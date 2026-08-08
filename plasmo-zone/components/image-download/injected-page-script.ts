/**
 * 注入到当前页面的逻辑（由 chrome.scripting.executeScript({ func, world: "MAIN" }) 执行）。
 * 须保持自包含，以便序列化到页面环境。
 *
 * 说明：
 * - 许多站点用 <canvas>（WebGL/Canvas2D）展示「图」，没有 <img>，只扫 img 会完全没有 checkbox。
 * - 使用 MAIN world，与页面共用 window，队列挂在 window 上供 executeScript 读取。
 * - Shadow DOM：向下遍历并监听各 shadowRoot。
 */

/** 与注入函数内字符串保持一致，供扩展页面读取 window 队列时引用 */
export const IMAGE_DOWNLOAD_QUEUE_KEY = "__YIXIANGHUA_IMAGE_DOWNLOAD_QUEUE__"

export function injectImageDownloadUi(): void {
  const MARK = "__YIXIANGHUA_IMAGE_DOWNLOAD_INJECTED__"
  const QUEUE_KEY = "__YIXIANGHUA_IMAGE_DOWNLOAD_QUEUE__"

  const w = window as unknown as Window & Record<string, unknown>
  if (w[MARK]) return
  w[MARK] = true

  const observedShadowRoots = new WeakSet<ShadowRoot>()

  function getQueue(): { id: string; url: string }[] {
    if (!w[QUEUE_KEY]) w[QUEUE_KEY] = []
    return w[QUEUE_KEY] as { id: string; url: string }[]
  }

  function getImageUrl(img: HTMLImageElement): string {
    try {
      if (img.currentSrc) return img.currentSrc
      if (img.src) return img.src
    } catch {
      /* ignore */
    }
    return ""
  }

  function isValidHttpUrl(url: string): boolean {
    if (!url) return false
    const t = url.trim()
    if (t.indexOf("data:") === 0 || t.indexOf("blob:") === 0) return false
    try {
      const u = new URL(t, document.baseURI)
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  }

  function canvasCanExport(canvas: HTMLCanvasElement): boolean {
    try {
      canvas.toDataURL("image/png")
      return true
    } catch {
      return false
    }
  }

  function addToQueue(itemId: string, url: string): void {
    const q = getQueue()
    if (!q.some((x) => x.id === itemId)) {
      q.push({ id: itemId, url })
    }
    console.log("[宜享花开发助手] 下载队列", q.length, q)
  }

  function removeFromQueue(itemId: string): void {
    const q = getQueue()
    for (let i = q.length - 1; i >= 0; i--) {
      if (q[i].id === itemId) q.splice(i, 1)
    }
    console.log("[宜享花开发助手] 下载队列", q.length, q)
  }

  function ensureImgCheckbox(img: HTMLImageElement): void {
    if (!img || img.nodeName !== "IMG") return
    if (img.closest("[data-yxh-img-wrap]")) return
    const parent = img.parentNode
    if (!parent) return

    const wrapId =
      "yxh_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36)

    const wrapper = document.createElement("span")
    wrapper.setAttribute("data-yxh-img-wrap", "1")
    wrapper.setAttribute("data-yxh-img-wrap-id", wrapId)
    wrapper.style.cssText =
      "position:relative;display:inline-block;vertical-align:baseline;max-width:100%;"

    parent.insertBefore(wrapper, img)
    wrapper.appendChild(img)

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.title = "加入下载队列"
    cb.style.cssText =
      "position:absolute;right:4px;top:4px;z-index:2147483646;width:18px;height:18px;cursor:pointer;margin:0;box-sizing:border-box;box-shadow:0 0 2px rgba(0,0,0,0.5);"

    function syncDisabled(): void {
      const u = getImageUrl(img)
      cb.disabled = !isValidHttpUrl(u)
    }

    syncDisabled()
    img.addEventListener("load", syncDisabled)

    cb.addEventListener("click", (e) => {
      e.stopPropagation()
    })

    cb.addEventListener("change", () => {
      const u = getImageUrl(img)
      if (!isValidHttpUrl(u)) return
      if (cb.checked) addToQueue(wrapId, u)
      else removeFromQueue(wrapId)
    })

    wrapper.appendChild(cb)
  }

  function ensureCanvasCheckbox(canvas: HTMLCanvasElement): void {
    if (!canvas || canvas.nodeName !== "CANVAS") return
    if (canvas.closest("[data-yxh-img-wrap]")) return
    const parent = canvas.parentNode
    if (!parent) return

    const wrapId =
      "yxh_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36)

    const wrapper = document.createElement("span")
    wrapper.setAttribute("data-yxh-img-wrap", "1")
    wrapper.setAttribute("data-yxh-canvas-wrap", "1")
    wrapper.setAttribute("data-yxh-img-wrap-id", wrapId)
    wrapper.style.cssText =
      "position:relative;display:inline-block;vertical-align:baseline;max-width:100%;"

    parent.insertBefore(wrapper, canvas)
    wrapper.appendChild(canvas)

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.title = "加入下载队列（导出为 PNG）"
    cb.style.cssText =
      "position:absolute;right:4px;top:4px;z-index:2147483646;width:18px;height:18px;cursor:pointer;margin:0;box-sizing:border-box;box-shadow:0 0 2px rgba(0,0,0,0.5);"

    function syncDisabled(): void {
      cb.disabled = !canvasCanExport(canvas)
      cb.title = cb.disabled ? "无法导出（画布跨域污染）" : "加入下载队列（导出为 PNG）"
    }

    syncDisabled()

    cb.addEventListener("click", (e) => {
      e.stopPropagation()
    })

    cb.addEventListener("change", () => {
      if (!canvasCanExport(canvas)) {
        cb.checked = false
        return
      }
      const dataUrl = canvas.toDataURL("image/png")
      if (cb.checked) addToQueue(wrapId, dataUrl)
      else removeFromQueue(wrapId)
    })

    wrapper.appendChild(cb)
  }

  function bindShadowTree(sr: ShadowRoot): void {
    if (observedShadowRoots.has(sr)) return
    observedShadowRoots.add(sr)
    domMo.observe(sr, { childList: true, subtree: true })
    attrMo.observe(sr, { attributes: true, attributeFilter: ["src", "srcset"], subtree: true })
    scanDeep(sr)
  }

  function scanDeep(root: ParentNode | null): void {
    if (!root) return
    const elRoot = root as Element & ParentNode
    if (!elRoot.querySelectorAll) return

    if (elRoot.nodeName === "IMG") {
      ensureImgCheckbox(elRoot as HTMLImageElement)
    }
    if (elRoot.nodeName === "CANVAS") {
      ensureCanvasCheckbox(elRoot as HTMLCanvasElement)
    }

    const imgs = elRoot.querySelectorAll("img")
    for (let i = 0; i < imgs.length; i++) {
      ensureImgCheckbox(imgs[i] as HTMLImageElement)
    }

    const canvases = elRoot.querySelectorAll("canvas")
    for (let i = 0; i < canvases.length; i++) {
      ensureCanvasCheckbox(canvases[i] as HTMLCanvasElement)
    }

    const all = elRoot.querySelectorAll("*")
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement & { shadowRoot?: ShadowRoot | null }
      if (el.shadowRoot) {
        bindShadowTree(el.shadowRoot)
      }
    }
  }

  function handleAddedNodes(list: NodeList): void {
    for (let n = 0; n < list.length; n++) {
      const node = list[n]
      if (node.nodeType !== 1) continue
      const el = node as HTMLElement & { shadowRoot?: ShadowRoot | null }
      if (el.nodeName === "IMG") {
        ensureImgCheckbox(el as HTMLImageElement)
      } else if (el.nodeName === "CANVAS") {
        ensureCanvasCheckbox(el as HTMLCanvasElement)
      } else {
        scanDeep(el as ParentNode)
      }
      if (el.shadowRoot) {
        bindShadowTree(el.shadowRoot)
      }
    }
  }

  const domMo = new MutationObserver((mutations) => {
    for (let m = 0; m < mutations.length; m++) {
      handleAddedNodes(mutations[m].addedNodes)
    }
  })

  const attrMo = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const t = mutations[i].target as Element
      if (!t) continue
      if (t.nodeName === "IMG" && !t.closest("[data-yxh-img-wrap]")) {
        ensureImgCheckbox(t as HTMLImageElement)
      }
    }
  })

  if (document.documentElement) {
    scanDeep(document.documentElement)
    domMo.observe(document.documentElement, { childList: true, subtree: true })
    attrMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["src", "srcset"],
      subtree: true
    })
  }

  console.log(
    "[宜享花开发助手] 图片下载脚本已注入（img + canvas + Shadow DOM，MAIN world）；队列: window." +
      QUEUE_KEY
  )
}

export type ImageDownloadQueueItem = { id: string; url: string }

export function readImageDownloadQueueSnapshot(): ImageDownloadQueueItem[] {
  const w = window as unknown as Window & Record<string, unknown>
  const k = "__YIXIANGHUA_IMAGE_DOWNLOAD_QUEUE__"
  const q = w[k]
  if (!Array.isArray(q)) return []
  const out: ImageDownloadQueueItem[] = []
  for (let i = 0; i < q.length; i++) {
    const item = q[i] as { id?: unknown; url?: unknown }
    if (item && typeof item === "object" && item.id != null && item.url != null) {
      out.push({ id: String(item.id), url: String(item.url) })
    }
  }
  return out
}
