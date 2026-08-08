/**
 * Popup UI
 * 主界面，从 content script 迁移而来
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import type { TabsProps } from "antd"
import { Button, Tabs, Typography } from "antd"

import ResetStyles from "./components/reset-styles"
import TabManager from "./components/tab-manager"

import "./popup.css"

async function openExtensionSidePanel(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const windowId = tab?.windowId
  if (windowId == null) {
    return
  }
  await chrome.sidePanel.open({ windowId })
}

export default function IndexPopup() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleClose = useCallback(() => {
    // 标准 popup 会自动关闭，这里可以添加清理逻辑
  }, [])

  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const items: TabsProps["items"] = useMemo(
    () => [
      {
        key: "3",
        label: "Tab管理",
        children: <TabManager refreshTrigger={refreshKey} />
      },

      {
        key: "2",
        label: "样式复写",
        children: <ResetStyles />
      }
    ],
    [refreshKey, handleClose]
  )

  const onChange = useCallback((key: string) => {
    console.log("切换到标签页:", key)
  }, [])

  return (
    <div
      style={{
        width: 600,
        maxWidth: 600,
        padding: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexShrink: 0,
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        <Typography.Text style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }}>快捷功能</Typography.Text>
        <Button size="small" type="primary" onClick={() => void openExtensionSidePanel()}>
          打开侧边栏
        </Button>
      </div>
      <Tabs
        items={items}
        defaultActiveKey="3"
        onChange={onChange}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}
        tabBarStyle={{
          marginBottom: 0,
          flexShrink: 0
        }}
      />
    </div>
  )
}
