
/**
 * 分页响应类型 - 原始类型: Page«SysDatasetColumnVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysDatasetColumnVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysDatasetColumnVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysDatasetColumnVO 类型的数组 */
  records?: SysDatasetColumnVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysDatasetColumnVO {
  /** 字段别名 */
  columnAlias?: string
  /** 字段SQL表达式 */
  columnSql?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 关联的数据集ID */
  datasetId?: number
  /** 前端显示排序 */
  displayOrder?: number
  /** 主键ID */
  id?: number
  /** 是否是聚合字段 */
  isAggregate?: string
  /** 是否显示在结果集中 */
  isVisible?: string
  /** 备注 */
  remark?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageSysDatasetColumnVOResponse = ResponseDataType & {
  payload: PageSysDatasetColumnVO
}

export type PageSysDatasetColumnVOListResponse = ResponseDataType & {
  payload: PageSysDatasetColumnVO[]
}

export type PageSysDatasetColumnVOPageResponse = ResponseDataType & {
  payload: PageSysDatasetColumnVO
}

export type SysDatasetColumnVOResponse = ResponseDataType & {
  payload: SysDatasetColumnVO
}

export type SysDatasetColumnVOListResponse = ResponseDataType & {
  payload: SysDatasetColumnVO[]
}

export type SysDatasetColumnVOPageResponse = ResponseDataType & {
  payload: {
    records: SysDatasetColumnVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

