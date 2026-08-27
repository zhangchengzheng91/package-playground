/**
 * Xiaocao 页面提取：图片 / 标题 / 时间
 */

import {
  collectImgSrcs,
  normalizeText,
  pickBestByViewport
} from "~utils/page-extract-shared"

/** 选择器下全部图片（不做视口筛选） */
export function getXiaoCaoImages(imageSelector: string): string[] {
  const rootSelector = imageSelector.trim() || ".tpc_content.do_not_catch"
  const seen = new Set<string>()
  const srcs: string[] = []

  Array.from(document.querySelectorAll(rootSelector)).forEach((root) => {
    collectImgSrcs(root, seen).forEach((src) => srcs.push(src))
  })

  return srcs
}

/** 多个匹配时取视口相交面积最大的文案 */
export function getXiaoCaoTitle(titleSelector: string): string {
  const trimmed = titleSelector.trim() || 'td[valign="top"] h4.f16'
  return pickBestByViewport(
    Array.from(document.querySelectorAll(trimmed)),
    normalizeText
  )
}

/** 从 data-timestamp（秒）* 1000 取毫秒时间戳字符串 */
export function getXiaoCaoTime(timeSelector: string): string {
  const selector = timeSelector.trim() || "tr.tr1 span[data-timestamp]"
  return pickBestByViewport(
    Array.from(document.querySelectorAll(selector)),
    (el) => {
      const tsAttr = el.getAttribute("data-timestamp")
      if (!tsAttr) return ""
      const ms = Number(tsAttr) * 1000
      return Number.isFinite(ms) ? String(ms) : ""
    }
  )
}
