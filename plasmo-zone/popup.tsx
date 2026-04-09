/**
 * Popup UI
 * 主界面，从 content script 迁移而来
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import type { TabsProps } from 'antd'
import { Tabs } from 'antd'


import ResetStyles from "./components/reset-styles"
import TabManager from './components/tab-manager'

import "./popup.css"

export default function IndexPopup() {
  const [refreshKey, setRefreshKey] = useState(0)

  // 处理关闭 popup（标准 popup 点击外部会自动关闭）
  const handleClose = useCallback(() => {
    // 标准 popup 会自动关闭，这里可以添加清理逻辑
  }, [])

  // 当 popup 打开时，触发刷新
  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // 使用 useMemo 缓存 tabs items，避免每次渲染都重新创建
  const items: TabsProps['items'] = useMemo(() => [
    {
      key: '3',
      label: 'Tab管理',
      children: <TabManager refreshTrigger={refreshKey} />,
    },

    {
      key: '2',
      label: '样式复写',
      children: <ResetStyles />,
    },
  ], [refreshKey, handleClose])

  const onChange = useCallback((key: string) => {
    console.log("切换到标签页:", key)
  }, [])

  return (
    <div 
      style={{ 
        width: 600,
        maxWidth: 600,
        padding: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Tabs 
        items={items} 
        defaultActiveKey="3" 
        onChange={onChange}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
        tabBarStyle={{
          marginBottom: 0,
          flexShrink: 0
        }}
      />
    </div>
  )
}
