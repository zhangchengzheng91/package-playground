/**
 * Background Script
 * 点击扩展图标时打开侧边栏
 */

import type { MessageRequest, MessageResponse } from "~types/messages"
import {
  forgetDouyinVideoRequests,
  getRecordedDouyinVideoUrl,
  installDouyinRefererRule,
  installDouyinVideoRequestWatch,
  listRecordedDouyinVideoRequests
} from "~utils/douyin"

installDouyinVideoRequestWatch()
void installDouyinRefererRule()

chrome.tabs.onRemoved.addListener((tabId) => {
  void forgetDouyinVideoRequests(tabId)
})

function createSuccessResponse(
  data?: Partial<MessageResponse>
): MessageResponse {
  return {
    success: true,
    ...data
  }
}

function openSidePanel(windowId: number | undefined): void {
  if (windowId == null) return
  // 必须在按键回调里同步调用，前面不能 await，否则 Chrome 会丢掉用户手势
  void chrome.sidePanel.open({ windowId }).catch((error) => console.error(error))
}

async function openExtensionSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  openSidePanel(tab?.windowId)
}

// Plasmo / Chrome 推荐：点击图标直接打开侧边栏（否则默认无反应）
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.action.onClicked.addListener(() => {
  void openExtensionSidePanel()
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "_execute_action" && command !== "open-side-panel") return
  if (tab?.windowId != null) {
    openSidePanel(tab.windowId)
    return
  }
  void openExtensionSidePanel()
})

chrome.runtime.onMessage.addListener(
  (request: MessageRequest, sender, sendResponse) => {
    if (request?.action === "OPEN_SIDE_PANEL") {
      openSidePanel(sender.tab?.windowId)
      sendResponse(createSuccessResponse())
      return true
    }

    if (request?.action === "GET_DOUYIN_RECORDED_VIDEO") {
      const tabId = sender.tab?.id
      void Promise.all([
        getRecordedDouyinVideoUrl(tabId),
        listRecordedDouyinVideoRequests(tabId)
      ]).then(([url, intercepted]) => {
        sendResponse(
          createSuccessResponse({
            data: {
              srcs: url ? [url] : [],
              titles: [],
              times: [],
              intercepted
            }
          })
        )
      })
      return true
    }

    console.log("background received:", request.action)
    sendResponse(createSuccessResponse())
    return true
  }
)

export {}
