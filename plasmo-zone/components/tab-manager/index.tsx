/**
 * Tab Manager 组件
 * 管理浏览器标签页，按域名分组显示
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Tag, Spin, Empty, message } from "antd"
import type { TabManagerProps } from "~types/tab-manager"
import type { ActiveTabChangedMessage } from "~types/messages"
import { getAllTabs, getActiveTab, switchTab, closeTab, closeTabs } from "~utils/chrome-api"
import { getDomain, getColorForDomain, groupTabsByDomain, getNextAvailableDomain } from "~utils/tab-utils"
import { COLORS, SPACING, TRANSITIONS } from "~styles/constants"

export default function TabManager({ refreshTrigger }: TabManagerProps) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const lastRefreshTriggerRef = useRef<number | undefined>(undefined)

  // 获取所有 tab 和当前活动 tab（并行执行）
  const refreshTabs = useCallback(async () => {
    setLoading(true)
    try {
      const [allTabs, activeTabData] = await Promise.all([
        getAllTabs(),
        getActiveTab()
      ])
      
      setTabs(allTabs)
      setActiveTab(activeTabData)
      
      // 初始化时，选中当前活动 tab 的域名
      if (activeTabData) {
        const domain = getDomain(activeTabData.url)
        setSelectedDomain(domain)
      }
    } catch (error) {
      console.error("获取标签页失败:", error)
      message.error("获取标签页失败，请重试")
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化时获取 tab
  useEffect(() => {
    refreshTabs()
    // 初始化 lastRefreshTriggerRef
    if (refreshTrigger !== undefined) {
      lastRefreshTriggerRef.current = refreshTrigger
    }
  }, [refreshTabs])

  // 当 refreshTrigger 变化时，刷新 tab 列表
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== lastRefreshTriggerRef.current) {
      lastRefreshTriggerRef.current = refreshTrigger
      refreshTabs()
    }
  }, [refreshTrigger, refreshTabs])

  // 监听 tab 切换事件（通过消息传递）
  useEffect(() => {
    const handleMessage = (msg: ActiveTabChangedMessage | { action: string }) => {
      if (msg.action === "activeTabChanged" && "tab" in msg) {
        setActiveTab(msg.tab)
        // 当活动 tab 变化时，自动切换到对应的域名
        const domain = getDomain(msg.tab.url)
        setSelectedDomain(domain)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // 当 activeTab 变化时，如果没有选中域名，自动切换
  useEffect(() => {
    if (activeTab && !selectedDomain) {
      const domain = getDomain(activeTab.url)
      setSelectedDomain(domain)
    }
  }, [activeTab, selectedDomain])

  // 按域名分组
  const groupedTabs = useMemo(() => {
    return groupTabsByDomain(tabs)
  }, [tabs])

  // 获取当前活动 tab 的域名
  const activeDomain = useMemo(() => {
    if (activeTab) {
      return getDomain(activeTab.url)
    }
    return null
  }, [activeTab])

  // 获取当前选中域名下的 tab 列表
  const selectedTabs = useMemo(() => {
    if (!selectedDomain) return []
    return groupedTabs[selectedDomain] || []
  }, [selectedDomain, groupedTabs])

  // 切换到下一个可用的域名
  const switchToNextDomain = useCallback((newTabs: chrome.tabs.Tab[]) => {
    const newGroupedTabs = groupTabsByDomain(newTabs)
    const nextDomain = getNextAvailableDomain(
      selectedDomain,
      newGroupedTabs,
      activeTab
    )
    if (nextDomain) {
      setSelectedDomain(nextDomain)
    }
  }, [selectedDomain, activeTab])

  // 处理 tag 点击事件
  const handleTagClick = useCallback((domain: string) => {
    setSelectedDomain(domain)
  }, [])

  // 处理标签页点击事件
  const handleTabClick = useCallback(async (tabId: number) => {
    try {
      await switchTab(tabId)
      // 切换成功后，更新活动 tab
      const clickedTab = tabs.find(tab => tab.id === tabId)
      if (clickedTab) {
        setActiveTab(clickedTab)
      }
    } catch (error) {
      console.error("切换标签页失败:", error)
      message.error("切换标签页失败")
    }
  }, [tabs])

  // 处理关闭单个标签页
  const handleCloseTab = useCallback(async (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发切换标签页
    
    try {
      await closeTab(tabId)
      // 关闭成功后，从列表中移除该标签页
      setTabs((prevTabs) => {
        const newTabs = prevTabs.filter((tab) => tab.id !== tabId)
        // 如果当前选中域名下没有 tab 了，切换到其他域名
        const domainTabs = newTabs.filter(tab => getDomain(tab.url) === selectedDomain)
        if (domainTabs.length === 0) {
          switchToNextDomain(newTabs)
        }
        return newTabs
      })
    } catch (error) {
      console.error("关闭标签页失败:", error)
      message.error("关闭标签页失败")
    }
  }, [selectedDomain, switchToNextDomain])

  // 处理关闭整个域名的所有标签页
  const handleCloseTag = useCallback(async (domain: string) => {
    const tabsToClose = groupedTabs[domain] || []
    if (tabsToClose.length === 0) return

    const tabIds = tabsToClose.map(tab => tab.id).filter((id): id is number => id !== undefined)
    
    try {
      await closeTabs(tabIds)
      // 关闭成功后，从列表中移除这些标签页
      setTabs((prevTabs) => {
        const newTabs = prevTabs.filter((tab) => !tabIds.includes(tab.id!))
        
        // 如果关闭的是当前选中的域名，切换到其他域名
        if (selectedDomain === domain) {
          switchToNextDomain(newTabs)
        }
        return newTabs
      })
      message.success(`已关闭 ${tabsToClose.length} 个标签页`)
    } catch (error) {
      console.error("关闭标签页失败:", error)
      message.error("关闭标签页失败")
    }
  }, [groupedTabs, selectedDomain, switchToNextDomain])

  // 生成标签样式
  const getTagStyle = useCallback((domain: string) => {
    const isActive = activeDomain === domain
    const isSelected = selectedDomain === domain
    const color = getColorForDomain(domain)
    
    return {
      marginBottom: 8,
      backgroundColor: color,
      color: "#fff",
      border: isActive ? "3px solid #fff" : isSelected ? "3px solid #ffd700" : "none",
      boxShadow: isActive 
        ? "0 0 12px rgba(255, 255, 255, 0.6), 0 0 20px rgba(0, 0, 0, 0.4)" 
        : isSelected 
          ? "0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)" 
          : "none",
      cursor: "pointer",
      transform: isActive ? "scale(1.08)" : isSelected ? "scale(1.06)" : "scale(1)",
      transition: `all ${TRANSITIONS.normal}`,
      fontWeight: isSelected ? "600" : "normal",
      opacity: isSelected ? 1 : 0.85,
      zIndex: isSelected ? 10 : 1,
      position: "relative" as const
    }
  }, [activeDomain, selectedDomain])

  if (loading && tabs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    )
  }

  if (tabs.length === 0) {
    return (
      <Empty 
        description="暂无标签页" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <Spin spinning={loading}>
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* 显示分组标签 */}
        <div style={{ 
          marginTop: SPACING.medium, 
          marginBottom: SPACING.medium,
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden'
        }}>
          {Object.keys(groupedTabs).map((domain) => (
            <Tag 
              key={domain} 
              closable
              onClose={(e) => {
                e.stopPropagation()
                handleCloseTag(domain)
              }}
              onClick={() => handleTagClick(domain)}
              style={getTagStyle(domain)}
            >
              {domain} ({groupedTabs[domain].length})
            </Tag>
          ))}
        </div>

        {/* 显示标签页列表 */}
        <div style={{ 
          marginTop: SPACING.medium,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0
        }}>
          {selectedTabs.length === 0 ? (
            <Empty 
              description="该域名下暂无标签页" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            selectedTabs.map((tab) => (
              <div 
                key={tab.id} 
                onClick={() => tab.id && handleTabClick(tab.id)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  marginBottom: SPACING.small,
                  cursor: "pointer",
                  padding: `${SPACING.small}px`,
                  borderRadius: "4px",
                  transition: `background-color ${TRANSITIONS.fast}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  {tab.favIconUrl && (
                    <img 
                      src={tab.favIconUrl} 
                      alt={tab.title || ""} 
                      style={{ width: 16, height: 16, marginRight: 8, border: "none" }}
                    />
                  )}
                  <div>{tab.title}</div>
                </div>
                <span 
                  onClick={(e) => tab.id && handleCloseTab(e, tab.id)}
                  style={{ 
                    fontSize: 16, 
                    color: COLORS.closeText,
                    padding: "4px 8px",
                    borderRadius: "2px",
                    cursor: "pointer",
                    lineHeight: 1,
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = COLORS.closeTextHover
                    e.currentTarget.style.backgroundColor = COLORS.closeHover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = COLORS.closeText
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  ×
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Spin>
  )
}
