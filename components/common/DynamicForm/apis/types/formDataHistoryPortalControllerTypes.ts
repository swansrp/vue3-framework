// ==================== Form Data History Portal Controller Types ====================
// 项目: mpbe-api
// 文件: formDataHistoryPortalControllerTypes.ts
// Tag: 表单数据 - 填写历史
// Tag Description: Form Data History Portal Controller
// ============================================================

// 导入公共类型
import type { OrderItem } from './common'
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
 * 分页响应类型 - 原始类型: Page«FormDataHistoryVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 FormDataHistoryVO 类型的数组
 */
export interface PageFormDataHistoryVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 FormDataHistoryVO 类型的数组 */
  records?: FormDataHistoryVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface FormDataHistoryVO {
  /** 审批时间 */
  confirmAt?: string
  /** 审批人 */
  confirmBy?: string
  /** 审批理由 */
  confirmReason?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 表单 ID */
  formId?: number
  /** 主键 ID */
  id?: string
  /** 备注/说明 */
  remark?: string
  /** 总体状态：0 草稿 1 提交 2 审核中 3 通过 4 退回 */
  status?: string
  /** 提交时间 */
  submittedAt?: string
  /** 提交人 */
  submittedBy?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
  /** 批号 */
  versionNo?: string
}

export type PageFormDataHistoryVOResponse = ResponseDataType & {
  payload: PageFormDataHistoryVO
}

export type PageFormDataHistoryVOListResponse = ResponseDataType & {
  payload: PageFormDataHistoryVO[]
}

export type PageFormDataHistoryVOPageResponse = ResponseDataType & {
  payload: PageFormDataHistoryVO
}

export type FormDataHistoryVOResponse = ResponseDataType & {
  payload: FormDataHistoryVO
}

export type FormDataHistoryVOListResponse = ResponseDataType & {
  payload: FormDataHistoryVO[]
}

export type FormDataHistoryVOPageResponse = ResponseDataType & {
  payload: {
    records: FormDataHistoryVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

