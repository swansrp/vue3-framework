
/**
 * 分页响应类型 - 原始类型: Page«SysDatasetTableVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysDatasetTableVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysDatasetTableVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysDatasetTableVO 类型的数组 */
  records?: SysDatasetTableVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysDatasetTableVO {
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 关联的数据集ID */
  datasetId?: number
  /** 主键ID */
  id?: number
  /** ON条件（主表可为空） */
  joinCondition?: string
  /** JOIN类型（主表可为空） */
  joinType?: string
  /** 备注 */
  remark?: string
  /** 表别名 */
  tableAlias?: string
  /** 表顺序 */
  tableOrder?: number
  /** 关联表SQL */
  tableSql?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageSysDatasetTableVOResponse = ResponseDataType & {
  payload: PageSysDatasetTableVO
}

export type PageSysDatasetTableVOListResponse = ResponseDataType & {
  payload: PageSysDatasetTableVO[]
}

export type PageSysDatasetTableVOPageResponse = ResponseDataType & {
  payload: PageSysDatasetTableVO
}

export type SysDatasetTableVOResponse = ResponseDataType & {
  payload: SysDatasetTableVO
}

export type SysDatasetTableVOListResponse = ResponseDataType & {
  payload: SysDatasetTableVO[]
}

export type SysDatasetTableVOPageResponse = ResponseDataType & {
  payload: {
    records: SysDatasetTableVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

