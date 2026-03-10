// ==================== Form Schema Portal Controller Types ====================
// 项目: mpbe-api
// 文件: formSchemaPortalControllerTypes.ts
// Tag: 表单配置 - 表单管理
// Tag Description: Form Schema Portal Controller
// ============================================================

// 导入公共类型
import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, QueryConditionReq, StatisticRes } from './common'
/**
 * 全局响应数据类型说明
 * @interface ResponseDataType
 * @description 所有API接口的统一响应格式
 * 
 * @property {Object} status - 响应状态信息
 * @property {number} status.code - 状态码，0表示成功，非0表示失败
 * @property {string} status.msg - 状态消息
 * @property {string} status.detailMsg - 详细错误信息
 * @property {any} payload - 响应数据载体，成功时包含实际返回的数据
 * 
 * @example
 * // 成功响应示例
 * {
 *   status: { code: 0, msg: 'success', detailMsg: '' },
 *   payload: { id: 1, name: 'example' }
 * }
 * 
 * // 失败响应示例
 * {
 *   status: { code: 1001, msg: 'error', detailMsg: '详细错误信息' },
 *   payload: null
 * }
 */
// ResponseDataType 是全局类型，不需要导入

/**
 * 分页响应类型 - 原始类型: Page«FormSchemaVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 FormSchemaVO 类型的数组
 */
export interface PageFormSchemaVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 FormSchemaVO 类型的数组 */
  records?: FormSchemaVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface OrderItem {
  asc?: boolean
  column?: string
}

export interface FormSchemaVO {
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 描述 */
  description?: string
  /** 主键 ID */
  id?: string
  /** 父 ID */
  pid?: string
  /** 排序 */
  sort?: number
  /** 状态: draft/published/archived */
  status?: string
  /** 表单名称 */
  title?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export interface TreeDataResVO {
  children?: TreeDataResVO[]
  key?: object
  pid?: object
  title?: string
}

export interface IdReqVO {
  /** id */
  id?: string
}

export interface IdOrderReqVO {
  /** id */
  id?: object
  /** 显示顺序 */
  showOrder?: number
}

export interface IdPidReqVO {
  /** id */
  id?: string
  /** pid */
  pid?: object
}

export interface TreeDataItemVO {
  key?: object
  pid?: object
  title?: string
}

export interface OrderItem {
  asc?: boolean
  column?: string
}

export type AdvancedQueryReqResponse = ResponseDataType & {
  payload: AdvancedQueryReq
}

export type AdvancedQueryReqListResponse = ResponseDataType & {
  payload: AdvancedQueryReq[]
}

export type AdvancedQueryReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedQueryReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type PageFormSchemaVOResponse = ResponseDataType & {
  payload: PageFormSchemaVO
}

export type PageFormSchemaVOListResponse = ResponseDataType & {
  payload: PageFormSchemaVO[]
}

export type PageFormSchemaVOPageResponse = ResponseDataType & {
  payload: PageFormSchemaVO
}

export type FormSchemaVOResponse = ResponseDataType & {
  payload: FormSchemaVO
}

export type FormSchemaVOListResponse = ResponseDataType & {
  payload: FormSchemaVO[]
}

export type FormSchemaVOPageResponse = ResponseDataType & {
  payload: {
    records: FormSchemaVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type AdvancedStatisticReqResponse = ResponseDataType & {
  payload: AdvancedStatisticReq
}

export type AdvancedStatisticReqListResponse = ResponseDataType & {
  payload: AdvancedStatisticReq[]
}

export type AdvancedStatisticReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedStatisticReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type StatisticResResponse = ResponseDataType & {
  payload: StatisticRes
}

export type StatisticResListResponse = ResponseDataType & {
  payload: StatisticRes[]
}

export type StatisticResPageResponse = ResponseDataType & {
  payload: {
    records: StatisticRes[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type AdvancedSummaryReqResponse = ResponseDataType & {
  payload: AdvancedSummaryReq
}

export type AdvancedSummaryReqListResponse = ResponseDataType & {
  payload: AdvancedSummaryReq[]
}

export type AdvancedSummaryReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedSummaryReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type TreeDataResVOResponse = ResponseDataType & {
  payload: TreeDataResVO
}

export type TreeDataResVOListResponse = ResponseDataType & {
  payload: TreeDataResVO[]
}

export type TreeDataResVOPageResponse = ResponseDataType & {
  payload: {
    records: TreeDataResVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type IdReqVOResponse = ResponseDataType & {
  payload: IdReqVO
}

export type IdReqVOListResponse = ResponseDataType & {
  payload: IdReqVO[]
}

export type IdReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdReqVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type QueryConditionReqResponse = ResponseDataType & {
  payload: QueryConditionReq
}

export type QueryConditionReqListResponse = ResponseDataType & {
  payload: QueryConditionReq[]
}

export type QueryConditionReqPageResponse = ResponseDataType & {
  payload: {
    records: QueryConditionReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type GeneralStatisticReqResponse = ResponseDataType & {
  payload: GeneralStatisticReq
}

export type GeneralStatisticReqListResponse = ResponseDataType & {
  payload: GeneralStatisticReq[]
}

export type GeneralStatisticReqPageResponse = ResponseDataType & {
  payload: {
    records: GeneralStatisticReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type GeneralSummaryReqResponse = ResponseDataType & {
  payload: GeneralSummaryReq
}

export type GeneralSummaryReqListResponse = ResponseDataType & {
  payload: GeneralSummaryReq[]
}

export type GeneralSummaryReqPageResponse = ResponseDataType & {
  payload: {
    records: GeneralSummaryReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type IdOrderReqVOResponse = ResponseDataType & {
  payload: IdOrderReqVO
}

export type IdOrderReqVOListResponse = ResponseDataType & {
  payload: IdOrderReqVO[]
}

export type IdOrderReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdOrderReqVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type IdPidReqVOResponse = ResponseDataType & {
  payload: IdPidReqVO
}

export type IdPidReqVOListResponse = ResponseDataType & {
  payload: IdPidReqVO[]
}

export type IdPidReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdPidReqVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type TreeDataItemVOResponse = ResponseDataType & {
  payload: TreeDataItemVO
}

export type TreeDataItemVOListResponse = ResponseDataType & {
  payload: TreeDataItemVO[]
}

export type TreeDataItemVOPageResponse = ResponseDataType & {
  payload: {
    records: TreeDataItemVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

