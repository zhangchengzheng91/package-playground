/**
 * 在页面指定容器中挂载 React 内容（content script 内使用）
 */

import { useEffect, useMemo, useRef, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"

import { matchesHostname, matchesPagePath } from "./path-utils"

export type ContentInjectorProps = {
  /** 仅在该应用路径下插入；不传则任意页面均尝试插入 */
  pagePath?: string
  /** 仅在该 hostname 下插入；支持字符串或数组；不传则不做域名限制 */
  hostname?: string | string[]
  /** 插入到的容器，CSS 选择器；`body` 表示 document.body */
  containerSelector?: string
  /** 插入的 React 内容 */
  children?: ReactNode
}

/** 与 ContentInjector 的 props 一致，用于配置表/数组项 */
export type ContentInjectorConfig = ContentInjectorProps

const DEFAULT_CHILDREN: ReactNode = "hello world"

function resolveContainer(selector: string): HTMLElement | null {
  if (selector === "body") {
    return document.body
  }
  return document.querySelector<HTMLElement>(selector)
}

function setupRouteListeners(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange)
  window.addEventListener("popstate", onChange)

  const originals = {
    pushState: history.pushState.bind(history),
    replaceState: history.replaceState.bind(history)
  }

  history.pushState = function (
    this: History,
    ...args: Parameters<History["pushState"]>
  ) {
    const ret = originals.pushState(...args)
    queueMicrotask(onChange)
    return ret
  } as History["pushState"]

  history.replaceState = function (
    this: History,
    ...args: Parameters<History["replaceState"]>
  ) {
    const ret = originals.replaceState(...args)
    queueMicrotask(onChange)
    return ret
  } as History["replaceState"]

  return () => {
    window.removeEventListener("hashchange", onChange)
    window.removeEventListener("popstate", onChange)
    history.pushState = originals.pushState
    history.replaceState = originals.replaceState
  }
}

/** 轻量轮询：仅用于容器晚于路由出现等场景（不再使用整页 MutationObserver，避免与列表/表格更新共振导致闪动） */
function startRoutePoll(onChange: () => void, durationMs: number, intervalMs: number): () => void {
  const start = Date.now()
  const id = window.setInterval(() => {
    onChange()
    if (Date.now() - start >= durationMs) {
      window.clearInterval(id)
    }
  }, intervalMs)
  return () => window.clearInterval(id)
}

export function ContentInjector({
  pagePath,
  hostname,
  containerSelector = "body",
  children = DEFAULT_CHILDREN
}: ContentInjectorProps) {
  const rootRef = useRef<Root | null>(null)
  const hostElRef = useRef<HTMLDivElement | null>(null)
  /** 当前 React root 所挂载的宿主节点，用于避免对同一节点重复 render 导致闪烁 */
  const lastMountedHostRef = useRef<HTMLDivElement | null>(null)
  const mountIdRef = useRef(
    `plasmo-react-inject-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)}`
  )

  const placement = useMemo(
    () => (containerSelector === "body" ? "append" : "prepend"),
    [containerSelector]
  )

  useEffect(() => {
    const mountId = mountIdRef.current

    function cleanupInjection(): void {
      rootRef.current?.unmount()
      rootRef.current = null
      hostElRef.current?.remove()
      hostElRef.current = null
      lastMountedHostRef.current = null
    }

    function attachHost(container: HTMLElement, host: HTMLDivElement): void {
      if (placement === "prepend") {
        container.prepend(host)
      } else {
        container.appendChild(host)
      }
    }

    /**
     * 仅在「新建宿主 / 宿主父节点不对」时插入容器。
     * 不再在每次 sync 里强行 prepend 到第一位：否则会与 Vue 更新子节点顺序反复争抢，表现为上下闪动。
     */
    function ensureHostInContainer(container: HTMLElement): HTMLDivElement {
      let host = document.getElementById(mountId) as HTMLDivElement | null
      if (!host) {
        host = document.createElement("div")
        host.id = mountId
        attachHost(container, host)
      } else if (host.parentElement !== container) {
        host.remove()
        attachHost(container, host)
      }
      hostElRef.current = host
      return host
    }

    function sync(): void {
      if (!document.body) {
        return
      }
      if (!matchesHostname(hostname)) {
        cleanupInjection()
        return
      }
      if (!matchesPagePath(pagePath)) {
        cleanupInjection()
        return
      }

      const container = resolveContainer(containerSelector)
      if (!container) {
        return
      }

      const existing = document.getElementById(mountId) as HTMLDivElement | null
      if (
        existing &&
        existing.isConnected &&
        existing.parentElement === container &&
        rootRef.current &&
        lastMountedHostRef.current === existing
      ) {
        return
      }

      if (existing && !existing.isConnected) {
        cleanupInjection()
      }

      const host = ensureHostInContainer(container)

      if (
        rootRef.current &&
        lastMountedHostRef.current === host &&
        host.isConnected
      ) {
        return
      }

      if (rootRef.current) {
        rootRef.current.unmount()
        rootRef.current = null
      }

      rootRef.current = createRoot(host)
      rootRef.current.render(<>{children}</>)
      lastMountedHostRef.current = host
    }

    const go = () => sync()

    if (document.body) {
      go()
    } else {
      document.addEventListener("DOMContentLoaded", go, { once: true })
    }

    window.addEventListener("load", go, { once: true })
    const unlistenRoute = setupRouteListeners(go)
    const stopPoll = startRoutePoll(go, 30_000, 800)

    return () => {
      document.removeEventListener("DOMContentLoaded", go)
      window.removeEventListener("load", go)
      unlistenRoute()
      stopPoll()
      cleanupInjection()
    }
  }, [pagePath, hostname, containerSelector, children, placement])

  return null
}
