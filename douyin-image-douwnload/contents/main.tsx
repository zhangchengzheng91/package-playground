/**
 * Content Script：承接侧边栏查询，执行页面提取逻辑
 */

import type { PlasmoCSConfig } from "plasmo"

import type { MessageResponse, QueryPageMediaRequest } from "~types/messages"
import {
  queryDouyinPageVideos,
  queryDouyinSourceCount,
  queryPageMedia,
  queryPageVideos
} from "~utils/query-page-media"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle"
}

function isOpenSidePanelShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === "KeyM" &&
    event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey &&
    !event.repeat
  )
}

window.addEventListener(
  "keydown",
  (event) => {
    if (!isOpenSidePanelShortcut(event)) return
    event.preventDefault()
    event.stopPropagation()
    void chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" })
  },
  true
)

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.action !== "QUERY_PAGE_MEDIA") {
    return
  }

  // 快捷键监听开在所有 frame；查询只由顶层页面回答，避免 iframe 先返回空结果
  if (window !== window.top) {
    return
  }

  const req = request as QueryPageMediaRequest
  try {
    if (req.mediaKind === "source-count") {
      const response: MessageResponse = {
        success: true,
        data: queryDouyinSourceCount()
      }
      sendResponse(response)
      return true
    }

    if (req.mediaKind === "video" && req.presetKey === "douyin") {
      void queryDouyinPageVideos(
        req.titleSelector,
        req.timeSelector,
        req.sourceIndex
      )
        .then((data) => {
          const response: MessageResponse = { success: true, data }
          sendResponse(response)
        })
        .catch((error: unknown) => {
          const response: MessageResponse = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
          sendResponse(response)
        })
      return true
    }

    if (req.mediaKind === "video") {
      const data = queryPageVideos(
        req.presetKey,
        req.imageSelector,
        req.titleSelector,
        req.timeSelector,
        req.sourceIndex
      )
      if (!data) {
        const response: MessageResponse = {
          success: false,
          error: "当前站点未提供视频匹配规则"
        }
        sendResponse(response)
        return true
      }
      const response: MessageResponse = { success: true, data }
      sendResponse(response)
      return true
    }

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
