/**
 * 单位格式化工具函数
 * 根据 unitConfig 自动派生显示单位（如 "2,10000" → "万元"）
 */

/**
 * 根据 unitConfig 的除数部分派生中文显示单位
 * @param unitConfig 格式如 "2,10000"（小数位,除数）
 * @returns 中文单位文本，如 "万元"、"元"
 */
export const deriveDisplayUnit = (unitConfig?: string): string => {
  if (!unitConfig) return ''

  const parts = unitConfig.split(',')
  if (parts.length !== 2) return ''

  const unit = parseInt(parts[1], 10)
  if (isNaN(unit) || unit <= 1) return unit === 1 ? '元' : ''

  const unitMap: Record<number, string> = {
    1: '元',
    10: '十元',
    100: '百元',
    1000: '千元',
    10000: '万元',
    100000: '十万元',
    1000000: '百万元',
    10000000: '千万元',
    100000000: '亿元'
  }

  return unitMap[unit] || ''
}

/**
 * 获取指标的有效显示单位：优先使用 metric.unit，为空时从 unitConfig 自动派生
 * @param metric 包含 unit 和 unitConfig 字段的指标对象
 * @returns 有效的显示单位文本
 */
export const getEffectiveUnit = (metric?: { unit?: string; unitConfig?: string } | null): string => {
  if (!metric) return ''
  if (metric.unit) return metric.unit
  return deriveDisplayUnit(metric.unitConfig)
}
