/**
 * Explicit `output.publicPath` when built with `WEBUI_PUBLIC_PATH` (ends with `/`).
 * Empty string when built with webpack `publicPath: 'auto'` (Whistle plugin); use runtime `__webpack_require__.p`.
 */
declare const __WEBUI_PUBLIC_PATH__: string;
