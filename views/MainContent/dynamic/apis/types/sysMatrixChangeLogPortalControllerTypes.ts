
/**
 * 分页响应类型 - 原始类型: Page«SysMatrixChangeLogVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysMatrixChangeLogVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysMatrixChangeLogVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysMatrixChangeLogVO 类型的数组 */
  records?: SysMatrixChangeLogVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysMatrixChangeLogVO {
  /** 影响的字段名 */
  affectedColumn?: string
  /** 变更描述 */
  changeDesc?: string
  /** 变更类型：1-创建表，2-添加字段，3-调整字段顺序，4-添加索引，5-删除索引 */
  changeType?: string
  /** 变更类型名称 */
  changeTypeName?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 执行的DDL语句 */
  ddlStatement?: string
  /** 错误信息 */
  errorMsg?: string
  /** 成功执行 */
  executeStatus?: string
  /** 执行状态名称 */
  executeStatusName?: string
  /** 主键ID */
  id?: number
  /** 矩阵ID */
  matrixId?: number
  /** 排序 */
  sort?: number
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
  /** 版本号 */
  version?: number
}

export type PageSysMatrixChangeLogVOResponse = ResponseDataType & {
  payload: PageSysMatrixChangeLogVO
}

export type PageSysMatrixChangeLogVOListResponse = ResponseDataType & {
  payload: PageSysMatrixChangeLogVO[]
}

export type PageSysMatrixChangeLogVOPageResponse = ResponseDataType & {
  payload: PageSysMatrixChangeLogVO
}

export type SysMatrixChangeLogVOResponse = ResponseDataType & {
  payload: SysMatrixChangeLogVO
}

export type SysMatrixChangeLogVOListResponse = ResponseDataType & {
  payload: SysMatrixChangeLogVO[]
}

export type SysMatrixChangeLogVOPageResponse = ResponseDataType & {
  payload: {
    records: SysMatrixChangeLogVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

