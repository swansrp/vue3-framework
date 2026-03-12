
// ==================== Form Schema Section Portal Controller API ====================
// 项目: mpbe-api
// 文件: formSchemaSectionPortalController.ts
// Tag: 表单配置 - 表单区块
// Tag Description: Form Schema Section Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, FormSchemaSectionVO, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq } from './types'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request, upload } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /form/section/advanced/count
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /form/section/advanced/query
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageFormSchemaSectionVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /form/section/advanced/query/export
 * @param params - 查询参数
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /form/section/advanced/select
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes FormSchemaSectionVO[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/section/advanced/statistic
 * @param data - 请求体数据（类型: AdvancedStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/section/advanced/summary
 * @param data - 请求体数据（类型: AdvancedSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 为区块创建数据表
 * @api POST /form/section/createMatrix
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 * 
 * @remarks
 * **POST接口使用规范（重要）:**
 * showSuccess - 默认true，成功时自动显示提示消息，通常保持默认值
 * showErr - 默认true，失败时自动显示错误消息，通常保持默认值
 * showLoading - 默认false，长时间处理的接口方法需要设置成true以显示loading图标，通常保持默认值
 * 
 * **调用建议:**
 * 1. 调用此接口时使用默认参数即可（showSuccess=true, showErr=true）
 * 2. 数据更新流程：调用此POST接口 -> 等待成功 -> 调用相应的获取数据接口获取最新数据
 * 3. request框架会根据showSuccess和showErr自动弹出操作结果提示
 */
export const formSchemaSectionCreateMatrix = (params?: {
  /** sectionId */
  sectionId?: number
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/createMatrix', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /form/section/delete
 * @param data - 请求体数据（类型: IdReqVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /form/section/delete/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /form/section/general/count
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /form/section/general/query
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageFormSchemaSectionVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /form/section/general/select
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes FormSchemaSectionVO[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/section/general/statistic
 * @param data - 请求体数据（类型: GeneralStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/section/general/summary
 * @param data - 请求体数据（类型: GeneralSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /form/section/id
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes FormSchemaSectionVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/section/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /form/section/import/add
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaSectionImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/section/import/add', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 获取导入新增进度
 * @api GET /form/section/import/add/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaSectionImportAddProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/section/import/add/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改
 * @api POST /form/section/import/update
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaSectionImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/section/import/update', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改进度
 * @api GET /form/section/import/update/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaSectionImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/section/import/update/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 添加数据
 * @api POST /form/section/insert
 * @param data - 请求体数据（类型: FormSchemaSectionVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaSectionVO
 * @requestTypes FormSchemaSectionVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionAdd = (data?: FormSchemaSectionVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /form/section/insert/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaSectionVO[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionAddList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/insert/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /form/section/order/update
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /form/section/template/export
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
 */
export const formSchemaSectionTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/section/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/section/update
 * @param params - 查询参数
 * @param data - 请求体数据（类型: FormSchemaSectionVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaSectionVO
 * @requestTypes FormSchemaSectionVO
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: FormSchemaSectionVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/section/update/list
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaSectionVO[]
 * @see {@link @/apis/types/formSchemaSectionPortalControllerTypes} - 相关类型定义
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
export const formSchemaSectionUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/section/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

