/**
 * Douyin（及同类站点）页面提取：图片 / 标题 / 时间
 */

import {
  collectImgSrcs,
  normalizeText,
  pickBestByViewport,
  pickLargestViewportRoot
} from "~utils/page-extract-shared"

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
