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
import type { SelectedBarInfo } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'
import {
  buildDrillConditionFromStatistic
} from '@/framework/components/common/Portal/utils'

// ===== Types =====

export interface VisibilityConfig {
  visibleFirstDimensions?: string[]
  visibleSecondDimensions?: string[]
  visibleStatisticTypes?: string[]
}

export interface RequestParamsResult {
  selectColumnCondition: Record<string, any>
  condition: { conditionList: any[]; andOr: '0' | '1' }
  sort: any
  metricColumn: any[]
  metricCondition: any[]
  statisticColumn: { value: string; label: string }[]
  majorCondition: string
}

// ===== 图表类型 =====

export function getChartType(config: any): 'bar' | 'line' | 'ptLine' | 'pie' | 'metricsPie' | 'treeStackedBar' {
  return config?.dataMetrics?.[0]?.chartType || 'bar'
}

// ===== 配置校验 =====

export function hasValidChartConfig(config: any): boolean {
  if (!config) return false
  const hasMetrics = Array.isArray(config.dataMetrics) && config.dataMetrics.length > 0
  if (!hasMetrics) return false
  // 指标饼图模式无维度，允许 firstDimension 为 null
  const isMetricsPieMode = config.dataMetrics.some((m: any) => m.chartType === 'metricsPie')
  if (isMetricsPieMode) return true
  // 树形堆叠模式：X 轴来自树父节点，只需树关系（treeDimension）
  const isTreeStackedMode = config.dataMetrics.some((m: any) => m.chartType === 'treeStackedBar')
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
 * 统一请求参数构建入口
 *
 * 自动判断 metricsPie / treeStacked / 默认三分支。
 * @param config    指标配置（DimensionIndicatorsFilter 或已解析的 indicatorConfig）
 * @param visibility 可见性过滤（ChartCard 烤进请求；ChartDisplayArea 不传，取数后过滤）
 */
export async function buildRequestParams(
  config: any,
  visibility?: VisibilityConfig
): Promise<RequestParamsResult> {
  // 指标饼图
  const isMetricsPie = config.dataMetrics?.some((m: any) => m.chartType === 'metricsPie')
  if (isMetricsPie) return buildMetricsPieRequestParams(config, visibility)

  // 树形堆叠
  const isTreeStacked = !!config.treeDimension &&
    config.dataMetrics?.some((m: any) => m.chartType === 'treeStackedBar')
  if (isTreeStacked && config.treeDimension) return buildTreeStackedRequestParams(config, visibility)

  // 默认（有维度）
  return buildDefaultRequestParams(config, visibility)
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
    requestParams.majorCondition
  )
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
