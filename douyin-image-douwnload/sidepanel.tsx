/**
 * Side Panel：按 class 选择器获取当前页面图片
 */

import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  hasSiteVideoRule,
  type PageMediaResult
} from "~utils/query-page-media"
import { parseRelativeTimeToYmd } from "~utils/relative-time"
import { buildDouyinVideoFilename } from "~utils/douyin"
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
  /** 抖音获取时页面地址上的 modal_id */
  vid?: string
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

function appendVid(text: string, vid?: string): string {
  const id = vid?.trim()
  if (!id || text.endsWith(`_${id}`)) return text
  return `${text}_${id}`
}

function groupVid(group: ImageGroup): string {
  return group.images.find((item) => item.vid)?.vid || ""
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

function collectSelected(groups: ImageGroup[], selectedSrcs: string[]) {
  return groups.flatMap((group) =>
    group.images
      .map((item, imageIndex) => ({
        src: item.src,
        label: buildImageLabel(item.time, item.title, imageIndex + 1),
        vid: item.vid || "",
        selected: selectedSrcs.includes(item.src)
      }))
      .filter((item) => item.selected)
  )
}

async function requestPageMedia(
  request: QueryPageMediaRequest
): Promise<PageMediaResult> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })

  if (!tab?.id) {
    throw new Error("未找到当前标签页")
  }

  if (!isInjectableUrl(tab.url)) {
    throw new Error("当前页面无法查询（浏览器内置页或扩展页）")
  }

  try {
    const response = (await chrome.tabs.sendMessage(
      tab.id,
      request
    )) as MessageResponse
    if (!response?.success || !response.data) {
      throw new Error(response?.error || "页面未返回数据")
    }
    return response.data
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
  const [imageLoading, setImageLoading] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [savingImages, setSavingImages] = useState(false)
  const [savingVideos, setSavingVideos] = useState(false)
  const [images, setImages] = useState<MatchedImage[]>([])
  const [selectedSrcs, setSelectedSrcs] = useState<string[]>([])
  const [videos, setVideos] = useState<MatchedImage[]>([])
  const [selectedVideoSrcs, setSelectedVideoSrcs] = useState<string[]>([])
  const [sourceIndex, setSourceIndex] = useState("1")
  const [sourceTotal, setSourceTotal] = useState<number | null>(null)

  const groups = useMemo(() => groupImagesByTimeTitle(images), [images])
  const videoGroups = useMemo(() => groupImagesByTimeTitle(videos), [videos])
  const canFetchVideos = hasSiteVideoRule(presetKey)

  useEffect(() => {
    if (presetKey !== "douyin") {
      setSourceTotal(null)
      return
    }

    let cancelled = false

    const refreshSourceTotal = async () => {
      try {
        const pageResult = await requestPageMedia({
          action: "QUERY_PAGE_MEDIA",
          presetKey: "douyin",
          imageSelector: ".",
          titleSelector: "",
          timeSelector: "",
          mediaKind: "source-count"
        })
        if (!cancelled) setSourceTotal(pageResult.sourceCount ?? 0)
      } catch {
        if (!cancelled) setSourceTotal(0)
      }
    }

    void refreshSourceTotal()
    const timer = window.setInterval(() => {
      void refreshSourceTotal()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [presetKey])

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

  const handleToggleVideo = useCallback((src: string, checked: boolean) => {
    setSelectedVideoSrcs((prev) => {
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

  const handleClearVideos = useCallback(() => {
    if (videos.length === 0) {
      message.warning("暂无视频可清空")
      return
    }

    const count = videos.length
    setVideos([])
    setSelectedVideoSrcs([])
    message.success(`已清空 ${count} 个视频`)
  }, [videos.length])

  const handleSelectAll = useCallback(() => {
    setSelectedSrcs(Array.from(new Set(images.map((item) => item.src))))
  }, [images])

  const handleDeselectAll = useCallback(() => {
    setSelectedSrcs([])
  }, [])

  const handleSelectAllVideos = useCallback(() => {
    setSelectedVideoSrcs(Array.from(new Set(videos.map((item) => item.src))))
  }, [videos])

  const handleDeselectAllVideos = useCallback(() => {
    setSelectedVideoSrcs([])
  }, [])

  const handleRenameGroup = useCallback(
    (
      group: ImageGroup,
      nextKey: string,
      setItems: typeof setImages
    ) => {
      const trimmed = nextKey.trim()
      if (!trimmed || trimmed === group.key) return

      const { time, title } = parseEditedGroupKey(trimmed, group.time)
      const nextGroupKey = buildGroupKey(time, title)
      if (nextGroupKey === group.key) return

      setItems((prev) =>
        prev.map((item) => {
          if (buildGroupKey(item.time, item.title) !== group.key) return item
          return { ...item, time, title }
        })
      )
    },
    []
  )

  const handleSaveImages = useCallback(async () => {
    const selectedImages = collectSelected(groups, selectedSrcs)

    if (selectedImages.length === 0) {
      message.warning("请先勾选要保存的图片")
      return
    }

    setSavingImages(true)
    try {
      await saveImagesToDirectory(
        selectedImages.map((item) => ({
          url: item.src,
          filename: buildSaveFilename(item.label, item.src)
        }))
      )
      message.success(`已保存 ${selectedImages.length} 张图片`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg !== "已取消选择文件夹") {
        message.error(`保存失败：${msg}`)
      }
    } finally {
      setSavingImages(false)
    }
  }, [groups, selectedSrcs])

  const handleSaveVideos = useCallback(async () => {
    const selectedVideos = collectSelected(videoGroups, selectedVideoSrcs)

    if (selectedVideos.length === 0) {
      message.warning("请先勾选要保存的视频")
      return
    }

    setSavingVideos(true)
    try {
      await saveImagesToDirectory(
        selectedVideos.map((item) => ({
          url: item.src,
          filename:
            presetKey === "douyin"
              ? buildDouyinVideoFilename(item.label, item.src, item.vid)
              : buildSaveFilename(item.label, item.src)
        }))
      )
      message.success(`已保存 ${selectedVideos.length} 个视频`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg !== "已取消选择文件夹") {
        message.error(`保存失败：${msg}`)
      }
    } finally {
      setSavingVideos(false)
    }
  }, [presetKey, videoGroups, selectedVideoSrcs])

  const handleFetchImages = useCallback(async () => {
    const trimmedImage = imageSelector.trim()
    if (!trimmedImage) {
      message.warning("请输入 image class")
      return
    }

    setImageLoading(true)

    try {
      const pageResult = await requestPageMedia({
        action: "QUERY_PAGE_MEDIA",
        presetKey,
        imageSelector: trimmedImage,
        titleSelector: titleSelector.trim(),
        timeSelector: timeSelector.trim(),
        mediaKind: "image"
      })

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
      setImageLoading(false)
    }
  }, [presetKey, imageSelector, titleSelector, timeSelector])

  const handleFetchVideos = useCallback(async () => {
    if (!canFetchVideos) return

    const trimmedImage = imageSelector.trim()
    if (!trimmedImage) {
      message.warning("请输入 image class")
      return
    }

    let parsedSourceIndex: number | undefined
    if (presetKey === "douyin") {
      parsedSourceIndex = Number(sourceIndex.trim())
      if (!Number.isInteger(parsedSourceIndex) || parsedSourceIndex < 0) {
        message.warning("请输入从 0 开始的 source 索引")
        return
      }
    }

    setVideoLoading(true)

    try {
      const pageResult = await requestPageMedia({
        action: "QUERY_PAGE_MEDIA",
        presetKey,
        imageSelector: trimmedImage,
        titleSelector: titleSelector.trim(),
        timeSelector: timeSelector.trim(),
        mediaKind: "video",
        sourceIndex: parsedSourceIndex
      })

      const { srcs, titles, times } = pageResult
      const title = titles[0] || ""
      const time = parseRelativeTimeToYmd(times[0] || "")
      const groupKey = buildGroupKey(time, title)

      if (presetKey === "douyin") {
        console.log("抖音拦截原始数据", pageResult.intercepted ?? [])
        if (pageResult.sourceCount != null) setSourceTotal(pageResult.sourceCount)
      }

      setVideos((prevVideos) => {
        const removedSrcSet = new Set(
          prevVideos
            .filter((item) => buildGroupKey(item.time, item.title) === groupKey)
            .map((item) => item.src)
        )
        const keptVideos = prevVideos.filter(
          (item) => buildGroupKey(item.time, item.title) !== groupKey
        )
        const vid = presetKey === "douyin" ? pageResult.vid || "" : ""
        const fetchedVideos = srcs.map((src, index) => ({
          index,
          src,
          title,
          time,
          vid
        }))

        setSelectedVideoSrcs((prevSelected) =>
          Array.from(
            new Set([
              ...prevSelected.filter((src) => !removedSrcSet.has(src)),
              ...srcs
            ])
          )
        )

        return [...fetchedVideos, ...keptVideos].map((item, index) => ({
          ...item,
          index
        }))
      })

      message.success(`已更新分组「${groupKey}」：${srcs.length} 个视频`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      message.error(`获取失败：${msg}`)
    } finally {
      setVideoLoading(false)
    }
  }, [
    canFetchVideos,
    presetKey,
    imageSelector,
    titleSelector,
    timeSelector,
    sourceIndex
  ])

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

        <div className="action-rows">
          <div className="action-row">
            <Button
              type="primary"
              loading={imageLoading}
              onClick={() => void handleFetchImages()}>
              获取图片
            </Button>
            <Button
              disabled={images.length === 0}
              onClick={handleClearAll}>
              清空图片
            </Button>
            <Button
              disabled={images.length === 0}
              onClick={handleSelectAll}>
              全选
            </Button>
            <Button
              disabled={selectedSrcs.length === 0}
              onClick={handleDeselectAll}>
              全不选
            </Button>
            <Button
              loading={savingImages}
              disabled={selectedSrcs.length === 0}
              onClick={() => void handleSaveImages()}>
              保存图片
            </Button>
          </div>
          <div className="action-row">
            {presetKey === "douyin" ? (
              <span className="source-index-input">
                <Input
                  value={sourceIndex}
                  onChange={(e) => setSourceIndex(e.target.value)}
                  onPressEnter={() => {
                    if (!canFetchVideos || videoLoading) return
                    void handleFetchVideos()
                  }}
                  addonBefore={`source 索引 (${sourceTotal ?? 0})`}
                  placeholder="1"
                />
              </span>
            ) : null}
            <span
              className="video-fetch-wrap"
              title={
                canFetchVideos ? undefined : "当前站点未提供视频匹配规则"
              }>
              <Button
                type="primary"
                loading={videoLoading}
                disabled={!canFetchVideos}
                onClick={() => void handleFetchVideos()}>
                获取视频
              </Button>
            </span>
            <Button
              disabled={videos.length === 0}
              onClick={handleClearVideos}>
              清空视频
            </Button>
            <Button
              disabled={videos.length === 0}
              onClick={handleSelectAllVideos}>
              全选
            </Button>
            <Button
              disabled={selectedVideoSrcs.length === 0}
              onClick={handleDeselectAllVideos}>
              全不选
            </Button>
            <Button
              loading={savingVideos}
              disabled={selectedVideoSrcs.length === 0}
              onClick={() => void handleSaveVideos()}>
              保存视频
            </Button>
          </div>
        </div>
      </div>

      <div className="media-section">
        <div className="stats-row">
          <Typography.Text strong>图片</Typography.Text>
          <Typography.Text type="secondary">
            图片组 {groups.length}
          </Typography.Text>
          <Typography.Text type="secondary">
            已选择 {selectedSrcs.length}
          </Typography.Text>
        </div>

      <Spin spinning={imageLoading}>
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
                      onChange: (value) =>
                        handleRenameGroup(group, value, setImages)
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

      <div className="media-section">
        <div className="stats-row">
          <Typography.Text strong>视频</Typography.Text>
          <Typography.Text type="secondary">
            视频组 {videoGroups.length}
          </Typography.Text>
          <Typography.Text type="secondary">
            已选择 {selectedVideoSrcs.length}
          </Typography.Text>
        </div>

        <Spin spinning={videoLoading}>
          {videoGroups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                canFetchVideos ? "暂无视频" : "当前站点未提供视频匹配规则"
              }
              style={{ margin: "16px 0" }}
            />
          ) : (
            <div className="group-list">
              {videoGroups.map((group) => (
                <Card
                  key={group.key}
                  size="small"
                  title={
                    <Typography.Text
                      editable={{
                        triggerType: ["icon", "text"],
                        onChange: (value) => {
                          const vid = groupVid(group)
                          const nextKey =
                            vid && value.endsWith(`_${vid}`)
                              ? value.slice(0, -(`_${vid}`).length)
                              : value
                          handleRenameGroup(group, nextKey, setVideos)
                        }
                      }}>
                      {appendVid(group.key, groupVid(group))}
                    </Typography.Text>
                  }
                  extra={
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {group.images.length} 个
                    </Typography.Text>
                  }>
                  <div className="video-grid">
                    {group.images.map((item, videoIndex) => {
                      const displayIndex = videoIndex + 1
                      const label = buildImageLabel(
                        item.time,
                        item.title,
                        displayIndex
                      )
                      return (
                        <div
                          className="video-card"
                          key={`${item.index}-${item.src}`}
                          onClick={() =>
                            handleToggleVideo(
                              item.src,
                              !selectedVideoSrcs.includes(item.src)
                            )
                          }>
                          <div className="image-card-top">
                            <Checkbox
                              className="image-check"
                              checked={selectedVideoSrcs.includes(item.src)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                handleToggleVideo(item.src, e.target.checked)
                              }
                            />
                          </div>
                          <div className="video-thumb">
                            <video
                              src={item.src}
                              controls
                              preload="metadata"
                              loop
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <Typography.Text className="image-label">
                            {appendVid(label, item.vid)}
                          </Typography.Text>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Spin>
      </div>
    </div>
  )
}
