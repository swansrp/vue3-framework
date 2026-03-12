// ==================== Form Data History Portal Controller API ====================
// 项目: mpbe-api
// 文件: formDataHistoryPortalController.ts
// Tag: 表单数据 - 填写历史
// Tag Description: Form Data History Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, FormDataHistoryVO, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq } from './types'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request, upload } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /form/history/advanced/count
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /form/history/advanced/query
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageFormDataHistoryVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /form/history/advanced/query/export
 * @param params - 查询参数
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /form/history/advanced/select
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes FormDataHistoryVO[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/history/advanced/statistic
 * @param data - 请求体数据（类型: AdvancedStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/history/advanced/summary
 * @param data - 请求体数据（类型: AdvancedSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /form/history/delete
 * @param data - 请求体数据（类型: IdReqVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /form/history/delete/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /form/history/general/count
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /form/history/general/query
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageFormDataHistoryVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /form/history/general/select
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes FormDataHistoryVO[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/history/general/statistic
 * @param data - 请求体数据（类型: GeneralStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/history/general/summary
 * @param data - 请求体数据（类型: GeneralSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /form/history/id
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes FormDataHistoryVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/history/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /form/history/import/add
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formDataHistoryImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/history/import/add', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 获取导入新增进度
 * @api GET /form/history/import/add/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formDataHistoryImportAddProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/history/import/add/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改
 * @api POST /form/history/import/update
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formDataHistoryImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/history/import/update', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改进度
 * @api GET /form/history/import/update/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formDataHistoryImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/history/import/update/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 添加数据
 * @api POST /form/history/insert
 * @param data - 请求体数据（类型: FormDataHistoryVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormDataHistoryVO
 * @requestTypes FormDataHistoryVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryAdd = (data?: FormDataHistoryVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /form/history/insert/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormDataHistoryVO[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryAddList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/insert/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /form/history/template/export
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
 */
export const formDataHistoryTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/history/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/history/update
 * @param params - 查询参数
 * @param data - 请求体数据（类型: FormDataHistoryVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormDataHistoryVO
 * @requestTypes FormDataHistoryVO
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: FormDataHistoryVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/history/update/list
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormDataHistoryVO[]
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 审批通过表单填写历史
 * - 将上报历史记录的状态从提交(1)变更为通过(3)
 * - 记录审批人和审批时间
 * @api POST /form/history/approve
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryApprove = (params?: {
  /** 上报历史记录ID */
  historyId?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/approve', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 拒绝表单填写历史
 * - 将上报历史记录的状态从提交(1)变更为退回(2)
 * - 记录审批人和审批时间
 * @api POST /form/history/reject
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formDataHistoryPortalControllerTypes} - 相关类型定义
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
export const formDataHistoryReject = (params?: {
  /** 上报历史记录ID */
  historyId?: string
  /** 拒绝原因 */
  rejectReason?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/history/reject', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

