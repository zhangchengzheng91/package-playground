import { App, Card, Tabs, Tag } from "antd"
import { useMemo } from "react"

import { handleDeployService } from "./deploy-service"

type ServiceLeaf = {
  title: string
  key: string
}

type ServiceGroup = {
  key: string
  children: ServiceLeaf[]
}

const services: ServiceGroup[] = [
  {
    key: "H5",
    children: [
      {
        title: "宜信小贷无线端-测试环境A",
        key: "H5-A"
      },
      {
        title: "宜信小贷无线端-测试环境B",
        key: "H5-B"
      },
      {
        title: "宜信小贷无线端-测试环境C",
        key: "H5-C"
      },
      {
        title: "宜信小贷无线端-测试环境D",
        key: "H5-D"
      },
      {
        title: "宜信小贷无线端-测试环境E",
        key: "H5-E"
      },
      {
        title: "宜信小贷无线端-测试环境F",
        key: "H5-F"
      },
      {
        title: "宜信小贷无线端-测试环境G",
        key: "H5-G"
      },
      {
        title: "宜信小贷无线端-测试环境H",
        key: "H5-H"
      },
      {
        title: "宜信小贷无线端-测试环境I",
        key: "H5-I"
      },
      {
        title: "宜信小贷无线端-测试环境J",
        key: "H5-J"
      },
      {
        title: "宜信小贷无线端-测试环境K",
        key: "H5-K"
      },
      {
        title: "宜信小贷无线端-测试环境L",
        key: "H5-L"
      },
      {
        title: "宜信小贷无线端-测试环境M",
        key: "H5-M"
      },
      {
        title: "宜信小贷无线端-测试环境N",
        key: "H5-N"
      },
      {
        title: "宜信小贷无线端-测试环境O",
        key: "H5-O"
      },
      {
        title: "宜信小贷无线端-测试环境P",
        key: "H5-P"
      },
      {
        title: "宜信小贷无线端-测试环境Q",
        key: "H5-Q"
      }
    ]
  },
  {
    key: "宜享花后管",
    children: [
      {
        title: "宜享花管理系统-测试环境A",
        key: "BOSS-A"
      },
      {
        title: "宜享花管理系统-测试环境B",
        key: "BOSS-B"
      },
      {
        title: "宜享花管理系统-测试环境C",
        key: "BOSS-C"
      },
      {
        title: "宜享花管理系统-测试环境D",
        key: "BOSS-D"
      },
      {
        title: "宜享花管理系统-测试环境E",
        key: "BOSS-E"
      },
      {
        title: "宜享花管理系统-测试环境F",
        key: "BOSS-F"
      },
      {
        title: "宜享花管理系统-核心专用",
        key: "BOSS-CORE"
      },
      {
        title: "宜享花管理系统",
        key: "BOSS-正式环境"
      }
    ]
  },
  {
    key: "璇玑",
    children: [
      {
        title: "璇玑平台-前端",
        key: "xuanji-frontend"
      },
    ]
  },
  {
    key: "客服",
    children: [
      {
        title: "璇玑平台-前端",
        key: "信鹿新客服系统后管-前端"
      },
    ]
  }
]

/** antd Tag 预设色；按 key 哈希取值，同一 key 颜色稳定 */
const TAG_PRESET_COLORS = [
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
] as const

function tagColorForKey(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return TAG_PRESET_COLORS[Math.abs(h) % TAG_PRESET_COLORS.length]
}

function PassCicdCardInner() {
  const { message } = App.useApp()

  const tabItems = useMemo(
    () =>
      services.map((group) => ({
        key: group.key,
        label: group.key,
        children: (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8
            }}
          >
            {group.children.map((item) => (
              <Tag
                key={item.key}
                color={tagColorForKey(item.key)}
                style={{ cursor: "pointer" }}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  try {
                    await handleDeployService(item.title)
                  } catch {
                    message.error("部署失败，请重试")
                  }
                }}
              >
                {item.title}
              </Tag>
            ))}
          </div>
        )
      })),
    [message]
  )

  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <Tabs defaultActiveKey={services[0]?.key} items={tabItems} />
    </Card>
  )
}

export function PassCicdCard() {
  return (
    <App>
      <PassCicdCardInner />
    </App>
  )
}
