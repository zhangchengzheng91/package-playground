/**
 * Background Script
 * 点击扩展图标时打开侧边栏
 */

import type { MessageRequest, MessageResponse } from "~types/messages"

function createSuccessResponse(
  data?: Partial<MessageResponse>
): MessageResponse {
  return {
    success: true,
    ...data
  }
}

async function openExtensionSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const windowId = tab?.windowId
  if (windowId == null) {
    return
  }
  await chrome.sidePanel.open({ windowId })
}

// Plasmo / Chrome 推荐：点击图标直接打开侧边栏（否则默认无反应）
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.action.onClicked.addListener(() => {
  void openExtensionSidePanel()
})

chrome.runtime.onMessage.addListener(
  (request: MessageRequest, _sender, sendResponse) => {
    console.log("background received:", request.action)
    sendResponse(createSuccessResponse())
    return true
  }
)

export {}
