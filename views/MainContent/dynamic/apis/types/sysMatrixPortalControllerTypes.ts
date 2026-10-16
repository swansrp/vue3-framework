
/**
 * 分页响应类型 - 原始类型: Page«SysMatrixVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysMatrixVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysMatrixVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysMatrixVO 类型的数组 */
  records?: SysMatrixVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysMatrixVO {
  /** 字符集 */
  charset?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 数据源名称 */
  dataSource?: string
  /** 存储引擎 */
  engine?: string
  /** 主键ID */
  id?: number
  /** 排序 */
  sort?: number
  /** 状态(0:未创建,1:已创建,2:已同步) */
  status?: string
  /** 表注释 */
  tableComment?: string
  /** 表名 */
  tableName?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
  /** 是否自增 */
  autoIncrement: string
}

export interface ImportMatrixReq {
  ddl?: string
}

export type PageSysMatrixVOResponse = ResponseDataType & {
  payload: PageSysMatrixVO
}

export type PageSysMatrixVOListResponse = ResponseDataType & {
  payload: PageSysMatrixVO[]
}

export type PageSysMatrixVOPageResponse = ResponseDataType & {
  payload: PageSysMatrixVO
}

export type SysMatrixVOResponse = ResponseDataType & {
  payload: SysMatrixVO
}

export type SysMatrixVOListResponse = ResponseDataType & {
  payload: SysMatrixVO[]
}

export type SysMatrixVOPageResponse = ResponseDataType & {
  payload: {
    records: SysMatrixVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type ImportMatrixReqResponse = ResponseDataType & {
  payload: ImportMatrixReq
}

export type ImportMatrixReqListResponse = ResponseDataType & {
  payload: ImportMatrixReq[]
}

export type ImportMatrixReqPageResponse = ResponseDataType & {
  payload: {
    records: ImportMatrixReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

