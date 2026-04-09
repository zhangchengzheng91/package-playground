export function normalizePath(p: string): string {
  if (!p || p === "/") return p
  return p.endsWith("/") ? p.slice(0, -1) || "/" : p
}

/** 与 hash 路由或 pathname（history 模式）对齐的应用内路径 */
export function getCurrentAppPath(): string {
  const hash = location.hash
  if (hash && hash.length > 1) {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash
    const pathOnly = raw.split("?")[0].split("#")[0]
    return normalizePath(pathOnly)
  }
  return normalizePath(location.pathname)
}

/**
 * `pagePath` 未传或为空：任意页面均视为匹配；
 * 传入时与 `getCurrentAppPath()` 规范化后全等比较。
 */
export function matchesPagePath(pagePath?: string | null): boolean {
  if (pagePath == null || pagePath === "") {
    return true
  }
  return getCurrentAppPath() === normalizePath(pagePath)
}
