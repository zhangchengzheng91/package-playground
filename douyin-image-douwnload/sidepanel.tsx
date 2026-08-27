/**
 * Side Panel：按 class 选择器获取当前页面图片
 */

import { useCallback, useMemo, useState } from "react"
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Image,
  Input,
  Radio,
  Spin,
  Typography,
  message
} from "antd"

import "./sidepanel.css"
import type { MessageResponse, QueryPageMediaRequest } from "~types/messages"
import type { PageMediaResult } from "~utils/query-page-media"
import { parseRelativeTimeToYmd } from "~utils/relative-time"
import {
  buildSaveFilename,
  saveImagesToDirectory
} from "~utils/save-images"

type SitePreset = {
  key: string
  label: string
  imageSelector: string
  titleSelector: string
  timeSelector: string
}

const SITE_PRESETS: SitePreset[] = [
  {
    key: "douyin",
    label: "douyin",
    imageSelector: ".focusPanel",
    titleSelector: ".title",
    timeSelector: ".time"
  },
  {
    key: "douyu",
    label: "douyu",
    imageSelector: ".focusPanel",
    titleSelector: ".title",
    timeSelector: ".time"
  },
  {
    key: "xiaocao",
    label: "xiaocao",
    imageSelector: ".tpc_content.do_not_catch",
    titleSelector: 'td[valign="top"] h4.f16',
    timeSelector: "tr.tr1 span[data-timestamp]"
  }
]

const DEFAULT_PRESET =
  SITE_PRESETS.find((item) => item.key === "douyin") ?? SITE_PRESETS[0]

type MatchedImage = {
  index: number
  src: string
  title: string
  time: string
}

type ImageGroup = {
  key: string
  time: string
  title: string
  images: MatchedImage[]
}

function buildGroupKey(time: string, title: string): string {
  return `${time || "未知时间"}-${title || "（无标题）"}`
}

function buildImageLabel(time: string, title: string, displayIndex: number): string {
  return `${time}-${title || "（无标题）"}-${displayIndex}`
}

/** 将编辑后的分组名解析回 time / title，尽量保持与 buildGroupKey 对称 */
function parseEditedGroupKey(
  nextKey: string,
  fallbackTime: string
): { time: string; title: string } {
  const match = nextKey.match(/^(未知时间|\d{4}-\d{2}-\d{2})-(.*)$/s)
  if (match) {
    return {
      time: match[1] === "未知时间" ? "" : match[1],
      title: match[2] === "（无标题）" ? "" : match[2]
    }
  }

  return {
    time: fallbackTime,
    title: nextKey === "（无标题）" ? "" : nextKey
  }
}

function groupImagesByTimeTitle(images: MatchedImage[]): ImageGroup[] {
  const map = new Map<string, ImageGroup>()

  images.forEach((item) => {
    const key = buildGroupKey(item.time, item.title)
    const existing = map.get(key)
    if (existing) {
      existing.images.push(item)
      return
    }
    map.set(key, {
      key,
      time: item.time,
      title: item.title,
      images: [item]
    })
  })

  return Array.from(map.values())
}

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

export default function SidePanel() {
  const [presetKey, setPresetKey] = useState(DEFAULT_PRESET.key)
  const [imageSelector, setImageSelector] = useState(
    DEFAULT_PRESET.imageSelector
  )
  const [titleSelector, setTitleSelector] = useState(
    DEFAULT_PRESET.titleSelector
  )
  const [timeSelector, setTimeSelector] = useState(DEFAULT_PRESET.timeSelector)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState<MatchedImage[]>([])
  const [selectedSrcs, setSelectedSrcs] = useState<string[]>([])

  const groups = useMemo(() => groupImagesByTimeTitle(images), [images])

  const applyPreset = useCallback((key: string) => {
    const preset = SITE_PRESETS.find((item) => item.key === key)
    if (!preset) return
    setPresetKey(preset.key)
    setImageSelector(preset.imageSelector)
    setTitleSelector(preset.titleSelector)
    setTimeSelector(preset.timeSelector)
  }, [])

  const handleToggleImage = useCallback((src: string, checked: boolean) => {
    setSelectedSrcs((prev) => {
      if (checked) {
        return prev.includes(src) ? prev : [...prev, src]
      }
      return prev.filter((item) => item !== src)
    })
  }, [])

  const handleClearAll = useCallback(() => {
    if (images.length === 0) {
      message.warning("暂无图片可清空")
      return
    }

    const count = images.length
    setImages([])
    setSelectedSrcs([])
    message.success(`已清空 ${count} 张图片`)
  }, [images.length])

  const handleRenameGroup = useCallback((group: ImageGroup, nextKey: string) => {
    const trimmed = nextKey.trim()
    if (!trimmed || trimmed === group.key) return

    const { time, title } = parseEditedGroupKey(trimmed, group.time)
    const nextGroupKey = buildGroupKey(time, title)
    if (nextGroupKey === group.key) return

    setImages((prev) =>
      prev.map((item) => {
        if (buildGroupKey(item.time, item.title) !== group.key) return item
        return { ...item, time, title }
      })
    )
  }, [])

  const handleSaveImages = useCallback(async () => {
    const selectedItems = groups.flatMap((group) =>
      group.images
        .map((item, imageIndex) => {
          const displayIndex = imageIndex + 1
          const label = buildImageLabel(item.time, item.title, displayIndex)
          return {
            src: item.src,
            label,
            selected: selectedSrcs.includes(item.src)
          }
        })
        .filter((item) => item.selected)
    )

    if (selectedItems.length === 0) {
      message.warning("请先勾选要保存的图片")
      return
    }

    setSaving(true)
    try {
      await saveImagesToDirectory(
        selectedItems.map((item) => ({
          url: item.src,
          filename: buildSaveFilename(item.label, item.src)
        }))
      )
      message.success(`已保存 ${selectedItems.length} 张图片`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg !== "已取消选择文件夹") {
        message.error(`保存失败：${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }, [groups, selectedSrcs])

  const handleFetchImages = useCallback(async () => {
    const trimmedImage = imageSelector.trim()
    if (!trimmedImage) {
      message.warning("请输入 image class")
      return
    }

    setLoading(true)

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab?.id) {
        message.error("未找到当前标签页")
        return
      }

      if (!isInjectableUrl(tab.url)) {
        message.error("当前页面无法查询（浏览器内置页或扩展页）")
        return
      }

      const request: QueryPageMediaRequest = {
        action: "QUERY_PAGE_MEDIA",
        presetKey,
        imageSelector: trimmedImage,
        titleSelector: titleSelector.trim(),
        timeSelector: timeSelector.trim()
      }

      let pageResult: PageMediaResult
      try {
        const response = (await chrome.tabs.sendMessage(
          tab.id,
          request
        )) as MessageResponse
        if (!response?.success || !response.data) {
          throw new Error(response?.error || "页面未返回数据")
        }
        pageResult = response.data
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        if (
          msg.includes("Could not establish connection") ||
          msg.includes("Receiving end does not exist")
        ) {
          throw new Error("页面脚本未就绪，请刷新目标页面后重试")
        }
        throw error
      }

      const { srcs, titles, times } = pageResult
      const title = titles[0] || ""
      const time = parseRelativeTimeToYmd(times[0] || "")
      const groupKey = buildGroupKey(time, title)

      setImages((prevImages) => {
        const removedSrcSet = new Set(
          prevImages
            .filter((item) => buildGroupKey(item.time, item.title) === groupKey)
            .map((item) => item.src)
        )
        const keptImages = prevImages.filter(
          (item) => buildGroupKey(item.time, item.title) !== groupKey
        )
        const fetchedImages = srcs.map((src, index) => ({
          index,
          src,
          title,
          time
        }))

        setSelectedSrcs((prevSelected) =>
          Array.from(
            new Set([
              ...prevSelected.filter((src) => !removedSrcSet.has(src)),
              ...srcs
            ])
          )
        )

        return [...fetchedImages, ...keptImages].map((item, index) => ({
          ...item,
          index
        }))
      })

      message.success(
        `已更新分组「${groupKey}」：${srcs.length} 张图片`
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      message.error(`获取失败：${msg}`)
    } finally {
      setLoading(false)
    }
  }, [presetKey, imageSelector, titleSelector, timeSelector])

  return (
    <div className="sidepanel-root">
      <div className="sidepanel-sticky">
        <Typography.Title level={5} style={{ margin: 0 }}>
          Douyin Image Download
        </Typography.Title>

        <Radio.Group
          value={presetKey}
          onChange={(e) => applyPreset(e.target.value)}
          options={SITE_PRESETS.map((item) => ({
            label: item.label,
            value: item.key
          }))}
        />

        <div className="selector-row">
          <Input
            value={imageSelector}
            onChange={(e) => setImageSelector(e.target.value)}
            placeholder={DEFAULT_PRESET.imageSelector}
            addonBefore="image class"
            allowClear
          />

          <Input
            value={titleSelector}
            onChange={(e) => setTitleSelector(e.target.value)}
            placeholder={DEFAULT_PRESET.titleSelector}
            addonBefore="title class"
            allowClear
          />

          <Input
            value={timeSelector}
            onChange={(e) => setTimeSelector(e.target.value)}
            placeholder={DEFAULT_PRESET.timeSelector}
            addonBefore="time class"
            allowClear
          />
        </div>

        <div className="action-row">
          <Button
            type="primary"
            loading={loading}
            onClick={() => void handleFetchImages()}>
            获取图片
          </Button>
          <Button
            disabled={images.length === 0}
            onClick={handleClearAll}>
            清空
          </Button>
          <Button
            loading={saving}
            disabled={selectedSrcs.length === 0}
            onClick={() => void handleSaveImages()}>
            保存
          </Button>
        </div>
      </div>

      <div className="stats-row">
        <Typography.Text type="secondary">
          图片组 {groups.length}
        </Typography.Text>
        <Typography.Text type="secondary">
          已选择 {selectedSrcs.length}
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无图片"
            style={{ margin: "16px 0" }}
          />
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <Card
                key={group.key}
                size="small"
                title={
                  <Typography.Text
                    editable={{
                      triggerType: ["icon", "text"],
                      onChange: (value) => handleRenameGroup(group, value)
                    }}>
                    {group.key}
                  </Typography.Text>
                }
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {group.images.length} 张
                  </Typography.Text>
                }>
                <Image.PreviewGroup>
                  <div className="image-grid">
                    {group.images.map((item, imageIndex) => {
                      const displayIndex = imageIndex + 1
                      const label = buildImageLabel(
                        item.time,
                        item.title,
                        displayIndex
                      )
                      return (
                        <div
                          className="image-card"
                          key={`${item.index}-${item.src}`}
                          onClick={() =>
                            handleToggleImage(
                              item.src,
                              !selectedSrcs.includes(item.src)
                            )
                          }>
                          <div className="image-card-top">
                            <Checkbox
                              className="image-check"
                              checked={selectedSrcs.includes(item.src)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                handleToggleImage(item.src, e.target.checked)
                              }
                            />
                          </div>
                          <div className="image-thumb">
                            <Image
                              src={item.src}
                              alt={item.title || `image-${displayIndex}`}
                              referrerPolicy="no-referrer"
                              preview={{ mask: "预览" }}
                              style={{
                                width: "100%",
                                height: "auto",
                                display: "block",
                                objectFit: "cover",
                                background: "rgba(0,0,0,0.04)",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                            />
                          </div>
                          <Typography.Text className="image-label">
                            {label}
                          </Typography.Text>
                        </div>
                      )
                    })}
                  </div>
                </Image.PreviewGroup>
              </Card>
            ))}
          </div>
        )}
      </Spin>
    </div>
  )
}
