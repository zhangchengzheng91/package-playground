/**
 * CodeFlow 列表页部署 DOM 操作（供 content script / 注入 UI 复用）
 */

import type { DeployServiceResponse } from "~types/messages"

function findSearchInput(): HTMLInputElement | null {
  return document.querySelector(
    'input[type="text"][autocomplete="off"][placeholder="搜索"]'
  ) as HTMLInputElement | null
}

function findRefreshButton(): HTMLButtonElement | null {
  const xpath = "//button[contains(., '刷新')]"
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  let refreshButton = result.singleNodeValue as HTMLButtonElement | null

  if (!refreshButton) {
    const buttons = document.querySelectorAll("button")
    for (const button of buttons) {
      const text = button.textContent || button.innerText || ""
      if (text.includes("刷新")) {
        refreshButton = button as HTMLButtonElement
        break
      }
    }
  }

  return refreshButton
}

function findTableRow(searchText: string): HTMLElement | null {
  const tables = document.querySelectorAll("table")
  for (const table of tables) {
    const rows = table.querySelectorAll("tr")
    for (const row of rows) {
      const text = row.textContent || row.innerText || ""
      if (text.includes(searchText)) {
        return row as HTMLElement
      }
    }
  }
  return null
}

function pollUntilFound(
  findFn: () => HTMLElement | null,
  timeout: number = 5000,
  interval: number = 200
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const check = () => {
      const element = findFn()
      if (element) {
        resolve(element)
        return
      }

      if (Date.now() - startTime >= timeout) {
        resolve(null)
        return
      }

      setTimeout(check, interval)
    }

    check()
  })
}

export async function handleDeployService(
  serviceName: string
): Promise<DeployServiceResponse> {
  try {
    const searchInput = findSearchInput()
    if (!searchInput) {
      return {
        success: false,
        error: "未找到搜索输入框，请确保在正确的页面操作"
      }
    }

    searchInput.value = serviceName
    const inputEvent = new Event("input", { bubbles: true })
    searchInput.dispatchEvent(inputEvent)
    searchInput.focus()

    const refreshButton = findRefreshButton()
    if (!refreshButton) {
      return {
        success: false,
        error: "未找到刷新按钮，请确保在正确的页面操作"
      }
    }

    refreshButton.click()

    const targetRow = await pollUntilFound(
      () => findTableRow(serviceName),
      5000,
      200
    )

    if (!targetRow) {
      return {
        success: false,
        error: `未找到包含 [${serviceName}] 的行`
      }
    }

    targetRow.style.backgroundColor = "yellowgreen"

    const iconBoxElement = targetRow.querySelector(".el-icon-box") as HTMLElement | null
    if (!iconBoxElement) {
      return {
        success: false,
        error: "未找到部署按钮，请手动操作"
      }
    }

    iconBoxElement.click()

    return {
      success: true,
      found: true,
      message: "已触发部署操作"
    }
  } catch (error) {
    console.error("部署操作失败:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "操作失败，请重试"
    }
  }
}
