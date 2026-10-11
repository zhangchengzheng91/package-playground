/**
 * Douyin（及同类站点）页面提取：图片 / 视频 / 标题 / 时间
 *
 * 视频地址在 video > source 的 src 上，video 自身没有 src。
 */

/**
 * 抖音个人主页接口链接：https://www.douyin.com/aweme/v1/web/aweme/post/
 * {
 *    aweme_id: string; // 视频 id。如果是 blod 从内存中加载的话，对应 _vid 字段
 * }
 *
 * 视频地址在 video > source 的 src 上，video 自身没有 src。
 */



import {
  collectImgSrcs,
  getVisibleArea,
  normalizeText,
  pickBestByViewport,
  pickLargestViewportRoot,
  type VideoMatcher
} from "~utils/page-extract-shared"
import { sanitizeFilenameSegment } from "~utils/save-images"

function listVideoSources(video: Element): Element[] {
  const direct = Array.from(video.children).filter((el) => el.tagName === "SOURCE")
  if (direct.length > 0) return direct
  return Array.from(video.querySelectorAll("source"))
}

function readSourceSrc(source: Element): string {
  const attr = source.getAttribute("src")?.trim() || ""
  const prop =
    "src" in source ? String((source as HTMLSourceElement).src || "").trim() : ""
  const raw = attr || (prop && prop !== location.href ? prop : "")
  if (!raw || raw.startsWith("blob:")) return ""
  try {
    const href = new URL(raw, document.baseURI).href
    return /^https?:/i.test(href) ? href : ""
  } catch {
    return /^https?:/i.test(raw) ? raw : ""
  }
}

function pickViewportVideo(): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null
  let bestArea = 0

  Array.from(document.querySelectorAll("video")).forEach((video) => {
    if (!(video instanceof HTMLVideoElement)) return
    const area = getVisibleArea(video)
    if (area > bestArea) {
      bestArea = area
      best = video
    }
  })

  return best
}

/** 视口内 video 的 source 个数；没有视频时为 0 */
export function countDouyinViewportSources(): number {
  const video = pickViewportVideo()
  if (!video) return 0
  return listVideoSources(video).length
}

const DOUYIN_VIDEO_REQUESTS_KEY = "douyinVideoRequests"
const MAX_RECORDED_PER_TAB = 1000
const DOUYIN_VOD_URLS = ["*://*.douyinvod.com/*"]

type RecordedVideoRequest = {
  url: string
  at: number
  /** webRequest.onBeforeRequest 的原始详情 */
  raw: Record<string, unknown>
}

type RecordedVideoMap = Record<string, RecordedVideoRequest[]>

function isDouyinPageUrl(raw?: string): boolean {
  if (!raw) return false
  try {
    const host = new URL(raw).hostname
    return host === "douyin.com" || host.endsWith(".douyin.com")
  } catch {
    return false
  }
}

function isDouyinVodFile(url: string): boolean {
  try {
    const host = new URL(url).hostname
    if (host !== "douyinvod.com" && !host.endsWith(".douyinvod.com")) return false
  } catch {
    return false
  }
  return /mime_type=video_mp4/i.test(url) || /\/video\/tos\//i.test(url)
}

function videoIdOf(url: string): string {
  try {
    const parsed = new URL(url)
    return (
      parsed.searchParams.get("__vid") ||
      parsed.searchParams.get("_vid") ||
      parsed.searchParams.get("video_id") ||
      ""
    )
  } catch {
    return ""
  }
}

/** 当前页面地址上的 modal_id，对应视频请求里的 __vid */
export function modalVidFromPageUrl(): string {
  try {
    return new URL(location.href).searchParams.get("modal_id")?.trim() || ""
  } catch {
    return ""
  }
}

function bitrateOf(url: string): number {
  try {
    const br = Number(new URL(url).searchParams.get("br"))
    return Number.isFinite(br) ? br : 0
  } catch {
    return 0
  }
}

/** 指定 vid 时只留该视频；否则用最新一条的 __vid。同一视频取码率最高的地址 */
function pickDouyinVideoUrl(entries: RecordedVideoRequest[], vid = ""): string {
  const files = entries.filter((item) => isDouyinVodFile(item.url))
  if (files.length === 0) return ""

  const targetVid = vid || videoIdOf(files[files.length - 1].url)
  const pool = targetVid
    ? files.filter((item) => videoIdOf(item.url) === targetVid)
    : [files[files.length - 1]]
  if (pool.length === 0) return ""

  return pool.reduce((best, item) => {
    const br = bitrateOf(item.url)
    const bestBr = bitrateOf(best.url)
    if (br !== bestBr) return br > bestBr ? item : best
    return item.at >= best.at ? item : best
  }).url
}

async function readRecordedMap(): Promise<RecordedVideoMap> {
  const bag = await chrome.storage.session.get(DOUYIN_VIDEO_REQUESTS_KEY)
  return (bag[DOUYIN_VIDEO_REQUESTS_KEY] || {}) as RecordedVideoMap
}

function snapshotWebRequest(
  details: chrome.webRequest.OnBeforeRequestDetails
): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(details)) as Record<string, unknown>
  } catch {
    return {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      tabId: details.tabId,
      frameId: details.frameId,
      parentFrameId: details.parentFrameId,
      initiator: details.initiator,
      timeStamp: details.timeStamp
    }
  }
}

/** 仅记录 douyin.com 页面发往 douyinvod.com 的视频文件请求 */
export async function rememberDouyinVideoRequest(
  details: chrome.webRequest.OnBeforeRequestDetails
): Promise<void> {
  const documentUrl = String(
    (details as { documentUrl?: string }).documentUrl || ""
  )
  if (details.tabId < 0) return
  if (!isDouyinPageUrl(details.initiator) && !isDouyinPageUrl(documentUrl)) return
  if (!isDouyinVodFile(details.url)) return

  const map = await readRecordedMap()
  const key = String(details.tabId)
  const prev = (map[key] || []).filter((item) => item.url !== details.url)
  map[key] = [
    ...prev,
    {
      url: details.url,
      at: details.timeStamp || Date.now(),
      raw: snapshotWebRequest(details)
    }
  ].slice(-MAX_RECORDED_PER_TAB)
  await chrome.storage.session.set({ [DOUYIN_VIDEO_REQUESTS_KEY]: map })
}

export async function forgetDouyinVideoRequests(tabId: number): Promise<void> {
  const map = await readRecordedMap()
  const key = String(tabId)
  if (!map[key]) return
  delete map[key]
  await chrome.storage.session.set({ [DOUYIN_VIDEO_REQUESTS_KEY]: map })
}

export type DouyinInterceptedVideo = Record<string, unknown>

async function readTabVideoRequests(
  tabId: number | undefined
): Promise<RecordedVideoRequest[]> {
  if (tabId == null || tabId < 0) return []
  const map = await readRecordedMap()
  return map[String(tabId)] || []
}

export async function listRecordedDouyinVideoRequests(
  tabId: number | undefined
): Promise<DouyinInterceptedVideo[]> {
  const entries = await readTabVideoRequests(tabId)
  return entries.map((item) => item.raw || { url: item.url, at: item.at })
}

export async function getRecordedDouyinVideoUrl(tabId: number | undefined): Promise<string> {
  const entries = await readTabVideoRequests(tabId)
  return pickDouyinVideoUrl(entries)
}

const DOUYIN_REFERER_RULE_ID = 1

/** 侧边栏播放/下载 douyinvod 时补上抖音页面来源头，避免 CDN 返回 403 */
export async function installDouyinRefererRule(): Promise<void> {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return
  const { RuleActionType, HeaderOperation, ResourceType } = chrome.declarativeNetRequest
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [DOUYIN_REFERER_RULE_ID],
      addRules: [
        {
          id: DOUYIN_REFERER_RULE_ID,
          priority: 1,
          action: {
            type: RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: "referer",
                operation: HeaderOperation.SET,
                value: "https://www.douyin.com/"
              }
            ]
          },
          condition: {
            urlFilter: "||douyinvod.com",
            resourceTypes: [
              ResourceType.MEDIA,
              ResourceType.XMLHTTPREQUEST,
              ResourceType.OTHER
            ]
          }
        }
      ]
    })
  } catch (error) {
    console.error(error)
  }
}

/** 在后台脚本启动时调用。只监听抖音视频 CDN */
export function installDouyinVideoRequestWatch(): void {
  const requestEvent = chrome.webRequest?.onBeforeRequest
  if (!requestEvent || requestEvent.hasListeners()) return
  requestEvent.addListener((details) => {
    void rememberDouyinVideoRequest(details)
    return undefined
  }, { urls: DOUYIN_VOD_URLS })
}

/** 没有 source 时，用页面 modal_id 当作 __vid，只取 resource 里这个视频的地址 */
function readDouyinVideoFromMemory(): string {
  const vid = modalVidFromPageUrl()
  if (!vid) return ""

  const entries = performance
    .getEntriesByType("resource")
    .map((entry) => ({
      url: entry.name,
      at: entry.startTime,
      raw: {}
    }))
    .filter(
      (item) =>
        /^https?:/i.test(item.url) &&
        isDouyinVodFile(item.url) &&
        videoIdOf(item.url) === vid
    )

  return pickDouyinVideoUrl(entries, vid)
}

/**
 * 多个 video 时只取与视口相交面积最大的那个。
 * 有 source 时按 sourceIndex 读取；长度为 0 时改从已加载请求里取真实地址。
 * 索引从 0 开始，缺省为 1（第二条）。
 */
export const getDouyinVideos: VideoMatcher = (_rootSelector, sourceIndex = 1) => {
  const index =
    Number.isInteger(sourceIndex) && sourceIndex >= 0 ? sourceIndex : 1
  const best = pickViewportVideo()
  if (!best) return []

  const sources = listVideoSources(best)
  if (sources.length === 0) {
    const src = readDouyinVideoFromMemory()
    return src ? [src] : []
  }

  const source = sources[index]
  const src = source ? readSourceSrc(source) : ""
  return src ? [src] : []
}

/**
 * 有 source 时按索引取地址。
 * 没有 source 时用后台记下的 douyinvod 请求；记录里也没有，再退回 performance 缓冲区。
 */
export async function resolveDouyinVideoSrcs(sourceIndex?: number): Promise<{
  srcs: string[]
  intercepted: DouyinInterceptedVideo[]
}> {
  const index = Number.isInteger(sourceIndex) && sourceIndex >= 0 ? sourceIndex : 1
  let intercepted: DouyinInterceptedVideo[] = []
  let recorded = ""
  try {
    const response = (await chrome.runtime.sendMessage({
      action: "GET_DOUYIN_RECORDED_VIDEO"
    })) as { data?: { srcs?: string[]; intercepted?: DouyinInterceptedVideo[] } }
    intercepted = response?.data?.intercepted || []
    recorded = response?.data?.srcs?.[0] || ""
  } catch {
    intercepted = []
  }

  const best = pickViewportVideo()
  if (!best) return { srcs: [], intercepted }

  const sources = listVideoSources(best)
  if (sources.length > 0) {
    const source = sources[index]
    const src = source ? readSourceSrc(source) : ""
    return { srcs: src ? [src] : [], intercepted }
  }

  const vid = modalVidFromPageUrl()
  const matched = vid
    ? pickDouyinVideoUrl(
        intercepted.flatMap((raw) => {
          const url = typeof raw.url === "string" ? raw.url : ""
          if (!url) return []
          const at = typeof raw.timeStamp === "number" ? raw.timeStamp : 0
          return [{ url, at, raw }]
        }),
        vid
      )
    : ""
  if (matched) return { srcs: [matched], intercepted }

  const memory = readDouyinVideoFromMemory()
  if (memory) return { srcs: [memory], intercepted }

  if (!vid && recorded) return { srcs: [recorded], intercepted }
  return { srcs: [], intercepted }
}

const DOUYIN_VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|ogv)(?:\?|#|$|\/)/i

/**
 * 抖音视频地址多半没有文件后缀（mime_type 在查询参数里）。
 * 地址自带视频后缀时沿用，否则写成 .mp4。
 * vid 使用获取时页面地址上的 modal_id，接在主文件名末尾。
 */
export function buildDouyinVideoFilename(
  label: string,
  url: string,
  vid = ""
): string {
  const base = sanitizeFilenameSegment(label) || "video"
  const matched = url.match(DOUYIN_VIDEO_EXT_RE)
  const ext = matched ? `.${matched[1].toLowerCase()}` : ".mp4"
  const stem = base.toLowerCase().endsWith(ext) ? base.slice(0, -ext.length) : base
  const id = sanitizeFilenameSegment(vid)
  const named = id ? `${stem}_${id}` : stem
  return `${named}${ext}`
}

/** 视口内面积最大的根节点下的图片 */
export function getDouyinImages(imageSelector: string): string[] {
  return collectImgSrcs(pickLargestViewportRoot(imageSelector))
}

/** 多个匹配时取视口相交面积最大的文案 */
export function getDouyinTitle(titleSelector: string): string {
  const trimmed = titleSelector.trim()
  if (!trimmed) return ""
  return pickBestByViewport(
    Array.from(document.querySelectorAll(trimmed)),
    normalizeText
  )
}

/** 多个匹配时取视口相交面积最大的文案 */
export function getDouyinTime(timeSelector: string): string {
  const trimmed = timeSelector.trim()
  if (!trimmed) return ""
  return pickBestByViewport(
    Array.from(document.querySelectorAll(trimmed)),
    normalizeText
  )
}
