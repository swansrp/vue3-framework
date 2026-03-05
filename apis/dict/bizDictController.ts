// ==================== System Biz Dict Controller API ====================
// 项目: mpbe-api
// 文件: systemBizDictController.ts
// Tag: 业务字典配置
// Tag Description: System Biz Dict Controller
// ============================================================
import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 通过字典编码获取业务字典
 * @api GET /biz/dict/existed
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes String "0" 不存在 "1" 已存在
 */
export const getDictExisted = (params?: {
  /** 字典名称 */
  name?: string
  /** 字典编码 */
  code?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/biz/dict/existed', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}


/**
 * 通过字典编码获取业务字典
 * @api GET /biz/dict/code
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes BizDictVO[]
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 */
export const getEnterpriseDictByCode = (params?: {
  /** bizId */
  bizId: string
  /** dictCode */
  dictCode: string,
  /** parentValue 可选，不传时返回所有字典项 */
  parentValue?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/biz/dict/code', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 删除字典项
 * @api POST /biz/dict/delete
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const deleteEnterpriseDict = (params?: {
  /** bizId */
  bizId: string
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/delete', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 批量删除字典项
 * @api POST /biz/dict/delete/batch
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const deleteEnterpriseDictBatch = (params?: {
  /** bizId */
  bizId: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/delete/batch', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 添加字典项
 * @api POST /biz/dict/insert
 * @param params - 查询参数
 * @param data - 请求体数据（类型: BizDictVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType BizDictVO
 * @requestTypes BizDictVO
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const systemBizDictAddDict = (params?: {
  /** bizId */
  bizId: string
}, data?: BizDictVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/insert', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取业务字典列表
 * @api GET /biz/dict/list
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes KeyValueResVO[]
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 */
export const getDictList = (params?: {
  /** bizId */
  bizId?: string
  /** code */
  code?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/biz/dict/list', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 变更指定字典编码的字典名称
 * @api POST /biz/dict/name
 * @param data - 请求体数据（类型: KeyValueResVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType KeyValueResVO
 * @requestTypes KeyValueResVO
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const systemBizDictUpdateDictName = (data?: KeyValueResVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/name', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新字典项
 * @api POST /biz/dict/update
 * @param params - 查询参数
 * @param data - 请求体数据（类型: BizDictVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType BizDictVO
 * @requestTypes BizDictVO
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const systemBizDictUpdateEnterpriseDict = (params?: {
  /** bizId */
  bizId: string
}, data?: BizDictVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取字典项详情
 * @api POST /biz/dict/value
 * @param data - 请求体数据（类型: BizDictValueReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType BizDictValueReq
 * @requestTypes BizDictValueReq
 * @responseTypes BizDictVO
 * @see {@link @/apis/typesBizDictControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 此接口不返回业务数据，仅返回操作状态
 * 3. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 4. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const getDictByValue = (data?: BizDictValueReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/biz/dict/value', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

// ==================== System Biz Dict Controller Types ====================
// 项目: mpbe-api
// 文件: systemBizDictControllerTypes.ts
// Tag: 业务字典配置
// Tag Description: System Biz Dict Controller
// ============================================================

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

export interface BizDictVO {
  /** NULL表示系统共用字典 */
  bizId?: string
  /** 创建时间 */
  createAt?: string
  /** 创建者 */
  createBy?: string
  /** 描述 */
  description?: string
  /** 字典编码 */
  dictCode?: string
  /** 字典名称 */
  dictName?: string
  /** 主键ID */
  id?: number
  /** 是否为默认项 */
  isDefault?: string
  /** 字典项显示名称 */
  label?: string
  /** 父级字典编码（级联字典用） */
  parentDictCode?: string
  /** 父级字典项值（级联字典用） */
  parentValue?: string
  /** 排序号 */
  sort?: number
  /** 更新时间 */
  updateAt?: string
  /** 更新者 */
  updateBy?: string
  /** 是否有效 */
  valid?: string
  /** 字典项值 */
  value?: string
}

export interface KeyValueResVO {
  label?: string
  value?: string
}

export interface BizDictValueReq {
  /** 字典名称 */
  dictName?: string
  /** 字典项 */
  value?: string
}

export type BizDictVOResponse = ResponseDataType & {
  payload: BizDictVO
}

export type BizDictVOListResponse = ResponseDataType & {
  payload: BizDictVO[]
}

export type BizDictVOPageResponse = ResponseDataType & {
  payload: {
    records: BizDictVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type KeyValueResVOResponse = ResponseDataType & {
  payload: KeyValueResVO
}

export type KeyValueResVOListResponse = ResponseDataType & {
  payload: KeyValueResVO[]
}

export type KeyValueResVOPageResponse = ResponseDataType & {
  payload: {
    records: KeyValueResVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type BizDictValueReqResponse = ResponseDataType & {
  payload: BizDictValueReq
}

export type BizDictValueReqListResponse = ResponseDataType & {
  payload: BizDictValueReq[]
}

export type BizDictValueReqPageResponse = ResponseDataType & {
  payload: {
    records: BizDictValueReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

/**
 * 字典响应类型（包含字典项列表）
 */
export interface BizDictRes {
  /** 字典编码 */
  dictCode?: string
  /** 字典名称 */
  dictName?: string
  /** 字典项列表 */
  dictItemList?: BizDictVO[]
}

export type BizDictResListResponse = ResponseDataType & {
  payload: BizDictRes[]
}

/**
 * 根据字典名称模糊查询字典列表
 * @api GET /biz/dict/search/name
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: false）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes BizDictRes[]
 */
export const searchByDictName = (params?: {
  /** 字典名称 */
  dictName?: string
}, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/biz/dict/search/name', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr) as Promise<BizDictResListResponse>
}

/**
 * 根据字典项名称模糊查询字典列表
 * @api GET /biz/dict/search/item
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: false）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes BizDictRes[]
 */
export const searchByDictItemName = (params?: {
  /** 字典项名称（label） */
  itemName?: string
}, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/biz/dict/search/item', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr) as Promise<BizDictResListResponse>
}



