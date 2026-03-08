// ==================== Form Schema Module Portal Controller API ====================
// 项目: mpbe-api
// 文件: formSchemaModulePortalController.ts
// Tag: 表单配置 - 表单模块
// Tag Description: Form Schema Module Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, FormSchemaModuleVO, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq } from '@/apis/types'
import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request, upload } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /form/module/advanced/count
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /form/module/advanced/query
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageFormSchemaModuleVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /form/module/advanced/query/export
 * @param params - 查询参数
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /form/module/advanced/select
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes FormSchemaModuleVO[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/module/advanced/statistic
 * @param data - 请求体数据（类型: AdvancedStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/module/advanced/summary
 * @param data - 请求体数据（类型: AdvancedSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /form/module/delete
 * @param data - 请求体数据（类型: IdReqVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /form/module/delete/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /form/module/general/count
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /form/module/general/query
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageFormSchemaModuleVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /form/module/general/select
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes FormSchemaModuleVO[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/module/general/statistic
 * @param data - 请求体数据（类型: GeneralStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/module/general/summary
 * @param data - 请求体数据（类型: GeneralSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /form/module/id
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes FormSchemaModuleVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/module/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /form/module/import/add
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaModuleImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/module/import/add', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 获取导入新增进度
 * @api GET /form/module/import/add/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaModuleImportAddProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/module/import/add/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改
 * @api POST /form/module/import/update
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaModuleImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/module/import/update', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改进度
 * @api GET /form/module/import/update/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaModuleImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/module/import/update/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 添加数据
 * @api POST /form/module/insert
 * @param data - 请求体数据（类型: FormSchemaModuleVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaModuleVO
 * @requestTypes FormSchemaModuleVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleAdd = (data?: FormSchemaModuleVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /form/module/insert/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaModuleVO[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleAddList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/insert/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /form/module/order/update
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /form/module/template/export
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
 */
export const formSchemaModuleTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/module/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/module/update
 * @param params - 查询参数
 * @param data - 请求体数据（类型: FormSchemaModuleVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaModuleVO
 * @requestTypes FormSchemaModuleVO
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: FormSchemaModuleVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/module/update/list
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaModuleVO[]
 * @see {@link @/apis/types/formSchemaModulePortalControllerTypes} - 相关类型定义
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
export const formSchemaModuleUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/module/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

