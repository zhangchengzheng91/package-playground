/**
 * 批量保存图片：仅第一次弹出系统「选择文件夹」对话框，之后全部写入该目录。
 * 使用 File System Access API（showDirectoryPicker），不逐张弹出另存为。
 */

import { dedupeQueueItemsByUrl } from "./queue-dedupe"

export function sanitizeFilenameSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120)
}

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|ico)$/i

/**
 * 根据 URL 生成建议文件名；无法解析时使用 image-{index}.png
 * 兼容路径形如 .../hash.jpeg/rs500（扩展名不在最后一段）
 */
export function suggestFilenameFromUrl(url: string, index: number): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/").filter(Boolean)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i]
      if (IMAGE_EXT_RE.test(seg)) {
        return sanitizeFilenameSegment(seg) || `image-${index + 1}.png`
      }
    }
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(?:\?|$|\/)/i)
    if (extMatch) {
      return `image-${index + 1}.${extMatch[1].toLowerCase()}`
    }
  } catch {
    /* ignore */
  }
  return `image-${index + 1}.png`
}

/** 下载时间前缀：yyyy-MM-dd HH:mm:ss（冒号等非法字符会经 sanitize 替换） */
export function formatDownloadTimestampPrefix(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const raw = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return sanitizeFilenameSegment(raw)
}

/**
 * 规范化文件名前缀：优先使用自定义前缀，为空时回退到当前时间戳。
 */
export function resolveDownloadNamePrefix(customPrefix?: string, at = new Date()): string {
  const custom = customPrefix ? sanitizeFilenameSegment(customPrefix) : ""
  return custom || formatDownloadTimestampPrefix(at)
}

/** 批量落盘文件名：前缀 + 序号 + 原名，避免同名覆盖 */
export function buildDownloadFilename(url: string, index: number, namePrefix: string): string {
  const base = suggestFilenameFromUrl(url, index)
  return `${namePrefix}_${String(index + 1).padStart(3, "0")}_${base}`
}

export type QueueEntry = { id: string; url: string }

export type DownloadQueueOptions = {
  /** 自定义文件名前缀；为空则使用下载时的时间戳 */
  namePrefix?: string
}

/**
 * 先让用户选择一次本地文件夹，再依次将队列中图片拉取并写入该目录（无二次确认）。
 */
export async function downloadQueueToDirectoryOnce(
  items: QueueEntry[],
  onProgress?: (done: number, total: number) => void,
  options?: DownloadQueueOptions
): Promise<void> {
  const unique = dedupeQueueItemsByUrl(items)

  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error("当前环境不支持选择文件夹，请使用 Chrome 86+ 或 Edge 等最新 Chromium 内核浏览器。")
  }

  let dirHandle: FileSystemDirectoryHandle
  try {
    dirHandle = await window.showDirectoryPicker()
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("已取消选择文件夹")
    }
    throw e
  }

  const total = unique.length
  const namePrefix = resolveDownloadNamePrefix(options?.namePrefix)

  for (let i = 0; i < unique.length; i++) {
    const filename = buildDownloadFilename(unique[i].url, i, namePrefix)
    const res = await fetch(unique[i].url, { credentials: "omit", mode: "cors" })
    if (!res.ok) {
      throw new Error(`第 ${i + 1}/${total} 张下载失败：HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    onProgress?.(i + 1, total)
  }
}
