/**
 * AI 对话类页面注入面板的通用工具：
 * - 按 CSS 选择器收集目标元素
 * - 点击后滚动到目标元素并加上高亮背景，切换时自动还原上一次高亮
 */

export interface HighlightRecord {
  el: HTMLElement
  bg: string
}

export interface HighlightRef {
  current: HighlightRecord | null
}

/** 点击目标元素后的高亮背景色 */
export const HIGHLIGHT_BG_COLOR = "yellowgreen"

/**
 * 按 CSS 选择器获取页面中所有匹配的元素（HTMLElement 列表）
 */
export function getElementsBySelector(
  selector: string,
  root: ParentNode = document
): HTMLElement[] {
  if (!selector) return []
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
}

/**
 * 按 CSS 选择器获取匹配元素中「最外层」的那一部分。
 * 用于解决 Tailwind 类项目中同一类名在祖孙多层重复出现、
 * 导致 `querySelectorAll` 把同一条消息的多层嵌套节点重复纳入的问题。
 * 返回的元素彼此不存在祖先-后代关系。
 */
export function getOutermostElementsBySelector(
  selector: string,
  root: ParentNode = document
): HTMLElement[] {
  const all = getElementsBySelector(selector, root)
  return all.filter(
    (el) => !all.some((other) => other !== el && other.contains(el))
  )
}

/**
 * 按 CSS 选择器获取匹配元素中「最内层」的那一部分。
 * 用于当同一类名出现在外层气泡壳与内层文本节点上，而只需要内层叶子文本的场景
 * （例如豆包「带引用的消息」结构，外层气泡会把引用摘要一起拼入 textContent）。
 * 返回的元素彼此不存在祖先-后代关系。
 */
export function getInnermostElementsBySelector(
  selector: string,
  root: ParentNode = document
): HTMLElement[] {
  const all = getElementsBySelector(selector, root)
  return all.filter(
    (el) => !all.some((other) => other !== el && el.contains(other))
  )
}

/**
 * 按 CSS 选择器获取匹配元素的文本内容（已 trim，过滤空项）
 */
export function getTextsBySelector(
  selector: string,
  root: ParentNode = document
): string[] {
  return getElementsBySelector(selector, root)
    .map((el) => el.textContent?.trim() ?? "")
    .filter((text) => text.length > 0)
}

/**
 * 滚动到目标元素顶部，并附加高亮背景色。
 * 通过外部传入的 ref 记录「上一次高亮的元素及其原始背景色」，
 * 切换到新元素时先还原旧元素背景，再高亮新元素；
 * 重复点击同一元素则保持高亮。
 */
export function scrollToAndHighlight(
  el: HTMLElement,
  lastRef: HighlightRef
): void {
  el.scrollIntoView({ behavior: "instant", block: "start" })

  const prev = lastRef.current
  // 点击同一个元素时保持高亮，不重复记录原始背景
  if (prev && prev.el === el) {
    el.style.backgroundColor = HIGHLIGHT_BG_COLOR
    return
  }
  // 还原上一个高亮元素
  if (prev) {
    prev.el.style.backgroundColor = prev.bg
  }
  // 记录当前元素原始背景后再高亮
  lastRef.current = { el, bg: el.style.backgroundColor }
  el.style.backgroundColor = HIGHLIGHT_BG_COLOR
}
