/**
 * Chrome API 封装
 */

import type { MessageRequest, MessageResponse } from "~types/messages"

/**
 * 发送消息到 background script
 */
export function sendMessage<T extends MessageResponse>(
  request: MessageRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else if (response && response.success) {
        resolve(response)
      } else {
        reject(new Error(response?.error || "操作失败"))
      }
    })
  })
}

/**
 * 获取当前浏览器中所有的 tab
 */
export async function getAllTabs(): Promise<chrome.tabs.Tab[]> {
  const response = await sendMessage<MessageResponse & { tabs: chrome.tabs.Tab[] }>({
    action: "getAllTabs"
  })
  return response.tabs || []
}

/**
 * 获取当前活动的 tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const response = await sendMessage<MessageResponse & { tab: chrome.tabs.Tab | null }>({
    action: "getActiveTab"
  })
  return response.tab || null
}

/**
 * 切换标签页
 */
export async function switchTab(tabId: number): Promise<void> {
  await sendMessage<MessageResponse>({
    action: "switchTab",
    tabId
  })
}

/**
 * 关闭标签页
 */
export async function closeTab(tabId: number): Promise<void> {
  await sendMessage<MessageResponse>({
    action: "closeTab",
    tabId
  })
}

/**
 * 批量关闭标签页
 */
export async function closeTabs(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return
  
  // Chrome API 支持批量关闭
  await Promise.all(tabIds.map(id => closeTab(id)))
}

