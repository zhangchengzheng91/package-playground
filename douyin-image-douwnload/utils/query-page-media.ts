/**
 * 按站点 preset 汇总页面媒体信息
 */

import {
  countDouyinViewportSources,
  getDouyinImages,
  getDouyinTime,
  getDouyinTitle,
  getDouyinVideos,
  modalVidFromPageUrl,
  resolveDouyinVideoSrcs
} from "~utils/douyin"
import type { VideoMatcher } from "~utils/page-extract-shared"
import {
  getXiaoCaoImages,
  getXiaoCaoTime,
  getXiaoCaoTitle,
  getXiaoCaoVideos
} from "~utils/xiaocao"

export type PageMediaResult = {
  srcs: string[]
  titles: string[]
  times: string[]
  /** 抖音视口内 video 的 source 个数 */
  sourceCount?: number
  /** 当前标签页拦截到的原始 webRequest 详情 */
  intercepted?: Record<string, unknown>[]
  /** 获取时页面地址上的 modal_id */
  vid?: string
}

export function queryPageMedia(
  presetKey: string,
  imageSelector: string,
  titleSelector: string,
  timeSelector: string
): PageMediaResult {
  let srcs: string[] = []
  let titleText = ""
  let timeText = ""

  switch (presetKey) {
    case "xiaocao": {
      srcs = getXiaoCaoImages(imageSelector)
      titleText = getXiaoCaoTitle(titleSelector)
      timeText = getXiaoCaoTime(timeSelector)
      break
    }
    case "douyin":
    case "douyu":
    default: {
      srcs = getDouyinImages(imageSelector)
      titleText = getDouyinTitle(titleSelector)
      timeText = getDouyinTime(timeSelector)
      break
    }
  }

  return {
    srcs,
    titles: titleText ? [titleText] : [],
    times: timeText ? [timeText] : []
  }
}

function videoMatcherFor(presetKey: string): VideoMatcher | null {
  switch (presetKey) {
    case "xiaocao":
      return getXiaoCaoVideos
    case "douyin":
      return getDouyinVideos
    case "douyu":
    default:
      return null
  }
}

/** 对应站点文件未导出视频匹配函数时，侧边栏按钮置灰 */
export function hasSiteVideoRule(presetKey: string): boolean {
  return videoMatcherFor(presetKey) != null
}

/** 无匹配规则时返回 null，调用方不要当成「找到 0 个视频」 */
export function queryPageVideos(
  presetKey: string,
  imageSelector: string,
  titleSelector: string,
  timeSelector: string,
  sourceIndex?: number
): PageMediaResult | null {
  const matcher = videoMatcherFor(presetKey)
  if (!matcher) return null

  let titleText = ""
  let timeText = ""

  switch (presetKey) {
    case "xiaocao": {
      titleText = getXiaoCaoTitle(titleSelector)
      timeText = getXiaoCaoTime(timeSelector)
      break
    }
    case "douyin":
    case "douyu":
    default: {
      titleText = getDouyinTitle(titleSelector)
      timeText = getDouyinTime(timeSelector)
      break
    }
  }

  return {
    srcs: matcher(imageSelector, sourceIndex),
    titles: titleText ? [titleText] : [],
    times: timeText ? [timeText] : [],
    sourceCount:
      presetKey === "douyin" ? countDouyinViewportSources() : undefined
  }
}

/** 抖音视频：有 source 走索引；没有 source 走后台记下的 CDN 请求 */
export async function queryDouyinPageVideos(
  titleSelector: string,
  timeSelector: string,
  sourceIndex?: number
): Promise<PageMediaResult> {
  const resolved = await resolveDouyinVideoSrcs(sourceIndex)
  const titleText = getDouyinTitle(titleSelector)
  const timeText = getDouyinTime(timeSelector)
  return {
    srcs: resolved.srcs,
    titles: titleText ? [titleText] : [],
    times: timeText ? [timeText] : [],
    sourceCount: countDouyinViewportSources(),
    intercepted: resolved.intercepted,
    vid: modalVidFromPageUrl()
  }
}

/** 只读取抖音视口内 video 的 source 个数，不抓取视频地址 */
export function queryDouyinSourceCount(): PageMediaResult {
  return {
    srcs: [],
    titles: [],
    times: [],
    sourceCount: countDouyinViewportSources()
  }
}
