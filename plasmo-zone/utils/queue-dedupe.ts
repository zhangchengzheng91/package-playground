/**
 * 待下载队列按 URL 去重（同一张图多选、多标签、多 frame 合并时只保留一条）。
 */

export function normalizeUrlForQueueDedupe(url: string): string {
  const t = url.trim()
  if (!t) return ""
  try {
    if (t.startsWith("http:") || t.startsWith("https:")) {
      return new URL(t).href
    }
  } catch {
    /* 非合法绝对 URL 时用原串 */
  }
  return t
}

export function dedupeQueueItemsByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const k = normalizeUrlForQueueDedupe(it.url)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}
