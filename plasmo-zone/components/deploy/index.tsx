/**
 * Deploy 组件
 * 服务部署功能
 * 通过消息与 content script 通信来操作页面 DOM
 */

import { Tree, message } from "antd"
import type { TreeDataNode, TreeProps } from "antd"
import { useCallback, useMemo } from "react"
import { bossService, H5Service } from "~constants"
import type { DeployServiceMessage, DeployServiceResponse } from "~types/messages"

interface DeployProps {
  onClose: () => void
}

// 发送部署服务请求到当前活动标签页的 content script
async function deployService(serviceName: string): Promise<DeployServiceResponse> {
  return new Promise((resolve, reject) => {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0] || !tabs[0].id) {
        reject(new Error("未找到活动标签页"))
        return
      }

      // 发送消息到 content script
      const message: DeployServiceMessage = {
        action: "deployService",
        serviceName
      }

      chrome.tabs.sendMessage(tabs[0].id, message, (response: DeployServiceResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (response) {
          resolve(response)
        } else {
          reject(new Error("未收到响应"))
        }
      })
    })
  })
}

export default function Deploy({ onClose }: DeployProps) {
  const services: TreeDataNode[] = useMemo(() => [
    {
      title: "宜享花后管",
      key: "BOSS",
      children: bossService,
    },
    {
      title: "H5",
      key: "H5",
      children: H5Service,
    }
  ], [])

  const onSelect: TreeProps["onSelect"] = useCallback(async (selectedKeys, info) => {
    const { node } = info
    const serviceName = node.title as string

    if (!serviceName) {
      message.warning("请选择有效的服务")
      return
    }

    try {
      message.loading({ content: "正在部署服务...", key: "deploy", duration: 0 })

      const response = await deployService(serviceName)

      if (response.success) {
        message.success({ 
          content: response.message || "部署操作已触发", 
          key: "deploy" 
        })
        onClose()
      } else {
        message.error({ 
          content: response.error || "部署失败", 
          key: "deploy" 
        })
      }
    } catch (error) {
      console.error("部署操作失败:", error)
      const errorMessage = error instanceof Error ? error.message : "操作失败，请重试"
      message.error({ 
        content: errorMessage, 
        key: "deploy" 
      })
    }
  }, [onClose])

  const onCheck: TreeProps["onCheck"] = useCallback((checkedKeys, info) => {
    console.log("onCheck", checkedKeys, info)
  }, [])

  return (
    <div>
      <Tree
        defaultExpandAll
        defaultExpandParent
        treeData={services}
        onSelect={onSelect}
        onCheck={onCheck}
      />
    </div>
  )
}
