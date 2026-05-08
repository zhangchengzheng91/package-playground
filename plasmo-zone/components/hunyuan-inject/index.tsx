import { App, Drawer, Empty, Tag } from "antd"
import { useCallback, useEffect, useRef, useState } from "react"

import { useInjectDrawerToggleHotkey } from "~hooks/use-inject-drawer-toggle-hotkey"
import {
  getElementsBySelector,
  scrollToAndHighlight,
  type HighlightRecord
} from "~utils/ai-chat"

/**
 * Hunyuan 用户对话气泡的 CSS 选择器。
 * 页面上元素的完整 class 为：
 *   `agent-chat__bubble agent-chat__bubble--human agent-chat__conv--human`
 * 仅需匹配 modifier class 即可唯一定位。
 */
const HUMAN_BUBBLE_SELECTOR = ".agent-chat__bubble--human"

const MIN_WIDTH = 240
const MAX_WIDTH = 960
const DEFAULT_WIDTH = 360

// antd 预设颜色，按顺序循环分配给每个 Tag
const TAG_COLORS = [
  "magenta",
  "red",
  "volcano",
  "orange",
  "gold",
  "lime",
  "green",
  "cyan",
  "blue",
  "geekblue",
  "purple"
]

function HunyuanInjectInner() {
  const [drawerOpen, setDrawerOpen] = useInjectDrawerToggleHotkey()
  const [size, setSize] = useState<number>(DEFAULT_WIDTH)
  const [items, setItems] = useState<HTMLElement[]>([])
  // 记录上次高亮的元素及其原始背景色，以便切换时还原
  const lastHighlightRef = useRef<HighlightRecord | null>(null)

  // antd 6 Drawer 原生支持 resizable，使用 onResize 回调钳制最小宽度
  const handleResize = useCallback((next: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next))
    setSize(clamped)
  }, [])

  // 抽屉每次打开时拉取当前页用户气泡列表
  const refresh = useCallback(() => {
    setItems(getElementsBySelector(HUMAN_BUBBLE_SELECTOR))
  }, [])

  useEffect(() => {
    if (drawerOpen) {
      refresh()
    }
  }, [drawerOpen, refresh])

  // 点击 Tag 时，将对应元素滚动到顶部，并带上高亮背景（通用逻辑见 utils/ai-chat）
  const handleScrollTo = useCallback((el: HTMLElement) => {
    scrollToAndHighlight(el, lastHighlightRef)
  }, [])

  return (
    <Drawer
      title={`Hunyuan 注入面板（${items.length}）`}
      placement="right"
      size={size}
      maxSize={MAX_WIDTH}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      mask={false}
      closable
      keyboard={false}
      getContainer={false}
      resizable={{ onResize: handleResize }}
      extra={
        <a onClick={refresh} style={{ fontSize: 12 }}>
          刷新
        </a>
      }>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        {items.length === 0 ? (
          <Empty description={`${HUMAN_BUBBLE_SELECTOR} 未找到元素`} />
        ) : (
          <ol style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            {items.map((el, idx) => (
              <li key={idx} style={{ marginBottom: 8 }}>
                <Tag
                  color={TAG_COLORS[idx % TAG_COLORS.length]}
                  style={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    cursor: "pointer"
                  }}
                  onClick={() => handleScrollTo(el)}>
                  {el.textContent?.trim()}
                </Tag>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Drawer>
  )
}

export function HunyuanInject() {
  return (
    <App>
      <HunyuanInjectInner />
    </App>
  )
}
