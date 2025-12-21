/**
 * Tab 相关工具函数
 */

/**
 * 从 URL 中提取域名
 */
export function getDomain(url: string | undefined): string {
  if (!url) return "未知域名"
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return "未知域名"
  }
}

/**
 * 根据字符串生成稳定的颜色
 */
export function getColorForDomain(domain: string): string {
  // 预定义一组好看的颜色
  const colors = [
    "#ff4d4f", "#ff7a45", "#ffa940", "#ffc53d", "#ffec3d",
    "#bae637", "#95de64", "#73d13d", "#52c41a", "#389e0d",
    "#13c2c2", "#36cfc9", "#5cdbd3", "#87e8de", "#b5f5ec",
    "#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff",
    "#722ed1", "#9254de", "#b37feb", "#d3adf7", "#efdbff",
    "#eb2f96", "#f759ab", "#ff85c0", "#ffadd2", "#ffd6e7",
  ]
  
  // 使用简单的哈希函数将域名映射到颜色
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 确保索引为正数
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * 按域名对标签页进行分组
 */
export function groupTabsByDomain(tabs: chrome.tabs.Tab[]): Record<string, chrome.tabs.Tab[]> {
  const groups: Record<string, chrome.tabs.Tab[]> = {}
  tabs.forEach((tab) => {
    const domain = getDomain(tab.url)
    if (!groups[domain]) {
      groups[domain] = []
    }
    groups[domain].push(tab)
  })
  return groups
}

/**
 * 切换到下一个可用的域名
 */
export function getNextAvailableDomain(
  currentDomain: string | null,
  groupedTabs: Record<string, chrome.tabs.Tab[]>,
  activeTab: chrome.tabs.Tab | null
): string | null {
  const allTabs = Object.values(groupedTabs).flat()
  
  // 如果当前域名下还有 tab，不需要切换
  if (currentDomain && groupedTabs[currentDomain]?.length > 0) {
    return currentDomain
  }
  
  // 优先切换到活动 tab 的域名
  if (activeTab) {
    const activeDomain = getDomain(activeTab.url)
    if (groupedTabs[activeDomain]?.length > 0) {
      return activeDomain
    }
  }
  
  // 否则切换到第一个有 tab 的域名
  if (allTabs.length > 0) {
    const firstDomain = getDomain(allTabs[0].url)
    if (groupedTabs[firstDomain]?.length > 0) {
      return firstDomain
    }
  }
  
  return null
}

