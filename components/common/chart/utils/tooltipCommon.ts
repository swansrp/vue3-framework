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
 * @param options       可选项：showSharePercent 按系列控制是否显示占比（增长率等无占比语义的系列关闭）；
 *                      showTotal 是否显示合计行（多系列单位混合时可关闭）
 */
export function buildFullAxisTooltipHtml(
  series: any[],
  categories: string[],
  hoveredCategory: string,
  getSeriesDisplayName: (s: any) => string,
  getSeriesUnit: (s: any) => string,
  formatValue: (value: number, s: any) => string,
  getDatumColor?: (datum: any, s: any) => string | undefined,
  options?: {
    showSharePercent?: (s: any) => boolean
    showTotal?: boolean
  }
): string {
  const accent = 'var(--accent, #1890ff)'
  const accentSoft = 'var(--accent-soft, #e6f7ff)'

  // 标题：系列名称（多个系列时用 / 连接）
  const headerText = [...new Set(series.map(s => getSeriesDisplayName(s)))].join(' / ')

  let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${headerText}</div>`

  series.forEach((s) => {
    const unit = getSeriesUnit(s)
    const showPercent = options?.showSharePercent ? options.showSharePercent(s) : true
    const seriesColor = s.itemStyle?.color || s.color || '#1890ff'
    const dataArr: any[] = Array.isArray(s.data) ? s.data : []
    const total = dataArr.reduce((sum, datum) => {
      const v = typeof datum === 'object' && datum?.value != null ? datum.value : datum
      return sum + (typeof v === 'number' ? v : 0)
    }, 0)

    categories.forEach((cat, idx) => {
      const datum = dataArr[idx]
      // 数据点为 null（如增长率基期缺失的断点）时显示 "-"
      const rawValue = typeof datum === 'object' ? datum?.value : datum
      const isNullValue = rawValue == null
      const value = typeof rawValue === 'number' ? rawValue : 0
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
      const valueText = isNullValue ? '-' : `${formatValue(value, s)}${unit}`
      const percentText = (!isNullValue && showPercent) ? ` (${percent}%)` : ''
      html += `<div style="${rowStyle}">${marker}<span style="vertical-align:middle;">${cat}: ${valueText}${percentText}</span>${currentTag}</div>`
    })
  })

  if (options?.showTotal === false) {
    return html
  }

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
 * 同比环比 tooltip：每个周期（年份/年月）一行，柱值(占比)与同比/环比增长率横向排布。
 * - 柱系列：多字段堆叠时逐字段展示，占比 = 该周期柱合计 / 全周期柱合计；
 * - 增长率系列（同比/环比）：原值直出（已是百分比语义），基期缺失的断点显示 '-'；
 * - hover 周期行高亮，视觉样式与 buildFullAxisTooltipHtml 保持一致。
 */
export function buildComparisonAxisTooltipHtml(
  series: any[],
  categories: string[],
  hoveredCategory: string,
  isRateSeries: (s: any) => boolean,
  getSeriesUnit: (s: any) => string,
  formatValue: (value: number, s: any) => string
): string {
  const accent = 'var(--accent, #1890ff)'
  const accentSoft = 'var(--accent-soft, #e6f7ff)'
  const barSeries = series.filter(s => !isRateSeries(s))
  const rateSeries = series.filter(s => isRateSeries(s))

  const valueAt = (s: any, idx: number): number | null => {
    const datum = Array.isArray(s.data) ? s.data[idx] : null
    const raw = typeof datum === 'object' && datum !== null ? datum.value : datum
    return typeof raw === 'number' ? raw : null
  }
  const colorOf = (s: any, idx: number): string => {
    const datum = Array.isArray(s.data) ? s.data[idx] : null
    return datum?.itemStyle?.color || s.itemStyle?.color || s.lineStyle?.color || s.color || '#1890ff'
  }
  const marker = (color: string) =>
    `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle;"></span>`

  // 柱合计：按周期求和，占比分母为全周期总和
  const catBarTotals = categories.map((_, idx) =>
    barSeries.reduce((sum, s) => sum + (valueAt(s, idx) ?? 0), 0))
  const grandBarTotal = catBarTotals.reduce((a, b) => a + b, 0)

  const headerText = [...new Set(series.map(s => s.name))].join(' / ')
  let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${headerText}</div>`

  categories.forEach((cat, idx) => {
    const isCurrent = cat === hoveredCategory
    const rowStyle = isCurrent
      ? `background: ${accentSoft}; border-left: 3px solid ${accent}; font-weight: bold; padding: 3px 6px; margin: 2px 0; border-radius: 3px; white-space: nowrap;`
      : 'padding: 3px 6px; margin: 2px 0; border-left: 3px solid transparent; white-space: nowrap;'

    // 柱值：单字段直接展示数值，多字段按「字段名 值」用 + 连接
    const barText = barSeries.map((s) => {
      const v = valueAt(s, idx)
      const text = v == null ? '-' : `${formatValue(v, s)}${getSeriesUnit(s)}`
      return `${marker(colorOf(s, idx))}${barSeries.length > 1 ? `${s.name} ` : ''}${text}`
    }).join('<span style="margin: 0 4px;">+</span>')
    const percent = grandBarTotal > 0 ? ((catBarTotals[idx] / grandBarTotal) * 100).toFixed(2) : '0.00'

    // 增长率：同比/环比横向排布在同一行
    const rateText = rateSeries.map((s) => {
      const v = valueAt(s, idx)
      return `<span style="margin-left: 10px;">${marker(colorOf(s, idx))}${s.name} ${v == null ? '-' : formatValue(v, s)}</span>`
    }).join('')

    const currentTag = isCurrent
      ? `<span style="color: ${accent}; font-size: 11px; margin-left: 6px; font-weight: bold; white-space: nowrap;">◀ 当前选中</span>`
      : ''
    html += `<div style="${rowStyle}"><span style="vertical-align:middle;">${cat}: ${barText} (${percent}%)${rateText}</span>${currentTag}</div>`
  })
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

/** 堆叠 tooltip 高亮列表的数据项 */
export interface HighlightTooltipItem {
  /** 显示名称（如叶子节点名/统计类型名） */
  name: string
  /** 数值（已转换单位） */
  value: number
  /** 颜色 */
  color: string
  /** 单位文本 */
  unit: string
  /** 格式化后的数值字符串 */
  formattedValue: string
}

const HIGHLIGHT_ACCENT = 'var(--accent, #1890ff)'
const HIGHLIGHT_ACCENT_SOFT = 'var(--accent-soft, #e6f7ff)'

/**
 * 构建饼图风格的「列表 + 高亮当前项」行 HTML（不含标题与合计行）
 * 每行：圆点 + 名称: 值单位 (占比%)，当前项高亮并带「◀ 当前选中」标记
 */
export function buildHighlightRowsHtml(items: HighlightTooltipItem[], currentName: string): string {
  const totalValue = items.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)
  let html = ''
  items.forEach((d) => {
    const isCurrent = d.name === currentName
    const percent = totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(2) : '0.00'
    const rowStyle = isCurrent
      ? `background: ${HIGHLIGHT_ACCENT_SOFT}; border-left: 3px solid ${HIGHLIGHT_ACCENT}; font-weight: bold; padding: 3px 6px; margin: 2px 0; border-radius: 3px;`
      : 'padding: 3px 6px; margin: 2px 0; border-left: 3px solid transparent;'
    const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${d.color};margin-right:6px;vertical-align:middle;"></span>`
    const currentTag = isCurrent
      ? `<span style="color: ${HIGHLIGHT_ACCENT}; font-size: 11px; margin-left: 6px; font-weight: bold; white-space: nowrap;">◀ 当前选中</span>`
      : ''
    html += `<div style="${rowStyle}">${marker}<span style="vertical-align:middle;">${d.name}: ${d.formattedValue}${d.unit} (${percent}%)</span>${currentTag}</div>`
  })
  return html
}

/**
 * 构建饼图风格 tooltip：标题 + 列表（高亮当前项）+ 合计行
 */
export function buildHighlightTooltipHtml(
  headerText: string,
  items: HighlightTooltipItem[],
  currentName: string,
  totalText: string
): string {
  let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${headerText}</div>`
  html += buildHighlightRowsHtml(items, currentName)
  html += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; color: var(--text-secondary, #8c8c8c); font-size: 12px;">${totalText}</div>`
  return html
}

/**
 * 生成 tooltip 定位回调（配合 confine:false + appendToBody:true 使用）
 * 回调的入参与返回值均相对于图表容器，边界判断时结合容器在页面中的偏移换算到视口坐标系
 * 策略：水平优先鼠标右侧、垂直优先鼠标下侧，放不下时翻转，最后夹在视口内，
 * 避免靠上的图表 tooltip 向上溢出屏幕顶部导致显示不全
 */
export function createTooltipPosition(getContainer: () => HTMLElement | null | undefined) {
  return (point: number[], _params: any, _dom: any, _rect: any, size: any): [number, number] => {
    const [boxWidth, boxHeight] = size.contentSize
    const containerRect = getContainer()?.getBoundingClientRect()
    const offsetX = containerRect?.left ?? 0
    const offsetY = containerRect?.top ?? 0
    const viewWidth = document.documentElement.clientWidth
    const viewHeight = document.documentElement.clientHeight
    const gap = 12
    const margin = 4

    // 水平方向调整：优先鼠标右侧，放不下翻转到左侧
    let x = point[0] + gap
    if (offsetX + x + boxWidth > viewWidth - margin) {
      x = point[0] - boxWidth - gap
    }

    // 垂直方向调整：优先鼠标下侧，放不下翻转到上侧
    let y = point[1] + gap
    if (offsetY + y + boxHeight > viewHeight - margin) {
      y = point[1] - boxHeight - gap
    }

    // 夹在视口内，保证 tooltip 完整可见
    x = Math.max(margin - offsetX, Math.min(x, viewWidth - margin - boxWidth - offsetX))
    y = Math.max(margin - offsetY, Math.min(y, viewHeight - margin - boxHeight - offsetY))
    return [x, y]
  }
}
