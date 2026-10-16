
/**
 * 分页响应类型 - 原始类型: Page«SysDatasetVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysDatasetVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysDatasetVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysDatasetVO 类型的数组 */
  records?: SysDatasetVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysDatasetVO {
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 数据源配置名称 */
  dataSource?: string
  /** 数据集名称 */
  datasetName?: string
  /** 数据集ID */
  id?: number
  /** 备注 */
  remark?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageSysDatasetVOResponse = ResponseDataType & {
  payload: PageSysDatasetVO
}

export type PageSysDatasetVOListResponse = ResponseDataType & {
  payload: PageSysDatasetVO[]
}

export type PageSysDatasetVOPageResponse = ResponseDataType & {
  payload: PageSysDatasetVO
}

export type SysDatasetVOResponse = ResponseDataType & {
  payload: SysDatasetVO
}

export type SysDatasetVOListResponse = ResponseDataType & {
  payload: SysDatasetVO[]
}

export type SysDatasetVOPageResponse = ResponseDataType & {
  payload: {
    records: SysDatasetVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

