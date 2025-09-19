// 个人仪表盘类型定义

// 左侧：指标树 节点类型（与后端指标实体对应）
export interface IndicatorNode {
  id: string
  pid: string
  key: string
  tableId: string
  order: number
  title: string
  show: boolean
  indicator: any
  children?: IndicatorNode[]
  isLeaf?: boolean
  items?: any[] // 添加 items 属性
}

// 右侧：仪表盘展示项（从指标派生，或直接由后端 dashboard 返回）
export interface DashboardItem {
  id: string
  title: string
  displayOrder: number
  commonStatistic: string
  xGrid: number
  yGrid: number
  xPosition: number
  yPosition: number
  show: boolean
  config: {
    tableId?: string
    url?: string
    columns?: any[]
    indicator?: string | any // 保存的指标配置JSON字符串或对象
  }
  indicatorId?: string
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