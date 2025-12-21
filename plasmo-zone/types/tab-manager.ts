/**
 * Tab Manager 相关类型定义
 */

export interface TabManagerProps {
  refreshTrigger?: number
}

export interface GroupedTabs {
  [domain: string]: chrome.tabs.Tab[]
}

