// 接收数据的类型定义
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

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

// 数据配置项
export interface DataMetric {
    dataName: string        // 数据名称
    dataField: string       // 英文字段名
    chartType: 'bar' | 'line' | 'ptLine' | 'pie' | 'metricsPie'  // 图表类型
    color: string           // 数据项整体颜色（用于饼图等）
    yAxisPosition: 'left' | 'right'    // 坐标轴位置（饼图不需要）
    stackGroup?: string     // 堆叠位置标识，相同值的会堆叠在一起
    unit?: string          // 数据单位显示文本
    unitConfig?: string    // 原始单位配置，如 "2,10000"
    formatConfig?: { fix: number; unitDivisor: number }  // 格式化配置
    itemColors: Record<string, string>  // 维度项的颜色映射 {itemKey: color}
    isVisibleInChart?: boolean  // 在图表统计指标控制中是否可见，用于编辑回显
}

export interface DimensionIndicatorsFilter {
    firstDimension: IndicatorGroup
    secondDimension: IndicatorGroup | null  // 允许为null
    filterConditions: ConditionGroup
    dataMetrics: Array<DataMetric>  // 新增数据配置数组
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
