// 个人仪表盘类型定义

// 左侧：指标树 节点类型（与后端指标实体对应）
export interface IndicatorNode {
  id: string
  pid: string
  key: string
  title: string
  show: boolean
  indicator: any
  children?: IndicatorNode[]
  isLeaf?: boolean
  items?: any[] // 添加 items 属性
}

// 图表配置类型
export interface ChartConfig {
  id: string
  indicatorId: string // 关联的指标ID
  title: string // 图表标题
  type: string // 图表类型
  xGrid: number // 横向格子数 (1-5)
  yGrid: number // 纵向格子数 (1-3)
  displayOrder: number // 显示顺序
  show: boolean // 是否显示
  config: any // 图表配置参数
  url?: string // 数据源URL
  columns?: any[] // 列配置
}

// 右侧：仪表盘展示项（从指标派生，或直接由后端 dashboard 返回）
export interface DashboardItem {
  id: string
  title: string
  displayOrder: number
  commonStatistic: string
  xGrid: number
  yGrid: number
  show: boolean
  config: any
  indicatorId?: string
}

// 仪表盘配置类型
export interface DashboardConfig {
  title: string // 仪表盘标题
  tableId: string // 表ID
  charts: ChartConfig[] // 图表配置列表
  selectedIndicators: string[] // 选中的指标ID列表
}

// 配置模式类型
export type ConfigMode = 'add' | 'edit'

// 维度配置类型
export interface DimensionConfig {
  id: string
  name: string
  type: 'first' | 'second' | 'filter' // 维度类型：一级、二级、筛选
  items: DimensionItem[]
}

// 维度项类型
export interface DimensionItem {
  id: string
  name: string
  condition: string // 查询条件
}