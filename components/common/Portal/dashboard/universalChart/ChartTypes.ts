// 数据配置项接口
export interface DataMetric {
  dataName: string                    // 数据名称
  dataField: string                   // 英文字段名
  chartType: 'bar' | 'line' | 'pie'  // 图表类型
  color: string                       // 数据项整体颜色
  yAxisPosition: 'left' | 'right'     // 坐标轴位置（饼图不需要）
  stackGroup?: string                 // 堆叠组标识，相同值的会堆叠在一起
  unit?: string                       // 数据单位
  itemColors?: Record<string, string> // 维度项的颜色映射 {itemKey: color}
}

// 图表数据项接口
export interface ChartDataItem {
  metricColumn: any
  metric: string
  metricLabel: string
  statistic: number
  children: {
    metricColumn: any
    metric: string
    metricLabel: string
    statistic: number
    children: any[]
  }[]
}

// 处理后的数据项接口
export interface ProcessedDataItem {
  metricLabel: string
  statistic: number
  statisticType: string
  firstDimension: string
  secondDimension: string
}

// 通用图表组件的props接口
export interface UniversalChartProps {
  data: ChartDataItem[]
  dataMetrics: DataMetric[]
  loading?: boolean
  title?: string
  subtitle?: string
  height?: string
  width?: string
  categories?: string[]  // 可选的x轴分类数据
  chartType: 'bar' | 'line' | 'pie'  // 直接指定图表类型
}

// 图表类型枚举
export type ChartType = 'bar' | 'line' | 'pie'

// y轴位置枚举
export type YAxisPosition = 'left' | 'right'

// 图表配置选项
export interface ChartOptions {
  title?: {
    text?: string
    subtext?: string
  }
  responsive?: boolean
  maintainAspectRatio?: boolean
  animation?: boolean
}

// 饼图专用数据接口
export interface PieDataItem {
  name: string
  value: number
  itemStyle?: {
    color: string
  }
}
