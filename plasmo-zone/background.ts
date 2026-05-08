/**
 * Background Script
 * 处理 Chrome Extension 的后台逻辑
 */

import type { MessageRequest, MessageResponse, ActiveTabChangedMessage } from "~types/messages"

// 统一的错误响应处理
function createErrorResponse(error: string): MessageResponse {
  return {
    success: false,
    error
  }
}

// 统一的消息响应处理
function createSuccessResponse(data?: Partial<MessageResponse>): MessageResponse {
  return {
    success: true,
    ...data
  }
}

// 向所有已注入 content script 的标签页广播消息
function broadcastToContentScripts(message: ActiveTabChangedMessage): void {
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // 忽略发送失败的情况（可能是 content script 未注入）
        })
      }
    })
  })
}

// 处理标签页激活事件
function handleTabActivated(activeInfo: chrome.tabs.OnActivatedInfo): void {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (!chrome.runtime.lastError && tab) {
      const message: ActiveTabChangedMessage = {
        action: "activeTabChanged",
        tab: tab
      }
      broadcastToContentScripts(message)
    }
  })
}

// 处理标签页更新事件
function handleTabUpdated(tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): void {
  if (changeInfo.status === "complete" && tab.active) {
    const message: ActiveTabChangedMessage = {
      action: "activeTabChanged",
      tab: tab
    }
    broadcastToContentScripts(message)
  }
}

// 监听快捷键
// 注意：Chrome Extension 的安全限制，快捷键无法直接打开标准的工具栏 popup
// chrome.action.openPopup() 只能在用户手势上下文中调用，快捷键不是用户手势
// 标准 popup 只能通过点击扩展图标打开
chrome.commands.onCommand.addListener((command) => {
  console.log("快捷键触发:", command)
  if (command === "toggle-drawer") {
    // 尝试打开 popup（可能会失败，因为快捷键不是用户手势）
    chrome.action.openPopup().catch(() => {
      console.log("快捷键无法打开 popup，请点击扩展图标打开")
    })
  }
})

// 处理来自 content script 和 popup 的消息
chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  // 处理获取所有标签页
  if (request.action === "getAllTabs") {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse(createErrorResponse(chrome.runtime.lastError.message))
      } else {
        sendResponse(createSuccessResponse({ tabs }))
      }
    })
    return true // 保持消息通道开放以支持异步响应
  }
  
  // 处理切换标签页
  if (request.action === "switchTab") {
    if (!request.tabId) {
      sendResponse(createErrorResponse("缺少 tabId 参数"))
      return true
    }
    
    chrome.tabs.update(request.tabId, { active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse(createErrorResponse(chrome.runtime.lastError.message))
      } else {
        sendResponse(createSuccessResponse())
      }
    })
    return true // 保持消息通道开放以支持异步响应
  }
  
  // 处理关闭标签页
  if (request.action === "closeTab") {
    if (!request.tabId) {
      sendResponse(createErrorResponse("缺少 tabId 参数"))
      return true
    }
    
    chrome.tabs.remove(request.tabId, () => {
      if (chrome.runtime.lastError) {
        sendResponse(createErrorResponse(chrome.runtime.lastError.message))
      } else {
        sendResponse(createSuccessResponse())
      }
    })
    return true // 保持消息通道开放以支持异步响应
  }
  
  // 处理获取活动标签页
  if (request.action === "getActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse(createErrorResponse(chrome.runtime.lastError.message))
      } else {
        sendResponse(createSuccessResponse({ tab: tabs[0] || null }))
      }
    })
    return true // 保持消息通道开放以支持异步响应
  }
  
  // 处理未知的 action
  console.warn("未知的消息 action:", request.action)
  sendResponse(createErrorResponse(`未知的 action: ${request.action}`))
  return true
})

// 监听 tab 切换事件
chrome.tabs.onActivated.addListener(handleTabActivated)

// 监听 tab 更新事件
chrome.tabs.onUpdated.addListener(handleTabUpdated)
