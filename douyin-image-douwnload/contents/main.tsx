/**
 * Content Script：承接侧边栏查询，执行页面提取逻辑
 */

import type { PlasmoCSConfig } from "plasmo"

import type { MessageResponse, QueryPageMediaRequest } from "~types/messages"
import { queryPageMedia } from "~utils/query-page-media"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action !== "QUERY_PAGE_MEDIA") {
    return
  }

  const req = request as QueryPageMediaRequest
  try {
    const data = queryPageMedia(
      req.presetKey,
      req.imageSelector,
      req.titleSelector,
      req.timeSelector
    )
    const response: MessageResponse = { success: true, data }
    sendResponse(response)
  } catch (error) {
    const response: MessageResponse = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
    sendResponse(response)
  }

  return true
})

export default function Content() {
  return null
}
