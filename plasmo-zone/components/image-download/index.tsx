/**
 * 下载图片：向当前标签页注入脚本，在 img/canvas 上显示 checkbox，
 * 勾选后加入 window.__YIXIANGHUA_IMAGE_DOWNLOAD_QUEUE__。
 * 「下载图片」先确认；「立即启用勾选」跳过确认直接注入。
 */

import { useCallback } from "react"
import { Button, Modal, Space, message } from "antd"

import { IMAGE_DOWNLOAD_QUEUE_KEY, injectImageDownloadUi } from "./injected-page-script"

export { IMAGE_DOWNLOAD_QUEUE_KEY }

function isInjectableUrl(url: string | undefined): boolean {
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

async function injectIntoActiveTab(onInjected?: () => void): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    message.error("未找到当前标签页")
    throw new Error("no tab")
  }
  if (!isInjectableUrl(tab.url)) {
    message.error("当前页面无法注入脚本（浏览器内置页或扩展页等）")
    throw new Error("not injectable")
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: "MAIN",
      func: injectImageDownloadUi
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    message.error(`注入失败：${msg}`)
    throw e
  }
  message.success("已注入（支持 img / canvas；右上角可勾选）")
  onInjected?.()
}

type ImageDownloadEntryProps = {
  /** 注入成功后回调，用于刷新已选列表 */
  onInjected?: () => void
}

export default function ImageDownloadEntry({ onInjected }: ImageDownloadEntryProps) {
  const handleClickWithConfirm = useCallback(() => {
    Modal.confirm({
      title: "下载图片",
      content: "是否在当前页面启用图片下载功能？",
      okText: "是",
      cancelText: "否",
      onOk: () => injectIntoActiveTab(onInjected)
    })
  }, [onInjected])

  const handleInjectDirect = useCallback(() => {
    void injectIntoActiveTab(onInjected).catch(() => {
      /* injectIntoActiveTab 已 message.error */
    })
  }, [onInjected])

  return (
    <Space size={8} wrap>
      <Button type="primary" size="small" onClick={handleClickWithConfirm}>
        下载图片
      </Button>
      <Button size="small" onClick={handleInjectDirect}>
        立即启用勾选
      </Button>
    </Space>
  )
}
