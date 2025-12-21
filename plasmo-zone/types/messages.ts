/**
 * Chrome Extension 消息类型定义
 */

export type MessageAction =
  | "getAllTabs"
  | "switchTab"
  | "closeTab"
  | "getActiveTab"
  | "toggleDrawer"
  | "activeTabChanged"
  | "deployService"
  | "toggleFloatingUI"

export interface MessageRequest {
  action: MessageAction
  tabId?: number
  tab?: chrome.tabs.Tab
}

export interface MessageResponse {
  success: boolean
  error?: string
  tabs?: chrome.tabs.Tab[]
  tab?: chrome.tabs.Tab | null
}

export interface ActiveTabChangedMessage {
  action: "activeTabChanged"
  tab: chrome.tabs.Tab
}

export interface ToggleDrawerMessage {
  action: "toggleDrawer"
}

export interface ToggleFloatingUIMessage {
  action: "toggleFloatingUI"
}

export interface DeployServiceMessage {
  action: "deployService"
  serviceName: string
}

export interface DeployServiceResponse extends MessageResponse {
  found?: boolean
  message?: string
}

