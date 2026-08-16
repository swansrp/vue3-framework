/**
 * 智能问数生成物合并器
 *
 * 把 LLM 输出的轻量 chart-spec（ChatBiSpec）合并到指标卡片完整配置上，
 * 产出可直接交给 ChartCard 的 DashboardItem，以及可交给 portal 穿透表的 advance-condition。
 *
 * 合并规则（patch 未给出的项一律沿用指标卡片默认配置）：
 * - patch.chartType              → 覆盖 config.dataMetrics[].chartType（需在八种合法类型内）
 * - patch.visibleFirstDimensions → config.visibleFirstDimensions（与配置项名称取交集）
 * - patch.visibleSecondDimensions → config.visibleSecondDimensions（同上）
 * - patch.visibleMetrics         → config.visibleStatisticTypes（与 dataName 取交集）
 * - patch.timeFilter             → 转 BETWEEN 条件（relation=13, value=[start,end]）合入 config.filterConditions.conditionList
 *
 * visible* 直接写进 config 即可生效：chartDataHelper 构建请求参数时的
 * 回退链 `visibility?.visibleXxx || config.visibleXxx || []` 会读取这些字段。
 */
import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { getCommonStatistic } from '@/framework/components/common/chartConfig/api'
import type { DashboardItem, IndicatorNode } from '@/framework/components/common/chartConfig/types'
import { CHART_TYPE } from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'

import { getChatBiSemantic } from './api'
import type {
  ChartBlueprint,
  ChartPatch,
  ChartSpec,
  ChatBiSemanticCatalog,
  SemanticField,
  SemanticValue,
  TableSpec
} from './types'

const VALID_CHART_TYPES = Object.values(CHART_TYPE) as string[]

// ===== 指标树加载与查找 =====

// 指标树按 tableId 缓存（面板会话内指标配置不变；权限过滤由接口按登录态返回）
const treeCache = new Map<string, IndicatorNode[]>()

export async function loadIndicatorTree(tableId: string): Promise<IndicatorNode[]> {
  const cached = treeCache.get(tableId)
  if (cached) return cached
  const resp = await getCommonStatistic(tableId)
  const tree: IndicatorNode[] = Array.isArray(resp?.payload) ? resp.payload : []
  treeCache.set(tableId, tree)
  return tree
}

// 按 indicatorId 深度查找指标卡片节点（id/key 字符串化比较，兼容大数 id 转字符串）
export function findIndicatorNode(nodes: IndicatorNode[], indicatorId: number | string): IndicatorNode | null {
  const target = String(indicatorId)
  for (const node of nodes) {
    if (String(node.id) === target || String(node.key) === target) return node
    if (node.children?.length) {
      const found = findIndicatorNode(node.children, indicatorId)
      if (found) return found
    }
  }
  return null
}

// ===== 图表生成物合并 =====

/**
 * 单个图表生成物 → DashboardItem
 *
 * @param node      指标卡片树节点（loadIndicatorTree 结果）
 * @param chartSpec LLM 输出的图表生成物
 * @param tableId   归属表格 code（ChartCard 取数依赖）
 * @param seq       生成物序号（保证同卡片多次引用时 DashboardItem.id 唯一）
 * @return 合并失败（配置非法）返回 null，调用方跳过该生成物
 */
export function mergeChartSpec(node: IndicatorNode, chartSpec: ChartSpec, tableId: string, seq = 0): DashboardItem | null {
  const patch = chartSpec.patch || {}
  let source: any
  try {
    source = typeof node.indicator === 'string' ? JSON.parse(node.indicator || '{}') : (node.indicator || {})
  } catch {
    console.warn('chatbi 指标卡片配置解析失败，跳过:', node.id)
    return null
  }
  if (!source || !Array.isArray(source.dataMetrics) || source.dataMetrics.length === 0) {
    console.warn('chatbi 指标卡片缺少 dataMetrics，跳过:', node.id)
    return null
  }

  // 深拷贝后打补丁，避免污染缓存中的原节点配置
  const cfg = JSON.parse(JSON.stringify(source))

  // 图表类型：合法类型才覆盖（图表内全部指标项统一切换）
  if (patch.chartType && VALID_CHART_TYPES.includes(patch.chartType)) {
    cfg.dataMetrics.forEach((m: any) => {
      m.chartType = patch.chartType
    })
  }

  // 维度/指标可见性：与配置中真实存在的名称取交集，交集为空沿用默认（防御模型幻觉名称）
  const firstNames = cfg.firstDimension?.indicatorItems?.map((i: any) => i.itemName) || []
  const matchedFirst = intersect(patch.visibleFirstDimensions, firstNames)
  if (matchedFirst) cfg.visibleFirstDimensions = matchedFirst

  const secondNames = cfg.secondDimension?.indicatorItems?.map((i: any) => i.itemName) || []
  const matchedSecond = intersect(patch.visibleSecondDimensions, secondNames)
  if (matchedSecond) cfg.visibleSecondDimensions = matchedSecond

  const metricNames = cfg.dataMetrics.map((m: any) => m.dataName)
  const matchedMetrics = intersect(patch.visibleMetrics, metricNames)
  if (matchedMetrics) cfg.visibleStatisticTypes = matchedMetrics

  // 时间范围：转 BETWEEN 叶子条件追加进原筛选条件（AND 关系）
  const timeCondition = buildTimeCondition(patch)
  if (timeCondition) {
    if (!cfg.filterConditions) cfg.filterConditions = { conditionList: [], andOr: '0' }
    if (!Array.isArray(cfg.filterConditions.conditionList)) cfg.filterConditions.conditionList = []
    cfg.filterConditions.conditionList.push(timeCondition)
  }

  return {
    id: `chatbi-${node.id}-${seq}`,
    title: node.title || '未命名指标',
    subTitle: node.subTitle || '',
    description: chartSpec.reason || node.description || '',
    displayOrder: seq,
    commonStatistic: node.id,
    xGrid: node.defaultXGrid || 4,
    yGrid: node.defaultYGrid || 3,
    xPosition: 1,
    yPosition: 1,
    show: true,
    config: { tableId, indicator: cfg },
    indicatorId: node.id
  } as DashboardItem
}

// 候选名称与合法名称取交集；候选为空或交集为空返回 null（沿用默认全部可见）
function intersect(candidates: string[] | undefined, validNames: string[]): string[] | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  const matched = candidates.filter(name => validNames.includes(name))
  return matched.length > 0 ? matched : null
}

function buildTimeCondition(patch: ChartPatch): ConditionListType | null {
  const filter = patch.timeFilter
  if (!filter?.property || !filter.start || !filter.end) return null
  return {
    property: filter.property,
    relation: FILTER_TYPE.BETWEEN,
    value: [filter.start, filter.end],
    conditionList: [],
    andOr: '0'
  }
}

// ===== 表格生成物 → portal 穿透表条件 =====

// TableSpec.conditions（叶子协议）包一层 conditionList 后注入穿透表 advance-condition
export function buildTableCondition(tableSpec: TableSpec): ConditionListType {
  const leaves = Array.isArray(tableSpec.conditions) ? tableSpec.conditions : []
  return {
    property: null,
    value: null,
    relation: null,
    conditionList: leaves
      .filter(c => c?.property && c.relation != null && Array.isArray(c.value) && c.value.length > 0)
      .map(c => ({
        property: c.property,
        relation: c.relation,
        value: c.value,
        conditionList: [],
        andOr: c.andOr || '0'
      })),
    andOr: '0'
  }
}

// ===== 图表自造编译（ChartSpec.config 语义插槽 → DashboardItem）=====

// 语义目录按 tableId 缓存（编译自造图需要字段值域/树字典编码/日期格式；面板会话内目录不变）
const semanticCache = new Map<string, ChatBiSemanticCatalog | null>()

export async function loadSemanticCatalog(tableId: string): Promise<ChatBiSemanticCatalog | null> {
  if (semanticCache.has(tableId)) return semanticCache.get(tableId) || null
  try {
    const resp = await getChatBiSemantic(tableId)
    const catalog = resp?.payload || null
    semanticCache.set(tableId, catalog)
    return catalog
  } catch {
    // 目录拉取失败静默缓存 null，自造图编译跳过，不影响复用卡片路径
    semanticCache.set(tableId, null)
    return null
  }
}

// 自造图确定性调色板（与同比环比合成系列一致，多次渲染颜色稳定）
const FORGE_PALETTE = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD', '#78D3F8', '#9661BC']

// 维度项匹配关系：树多选合一字段按包含，其余等值（与 treeStacked.relationByFieldType 口径一致）
const relationForField = (fieldType?: string): FILTER_TYPE =>
  fieldType === 'tree-multi' ? FILTER_TYPE.CONTAIN : FILTER_TYPE.EQUAL

// 字段查找：自造插槽必须命中语义目录，防御模型幻觉字段名
const findField = (catalog: ChatBiSemanticCatalog, property?: string): SemanticField | null =>
  (property && catalog.fields.find(f => f.property === property)) || null

// 蓝图指标过滤：field 非空必须命中目录（防幻觉聚合列），空保留为计数；至多 4 个与配置约束一致
const resolveMetrics = (catalog: ChatBiSemanticCatalog, metrics?: ChartBlueprint['metrics']) => {
  const resolved: NonNullable<ChartBlueprint['metrics']> = []
  for (const m of Array.isArray(metrics) ? metrics : []) {
    if (!m) continue
    if (m.field && !findField(catalog, m.field)) continue
    resolved.push(m)
    if (resolved.length >= 4) break
  }
  return resolved
}

// 指标显示名缺省：聚合取字段显示名，计数用「数量」
const metricName = (catalog: ChatBiSemanticCatalog, m: { name?: string; field?: string }): string => {
  if (m.name) return m.name
  if (m.field) return findField(catalog, m.field)?.label || m.field
  return '数量'
}

// 蓝图维度项与目录值域对齐：label 命中者按给定顺序取用，未给出或全部未命中回退全量
const resolveItems = (field: SemanticField, items?: SemanticValue[]): SemanticValue[] => {
  const values = field.values || []
  if (!Array.isArray(items) || items.length === 0) return values
  const byLabel = new Map(values.map(v => [v.label, v]))
  const resolved = items.map(i => byLabel.get(i?.label || '')).filter((v): v is SemanticValue => !!v)
  return resolved.length > 0 ? resolved : values
}

// 维度组编译：值域条目 → 一/二级维度（每项一条匹配叶子条件，与卡片配置生成器产物同构）
const forgeDimensionGroup = (field: SemanticField, items: SemanticValue[]) => {
  const relation = relationForField(field.fieldType)
  return {
    groupName: field.label,
    groupValue: field.property,
    indicatorItems: items.map(item => ({
      itemName: item.label,
      itemValue: item.value,
      queryConditions: {
        conditionList: [
          { property: field.property, relation, value: [item.value], conditionList: [], andOr: '0' }
        ],
        andOr: '0'
      }
    }))
  }
}

// 蓝图全局筛选：filters 叶子 + timeFilter 介于条件，编入卡片级 filterConditions（四种取数分支公共携带）
const buildForgeFilterConditions = (blueprint: ChartBlueprint) => {
  const leaves: ConditionListType[] = []
  for (const c of Array.isArray(blueprint.filters) ? blueprint.filters : []) {
    if (c?.property && c.relation != null && Array.isArray(c.value) && c.value.length > 0) {
      leaves.push({ property: c.property, relation: c.relation, value: c.value, conditionList: [], andOr: c.andOr || '0' })
    }
  }
  const time = buildTimeCondition({ timeFilter: blueprint.timeFilter })
  if (time) leaves.push(time)
  return { conditionList: leaves, andOr: '0' as const }
}

// 标准系列行：颜色/格式确定性分配（pie 按维度项填 itemColors 供扇区配色）
const forgeMetricRows = (
  chartType: string,
  metrics: Array<{ name?: string; field?: string }>,
  catalog: ChatBiSemanticCatalog,
  dimItems?: SemanticValue[]
) =>
  metrics.map((m, i) => ({
    dataName: metricName(catalog, m),
    dataField: m.field || '',
    chartType,
    color: FORGE_PALETTE[i % FORGE_PALETTE.length],
    yAxisPosition: 'left',
    stackGroup: 'noStack',
    formatConfig: { fix: 0, unitDivisor: 1 },
    itemColors: dimItems
      ? Object.fromEntries(dimItems.map((it, j) => [it.value, FORGE_PALETTE[j % FORGE_PALETTE.length]]))
      : {}
  }))

// 分组字段字典映射（值域 value→label，rankingBar 结果码值翻译用；无值域时空映射）
const dictMapOf = (field: SemanticField): Record<string, string> => {
  const map: Record<string, string> = {}
  for (const v of field.values || []) map[v.value] = v.label
  return map
}

/**
 * 图表自造编译：ChartSpec.config（语义插槽）→ DashboardItem
 *
 * LLM 只填语义插槽（维度字段/指标/分组/日期/筛选…），系列色、坐标轴、格式化等
 * 渲染细节由本编译器按已配置卡片同构格式补齐，产物直接交给 ChartCard 渲染取数。
 * 插槽字段必须命中语义目录（防幻觉），未命中返回 null 由调用方跳过。
 *
 * @param chartSpec 含 config 蓝图的图表生成物
 * @param catalog   语义目录（loadSemanticCatalog 结果，提供字段值域/字典编码/日期格式）
 * @param tableId   归属表格 code（ChartCard 取数依赖）
 * @param seq       生成物序号（保证 DashboardItem.id 唯一）
 */
export function forgeChartItem(
  chartSpec: ChartSpec,
  catalog: ChatBiSemanticCatalog,
  tableId: string,
  seq = 0
): DashboardItem | null {
  const bp = chartSpec.config || {}
  const chartType = VALID_CHART_TYPES.includes(bp.chartType) ? bp.chartType : CHART_TYPE.BAR
  const metrics = resolveMetrics(catalog, bp.metrics)
  if (metrics.length === 0) {
    console.warn('chatbi 自造图表缺少合法指标，跳过:', bp.title || bp.chartType)
    return null
  }

  const cfg: any = { filterConditions: buildForgeFilterConditions(bp) }

  if (chartType === CHART_TYPE.METRICS_PIE) {
    // 指标饼图：无维度，扇区=指标字段（field 必填，计数类混入即语义不成立）
    if (metrics.some(m => !m.field)) {
      console.warn('chatbi 自造指标饼图存在计数类指标（field 必填），跳过:', bp.title)
      return null
    }
    cfg.firstDimension = null
    cfg.secondDimension = null
    cfg.dataMetrics = forgeMetricRows(CHART_TYPE.METRICS_PIE, metrics, catalog)
  } else if (chartType === CHART_TYPE.RANKING_BAR) {
    // 排行榜：无维度，分组字段触发 GROUP BY，空 dataField=计数
    const groupField = findField(catalog, bp.groupByField)
    if (!groupField) {
      console.warn('chatbi 自造排行榜缺少合法分组字段，跳过:', bp.groupByField)
      return null
    }
    cfg.firstDimension = null
    cfg.secondDimension = null
    cfg.dataMetrics = [{
      ...forgeMetricRows(chartType, metrics.slice(0, 1), catalog)[0],
      groupByField: groupField.property,
      groupByLabel: groupField.label,
      topN: bp.topN ?? 10,
      // UI 语义 0=正序(ASC)/1=倒序(DESC)；蓝图缺省 desc
      sortOrder: bp.sortOrder === 'asc' ? 0 : 1,
      groupByDictMap: dictMapOf(groupField)
    }]
  } else if (chartType === CHART_TYPE.TREE_STACKED_BAR) {
    // 树形堆叠：仅存树字典引用，渲染时实时拉树合成虚拟维度（存储配置中一/二级维度为 null）
    const treeField = findField(catalog, bp.treeField)
    if (!treeField?.dictName) {
      console.warn('chatbi 自造树形堆叠缺少带字典的树字段，跳过:', bp.treeField)
      return null
    }
    cfg.treeDimension = {
      dictName: treeField.dictName,
      property: treeField.property,
      fieldType: treeField.fieldType === 'tree-multi' ? FIELD_TYPE.TREE_MULTI_IN_ONE : FIELD_TYPE.TREE,
      displayName: treeField.label
    }
    cfg.firstDimension = null
    cfg.secondDimension = null
    cfg.dataMetrics = forgeMetricRows(CHART_TYPE.TREE_STACKED_BAR, metrics, catalog)
  } else if (chartType === CHART_TYPE.COMPARISON_BAR) {
    // 同比环比：无维度，周期桶由 dateFormat 分支生成；dataField 空=计数
    const dateField = findField(catalog, bp.dateField)
    if (!dateField) {
      console.warn('chatbi 自造同比环比缺少合法日期字段，跳过:', bp.dateField)
      return null
    }
    cfg.firstDimension = null
    cfg.secondDimension = null
    cfg.dataMetrics = [{
      ...forgeMetricRows(chartType, metrics.slice(0, 1), catalog)[0],
      dateField: dateField.property,
      dateFieldLabel: dateField.label,
      dateFormat: dateField.dateFormat || 'DATETIME'
    }]
  } else {
    // bar/line/ptLine/pie：一级维度必需（值域非空），可选二级维度交叉分析
    const dimField = findField(catalog, bp.dimensionField)
    if (!dimField || !dimField.values?.length) {
      console.warn('chatbi 自造图表缺少有值域的维度字段，跳过:', bp.dimensionField)
      return null
    }
    const dimItems = resolveItems(dimField, bp.dimensionItems)
    cfg.firstDimension = forgeDimensionGroup(dimField, dimItems)
    const secondField = findField(catalog, bp.secondDimensionField)
    const secondItems = secondField?.values?.length ? resolveItems(secondField, bp.secondDimensionItems) : []
    cfg.secondDimension = secondItems.length > 0 ? forgeDimensionGroup(secondField, secondItems) : null
    cfg.dataMetrics = forgeMetricRows(chartType, metrics, catalog, dimItems)
  }

  return {
    id: `chatbi-forge-${seq}`,
    title: bp.title || forgeTitle(chartType, cfg),
    subTitle: '',
    description: chartSpec.reason || '',
    displayOrder: seq,
    // 自造图不引用任何已配置卡片（ChartCard 渲染真源是 config.indicator + tableId）
    commonStatistic: '',
    xGrid: 4,
    yGrid: 3,
    xPosition: 1,
    yPosition: 1,
    show: true,
    config: { tableId, indicator: cfg }
  } as DashboardItem
}

// 标题兜底（蓝图未给 title 时按模式给业务可读名）
function forgeTitle(chartType: string, cfg: any): string {
  const first = cfg.dataMetrics?.[0]
  switch (chartType) {
    case CHART_TYPE.RANKING_BAR:
      return `${first?.groupByLabel || '分组'}TOP${first?.topN ?? 10}`
    case CHART_TYPE.TREE_STACKED_BAR:
      return `${cfg.treeDimension?.displayName || '树形维度'}构成`
    case CHART_TYPE.COMPARISON_BAR:
      return `${first?.dataName || '指标'}同比对比`
    case CHART_TYPE.METRICS_PIE:
      return '指标构成'
    default:
      return `${cfg.firstDimension?.groupName || ''}${first?.dataName || ''}统计`
  }
}
