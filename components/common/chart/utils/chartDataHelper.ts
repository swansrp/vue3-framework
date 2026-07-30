/**
 * 图表渲染共享工具
 *
 * ChartDisplayArea（配置弹窗）与 ChartCard（仪表盘卡片）两条渲染链路的公共逻辑：
 * - 请求参数构建（metricsPie / treeStacked / 默认笛卡尔积）
 * - API 调用封装
 * - 图表分类（X 轴）计算
 * - 维度值映射
 * - 点击事件参数解析 + selectedBarInfo 构建
 * - 数据过滤（后置可见性过滤 / 隐藏为 0 / 排序）
 *
 * 校验逻辑（树形校验、回写维度、颜色分配）不在此文件中，
 * 由各组件按需在调用前完成。
 */
import { buildTreeStackedData } from './treeStacked'

import { advancedStatisticRequest } from '@/framework/apis'
import type { ChartType, ChartMode } from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import { CHART_TYPE, CHART_MODE } from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import type { SelectedBarInfo } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import {
  buildDrillConditionFromStatistic
} from '@/framework/components/common/Portal/utils'

// ===== Types =====

// 同比环比展示态选项（echarts UI 配置，不持久化到后端 JSON）
export interface ComparisonDisplayOptions {
  yearCount?: number  // 展示年份数量（2~10）
  month?: number      // 统计月份（1~12，dateFormat=YYYY 时无效）
  endYear?: number    // 截止年份（默认当前年）
  scope?: 'single' | 'ytd'  // 统计口径：single=单月，ytd=年累计(1月~当前月)；dateFormat=YYYY 固定整年
  showMom?: boolean   // 是否显示环比线（默认关闭；dateFormat=YYYY 无环比）
}

export interface VisibilityConfig {
  visibleFirstDimensions?: string[]
  visibleSecondDimensions?: string[]
  visibleStatisticTypes?: string[]
  comparison?: ComparisonDisplayOptions
}

export interface RequestParamsResult {
  selectColumnCondition: Record<string, any>
  condition: { conditionList: any[]; andOr: '0' | '1' }
  sort: any
  metricColumn: any[]
  metricCondition: any[]
  statisticColumn: { value: string; label: string }[]
  majorCondition: string
  limit?: number | null
}

// ===== 图表类型 =====

export function getChartType(config: any): ChartType {
  return config?.dataMetrics?.[0]?.chartType || CHART_TYPE.BAR
}

// 解析图表“模式”（将具体 chartType 归类为三种配置模式）
// - metricsPie：任一指标为指标饼图
// - treeStackedBar：任一指标为树形堆叠，或存在树关系 treeDimension
// - standard：其余标准图表
// 注：metricsPie 优先于 treeStackedBar；与各配置/批量编辑弹窗的模式判定保持 OR 语义一致
export function resolveChartMode(config: any): ChartMode {
  const metrics = Array.isArray(config?.dataMetrics) ? config.dataMetrics : []
  if (metrics.some((m: any) => m.chartType === CHART_TYPE.METRICS_PIE)) return CHART_MODE.METRICS_PIE
  if (metrics.some((m: any) => m.chartType === CHART_TYPE.RANKING_BAR)) return CHART_MODE.RANKING_BAR
  if (metrics.some((m: any) => m.chartType === CHART_TYPE.COMPARISON_BAR)) return CHART_MODE.COMPARISON_BAR
  if (metrics.some((m: any) => m.chartType === CHART_TYPE.TREE_STACKED_BAR) || config?.treeDimension) return CHART_MODE.TREE_STACKED_BAR
  return CHART_MODE.STANDARD
}

// ===== 配置校验 =====

export function hasValidChartConfig(config: any): boolean {
  if (!config) return false
  const hasMetrics = Array.isArray(config.dataMetrics) && config.dataMetrics.length > 0
  if (!hasMetrics) return false
  // 指标饼图模式无维度，允许 firstDimension 为 null
  const isMetricsPieMode = config.dataMetrics.some((m: any) => m.chartType === CHART_TYPE.METRICS_PIE)
  if (isMetricsPieMode) return true
  // 排行榜(Top-N)模式：无维度，只需分组字段
  const isRankingMode = config.dataMetrics.some((m: any) => m.chartType === CHART_TYPE.RANKING_BAR)
  if (isRankingMode) return !!config.dataMetrics[0]?.groupByField
  // 同比环比模式：无维度，只需时间字段
  const isComparisonMode = config.dataMetrics.some((m: any) => m.chartType === CHART_TYPE.COMPARISON_BAR)
  if (isComparisonMode) return !!config.dataMetrics[0]?.dateField
  // 树形堆叠模式：X 轴来自树父节点，只需树关系（treeDimension）
  const isTreeStackedMode = config.dataMetrics.some((m: any) => m.chartType === CHART_TYPE.TREE_STACKED_BAR)
  if (isTreeStackedMode) return !!config.treeDimension
  // 其他模式必须有 firstDimension
  return !!config.firstDimension
}

// ===== 图表分类（X 轴）=====

/**
 * 构建图表 X 轴分类
 * 以配置的第一维度顺序为准，与后端返回数据做交集，再按可见性过滤
 *
 * @param data             图表数据
 * @param configuredOrder  配置中的第一维度顺序
 * @param visibleDimensions 可见的第一维度列表（空/不传 = 全部可见）
 * @param sortApplied       是否已应用排序（排序时分类跟随数据顺序）
 */
export function buildChartCategories(
  data: any[],
  configuredOrder: string[],
  visibleDimensions?: string[],
  sortApplied = false
): string[] {
  if (!data.length) return []
  const dataCats = [...new Set(data.map((item: any) => item.metricLabel?.split('&&')[0]).filter(Boolean))]

  // 应用排序时，分类跟随排序后的数据顺序
  if (sortApplied) return dataCats

  const ordered = configuredOrder.filter((name: string) => dataCats.includes(name))
  const extras = dataCats.filter((name: string) => !configuredOrder.includes(name))
  const allCategories = [...ordered, ...extras]

  if (!visibleDimensions || visibleDimensions.length === 0) return allCategories
  return allCategories.filter((cat) => visibleDimensions.includes(cat))
}

// ===== 维度值映射 =====

export function buildDimensionValueMap(config: any) {
  const first: Record<string, string> = {}
  const second: Record<string, string> = {}

  config?.firstDimension?.indicatorItems?.forEach((item: any) => {
    first[item.itemName] = typeof item.itemValue === 'string' ? item.itemValue : String(item.itemValue)
  })
  config?.secondDimension?.indicatorItems?.forEach((item: any) => {
    second[item.itemName] = typeof item.itemValue === 'string' ? item.itemValue : String(item.itemValue)
  })

  return { first, second }
}

// ===== 请求参数构建 =====

/**
 * 指标饼图请求参数
 * 扇区 = 数据指标字段，无维度，多统计字段独立 SUM
 */
export function buildMetricsPieRequestParams(config: any, visibility?: VisibilityConfig): RequestParamsResult {
  const visibleStatisticTypes = visibility?.visibleStatisticTypes || config.visibleStatisticTypes || []
  const visibleDataMetrics = visibleStatisticTypes.length > 0
    ? config.dataMetrics.filter((metric: any) => visibleStatisticTypes.includes(metric.dataName))
    : config.dataMetrics

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: (config.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    sort: null,
    metricColumn: [],
    // 空条件生成 1=1，使 CASE WHEN 等价于直接 SUM
    metricCondition: [
      { value: 'metricsPie', label: '指标饼图', condition: { andOr: '0' as const, conditionList: [] } }
    ],
    statisticColumn: visibleDataMetrics?.map((metric: any) => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: '1'
  }
}

/**
 * 树形堆叠请求参数
 * 父节点为 X 轴，每根柱子仅堆叠其直属子节点（非笛卡尔积）
 */
export async function buildTreeStackedRequestParams(
  config: any,
  visibility?: VisibilityConfig
): Promise<RequestParamsResult> {
  // 复用共享取数逻辑：拉树 → 拍平 → 按可见性过滤 → 生成条件
  const { metricConditions } = await buildTreeStackedData(
    config.treeDimension,
    visibility?.visibleFirstDimensions || config.visibleFirstDimensions || [],
    visibility?.visibleSecondDimensions || config.visibleSecondDimensions || []
  )

  const visibleStatisticTypes = visibility?.visibleStatisticTypes || config.visibleStatisticTypes || []
  const visibleDataMetrics = visibleStatisticTypes.length > 0
    ? config.dataMetrics?.filter((metric: any) => visibleStatisticTypes.includes(metric.dataName))
    : config.dataMetrics

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: (config.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    sort: null,
    metricColumn: [],
    metricCondition: metricConditions,
    statisticColumn: visibleDataMetrics?.map((metric: any) => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: ''
  }
}

/**
 * 默认请求参数（有维度，笛卡尔积交叉组合）
 */
export function buildDefaultRequestParams(
  config: any,
  visibility?: VisibilityConfig
): RequestParamsResult {
  const metricConditions: any[] = []

  // 处理一级维度
  if (config.firstDimension?.indicatorItems) {
    const visibleFirstDims = visibility?.visibleFirstDimensions || config.visibleFirstDimensions || []
    const firstItems = visibleFirstDims.length > 0
      ? config.firstDimension.indicatorItems.filter((item: any) => visibleFirstDims.includes(item.itemName))
      : config.firstDimension.indicatorItems

    if (config.secondDimension?.indicatorItems) {
      const visibleSecondDims = visibility?.visibleSecondDimensions || config.visibleSecondDimensions || []
      const secondItems = visibleSecondDims.length > 0
        ? config.secondDimension.indicatorItems.filter((item: any) => visibleSecondDims.includes(item.itemName))
        : config.secondDimension.indicatorItems

      // 有二级维度，进行交叉组合
      firstItems.forEach((firstItem: any) => {
        secondItems.forEach((secondItem: any) => {
          metricConditions.push({
            value: `${config.firstDimension.groupValue}&&${firstItem.itemValue}&&${config.secondDimension.groupValue}&&${secondItem.itemValue}`,
            label: `${firstItem.itemName}&&${secondItem.itemName}`,
            condition: {
              andOr: '0',
              conditionList: [
                ...(firstItem.queryConditions?.conditionList || []),
                ...(secondItem.queryConditions?.conditionList || [])
              ]
            }
          })
        })
      })
    } else {
      // 只有一级维度
      firstItems.forEach((item: any) => {
        metricConditions.push({
          value: `${config.firstDimension.groupValue}&&${item.itemValue}`,
          label: item.itemName,
          condition: item.queryConditions
        })
      })
    }
  }

  const visibleStatisticTypes = visibility?.visibleStatisticTypes || config.visibleStatisticTypes || []
  const visibleDataMetrics = visibleStatisticTypes.length > 0
    ? config.dataMetrics?.filter((metric: any) => visibleStatisticTypes.includes(metric.dataName))
    : config.dataMetrics

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: (config.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    sort: null,
    metricColumn: [],
    metricCondition: metricConditions,
    statisticColumn: visibleDataMetrics?.map((metric: any) => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: ''
  }
}

/**
 * 排行榜(Top-N)请求参数
 * 往 metricColumn 传一个分组字段触发 GROUP BY；metricCondition 保持空以启用后端 limit 分支；
 * statisticColumn 空=计数 count(1)，填字段=对该字段 sum；sort 控制正/倒序，limit 控制取前 N 名。
 */
export function buildRankingRequestParams(config: any, _visibility?: VisibilityConfig): RequestParamsResult {
  const metric = config.dataMetrics?.[0] || {}
  const groupByField: string = metric.groupByField || ''
  const groupByLabel: string = metric.groupByLabel || groupByField
  const groupByDictMap = metric.groupByDictMap || {}
  // 统计字段：dataField 非空=对该金额/数值字段求和；空=计数
  const sumField: string = metric.dataField || ''

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: (config.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    // sortOrder：UI 1=倒序(从大到小)、0=正序(从小到大)；后端驱动语义 1=ASC、2=DESC
    sort: (metric.sortOrder ?? 1) === 0 ? 1 : 2,
    // 非空 column 触发 GROUP BY
    metricColumn: [{ column: groupByField, label: groupByLabel, dictMap: groupByDictMap }],
    // 必须为空才能启用后端「纯分组 + limit」分支
    metricCondition: [],
    statisticColumn: [{ value: sumField, label: metric.dataName || (sumField ? groupByLabel : '数量') }],
    majorCondition: '0',
    limit: metric.topN ?? null
  }
}

// ===== 同比环比(comparisonBar) =====

// 同比/环比系列固定显示名（children.metric 与合成渲染指标 dataName 保持一致）
export const COMPARISON_SERIES = { YOY: '同比', MOM: '环比' } as const

// 展示态默认值：当前年 + 当前月，默认展示 5 年，默认年累计口径，环比默认关闭
export function getDefaultComparisonOptions(): Required<ComparisonDisplayOptions> {
  const now = new Date()
  return { yearCount: 5, month: now.getMonth() + 1, endYear: now.getFullYear(), scope: 'ytd', showMom: false }
}

const clampNumber = (v: any, min: number, max: number, fallback: number): number => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

// 归并展示态选项（展示态为 UI 配置，不持久化，取值时统一夹紧到合法区间）
export function resolveComparisonOptions(visibility?: VisibilityConfig): Required<ComparisonDisplayOptions> {
  const defaults = getDefaultComparisonOptions()
  const opts = visibility?.comparison || {}
  return {
    yearCount: clampNumber(opts.yearCount, 2, 10, defaults.yearCount),
    month: clampNumber(opts.month, 1, 12, defaults.month),
    endYear: clampNumber(opts.endYear, 1970, 9999, defaults.endYear),
    scope: opts.scope === 'single' ? 'single' : defaults.scope,
    showMom: opts.showMom === true
  }
}

// 时间字段格式（与列的实际存储形态对应）：
// - DATETIME：真日期/日期时间列（区间条件，带 00:00:00）
// - YYYY-MM-DD / YYYYMMDD：日期文本列（区间条件，字典序即时间序）
// - YYYY-MM / YYYYMM：年月文本列（相等 / IN 匹配）
// - YYYY：纯年份列（相等匹配，仅同比）
export type ComparisonDateFormat = 'DATETIME' | 'YYYY' | 'YYYY-MM' | 'YYYYMM' | 'YYYY-MM-DD' | 'YYYYMMDD'
const COMPARISON_DATE_FORMATS: ComparisonDateFormat[] = ['DATETIME', 'YYYY', 'YYYY-MM', 'YYYYMM', 'YYYY-MM-DD', 'YYYYMMDD']
export function resolveComparisonDateFormat(metric: any): ComparisonDateFormat {
  const f = metric?.dateFormat
  return COMPARISON_DATE_FORMATS.includes(f) ? f : 'DATETIME'
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const periodKey = (year: number, month: number) => `${year}-${pad2(month)}`
// ytd 口径下环比专用单月桶标签（避免与年累计当期桶 'YYYY-MM' 冲突，仅内部使用不上 X 轴）
const momBucketKey = (year: number, month: number) => `${periodKey(year, month)}-MOM`
// 上一个月（1 月取上年 12 月）
const prevOfMonth = (year: number, month: number): [number, number] =>
  month === 1 ? [year - 1, 12] : [year, month - 1]
// 年月文本列的存储值（YYYY-MM 或 YYYYMM）
const formatPeriodValue = (format: ComparisonDateFormat, year: number, month: number) =>
  format === 'YYYYMM' ? `${year}${pad2(month)}` : periodKey(year, month)

// 天粒度区间格式（含 DATETIME）：用 [起, 止) 半开区间过滤，文本列字典序与时间序一致
const isRangeFormat = (format: ComparisonDateFormat) =>
  format === 'DATETIME' || format === 'YYYY-MM-DD' || format === 'YYYYMMDD'

// 某年某月 1 日 0 点的边界字面量（按格式生成）
const monthStartLiteral = (format: ComparisonDateFormat, year: number, month: number) => {
  if (format === 'YYYYMMDD') return `${year}${pad2(month)}01`
  if (format === 'YYYY-MM-DD') return `${periodKey(year, month)}-01`
  return `${periodKey(year, month)}-01 00:00:00`
}

const singleCondition = (conditionList: any[]) => ({ andOr: '0' as const, conditionList })

// [起月1日, 止月1日) 区间条件
const buildRangeCondition = (format: ComparisonDateFormat, dateField: string, startY: number, startM: number, endY: number, endM: number) =>
  singleCondition([
    { property: dateField, relation: FILTER_TYPE.GREATER_EQUAL, value: [monthStartLiteral(format, startY, startM)], conditionList: [] },
    { property: dateField, relation: FILTER_TYPE.LESS, value: [monthStartLiteral(format, endY, endM)], conditionList: [] }
  ])

// 单月条件：区间格式为 [当月1日, 次月1日)；年月文本列为相等匹配
const buildSingleMonthCondition = (format: ComparisonDateFormat, dateField: string, year: number, month: number) => {
  if (isRangeFormat(format)) {
    const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1]
    return buildRangeCondition(format, dateField, year, month, ny, nm)
  }
  return singleCondition([
    { property: dateField, relation: FILTER_TYPE.EQUAL, value: [formatPeriodValue(format, year, month)], conditionList: [] }
  ])
}

// 年累计条件：区间格式为 [当年1月1日, 次月1日)；年月文本列为 IN(1月..当前月)
const buildYtdCondition = (format: ComparisonDateFormat, dateField: string, year: number, month: number) => {
  if (isRangeFormat(format)) {
    const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1]
    return buildRangeCondition(format, dateField, year, 1, ny, nm)
  }
  const values: string[] = []
  for (let m = 1; m <= month; m++) values.push(formatPeriodValue(format, year, m))
  return singleCondition([
    { property: dateField, relation: FILTER_TYPE.IN, value: values, conditionList: [] }
  ])
}

// 当期柱条件：按口径取单月或年累计
const buildMainCondition = (format: ComparisonDateFormat, dateField: string, year: number, month: number, scope: 'single' | 'ytd') =>
  scope === 'ytd' ? buildYtdCondition(format, dateField, year, month) : buildSingleMonthCondition(format, dateField, year, month)

// 纯年份列条件：field = 'YYYY' 相等匹配
const buildYearEqualCondition = (dateField: string, year: number) =>
  singleCondition([
    { property: dateField, relation: FILTER_TYPE.EQUAL, value: [String(year)], conditionList: [] }
  ])

/**
 * 同比环比请求参数
 * 复用标准模式 CASE WHEN 条件桶，按 dateFormat 分支：
 * - YYYY（纯年份列）：每年一个整年桶 + 最早年份的上一年（同比基线），无环比；
 * - 其余（DATETIME/YYYY-MM/YYYYMM）：每年生成「当期柱」桶（单月或年累计口径），
 *   环比为展示态开关（默认关闭），开启时始终按单月口径取数（当月 vs 上月，1 月取上年 12 月），
 *   ytd 口径下额外补单月桶；同比基线为最早展示年份的上一年同口径桶。
 * 一次请求取全数据，同比/环比增长率由前端计算。
 */
export function buildComparisonRequestParams(config: any, visibility?: VisibilityConfig): RequestParamsResult {
  const statMetrics: any[] = config.dataMetrics?.length ? config.dataMetrics : [{}]
  const metric = statMetrics[0]
  const dateField: string = metric.dateField || ''
  const format = resolveComparisonDateFormat(metric)
  const { yearCount, month, endYear, scope, showMom } = resolveComparisonOptions(visibility)

  // 收集去重后的条件桶：label -> condition
  const buckets = new Map<string, any>()
  const addBucket = (label: string, condition: any) => { if (!buckets.has(label)) buckets.set(label, condition) }

  if (format === 'YYYY') {
    // 纯年份列：展示年份 + 最早年份的上一年（同比基线）
    for (let year = endYear - yearCount; year <= endYear; year++) {
      addBucket(String(year), buildYearEqualCondition(dateField, year))
    }
  } else {
    for (let year = endYear - yearCount + 1; year <= endYear; year++) {
      // 当期柱（X 轴桶，label 供穿透匹配）
      addBucket(periodKey(year, month), buildMainCondition(format, dateField, year, month, scope))
      // 环比（开关开启时才取数）：始终单月口径；ytd 下当期/基线用独立单月桶，single 下当期即柱桶
      if (showMom) {
        const [py, pm] = prevOfMonth(year, month)
        if (scope === 'ytd') {
          addBucket(momBucketKey(year, month), buildSingleMonthCondition(format, dateField, year, month))
          addBucket(momBucketKey(py, pm), buildSingleMonthCondition(format, dateField, py, pm))
        } else {
          addBucket(periodKey(py, pm), buildSingleMonthCondition(format, dateField, py, pm))
        }
      }
    }
    // 同比基线：最早展示年份的上一年（同口径）
    addBucket(periodKey(endYear - yearCount, month), buildMainCondition(format, dateField, endYear - yearCount, month, scope))
  }

  const metricConditions = [...buckets.entries()].map(([label, condition]) => ({
    value: `${dateField}&&${label}`,
    label,
    condition
  }))

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: (config.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    sort: null,
    metricColumn: [],
    metricCondition: metricConditions,
    // 多统计字段（同柱堆叠）：每个字段一列独立 SUM；dataField 空=计数
    statisticColumn: statMetrics.map((m: any) => ({ value: m.dataField || '', label: m.dataName || '数量' })),
    majorCondition: ''
  }
}

/**
 * 同比环比响应归一化
 *
 * 将「周期桶」扁平响应归一化为标准嵌套结构，复用 MixedChart 渲染管道：
 * `[{ metric/metricLabel: 'YYYY-MM'或'YYYY'(X轴/穿透桶标签), statistic: 当期总值,
 *     children: [各统计字段(bar,多字段时堆叠), 同比(ptLine,%), 环比(ptLine,%,showMom 开启且非 YYYY 格式才有)] }]`
 *
 * - 多统计字段时每个字段一个 bar child（堆叠成一根柱），增长率按各字段合计值计算；
 * - 增长率 = (当期 - 基期) / |基期| * 100，保留 2 位小数；
 * - 同比按当期柱同口径（单月/年累计/整年）对比上年；环比始终单月口径（当月 vs 上月）；
 * - 基期缺失或为 0 时增长率为 null（折线断点，避免除零误导）；
 * - metricLabel 与请求桶 label 一致，点击穿透可直接用 conditionLabel 匹配。
 */
export function normalizeComparisonResponse(config: any, payload: any[], visibility?: VisibilityConfig): any[] {
  const statMetrics: any[] = config?.dataMetrics?.length ? config.dataMetrics : [{}]
  const metric = statMetrics[0]
  const dateField: string = metric.dateField || ''
  const format = resolveComparisonDateFormat(metric)
  // 与请求 statisticColumn 的 label 一一对应，用于从响应 children 中按名取值
  const statNames: string[] = statMetrics.map((m: any) => m.dataName || '数量')
  const { yearCount, month, endYear, scope, showMom } = resolveComparisonOptions(visibility)

  // 周期标签 -> { 统计字段名 -> 值 }
  const valueByPeriod: Record<string, Record<string, number | null>> = {}
  ;(Array.isArray(payload) ? payload : []).forEach((item: any) => {
    const label = item?.metricLabel
    if (!label) return
    const bucket: Record<string, number | null> = {}
    if (item.children?.length) {
      item.children.forEach((child: any) => {
        bucket[child?.metric] = (child?.statistic === null || child?.statistic === undefined) ? null : Number(child.statistic)
      })
    } else {
      bucket[statNames[0]] = (item.statistic === null || item.statistic === undefined) ? null : Number(item.statistic)
    }
    valueByPeriod[label] = bucket
  })

  // 桶内单字段值（桶或字段缺失按 0）
  const fieldOf = (label: string, name: string): number => valueByPeriod[label]?.[name] ?? 0
  // 桶内各字段合计（桶缺失返回 undefined，供基期判空）
  const totalOf = (label: string): number | undefined => {
    const bucket = valueByPeriod[label]
    if (!bucket) return undefined
    return statNames.reduce((sum, name) => sum + (bucket[name] ?? 0), 0)
  }

  const rate = (current: number, base: number | null | undefined): number | null => {
    if (base === null || base === undefined || base === 0) return null
    return Number((((current - base) / Math.abs(base)) * 100).toFixed(2))
  }

  // 各统计字段的 bar children
  const buildStatChildren = (label: string) => statNames.map(name => ({
    metricColumn: dateField, metric: name, metricLabel: name, statistic: fieldOf(label, name)
  }))

  const result: any[] = []
  for (let year = endYear - yearCount + 1; year <= endYear; year++) {
    if (format === 'YYYY') {
      // 纯年份列：整年对比，仅同比
      const curKey = String(year)
      const current = totalOf(curKey) ?? 0
      const yoyBase = totalOf(String(year - 1))
      result.push({
        metricColumn: dateField,
        metric: curKey,
        metricLabel: curKey,
        statistic: current,
        children: [
          ...buildStatChildren(curKey),
          { metricColumn: dateField, metric: COMPARISON_SERIES.YOY, metricLabel: COMPARISON_SERIES.YOY, statistic: rate(current, yoyBase) }
        ]
      })
      continue
    }
    const curKey = periodKey(year, month)
    const current = totalOf(curKey) ?? 0
    // 同比：同口径对比上年同期
    const yoyBase = totalOf(periodKey(year - 1, month))
    const children: any[] = [
      ...buildStatChildren(curKey),
      { metricColumn: dateField, metric: COMPARISON_SERIES.YOY, metricLabel: COMPARISON_SERIES.YOY, statistic: rate(current, yoyBase) }
    ]
    // 环比（开关开启时才计算）：始终单月口径；ytd 下当期/基线取独立单月桶
    if (showMom) {
      const [py, pm] = prevOfMonth(year, month)
      const momCurrent = scope === 'ytd' ? (totalOf(momBucketKey(year, month)) ?? 0) : current
      const momBase = totalOf(scope === 'ytd' ? momBucketKey(py, pm) : periodKey(py, pm))
      children.push({ metricColumn: dateField, metric: COMPARISON_SERIES.MOM, metricLabel: COMPARISON_SERIES.MOM, statistic: rate(momCurrent, momBase) })
    }
    result.push({
      metricColumn: dateField,
      metric: curKey,
      metricLabel: curKey,
      statistic: current,
      children
    })
  }
  return result
}

/**
 * 合成同比环比渲染指标：各统计字段走左轴柱状图（多字段时堆叠成一根柱），
 * 同比/环比增长率走右轴虚线折线（%）。
 * dataName 与 normalizeComparisonResponse 的 children.metric 对齐，
 * bar + ptLine 组合会被 UniversalChart 自动判定为 mixed 双轴混合图。
 * 环比线由展示态开关控制（showMom，默认关闭）；dateFormat=YYYY（纯年份列）无月份概念，恒不产出环比线。
 */
export function buildComparisonRenderMetrics(config: any, showMom = false): any[] {
  const statMetrics: any[] = config?.dataMetrics?.length ? config.dataMetrics : [{}]
  const format = resolveComparisonDateFormat(statMetrics[0])
  const multiStat = statMetrics.length > 1
  const fallbackColors = ['#5B8FF9', '#61DDAA', '#65789B', '#7262FD', '#78D3F8', '#9661BC']
  const metrics: any[] = statMetrics.map((m: any, i: number) => ({
    dataName: m.dataName || '数量',
    dataField: m.dataField || '',
    chartType: CHART_TYPE.BAR,
    color: m.color || fallbackColors[i % fallbackColors.length],
    yAxisPosition: 'left',
    // 多字段时堆叠成一根柱（同一堆叠组），单字段保持普通柱
    stackGroup: multiStat ? 'stack1' : 'noStack',
    unit: m.unit,
    unitConfig: m.unitConfig,
    formatConfig: m.formatConfig,
    itemColors: {}
  }))
  metrics.push({
    dataName: COMPARISON_SERIES.YOY,
    dataField: '__yoyRate__',
    chartType: CHART_TYPE.PT_LINE,
    color: '#F6BD16',
    yAxisPosition: 'right',
    unit: '%',
    // 数值本身已是增长率百分比：MixedChart 直接展示原值，不做占比换算/0-100 夹紧
    directPercent: true,
    itemColors: {}
  })
  if (showMom && format !== 'YYYY') {
    metrics.push({
      dataName: COMPARISON_SERIES.MOM,
      dataField: '__momRate__',
      chartType: CHART_TYPE.PT_LINE,
      color: '#5AD8A6',
      yAxisPosition: 'right',
      unit: '%',
      directPercent: true,
      itemColors: {}
    })
  }
  return metrics
}

/**
 * 统一请求参数构建入口
 *
 * 自动判断 rankingBar / comparisonBar / metricsPie / treeStacked / 默认五分支。
 * @param config    指标配置（DimensionIndicatorsFilter 或已解析的 indicatorConfig）
 * @param visibility 可见性过滤（ChartCard 烤进请求；ChartDisplayArea 不传，取数后过滤）
 */
export async function buildRequestParams(
  config: any,
  visibility?: VisibilityConfig
): Promise<RequestParamsResult> {
  // 排行榜(Top-N)
  const isRanking = config.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.RANKING_BAR)
  if (isRanking) return buildRankingRequestParams(config, visibility)

  // 同比环比
  const isComparison = config.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.COMPARISON_BAR)
  if (isComparison) return buildComparisonRequestParams(config, visibility)

  // 指标饼图
  const isMetricsPie = config.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.METRICS_PIE)
  if (isMetricsPie) return buildMetricsPieRequestParams(config, visibility)

  // 树形堆叠
  const isTreeStacked = !!config.treeDimension &&
    config.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.TREE_STACKED_BAR)
  if (isTreeStacked && config.treeDimension) return buildTreeStackedRequestParams(config, visibility)

  // 默认（有维度）
  return buildDefaultRequestParams(config, visibility)
}

// ===== 排行榜(Top-N)响应归一化 =====

/**
 * 将后端「纯分组」扁平响应归一化为标准嵌套结构，复用现有 BarChart 渲染管道。
 *
 * 后端返回：`[{ metricColumn, metric: 分组原值/字典码/'NULL', metricLabel: 字典名/'未知'/'null', statistic }]`
 * 归一化为：`[{ metricColumn, metric: 分组原值(供穿透), metricLabel: 显示名(X轴), statistic,
 *              children: [{ metricColumn, metric: 指标名, metricLabel: 指标名, statistic }] }]`
 *
 * - `metric` 保留原始分组值（字典码 / 'NULL'），供点击穿透构建等值条件；
 * - `metricLabel` 为显示名：字典字段用后端反查的字典名，NULL 显示「未填写」，其余用原值；
 * - children 单项的 `metric` = 指标显示名（与 dataMetrics[0].dataName 一致），驱动 BarChart 单系列。
 */
export function normalizeRankingResponse(config: any, payload: any[]): any[] {
  if (!Array.isArray(payload)) return []
  const metric = config?.dataMetrics?.[0] || {}
  const groupByField: string = metric.groupByField || ''
  const statName: string = metric.dataName || (metric.dataField ? metric.dataName : '数量')
  return payload.map((item: any) => {
    const raw = item.metric
    const isNull = raw === 'NULL' || raw === '__NULL__' || raw === null || raw === undefined
    let displayName: string
    if (isNull) {
      // NULL 分组：后端 metricLabel 为「未知」，前端统一显示「未填写」
      displayName = '未填写'
    } else if (item.metricLabel && item.metricLabel !== 'null' && item.metricLabel !== '未知') {
      // 字典字段：后端已反查为字典显示名（非字典字段 metricLabel 为字面量 'null'，走 else 分支）
      displayName = item.metricLabel
    } else {
      displayName = String(raw)
    }
    const statistic = item.statistic
    return {
      metricColumn: groupByField,
      metric: isNull ? 'NULL' : String(raw),
      metricLabel: displayName,
      statistic,
      children: [{ metricColumn: groupByField, metric: statName, metricLabel: statName, statistic }]
    }
  })
}

// ===== API 调用 =====

/**
 * 调用统计 API 获取图表数据
 *
 * @param url       Portal 配置中的接口 URL
 * @param config    指标配置
 * @param visibility 可见性过滤（可选）
 * @returns { requestParams, response } —— requestParams 供穿透条件复用
 */
export async function fetchStatisticData(
  url: string,
  config: any,
  visibility?: VisibilityConfig
): Promise<{ requestParams: RequestParamsResult; response: any }> {
  const requestParams = await buildRequestParams(config, visibility)
  const response = await advancedStatisticRequest(
    url,
    new Map(Object.entries(requestParams.selectColumnCondition || {})),
    requestParams.condition,
    requestParams.sort,
    requestParams.metricColumn,
    requestParams.metricCondition,
    requestParams.statisticColumn,
    requestParams.majorCondition,
    undefined,
    undefined,
    undefined,
    requestParams.limit ?? null
  )
  // 排行榜(Top-N)：将扁平响应归一化为标准嵌套结构，复用现有渲染/过滤/穿透管道
  const isRanking = config?.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.RANKING_BAR)
  if (isRanking && response && Array.isArray(response.payload)) {
    response.payload = normalizeRankingResponse(config, response.payload)
  }
  // 同比环比：周期桶响应归一化 + 前端计算同比/环比增长率
  const isComparison = config?.dataMetrics?.some((m: any) => m.chartType === CHART_TYPE.COMPARISON_BAR)
  if (isComparison && response && Array.isArray(response.payload)) {
    response.payload = normalizeComparisonResponse(config, response.payload, visibility)
  }
  return { requestParams, response }
}

// ===== 点击事件参数解析 =====

/**
 * 解析柱状图/折线图点击参数
 * seriesName 格式：无第二维度 = "统计类型"；有第二维度 = "第二维度&&统计类型"
 */
export function parseBarClickParams(params: any, hasSecondDimension: boolean) {
  const seriesName = params.seriesName
  const firstDim = params.name // x 轴的值（第一维度）

  let secondDim = ''
  let statType = ''

  if (hasSecondDimension && seriesName.includes('&&')) {
    const parts = seriesName.split('&&')
    secondDim = parts[0] || ''
    statType = parts[1] || ''
  } else {
    statType = seriesName
    secondDim = ''
  }
  return { firstDim, secondDim, statType }
}

/**
 * 解析饼图点击参数
 * pieSegmentName 格式：无第二维度 = "第一维度"；有第二维度 = "第一维度&&第二维度"
 */
export function parsePieClickParams(params: any, hasSecondDimension: boolean) {
  const pieSegmentName = params.name
  let firstDim = ''
  let secondDim = ''
  const statType = params.seriesName || '总计'

  if (hasSecondDimension && pieSegmentName.includes('&&')) {
    const parts = pieSegmentName.split('&&')
    firstDim = parts[0] || ''
    secondDim = parts[1] || ''
  } else {
    firstDim = pieSegmentName
    secondDim = ''
  }
  return { firstDim, secondDim, statType, pieSegmentName }
}

// ===== SelectedBarInfo 构建 =====

/**
 * 构建穿透弹窗所需的 SelectedBarInfo
 */
export function buildSelectedBarInfo(
  firstDim: string,
  secondDim: string | null,
  firstDimensionName: string,
  secondDimensionName: string | null,
  statType: string,
  statisticData: string[],
  combinedConditions: any,
  hasSecond: boolean
): SelectedBarInfo {
  return {
    firstDimension: firstDim,
    secondDimension: secondDim || null,
    firstDimensionName,
    secondDimensionName: hasSecond ? secondDimensionName : null,
    statisticType: statType,
    statisticData,
    combinedConditions,
    title: hasSecond && secondDim
      ? `${firstDimensionName}: ${firstDim} && ${secondDimensionName}: ${secondDim} (${statType})`
      : `${firstDimensionName}: ${firstDim} (${statType})`,
    color: '#1890ff'
  }
}

/**
 * 从缓存 statistic 请求体构建穿透条件（ChartCard 使用）
 */
export function buildDrillConditionFromCache(
  lastStatisticBody: any,
  firstDim: string,
  secondDim: string
): any {
  if (!lastStatisticBody) return null
  const conditionLabel = secondDim ? `${firstDim}&&${secondDim}` : firstDim
  return buildDrillConditionFromStatistic(lastStatisticBody, { conditionLabel })
}

/**
 * 排行榜(Top-N)穿透：基于被点分组的原始值构建「全局条件 AND groupByField = 值」。
 * @param lastStatisticBody 最近一次请求体（含 metricColumn，供字典反查）
 * @param groupByField      分组字段列属性名
 * @param rawMetric         被点柱子的分组原值（字典码 / 'NULL'）
 */
export function buildDrillConditionFromRanking(
  lastStatisticBody: any,
  groupByField: string,
  rawMetric: string
): any {
  if (!lastStatisticBody || !groupByField) return null
  return buildDrillConditionFromStatistic(lastStatisticBody, { metricColumn: groupByField, metric: rawMetric })
}

// ===== 数据过滤 =====

/**
 * 后置可见性过滤（ChartDisplayArea 取数后由控制面板使用）
 */
export function filterChartDataByVisibility(
  data: any[],
  visibleFirstDimensions: string[],
  visibleSecondDimensions: string[],
  visibleStatisticTypes: string[]
): any[] {
  if (!data.length) return []
  return data
    .filter((item: any) => {
      const parts = item.metricLabel.split('&&')
      const firstDim = parts[0]
      const secondDim = parts[1]

      const firstDimVisible =
        visibleFirstDimensions.length === 0 || visibleFirstDimensions.includes(firstDim)
      const secondDimVisible =
        visibleSecondDimensions.length === 0 || visibleSecondDimensions.includes(secondDim)

      return firstDimVisible && secondDimVisible
    })
    .map((item: any) => ({
      ...item,
      children: item.children.filter((child: any) => {
        const statType = child.metric
        return (
          visibleStatisticTypes.length === 0 ||
          visibleStatisticTypes.includes(statType)
        )
      })
    }))
    .filter((item: any) => item.children.length > 0)
}

/**
 * 过滤顶层 statistic 为 0 的项；若有 children，仅当所有子项 statistic 均为 0 时才过滤
 */
export function filterZeroData(items: any[]): any[] {
  return items.filter(item => {
    if (Array.isArray(item.children) && item.children.length > 0) {
      return item.children.some((c: any) => Number(c.statistic) !== 0)
    }
    return Number(item.statistic) !== 0
  })
}

/**
 * 按顶层 statistic 数值升/降序，并同步对 children 内部排序
 */
export function sortChartData(items: any[], order: 'asc' | 'desc'): any[] {
  const cmp = (a: any, b: any) => {
    const va = Number(a.statistic) || 0
    const vb = Number(b.statistic) || 0
    return order === 'asc' ? va - vb : vb - va
  }
  return items
    .map(item => {
      const cloned = { ...item }
      if (Array.isArray(item.children) && item.children.length > 0) {
        cloned.children = [...item.children].sort(cmp)
      }
      return cloned
    })
    .sort(cmp)
}

// ===== 维度数据提取 =====

/**
 * 从图表数据中提取维度列表和统计类型
 */
export function extractDimensionData(
  data: any[],
  configFirst?: string[],
  configSecond?: string[]
): {
  firstDimensions: string[]
  secondDimensions: string[]
  statisticTypes: string[]
} {
  const dataFirst = [...new Set(data.map((item: any) => item.metricLabel?.split('&&')[0]).filter(Boolean))]
  const dataSecond = [...new Set(data.map((item: any) => item.metricLabel?.split('&&')[1]).filter(Boolean))]
  const statisticTypes = [
    ...new Set(data.flatMap((item: any) => (item.children || []).map((child: any) => child.metric)))
  ]

  return {
    firstDimensions: configFirst?.length ? configFirst : dataFirst,
    secondDimensions: configSecond?.length ? configSecond : dataSecond,
    statisticTypes
  }
}
