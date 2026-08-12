# Douyin Image Download

[Plasmo](https://docs.plasmo.com/) Chrome 扩展项目。当前仅包含框架骨架，不含业务逻辑。

## Getting Started

```bash
pnpm install
pnpm dev
```

在 Chrome 中加载开发构建目录：`build/chrome-mv3-dev`。

## Scripts

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发模式 |
| `pnpm build` | 生产构建 |
| `pnpm package` | 打包 zip |

## 文件结构

```
douyin-image-douwnload/
├── package.json        # Plasmo 配置与依赖
├── tsconfig.json
├── popup.tsx           # 弹窗入口
├── popup.css
├── background.ts       # 后台脚本
├── contents/main.tsx   # Content Script 入口
├── types/messages.ts   # 消息类型
├── assets/icon.png
└── README.md
```

## 参考

框架结构参考 `plasmo-zone` 项目。
