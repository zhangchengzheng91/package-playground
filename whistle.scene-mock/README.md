# whistle.scene-mock

## Web UI 构建

插件页挂在 Whistle 的**子路径**下时，`index.html` 里不要用根路径脚本（`/js/...`、`/css/...`），否则请求会打到代理根目录并报 404。默认 `pnpm run build` 使用 webpack `publicPath: 'auto'`，生成的资源路径为相对于当前页的 `js/`、`css/`。

若本地 dev server 固定在子路径（例如 `/v2/`），可显式指定：

`WEBUI_PUBLIC_PATH=/v2/ pnpm run build`

脚本（在 `webui/` 目录）：

- `pnpm dev`：仅 webpack dev server（内存，`dist` 不写盘）。
- `pnpm run watch`：dev server **并写入 `dist/`**（便于 Whistle `uiServer` 读磁盘），控制台会打出端口（含 `[webui] dev server listening on port …`）。
- `pnpm run build:watch`：与 `pnpm run build` **相同的 production 产物**（`js/*.[hash].js`、`css/*.[hash].css` 等），仅多 `--watch` 监听源码变更；不设 HTTP，无端口输出。
