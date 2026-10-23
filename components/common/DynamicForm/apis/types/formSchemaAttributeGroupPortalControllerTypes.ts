// ==================== Form Schema Attribute Group Portal Controller Types ====================
// 项目: mpbe-api
// 文件: formSchemaAttributeGroupPortalControllerTypes.ts
// Tag: 表单配置 - 字段分组
// Tag Description: Form Schema Attribute Group Portal Controller
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
 * 分页响应类型 - 原始类型: Page«FormSchemaAttributeGroupVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 FormSchemaAttributeGroupVO 类型的数组
 */
export interface PageFormSchemaAttributeGroupVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 FormSchemaAttributeGroupVO 类型的数组 */
  records?: FormSchemaAttributeGroupVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface FormSchemaAttributeGroupVO {
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 分组描述 */
  description?: string
  /** 主键 ID */
  id?: number
  /** 是否支持多行：0=单组，1=多组子表 */
  multi?: string
  /** 父 ID */
  pid?: number
  /** 是否必填 */
  required?: string
  /** 所属区块 ID */
  sectionId?: number
  /** 排序 */
  sort?: number
  /** 分组标题 */
  title?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export type PageFormSchemaAttributeGroupVOResponse = ResponseDataType & {
  payload: PageFormSchemaAttributeGroupVO
}

export type PageFormSchemaAttributeGroupVOListResponse = ResponseDataType & {
  payload: PageFormSchemaAttributeGroupVO[]
}

export type PageFormSchemaAttributeGroupVOPageResponse = ResponseDataType & {
  payload: PageFormSchemaAttributeGroupVO
}

export type FormSchemaAttributeGroupVOResponse = ResponseDataType & {
  payload: FormSchemaAttributeGroupVO
}

export type FormSchemaAttributeGroupVOListResponse = ResponseDataType & {
  payload: FormSchemaAttributeGroupVO[]
}

export type FormSchemaAttributeGroupVOPageResponse = ResponseDataType & {
  payload: {
    records: FormSchemaAttributeGroupVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

