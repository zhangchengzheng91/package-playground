/**
 * 侧边栏：图片下载（注入脚本、队列、批量保存）
 */

import { useEffect, useState } from "react"
import { Typography } from "antd"

import ImageDownloadEntry from "./components/image-download"
import ImageDownloadQueueList from "./components/image-download/queue-list"

import "./sidepanel.css"

export default function SidePanel() {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
          flexWrap: "wrap"
        }}
      >
        <Typography.Text strong style={{ fontSize: 14 }}>
          图片下载
        </Typography.Text>
        <ImageDownloadEntry onInjected={() => setRefreshKey((k) => k + 1)} />
      </div>

      <ImageDownloadQueueList refreshTrigger={refreshKey} maxHeight="min(55vh, 360px)" />
    </div>
  )
}
