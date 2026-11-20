/**
 * 展示格式化小函数单源（2026-11-20 棒3：自 AgentPane／AgentProcessGroup 收敛，行为逐字不变）。
 * 只放纯函数、零依赖 Vue——组头耗时秒表/实时预览行等展示口径两处共用一份，
 * InkHubChat（棒3 多轮对话线接入 AgentProcessGroup）同源消费。
 */

/**
 * 时长人话化（U68）：裸秒数退役——<60s 显示「N 秒」、<1h 显示「N 分 N 秒」、
 * 再往上「N 时 N 分 N 秒」（132s → 2分12秒）。
 */
export const fmtDuration = (sec: number): string => {
  const s = sec % 60
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  if (h > 0) return `${h}时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

/** 单行截断（U65 预览行用）：压平空白，超长 …（CSS 省略号兜底，这里控制 title 全文长度） */
export const clipOneLine = (text: string, max = 120): string => {
  const one = (text || '').replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max)}…` : one
}
