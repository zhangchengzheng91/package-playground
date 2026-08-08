/**
 * 在扩展页面（如侧边栏）中展示已选图片队列（缩略图 + URL）。
 * 按标签页缓存队列：切换 Chrome 标签后不会用新页的空队列清空其它页已选。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button, Empty, Image, Input, message, Spin, Typography } from "antd"
import type { ImageDownloadQueueItem } from "./injected-page-script"
import { readImageDownloadQueueSnapshot } from "./injected-page-script"
import {
  buildDownloadFilename,
  downloadQueueToDirectoryOnce,
  formatDownloadTimestampPrefix,
  resolveDownloadNamePrefix
} from "~utils/download-images"
import { dedupeQueueItemsByUrl, normalizeUrlForQueueDedupe } from "~utils/queue-dedupe"

function isReadableTabUrl(url: string | undefined): boolean {
  if (!url) return false
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  ) {
    return false
  }
  return true
}

async function fetchQueueFromTab(tabId: number): Promise<ImageDownloadQueueItem[]> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: "MAIN",
    func: readImageDownloadQueueSnapshot
  })

  const merged: ImageDownloadQueueItem[] = []
  const seenUrl = new Set<string>()
  for (let i = 0; i < results.length; i++) {
    const r = results[i].result
    if (!Array.isArray(r)) continue
    const arr = r as ImageDownloadQueueItem[]
    for (let j = 0; j < arr.length; j++) {
      const item = arr[j]
      const u = normalizeUrlForQueueDedupe(item.url)
      if (!u || seenUrl.has(u)) continue
      seenUrl.add(u)
      merged.push(item)
    }
  }
  return merged
}

type QueueRow = ImageDownloadQueueItem & { sourceTabId: number }

function mergeQueuesByTab(map: Map<number, ImageDownloadQueueItem[]>): QueueRow[] {
  const rows: QueueRow[] = []
  const seenUrl = new Set<string>()
  map.forEach((list, tabId) => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const u = normalizeUrlForQueueDedupe(item.url)
      if (!u || seenUrl.has(u)) continue
      seenUrl.add(u)
      rows.push({ ...item, sourceTabId: tabId })
    }
  })
  return rows
}

type Props = {
  /** 与页面打开 / 注入成功等联动，变化时立即拉取队列 */
  refreshTrigger?: number
  /** 列表区域最大高度 */
  maxHeight?: number | string
}

export default function ImageDownloadQueueList({ refreshTrigger, maxHeight = 220 }: Props) {
  const [items, setItems] = useState<QueueRow[]>([])
  const queueByTabIdRef = useRef<Map<number, ImageDownloadQueueItem[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [namePrefix, setNamePrefix] = useState(() => formatDownloadTimestampPrefix())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setItems(mergeQueuesByTab(queueByTabIdRef.current))
        return
      }
      if (!isReadableTabUrl(tab.url)) {
        setItems(mergeQueuesByTab(queueByTabIdRef.current))
        return
      }
      const list = await fetchQueueFromTab(tab.id)
      queueByTabIdRef.current.set(tab.id, list)
      setItems(mergeQueuesByTab(queueByTabIdRef.current))
    } catch (e) {
      console.error(e)
      setItems(mergeQueuesByTab(queueByTabIdRef.current))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshTrigger])

  useEffect(() => {
    const t = window.setInterval(() => void load(), 1500)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    const onActivated = () => {
      void load()
    }
    const onRemoved = (tabId: number) => {
      queueByTabIdRef.current.delete(tabId)
      setItems(mergeQueuesByTab(queueByTabIdRef.current))
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
    }
  }, [load])

  const handleDownloadAll = useCallback(async () => {
    if (items.length === 0) {
      message.warning("没有可下载的图片")
      return
    }
    const payload = dedupeQueueItemsByUrl(
      items.map(({ sourceTabId: _t, ...rest }) => rest)
    )
    setDownloading(true)
    message.loading({ content: "请在对话框中选择保存文件夹（仅一次）…", key: "dl", duration: 0 })
    try {
      await downloadQueueToDirectoryOnce(
        payload,
        (done, total) => {
          message.loading({ content: `正在保存 ${done}/${total}…`, key: "dl", duration: 0 })
        },
        { namePrefix }
      )
      message.success({ content: "已全部保存到所选文件夹", key: "dl" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败"
      message.error({ content: msg, key: "dl" })
    } finally {
      setDownloading(false)
    }
  }, [items, namePrefix])

  const itemKey = (row: QueueRow) => `${row.sourceTabId}-${row.id}`

  const previewNamePrefix = useMemo(() => resolveDownloadNamePrefix(namePrefix), [namePrefix])

  return (
    <div
      style={{
        marginBottom: 12,
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 8,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.02)",
        maxHeight,
        display: "flex",
        flexDirection: "column",
        minHeight: 0
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          flexShrink: 0,
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        <Typography.Text strong style={{ fontSize: 13 }}>
          已选图片
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            ({items.length})
          </Typography.Text>
        </Typography.Text>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button
            size="small"
            type="primary"
            disabled={items.length === 0 || downloading}
            loading={downloading}
            onClick={() => void handleDownloadAll()}
          >
            下载全部
          </Button>
          <Button size="small" type="link" onClick={() => void load()} style={{ padding: "0 4px", height: "auto" }}>
            刷新
          </Button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexShrink: 0, alignItems: "center" }}>
        <Input
          size="small"
          value={namePrefix}
          onChange={(e) => setNamePrefix(e.target.value)}
          placeholder="文件名前缀，留空则使用当前时间"
          allowClear
          addonBefore="前缀"
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          size="small"
          onClick={() => setNamePrefix(formatDownloadTimestampPrefix())}
          title="填入当前时间"
        >
          时间
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8, marginTop: 0 }}>
        点击「下载全部」后先选择一次文件夹；文件名形如 前缀_001_xxx.png（可自定义前缀）。
      </Typography.Paragraph>

      <Spin spinning={loading} size="small">
        {items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无已选图片（多标签已选会合并显示）"
            style={{ margin: "8px 0" }}
          />
        ) : (
          <Image.PreviewGroup>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                overflowY: "auto",
                flex: 1,
                minHeight: 0
              }}
            >
              {items.map((item, index) => {
                const name = buildDownloadFilename(item.url, index, previewNamePrefix)
                return (
                  <li
                    key={itemKey(item)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(0,0,0,0.06)"
                    }}
                  >
                    <Thumbnail url={item.url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text
                        ellipsis={{ tooltip: name }}
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgba(0,0,0,0.85)"
                        }}
                      >
                        {name}
                      </Typography.Text>
                      <Typography.Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2, tooltip: item.url }}
                        style={{
                          margin: "2px 0 0",
                          fontSize: 11,
                          wordBreak: "break-all"
                        }}
                      >
                        {item.url}
                      </Typography.Paragraph>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Image.PreviewGroup>
        )}
      </Spin>
    </div>
  )
}

function Thumbnail({ url }: { url: string }) {
  return (
    <Image
      src={url}
      alt=""
      width={56}
      height={56}
      referrerPolicy="no-referrer"
      preview={{ mask: "预览" }}
      style={{
        objectFit: "cover",
        borderRadius: 4,
        flexShrink: 0,
        background: "rgba(0,0,0,0.04)",
        cursor: "pointer"
      }}
    />
  )
}
