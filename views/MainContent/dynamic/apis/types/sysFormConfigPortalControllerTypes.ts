
/**
 * 分页响应类型 - 原始类型: Page«SysFormConfigVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysFormConfigVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysFormConfigVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysFormConfigVO 类型的数组 */
  records?: SysFormConfigVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysFormConfigVO {
  /** 字段ID */
  columnId?: number
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 默认值 */
  defaultValue?: string
  /** 描述 */
  description?: string
  /** 所属字典 */
  dict?: string
  /** 字段类型 */
  fieldType?: string
  /** 高 */
  height?: number
  /** 主键ID */
  id?: number
  /** 是否必填 */
  isRequired?: string
  /** 显示标签 */
  label?: string
  /** 矩阵ID */
  matrixId?: number
  /** 最大值 */
  maxValue?: string
  /** 最小值 */
  minValue?: string
  /** 横轴坐标 */
  positionX?: number
  /** 纵轴坐标 */
  positionY?: number
  /** 是否只读 */
  readonly?: string
  /** 排序 */
  sort?: number
  /** 单位 */
  unit?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
  /** 正则表达式 */
  validationRule?: string
  /** 宽 */
  width?: number
}

export type PageSysFormConfigVOResponse = ResponseDataType & {
  payload: PageSysFormConfigVO
}

export type PageSysFormConfigVOListResponse = ResponseDataType & {
  payload: PageSysFormConfigVO[]
}

export type PageSysFormConfigVOPageResponse = ResponseDataType & {
  payload: PageSysFormConfigVO
}

export type SysFormConfigVOResponse = ResponseDataType & {
  payload: SysFormConfigVO
}

export type SysFormConfigVOListResponse = ResponseDataType & {
  payload: SysFormConfigVO[]
}

export type SysFormConfigVOPageResponse = ResponseDataType & {
  payload: {
    records: SysFormConfigVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

