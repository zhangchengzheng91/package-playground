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
}

export type PageMediaPayload = {
  srcs: string[]
  titles: string[]
  times: string[]
}

export interface MessageResponse {
  success: boolean
  error?: string
  data?: PageMediaPayload
}
