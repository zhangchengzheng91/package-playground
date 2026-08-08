/** Webpack runtime public path; set when using `output.publicPath: 'auto'`. */
declare const __webpack_require__: { p: string };

function basenameFromWebpackPublicPath(): string | undefined {
  if (typeof __webpack_require__ === 'undefined' || !__webpack_require__.p) {
    return undefined;
  }
  const p = __webpack_require__.p;
  if (p === 'auto') {
    return undefined;
  }
  try {
    const pathname = new URL(p, window.location.href).pathname;
    return pathname.replace(/\/$/, '') || '/';
  } catch {
    return undefined;
  }
}

/**
 * When runtime chunk does not set `__webpack_require__.p`, infer mount path from the entry script
 * URL (same idea as webpack `publicPath: 'auto'`).
 */
function basenameFromEntryScriptSrc(): string | undefined {
  const { scripts } = document;
  for (let i = scripts.length - 1; i >= 0; i -= 1) {
    const el = scripts.item(i);
    if (!el || el.tagName !== 'SCRIPT' || !el.src) {
      continue;
    }
    const pathname = new URL(el.src).pathname;
    const m = pathname.match(/^(.+)\/js\/main\.[a-z0-9]+\.js$/i);
    if (m?.[1] !== undefined) {
      const base = m[1];
      return (base.replace(/\/$/, '') || '/') as string;
    }
  }
  return undefined;
}

/** `BrowserRouter` basename: explicit build path or derived from webpack public path under Whistle iframe. */
export const ROUTER_BASENAME = ((): string => {
  const explicit = __WEBUI_PUBLIC_PATH__.trim();
  if (explicit !== '') {
    return explicit.replace(/\/?$/, '/').replace(/\/$/, '') || '/';
  }
  return (
    basenameFromWebpackPublicPath() ?? basenameFromEntryScriptSrc() ?? '/'
  );
})();
