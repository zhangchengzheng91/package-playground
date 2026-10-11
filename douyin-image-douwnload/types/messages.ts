/**
 * Chrome Extension message types
 */

export type MessageAction = "QUERY_PAGE_MEDIA" | string

export interface MessageRequest {
  action: MessageAction
}

export type QueryPageMediaRequest = {
  action: "QUERY_PAGE_MEDIA"
  presetKey: string
  imageSelector: string
  titleSelector: string
  timeSelector: string
  /** 缺省为图片；video 抓取视频；source-count 只统计抖音视口内 source 个数 */
  mediaKind?: "image" | "video" | "source-count"
  /** 抖音 video > source 的下标，从 0 开始 */
  sourceIndex?: number
}

export type PageMediaPayload = {
  srcs: string[]
  titles: string[]
  times: string[]
  sourceCount?: number
  intercepted?: Record<string, unknown>[]
  /** 获取时页面地址上的 modal_id */
  vid?: string
}

export interface MessageResponse {
  success: boolean
  error?: string
  data?: PageMediaPayload
}
