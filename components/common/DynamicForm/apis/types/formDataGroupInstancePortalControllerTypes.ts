// ==================== Form Data Group Instance Portal Controller Types ====================
// 项目: mpbe-api
// 文件: formDataGroupInstancePortalControllerTypes.ts
// Tag: 表单数据 - 分组实例
// Tag Description: Form Data Group Instance Portal Controller
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
 * 分页响应类型 - 原始类型: Page«FormDataGroupInstanceVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 FormDataGroupInstanceVO 类型的数组
 */
export interface PageFormDataGroupInstanceVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 FormDataGroupInstanceVO 类型的数组 */
  records?: FormDataGroupInstanceVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface FormDataGroupInstanceVO {
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 分组配置 ID */
  groupId?: number
  /** 上传历史 ID */
  historyId?: string
  /** 主键 ID */
  id?: string
  /** 行索引（多组子表场景） */
  rowIndex?: number
  /** 区块实例 ID */
  sectionInstanceId?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageFormDataGroupInstanceVOResponse = ResponseDataType & {
  payload: PageFormDataGroupInstanceVO
}

export type PageFormDataGroupInstanceVOListResponse = ResponseDataType & {
  payload: PageFormDataGroupInstanceVO[]
}

export type PageFormDataGroupInstanceVOPageResponse = ResponseDataType & {
  payload: PageFormDataGroupInstanceVO
}

export type FormDataGroupInstanceVOResponse = ResponseDataType & {
  payload: FormDataGroupInstanceVO
}

export type FormDataGroupInstanceVOListResponse = ResponseDataType & {
  payload: FormDataGroupInstanceVO[]
}

export type FormDataGroupInstanceVOPageResponse = ResponseDataType & {
  payload: {
    records: FormDataGroupInstanceVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

