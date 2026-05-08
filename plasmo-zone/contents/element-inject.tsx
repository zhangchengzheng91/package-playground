/**
 * PaaS 页面注入入口：通过配置数组驱动多个 ContentInjector。
 *
 * Plasmo 对 contents 下的 .tsx 会按「Content Script UI」打包，必须提供 default export；
 * 实际注入逻辑放在 useEffect 中，default 仅作占位（返回 null）。
 */

import { Fragment, useEffect } from "react"
import { createRoot } from "react-dom/client"

import {
  ContentInjector,
  type ContentInjectorConfig
} from "~components/content-injector"
import { DoubaoInject } from "~components/doubao-inject"
import { HunyuanInject } from "~components/hunyuan-inject"
import { PassCicdCard } from "~components/pass-cicd"

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "http://paastest.creditease.corp/*",
    "https://paastest.creditease.corp/*",
    "http://paas.creditease.corp//*",
    "http://paas.creditease.corp//*",
    "https://aistudio.tencent.com/*",
    "https://www.doubao.com/*"
  ],
  run_at: "document_idle"
}

/** 注入项配置列表：每项对应一次 ContentInjector 挂载（含 pagePath、containerSelector、children） */
export const elementInjectConfigs: ContentInjectorConfig[] = [
  {
    pagePath: "/cicd/codeFlow/list",
    containerSelector: ".cicd-flow",
    children: <PassCicdCard />
  },
  {
    hostname: "aistudio.tencent.com",
    containerSelector: "body",
    children: <HunyuanInject />
  },
  {
    hostname: "www.doubao.com",
    containerSelector: "body",
    children: <DoubaoInject />
  }
]

const APP_HOST_ID = "__plasmo_element_inject_app"

function injectKey(cfg: ContentInjectorConfig, index: number): string {
  const childKey =
    typeof cfg.children === "string" || typeof cfg.children === "number"
      ? String(cfg.children)
      : `node-${index}`
  return [cfg.pagePath ?? "*", cfg.containerSelector ?? "body", childKey, index].join("::")
}

function mountElementInject(): void {
  if (document.getElementById(APP_HOST_ID)) {
    return
  }

  const host = document.createElement("div")
  host.id = APP_HOST_ID
  host.setAttribute("aria-hidden", "true")
  host.style.display = "none"
  document.documentElement.appendChild(host)

  createRoot(host).render(
    <Fragment>
      {elementInjectConfigs.map((item, index) => (
        <ContentInjector key={injectKey(item, index)} {...item} />
      ))}
    </Fragment>
  )
}

/** Plasmo CSUI 要求的默认导出；无 UI，仅触发真实注入 */
export default function ElementInjectContentScript() {
  useEffect(() => {
    mountElementInject()
  }, [])

  return null
}
