// ==================== Form Schema Portal Controller Types ====================
// 项目: mpbe-api
// 文件: formSchemaPortalControllerTypes.ts
// Tag: 表单配置 - 表单管理
// Tag Description: Form Schema Portal Controller
// ============================================================

// 导入公共类型
import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, OrderItem, QueryConditionReq, StatisticRes } from './common'
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
  /** 编码 */
  code: string
  /** 表单名称 */
  title?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
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

