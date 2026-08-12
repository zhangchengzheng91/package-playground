/**
 * 将选中图片保存到本地文件夹（File System Access API）
 */

export function sanitizeFilenameSegment(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|ico)(?:\?|$|\/)/i

export function guessImageExtension(url: string, contentType?: string | null): string {
  if (contentType) {
    const mime = contentType.split(";")[0].trim().toLowerCase()
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/bmp": ".bmp",
      "image/svg+xml": ".svg",
      "image/avif": ".avif"
    }
    if (map[mime]) return map[mime]
  }

  const matched = url.match(IMAGE_EXT_RE)
  if (matched) {
    const ext = matched[1].toLowerCase()
    return `.${ext === "jpeg" ? "jpg" : ext}`
  }
  return ".jpg"
}

export function buildSaveFilename(label: string, url: string, contentType?: string | null): string {
  const base = sanitizeFilenameSegment(label) || "image"
  const ext = guessImageExtension(url, contentType)
  if (base.toLowerCase().endsWith(ext)) return base
  return `${base}${ext}`
}

export type SaveImageItem = {
  url: string
  filename: string
}

/**
 * 选择一次本地文件夹，将图片写入其中；同名文件直接覆盖。
 */
export async function saveImagesToDirectory(
  items: SaveImageItem[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (items.length === 0) {
    throw new Error("没有可保存的图片")
  }

  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error(
      "当前环境不支持选择文件夹，请使用 Chrome 86+ 或 Edge 等最新 Chromium 内核浏览器。"
    )
  }

  let dirHandle: FileSystemDirectoryHandle
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("已取消选择文件夹")
    }
    throw e
  }

  const total = items.length
  for (let i = 0; i < total; i++) {
    const item = items[i]
    const res = await fetch(item.url, { credentials: "omit", mode: "cors" })
    if (!res.ok) {
      throw new Error(`第 ${i + 1}/${total} 张下载失败：HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const filename = item.filename.includes(".")
      ? item.filename
      : buildSaveFilename(item.filename, item.url, res.headers.get("content-type"))

    // create: true + 重新写入 = 已存在则覆盖
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    onProgress?.(i + 1, total)
  }
}
