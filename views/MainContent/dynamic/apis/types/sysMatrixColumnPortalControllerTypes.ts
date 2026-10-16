
/**
 * 分页响应类型 - 原始类型: Page«SysMatrixColumnVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysMatrixColumnVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysMatrixColumnVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysMatrixColumnVO 类型的数组 */
  records?: SysMatrixColumnVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysMatrixColumnVO {
  /** 字段注释 */
  columnComment?: string
  /** 字段长度 */
  columnLength?: number
  /** 字段名 */
  columnName?: string
  /** 字段类型 */
  columnType?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 小数位数 */
  decimalPlaces?: number
  /** 默认值 */
  defaultValue?: string
  /** 表单字段类型 */
  fieldType?: string
  /** 主键ID */
  id?: number
  /** 名称字段 */
  isDisplayNameField?: string
  /** 是否索引 */
  isIndex?: string
  /** 是否可空 */
  isNullable?: string
  /** 顺序字段 */
  isOrderField?: string
  /** 父节点字段 */
  isPidField?: string
  /** 是否主键 */
  isPrimaryKey?: string
  /** 是否唯一 */
  isUnique?: string
  /** 矩阵ID */
  matrixId?: number
  /** 关联字典 */
  referenceDict?: string
  /** 关联矩阵 */
  referenceMatrixId?: string
  /** 序列 */
  sequence?: string
  /** 排序 */
  sort?: number
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageSysMatrixColumnVOResponse = ResponseDataType & {
  payload: PageSysMatrixColumnVO
}

export type PageSysMatrixColumnVOListResponse = ResponseDataType & {
  payload: PageSysMatrixColumnVO[]
}

export type PageSysMatrixColumnVOPageResponse = ResponseDataType & {
  payload: PageSysMatrixColumnVO
}

export type SysMatrixColumnVOResponse = ResponseDataType & {
  payload: SysMatrixColumnVO
}

export type SysMatrixColumnVOListResponse = ResponseDataType & {
  payload: SysMatrixColumnVO[]
}

export type SysMatrixColumnVOPageResponse = ResponseDataType & {
  payload: {
    records: SysMatrixColumnVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

