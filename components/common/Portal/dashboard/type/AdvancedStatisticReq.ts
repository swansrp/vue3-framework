// 接收数据的类型定义
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

// ===== 图表类型 / 图表模式 常量（单一事实来源，替代散落的魔法字符串）=====

// 具体图表类型（对应 DataMetric.chartType）
export const CHART_TYPE = {
    BAR: 'bar',
    LINE: 'line',
    PT_LINE: 'ptLine',
    PIE: 'pie',
    METRICS_PIE: 'metricsPie',
    TREE_STACKED_BAR: 'treeStackedBar',
    RANKING_BAR: 'rankingBar',
    COMPARISON_BAR: 'comparisonBar'
} as const
export type ChartType = typeof CHART_TYPE[keyof typeof CHART_TYPE]

// 图表配置模式（由 resolveChartMode 将具体 chartType 归类）
export const CHART_MODE = {
    STANDARD: 'standard',
    METRICS_PIE: 'metricsPie',
    TREE_STACKED_BAR: 'treeStackedBar',
    RANKING_BAR: 'rankingBar',
    COMPARISON_BAR: 'comparisonBar'
} as const
export type ChartMode = typeof CHART_MODE[keyof typeof CHART_MODE]

export interface ConditionGroup {
    andOr: '0' | '1'; // 与框架 ConditionType 保持一致
    conditionList: Array<ConditionListType>
}

export interface IndicatorItem {
    itemName: string
    itemValue: any
    queryConditions: ConditionGroup
    isVisibleInChart?: boolean  // 在图表统计指标控制中是否可见，用于编辑回显
}

export interface IndicatorGroup {
    groupName: string
    groupValue: string
    indicatorItems: Array<IndicatorItem>
}

// 树形维度配置（树形堆叠柱状图）
// 仅存储树形字典引用，渲染时通过 getTreeList 实时拉取树结构，字典变更零维护
export interface TreeDimensionConfig {
    dictName: string       // 树形字典名，如 "DC_DC_PHASE_DICT"
    property: string       // 对应实体字段名
    fieldType: string      // TREE | TREE_MULTI_IN_ONE
    displayName?: string   // 字段显示名（用于展示）
}

// 数据配置项
export interface DataMetric {
    dataName: string        // 数据名称
    dataField: string       // 英文字段名
    chartType: ChartType  // 图表类型
    color: string           // 数据项整体颜色（用于饼图等）
    yAxisPosition: 'left' | 'right'    // 坐标轴位置（饼图不需要）
    stackGroup?: string     // 堆叠位置标识，相同值的会堆叠在一起
    unit?: string          // 数据单位显示文本
    unitConfig?: string    // 原始单位配置，如 "2,10000"
    formatConfig?: { fix: number; unitDivisor: number }  // 格式化配置
    itemColors: Record<string, string>  // 维度项的颜色映射 {itemKey: color}
    isVisibleInChart?: boolean  // 在图表统计指标控制中是否可见，用于编辑回显
    // ===== 排行榜(Top-N)专属字段（chartType === 'rankingBar' 时生效）=====
    groupByField?: string   // 分组字段（列属性名，触发 GROUP BY）
    groupByLabel?: string   // 分组字段显示名
    topN?: number           // 取前 N 名（LIMIT）
    sortOrder?: 0 | 1       // 排序方向：0=正序(ASC)，1=倒序(DESC)
    groupByDictMap?: Record<string, string>  // 分组字段的字典映射（可选）
    // ===== 同比环比专属字段（chartType === 'comparisonBar' 时生效）=====
    // 仅持久化"图是什么"：时间字段 + 统计方式（dataField 空=计数、非空=求和）；
    // 年份数量 / 月份为展示态控制（echarts UI 配置），不写入后端 JSON
    dateField?: string      // 时间字段（列属性名）
    dateFieldLabel?: string // 时间字段显示名
    // 时间字段格式：DATETIME=真日期列(区间条件，默认)；YYYY-MM-DD/YYYYMMDD=日期文本列(区间条件)；
    // YYYY-MM/YYYYMM=年月文本列(相等/IN 匹配)；YYYY=纯年份列(仅同比，无月份概念)
    dateFormat?: 'DATETIME' | 'YYYY' | 'YYYY-MM' | 'YYYYMM' | 'YYYY-MM-DD' | 'YYYYMMDD'
}

export interface DimensionIndicatorsFilter {
    firstDimension: IndicatorGroup
    secondDimension: IndicatorGroup | null  // 允许为null
    filterConditions: ConditionGroup
    dataMetrics: Array<DataMetric>  // 新增数据配置数组
    treeDimension?: TreeDimensionConfig | null  // 树形堆叠柱状图的树关系引用
    visibleStatisticTypes?: string[]  // 统计指标的可见性配置，用于编辑回显
    visibleFirstDimensions?: string[]  // 一级维度的可见性配置，用于编辑回显
    visibleSecondDimensions?: string[]  // 二级维度的可见性配置，用于编辑回显
}

// 返回的数据类型定义
// 与框架 ConditionListType 保持兼容
export interface ConditionItem {
    id?: number
    property?: string | null // 与 ConditionListType 保持一致
    relation?: number | string | null // 与 ConditionListType 保持一致
    value?: Array<any> | null // 与 ConditionListType 保持一致
    conditionList?: ConditionItem[] // 递归类型
    andOr?: string // 与 ConditionListType 保持一致
    isShow?: boolean
}

export interface MetricCondition {
    value: string
    label: string
    condition: {
        conditionList: Array<ConditionListType>
        andOr: string // 与 ConditionListType 保持一致
    };
}

export interface RequestParams {
    selectColumnCondition: Record<string, any>
    condition: ConditionGroup // 使用框架的 ConditionType
    sort: 0 | 1 | null // 与框架 advancedStatisticRequest 保持一致
    metricColumn: MetricColumn[]
    metricCondition: MetricCondition[]
    statisticColumn: StatisticColumn[]
    majorCondition: string
    limit?: number | null // Top-N 取数上限（仅纯分组分支生效）
}

// 指标列定义
export interface MetricColumn {
    column: string
    dictMap: Record<string, string>
}

// 统计列定义
export interface StatisticColumn {
    value: string
    label: string
}

// 转换配置选项
export interface ConvertOptions {
    sort?: 0 | 1 // 与框架 advancedStatisticRequest 保持一致（可选参数不包括 null）
    metricColumn?: MetricColumn[]
    statisticColumn?: StatisticColumn[]
    majorCondition?: string
    selectColumnCondition?: Record<string, any>
}
