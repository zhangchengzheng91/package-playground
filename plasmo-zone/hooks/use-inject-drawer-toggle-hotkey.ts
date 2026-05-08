import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction
} from "react"

/** 与 manifest commands 对齐：win/linux `Alt+Shift+P`，mac `Command+Shift+P` */
const MAC_UA = /Mac|iPhone|iPad|iPod/i

function isInjectDrawerToggleHotkey(e: KeyboardEvent): boolean {
  if (e.repeat || e.code !== "KeyP" || !e.shiftKey) {
    return false
  }
  const mac =
    typeof navigator !== "undefined" && MAC_UA.test(navigator.userAgent)
  if (mac) {
    return e.metaKey && !e.altKey && !e.ctrlKey
  }
  return e.altKey && !e.metaKey && !e.ctrlKey
}

function hotkeyShouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true
  }
  return target.isContentEditable
}

/**
 * 注入面板 Drawer 开关节点快捷键（capture 阶段，避免与页面默认行为冲突时可优先拦截）。
 * 默认关闭；打开后由各注入面板的 effect 拉取列表数据。
 */
export function useInjectDrawerToggleHotkey(
  initialOpen = false
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isInjectDrawerToggleHotkey(e)) {
        return
      }
      if (hotkeyShouldIgnoreTarget(e.target)) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      setOpen((v) => !v)
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [])

  return [open, setOpen]
}
