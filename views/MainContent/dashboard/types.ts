// 个人仪表盘类型定义

// 指标树节点类型
export interface IndicatorTreeNode {
  id: string
  pid: string
  key: string
  title: string
  type: 'common' | 'personal' // 指标类型：通用或个人
  treeOrder: number // 指标树的显示顺序
  displayOrder: number // 图表页面展示顺序
  xGrid: number // 图表card所占横向格子数
  yGrid: number // 图表card所占纵向格子数
  show: boolean // 图表页面是否展示
  config: any // 用于渲染的配置参数
  children?: IndicatorTreeNode[]
  items?: IndicatorItem[]
  isLeaf?: boolean
}

// 指标项类型
export interface IndicatorItem {
  id: string
  key: string
  title: string
  condition?: string // 查询条件
  isLeaf: boolean
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