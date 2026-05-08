import { App, Drawer, Empty, Tag } from "antd"
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"

import { useInjectDrawerToggleHotkey } from "~hooks/use-inject-drawer-toggle-hotkey"
import {
  getInnermostElementsBySelector,
  getOutermostElementsBySelector
} from "~utils/ai-chat"

const MESSAGE_BOX_SELECTOR = '[data-target-id="message-box-target-id"]'
/** 用户侧操作条；助手侧为 `receive-message-action-bar`，同盒内不会并存。 */
const SEND_MESSAGE_ACTION_BAR_SELECTOR =
  '[data-foundation-type="send-message-action-bar"]'

/**
 * Doubao 用户对话气泡的 CSS 选择器：
 * 仅在「用户发送」消息盒内匹配带 `justify-end` 的行，排除助手长文等（同盒含
 * `receive-message-action-bar`，且常为 `flow-markdown-body`，无 send 条）。
 * 消息行内部也会有多层 `justify-end`，须配合 `getOutermostElementsBySelector`。
 */
const HUMAN_BUBBLE_SELECTOR = `${MESSAGE_BOX_SELECTOR}:has(${SEND_MESSAGE_ACTION_BAR_SELECTOR}) .justify-end`

/**
 * 豆包消息行（`v_list_row`）内消息体插件类型二选一，不会同时出现：
 * 引用气泡 vs 纯文本气泡。以下 id 用于单次匹配后的分支。
 */
const PLUGIN_ID_REFERENCE = "custom_type:reference_text_node"
const PLUGIN_ID_BLOCK_TEXT = "block_type:10000"

const REFERENCE_NODE_SELECTOR = `[data-plugin-identifier="${PLUGIN_ID_REFERENCE}"]`
const BLOCK_TEXT_NODE_SELECTOR = `[data-plugin-identifier="${PLUGIN_ID_BLOCK_TEXT}"]`
/**
 * 逗号选择器取文档序第一个命中；互斥前提下即为该行唯一插件根节点。
 */
const PLUGIN_ROOT_SELECTOR = `${REFERENCE_NODE_SELECTOR}, ${BLOCK_TEXT_NODE_SELECTOR}`
/**
 * 与页面 XPath 一致：正文落在带 `whitespace-pre-wrap` 的节点上。
 * 使用属性子串匹配以兼容类名前后拼接。
 */
const WHITESPACE_PRE_WRAP_SELECTOR = '[class*="whitespace-pre-wrap"]'
/**
 * 兑底：结构变更时仍尝试仅取「最内层」气泡色文本节点，避免引用壳层拼进 Tag。
 */
const BUBBLE_TEXT_SELECTOR = '[class*="text-g-send-msg-bubble-text"]'

/**
 * 返回 Tag 上应显示的文本：
 * 先 `PLUGIN_ROOT_SELECTOR` 一次命中插件根（一行仅一种），再按 `data-plugin-identifier` 分支。
 * - 引用气泡：根下多个 pre-wrap 时取最后一个非空（正文在引用块之后）。
 * - 纯文本气泡：优先直接子级 pre-wrap，否则任一下层 pre-wrap。
 * - 未命中插件根：整行 textContent；引用分支未命中 pre-wrap 时回退最内层 bubble-text。
 */
function getBubbleText(el: HTMLElement): string {
  const fullText = el.textContent?.trim() ?? ""
  const pluginRoot = el.querySelector<HTMLElement>(PLUGIN_ROOT_SELECTOR)
  if (!pluginRoot) {
    return fullText
  }

  const pluginId = pluginRoot.getAttribute("data-plugin-identifier")

  if (pluginId === PLUGIN_ID_REFERENCE) {
    const wraps = pluginRoot.querySelectorAll<HTMLElement>(
      WHITESPACE_PRE_WRAP_SELECTOR
    )
    const fromPreWrap = Array.from(wraps)
      .map((n) => n.textContent?.trim() ?? "")
      .filter((t) => t.length > 0)
    if (fromPreWrap.length > 0) {
      return fromPreWrap[fromPreWrap.length - 1]
    }
    const parts = getInnermostElementsBySelector(BUBBLE_TEXT_SELECTOR, el)
      .map((n) => n.textContent?.trim() ?? "")
      .filter((t) => t.length > 0)
    return parts.length > 0 ? parts.join(" ") : fullText
  }

  if (pluginId === PLUGIN_ID_BLOCK_TEXT) {
    const direct = pluginRoot.querySelector<HTMLElement>(
      `:scope > ${WHITESPACE_PRE_WRAP_SELECTOR}`
    )
    const directText = direct?.textContent?.trim() ?? ""
    if (directText.length > 0) {
      return directText
    }
    const nested = pluginRoot.querySelector<HTMLElement>(
      WHITESPACE_PRE_WRAP_SELECTOR
    )
    const nestedText = nested?.textContent?.trim() ?? ""
    if (nestedText.length > 0) {
      return nestedText
    }
  }

  return fullText
}

/** 与虚拟列表行节点对齐的 class（行带 `transform` / `data-observe-row`） */
const V_LIST_ROW_CLASS = "v_list_row"
const DOUBAO_HIGHLIGHT_BG = "yellowgreen"

interface DoubaoHighlightRecord {
  el: HTMLElement
  bg: string
}

/**
 * 扫描时记下稳定键；虚拟列表会卸载/复用节点，点击时必须按键重新 query，不能沿用旧 HTMLElement。
 */
interface DoubaoHumanBubbleKey {
  messageId: string | null
  observeRow: string | null
}

function resolveBubbleStableKey(el: HTMLElement): DoubaoHumanBubbleKey {
  return {
    messageId:
      el.closest("[data-message-id]")?.getAttribute("data-message-id") ?? null,
    observeRow:
      el
        .closest<HTMLElement>(`.${V_LIST_ROW_CLASS}`)
        ?.getAttribute("data-observe-row") ?? null
  }
}

function findLiveHumanBubble(key: DoubaoHumanBubbleKey): HTMLElement | null {
  const selectors: string[] = []
  if (key.messageId) {
    selectors.push(`[data-message-id="${CSS.escape(key.messageId)}"]`)
  }
  if (key.observeRow) {
    selectors.push(`[data-observe-row="${CSS.escape(key.observeRow)}"]`)
  }
  for (const sel of selectors) {
    const anchor = document.querySelector<HTMLElement>(sel)
    if (!anchor) continue
    const scope =
      anchor.closest<HTMLElement>(`.${V_LIST_ROW_CLASS}`) ??
      anchor.closest<HTMLElement>(MESSAGE_BOX_SELECTOR) ??
      document.documentElement
    const bubbles = getOutermostElementsBySelector(HUMAN_BUBBLE_SELECTOR, scope)
    const hit = bubbles.find(
      (b) => anchor.contains(b) || b.contains(anchor)
    )
    if (hit) return hit
  }
  return null
}

/**
 * 豆包对话区为虚拟列表：点击后须等对当前帧布局完成，再滚到「行」节点；
 * 高亮仍落在气泡匹配节点上，与列表刷新/Drawer 交互错开一圈 rAF，避免跳错位置。
 */
function scrollDoubaoHumanBubbleIntoView(
  bubbleMatchEl: HTMLElement,
  lastHighlightRef: MutableRefObject<DoubaoHighlightRecord | null>
): void {
  const scrollTarget =
    bubbleMatchEl.closest<HTMLElement>(`.${V_LIST_ROW_CLASS}`) ??
    bubbleMatchEl.closest<HTMLElement>(MESSAGE_BOX_SELECTOR) ??
    bubbleMatchEl

  const run = () => {
    if (!bubbleMatchEl.isConnected) {
      return
    }
    scrollTarget.scrollIntoView({
      behavior: "auto",
      block: "start",
      inline: "nearest"
    })

    const prev = lastHighlightRef.current
    if (prev && prev.el === bubbleMatchEl) {
      bubbleMatchEl.style.backgroundColor = DOUBAO_HIGHLIGHT_BG
      return
    }
    if (prev) {
      prev.el.style.backgroundColor = prev.bg
    }
    lastHighlightRef.current = {
      el: bubbleMatchEl,
      bg: bubbleMatchEl.style.backgroundColor
    }
    bubbleMatchEl.style.backgroundColor = DOUBAO_HIGHLIGHT_BG
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(run)
  })
}

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

interface DoubaoHumanRowItem {
  key: DoubaoHumanBubbleKey
  label: string
}

function DoubaoInjectInner() {
  const [drawerOpen, setDrawerOpen] = useInjectDrawerToggleHotkey()
  const [size, setSize] = useState<number>(DEFAULT_WIDTH)
  const [items, setItems] = useState<DoubaoHumanRowItem[]>([])
  // 记录上次高亮的元素及其原始背景色，以便切换时还原
  const lastHighlightRef = useRef<DoubaoHighlightRecord | null>(null)

  // antd 6 Drawer 原生支持 resizable，使用 onResize 回调钳制最小宽度
  const handleResize = useCallback((next: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next))
    setSize(clamped)
  }, [])

  // 抽屉每次打开时拉取当前页用户气泡列表（虚拟列表下需最新 DOM）
  const refresh = useCallback(() => {
    const rows: DoubaoHumanRowItem[] = []
    for (const el of getOutermostElementsBySelector(HUMAN_BUBBLE_SELECTOR)) {
      const stable = resolveBubbleStableKey(el)
      if (!stable.messageId && !stable.observeRow) continue
      rows.push({ key: stable, label: getBubbleText(el) })
    }
    setItems(rows)
  }, [])

  useEffect(() => {
    if (drawerOpen) {
      refresh()
    }
  }, [drawerOpen, refresh])

  const handleScrollTo = useCallback((rowKey: DoubaoHumanBubbleKey) => {
    const live = findLiveHumanBubble(rowKey)
    if (!live) {
      return
    }
    scrollDoubaoHumanBubbleIntoView(live, lastHighlightRef)
  }, [])

  return (
    <Drawer
      title={`Doubao 注入面板（${items.length}）`}
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
            {items.map((row, idx) => {
              const listKey = `${row.key.messageId ?? ""}|${row.key.observeRow ?? ""}|${idx}`
              return (
                <li key={listKey} style={{ marginBottom: 8 }}>
                  <Tag
                    color={TAG_COLORS[idx % TAG_COLORS.length]}
                    style={{
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      cursor: "pointer"
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleScrollTo(row.key)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleScrollTo(row.key)
                      }
                    }}>
                    {row.label}
                  </Tag>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </Drawer>
  )
}

export function DoubaoInject() {
  return (
    <App>
      <DoubaoInjectInner />
    </App>
  )
}
