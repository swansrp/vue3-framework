/**
 * Dataset配置管理相关类型定义
 */

// Dataset配置信息（前端使用）
export interface DatasetInfo {
  id?: number                  // 后端自增 ID
  tableId: string              // Dataset ID（用于前端展示，可能是datasetName或id）
  datasetName?: string         // Dataset名称（后缀Dataset）
  remark?: string              // 备注
  dataSource?: string
  datasets?: DatasetTableInfo[] // 表配置
  columns?: DatasetColumnInfo[] // 列配置
}

// Dataset表信息（映射到SysDatasetTable）
export interface DatasetTableInfo {
  id?: number
  datasetId?: number
  tableOrder?: number           // 表顺序
  tableSql?: string             // 表名
  tableAlias?: string           // 表别名
  joinType?: string             // JOIN类型
  joinCondition?: string        // JOIN条件
  remark?: string
  dataSource?: string
}

// Dataset列配置信息（映射到SysDatasetColumn）
export interface DatasetColumnInfo {
  id?: number
  datasetId?: number
  columnSql?: string            // SQL表达式
  columnAlias?: string          // 字段别名
  isAggregate?: string          // 是否聚合字段 (0/1)
  displayOrder?: number         // 显示顺序
  isVisible?: string            // 是否显示 (0/1)
  remark?: string
  tableId?: string              // 仅用于表单，实际使用datasetId
}

// SQL解析请求（对应DatasetConfigReq）
export interface DatasetConfigReq {
  datasetId?: number | string   // 支持字符串以便表单使用
  sql: string
  dataSource?: string
  tableId?: string              // 仅用于前端表单，实际使用datasetId
}

// 列顺序更新请求（对应IdOrderReqVO）
export interface IdOrderReqVO {
  id: string
  showOrder: number
}

// Portal表单查询请求
export interface PortalQueryReq {
  tableId: string
  pageNum?: number
  pageSize?: number
  conditionList?: any[]
  orderList?: any[]
  queryField?: string
}

// JOIN类型选项（与后端枚举对应）
export const JOIN_TYPES = [
  { label: '内联 (INNER)', value: '0' },
  { label: '左联 (LEFT)', value: '1' },
  { label: '右联 (RIGHT)', value: '2' },
  { label: '全联 (FULL)', value: '3' },
]

// 是否聚合选项
export const IS_AGGREGATE_OPTIONS = [
  { label: '否', value: '0' },
  { label: '是', value: '1' },
]

// 是否可见选项
export const IS_VISIBLE_OPTIONS = [
  { label: '是', value: '1' },
  { label: '否', value: '0' },
]
