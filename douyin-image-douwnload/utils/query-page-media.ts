/**
 * 按站点 preset 汇总页面媒体信息
 */

import {
  getDouyinImages,
  getDouyinTime,
  getDouyinTitle
} from "~utils/douyin"
import {
  getXiaoCaoImages,
  getXiaoCaoTime,
  getXiaoCaoTitle
} from "~utils/xiaocao"

export type PageMediaResult = {
  srcs: string[]
  titles: string[]
  times: string[]
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
