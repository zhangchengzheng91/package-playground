/**
 * 将相对时间文案（如「5天前」「5天前 · 湖南」）转换为 yyyy-MM-dd
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function shiftByUnit(date: Date, amount: number, unit: string): boolean {
  switch (unit) {
    case "秒":
      date.setSeconds(date.getSeconds() - amount)
      return true
    case "分钟":
    case "分":
      date.setMinutes(date.getMinutes() - amount)
      return true
    case "小时":
    case "时":
      date.setHours(date.getHours() - amount)
      return true
    case "天":
    case "日":
      date.setDate(date.getDate() - amount)
      return true
    case "周":
    case "星期":
      date.setDate(date.getDate() - amount * 7)
      return true
    case "个月":
    case "月":
      date.setMonth(date.getMonth() - amount)
      return true
    case "年":
      date.setFullYear(date.getFullYear() - amount)
      return true
    default:
      return false
  }
}

/**
 * 解析常见中文相对/绝对时间，输出精确日期 yyyy-MM-dd。
 * 支持「5天前 · 湖南」这类带后缀文案：优先提取其中的相对时间片段。
 * 无法识别时返回原始字符串。
 */
export function parseRelativeTimeToYmd(
  raw: string,
  now: Date = new Date()
): string {
  const text = raw.replace(/\s+/g, "").trim()
  if (!text) return ""

  // data-timestamp 秒级时间戳 * 1000 后的毫秒数
  if (/^\d{12,13}$/.test(text)) {
    return formatYmd(new Date(Number(text)))
  }

  const date = new Date(now.getTime())

  // 优先：x天前 / x小时前 ...（允许前后有其它文案，如「5天前·湖南」）
  const relative = text.match(
    /(\d+)(秒|分钟|分|小时|时|天|日|周|星期|个月|月|年)前/
  )
  if (relative) {
    const amount = Number(relative[1])
    const unit = relative[2]
    if (shiftByUnit(date, amount, unit)) {
      return formatYmd(date)
    }
  }

  if (/刚刚|刚才|今天|今日/.test(text)) {
    return formatYmd(date)
  }
  if (/昨天|昨日/.test(text)) {
    date.setDate(date.getDate() - 1)
    return formatYmd(date)
  }
  if (text.includes("前天")) {
    date.setDate(date.getDate() - 2)
    return formatYmd(date)
  }
  if (/一周前/.test(text)) {
    date.setDate(date.getDate() - 7)
    return formatYmd(date)
  }

  // yyyy-MM-dd / yyyy年M月d日
  const absolute = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (absolute) {
    return `${absolute[1]}-${pad2(Number(absolute[2]))}-${pad2(Number(absolute[3]))}`
  }

  // M月d日 / M-d（如 5月31日 → 当年-05-31）
  const md =
    text.match(/(\d{1,2})月(\d{1,2})日/) || text.match(/(\d{1,2})[-/.](\d{1,2})/)
  if (md) {
    return `${now.getFullYear()}-${pad2(Number(md[1]))}-${pad2(Number(md[2]))}`
  }

  return raw.trim()
}
