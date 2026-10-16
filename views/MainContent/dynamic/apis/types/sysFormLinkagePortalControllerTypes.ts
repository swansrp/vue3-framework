
/**
 * 分页响应类型 - 原始类型: Page«SysFormLinkageVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysFormLinkageVO 类型的数组
 */
import type { OrderItem } from './common'

export interface PageSysFormLinkageVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysFormLinkageVO 类型的数组 */
  records?: SysFormLinkageVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface SysFormLinkageVO {
  /** 执行脚本(JS) */
  actionScript?: string
  /** 条件脚本(JS) */
  conditionScript?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 表单配置ID */
  formConfigId?: number
  /** 主键ID */
  id?: number
  /** 是否启用 */
  isEnabled?: string
  /** 联动名称 */
  linkageName?: string
  /** 优先级 */
  priority?: number
  /** 排序 */
  sort?: number
  /** 目标字段(逗号分隔) */
  targetFields?: string
  /** 触发事件(change/blur/focus) */
  triggerEvent?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageSysFormLinkageVOResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO
}

export type PageSysFormLinkageVOListResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO[]
}

export type PageSysFormLinkageVOPageResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO
}

export type SysFormLinkageVOResponse = ResponseDataType & {
  payload: SysFormLinkageVO
}

export type SysFormLinkageVOListResponse = ResponseDataType & {
  payload: SysFormLinkageVO[]
}

export type SysFormLinkageVOPageResponse = ResponseDataType & {
  payload: {
    records: SysFormLinkageVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

