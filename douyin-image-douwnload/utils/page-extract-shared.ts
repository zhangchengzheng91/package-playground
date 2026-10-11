/** 页面 DOM 提取共用工具（在 content script / 页面上下文中运行） */

/** 站点文件导出该函数表示提供视频匹配；导出 null 则侧边栏按钮置灰 */
export type VideoMatcher = (
  rootSelector: string,
  sourceIndex?: number
) => string[]

export function getVisibleArea(el: Element): number {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight
  const rect = el.getBoundingClientRect()
  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
  )
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
  )
  return visibleWidth * visibleHeight
}

export function pickBestByViewport(
  elements: Element[],
  readText: (el: Element) => string
): string {
  let bestText = ""
  let bestArea = -1
  elements.forEach((el) => {
    const text = readText(el)
    if (!text) return
    const area = getVisibleArea(el)
    if (area > bestArea) {
      bestArea = area
      bestText = text
    }
  })
  return bestText
}

export function collectImgSrcs(
  imageRoot: Element | null,
  seen: Set<string> = new Set()
): string[] {
  const srcs: string[] = []
  if (!imageRoot) return srcs

  const imgs =
    imageRoot instanceof HTMLImageElement
      ? [imageRoot]
      : Array.from(imageRoot.querySelectorAll("img"))

  imgs.forEach((img) => {
    const src = img.getAttribute("src")?.trim() || img.currentSrc?.trim()
    if (!src || seen.has(src)) return
    seen.add(src)
    srcs.push(src)
  })
  return srcs
}

/** 多个匹配时，取与视口相交面积最大的元素 */
export function pickLargestViewportRoot(selector: string): Element | null {
  const trimmed = selector.trim()
  if (!trimmed) return null

  let imageRoot: Element | null = null
  let bestVisibleArea = -1
  Array.from(document.querySelectorAll(trimmed)).forEach((el) => {
    const visibleArea = getVisibleArea(el)
    if (visibleArea > bestVisibleArea) {
      bestVisibleArea = visibleArea
      imageRoot = el
    }
  })
  return imageRoot
}

export function normalizeText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim()
}
