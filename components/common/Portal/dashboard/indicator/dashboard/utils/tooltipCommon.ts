/**
 * 通用 tooltip 构建工具
 * 非堆叠的 bar/line 图表复用饼图的 tooltip 内容结构与视觉样式
 */

export interface TooltipSeriesItem {
  /** 系列显示名称 */
  name: string
  /** 数值（已转换） */
  value: number
  /** 颜色（hex/rgb/hsl） */
  color: string
  /** 单位文本 */
  unit: string
  /** 格式化后的数值字符串 */
  formattedValue: string
}

export interface BuildAxisTooltipOptions {
  /** 标题文本（通常为类目名/axisValue） */
  headerText: string
  /** 各系列数据项 */
  items: TooltipSeriesItem[]
  /** 合计行文本 */
  totalText: string
}

/**
 * 构建与饼图风格一致的 axis tooltip HTML
 * 结构：加粗标题 + 各系列行（圆点 + 名称: 值 单位 (百分比)） + 合计行
 */
export function buildAxisTooltipHtml(options: BuildAxisTooltipOptions): string {
  const { headerText, items, totalText } = options

  const totalValue = items.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)

  let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${headerText}</div>`

  items.forEach((d) => {
    const percent = totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(2) : '0.00'
    const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${d.color};margin-right:6px;vertical-align:middle;"></span>`
    html += `<div style="padding: 3px 6px; margin: 2px 0; border-left: 3px solid transparent;">${marker}<span style="vertical-align:middle;">${d.name}: ${d.formattedValue}${d.unit} (${percent}%)</span></div>`
  })

  html += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; color: var(--text-secondary, #8c8c8c); font-size: 12px;">${totalText}</div>`

  return html
}

/**
 * 构建"全量数据" axis tooltip HTML（与饼图 buildFullTooltipHtml 行为一致）
 * 列出每个系列的所有类目数值与占比，并高亮当前 hover 的类目
 * @param series        图表 series 数组（提供 name / data / 颜色）
 * @param categories    类目数组（x 轴）
 * @param hoveredCategory 当前 hover 的类目名（用于高亮）
 * @param getSeriesDisplayName 系列显示名回调
 * @param getSeriesUnit 系列单位回调
 * @param formatValue   数值格式化回调
 * @param getDatumColor 单个数据点颜色回调（取不到时回退系列颜色）
 */
export function buildFullAxisTooltipHtml(
  series: any[],
  categories: string[],
  hoveredCategory: string,
  getSeriesDisplayName: (s: any) => string,
  getSeriesUnit: (s: any) => string,
  formatValue: (value: number, s: any) => string,
  getDatumColor?: (datum: any, s: any) => string | undefined
): string {
  const accent = 'var(--accent, #1890ff)'
  const accentSoft = 'var(--accent-soft, #e6f7ff)'

  // 标题：系列名称（多个系列时用 / 连接）
  const headerText = [...new Set(series.map(s => getSeriesDisplayName(s)))].join(' / ')

  let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${headerText}</div>`

  series.forEach((s) => {
    const unit = getSeriesUnit(s)
    const seriesColor = s.itemStyle?.color || s.color || '#1890ff'
    const dataArr: any[] = Array.isArray(s.data) ? s.data : []
    const total = dataArr.reduce((sum, datum) => {
      const v = typeof datum === 'object' && datum?.value != null ? datum.value : datum
      return sum + (typeof v === 'number' ? v : 0)
    }, 0)

    categories.forEach((cat, idx) => {
      const datum = dataArr[idx]
      const value = typeof datum === 'object' && datum?.value != null ? datum.value : (typeof datum === 'number' ? datum : 0)
      const isCurrent = cat === hoveredCategory
      const percent = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00'
      const color = (getDatumColor && getDatumColor(datum, s)) || seriesColor
      const rowStyle = isCurrent
        ? `background: ${accentSoft}; border-left: 3px solid ${accent}; font-weight: bold; padding: 3px 6px; margin: 2px 0; border-radius: 3px;`
        : 'padding: 3px 6px; margin: 2px 0; border-left: 3px solid transparent;'
      const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>`
      const currentTag = isCurrent
        ? `<span style="color: ${accent}; font-size: 11px; margin-left: 6px; font-weight: bold; white-space: nowrap;">◀ 当前选中</span>`
        : ''
      html += `<div style="${rowStyle}">${marker}<span style="vertical-align:middle;">${cat}: ${formatValue(value, s)}${unit} (${percent}%)</span>${currentTag}</div>`
    })
  })

  // 合计行（所有系列总和；单系列时即该系列总和）
  const grandTotal = series.reduce((sum, s) => {
    const dataArr: any[] = Array.isArray(s.data) ? s.data : []
    return sum + dataArr.reduce((ss, datum) => {
      const v = typeof datum === 'object' && datum?.value != null ? datum.value : datum
      return ss + (typeof v === 'number' ? v : 0)
    }, 0)
  }, 0)
  const firstUnit = getSeriesUnit(series[0])
  const allSameUnit = series.every(s => getSeriesUnit(s) === firstUnit)
  html += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; color: var(--text-secondary, #8c8c8c); font-size: 12px;">总计：${formatValue(grandTotal, series[0])}${allSameUnit ? firstUnit : ''}</div>`

  return html
}

/**
 * 判断 series 数组中是否存在"真正的视觉堆叠"
 * 注意：仅当某个 stack 组内包含 2 个及以上系列时，柱子才会真正上下堆叠。
 * 若每个 stack 组只有 1 个系列（如多指标各自 selfStack 但无第二维度），
 * 柱子实际是并排显示的，不应视为堆叠。
 */
export function hasStackedSeries(series: any[]): boolean {
  const stackCount: Record<string, number> = {}
  series.forEach((s: any) => {
    if (s && s.stack) {
      stackCount[s.stack] = (stackCount[s.stack] || 0) + 1
    }
  })
  return Object.values(stackCount).some(count => count > 1)
}
