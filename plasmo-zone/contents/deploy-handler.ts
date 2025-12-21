/**
 * Deploy Handler Content Script
 * 轻量级 content script，专门用于处理 Deploy 功能的 DOM 操作
 */

import type { DeployServiceMessage, DeployServiceResponse } from "~types/messages"

// 查找搜索输入框
function findSearchInput(): HTMLInputElement | null {
  return document.querySelector(
    'input[type="text"][autocomplete="off"][placeholder="搜索"]'
  ) as HTMLInputElement | null
}

// 查找刷新按钮
function findRefreshButton(): HTMLButtonElement | null {
  // 使用 XPath 查找包含"刷新"文本的 button 元素
  const xpath = "//button[contains(., '刷新')]"
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  let refreshButton = result.singleNodeValue as HTMLButtonElement | null

  // 如果 XPath 没找到，尝试遍历所有 button 并检查 textContent 或 innerText
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

// 查找包含指定文本的表格行
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

// 轮询查找元素，直到找到或超时
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

// 处理部署服务请求
async function handleDeployService(serviceName: string): Promise<DeployServiceResponse> {
  try {
    // 查找搜索输入框
    const searchInput = findSearchInput()
    if (!searchInput) {
      return {
        success: false,
        error: "未找到搜索输入框，请确保在正确的页面操作"
      }
    }

    // 设置搜索值并触发事件
    searchInput.value = serviceName
    const inputEvent = new Event("input", { bubbles: true })
    searchInput.dispatchEvent(inputEvent)
    searchInput.focus()

    // 查找并点击刷新按钮
    const refreshButton = findRefreshButton()
    if (!refreshButton) {
      return {
        success: false,
        error: "未找到刷新按钮，请确保在正确的页面操作"
      }
    }

    refreshButton.click()

    // 使用轮询查找目标行
    const targetRow = await pollUntilFound(
      () => findTableRow(serviceName),
      5000, // 5秒超时
      200   // 每200ms检查一次
    )

    if (!targetRow) {
      return {
        success: false,
        error: `未找到包含 [${serviceName}] 的行`
      }
    }

    // 高亮目标行
    targetRow.style.backgroundColor = "yellowgreen"

    // 查找并点击部署按钮
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

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener(
  (message: DeployServiceMessage, sender, sendResponse) => {
    if (message.action === "deployService") {
      handleDeployService(message.serviceName)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "未知错误"
          })
        })
      return true // 保持消息通道开放以支持异步响应
    }
  }
)

