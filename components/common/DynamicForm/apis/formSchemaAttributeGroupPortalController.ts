// ==================== Form Schema Attribute Group Portal Controller API ====================
// 项目: mpbe-api
// 文件: formSchemaAttributeGroupPortalController.ts
// Tag: 表单配置 - 字段分组
// Tag Description: Form Schema Attribute Group Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, FormSchemaAttributeGroupVO, GeneralStatisticReq, GeneralSummaryReq, IdPidReqVO, IdReqVO, QueryConditionReq } from './types'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request, upload } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /form/attribute/group/advanced/count
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /form/attribute/group/advanced/query
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageFormSchemaAttributeGroupVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /form/attribute/group/advanced/query/export
 * @param params - 查询参数
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /form/attribute/group/advanced/select
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes FormSchemaAttributeGroupVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/attribute/group/advanced/statistic
 * @param data - 请求体数据（类型: AdvancedStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/attribute/group/advanced/summary
 * @param data - 请求体数据（类型: AdvancedSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * getTreeData
 * @api POST /form/attribute/group/advanced/tree/data
 * @param data - 请求体数据（类型: AdvancedQueryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes TreeDataResVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const getTreeData = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/advanced/tree/data', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /form/attribute/group/delete
 * @param data - 请求体数据（类型: IdReqVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /form/attribute/group/delete/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /form/attribute/group/general/count
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /form/attribute/group/general/query
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageFormSchemaAttributeGroupVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /form/attribute/group/general/select
 * @param data - 请求体数据（类型: QueryConditionReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes FormSchemaAttributeGroupVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /form/attribute/group/general/statistic
 * @param data - 请求体数据（类型: GeneralStatisticReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /form/attribute/group/general/summary
 * @param data - 请求体数据（类型: GeneralSummaryReq）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /form/attribute/group/id
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes FormSchemaAttributeGroupVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /form/attribute/group/import/add
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaAttributeGroupImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/attribute/group/import/add', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 获取导入新增进度
 * @api GET /form/attribute/group/import/add/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaAttributeGroupImportAddProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/attribute/group/import/add/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改
 * @api POST /form/attribute/group/import/update
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaAttributeGroupImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, onUploadProgress?: Function) => {
  const api = buildPostApiByType('/form/attribute/group/import/update', '')
  return upload(api, params || {}, data || {}, onUploadProgress || (() => {}))
}

/**
 * 导入修改进度
 * @api GET /form/attribute/group/import/update/progress
 * @param params - 查询参数
 * @param onUploadProgress - 上传进度回调
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 * @upload true - 此接口使用 multipart/form-data 上传文件
 */
export const formSchemaAttributeGroupImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, onUploadProgress?: Function) => {
  const api = buildGetApiByType('/form/attribute/group/import/update/progress', '')
  return upload(api, params || {}, {}, onUploadProgress || (() => {}))
}

/**
 * 添加数据
 * @api POST /form/attribute/group/insert
 * @param data - 请求体数据（类型: FormSchemaAttributeGroupVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaAttributeGroupVO
 * @requestTypes FormSchemaAttributeGroupVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupAdd = (data?: FormSchemaAttributeGroupVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /form/attribute/group/insert/list
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaAttributeGroupVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupAddList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/insert/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /form/attribute/group/order/update
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * pid
 * @api POST /form/attribute/group/pid
 * @param data - 请求体数据（类型: IdPidReqVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType IdPidReqVO
 * @requestTypes IdPidReqVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const pid = (data?: IdPidReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/pid', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /form/attribute/group/template/export
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const formSchemaAttributeGroupTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * getBrothers
 * @api GET /form/attribute/group/tree/brothers
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes TreeDataItemVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const getBrothers = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/tree/brothers', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * getChildren
 * @api GET /form/attribute/group/tree/children
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes TreeDataItemVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const getChildren = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/tree/children', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * getTreeData
 * @api GET /form/attribute/group/tree/data
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes TreeDataResVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const getTreeDataData = (showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/tree/data', '')
  return request(api, {}, {}, showSuccess, showLoading, showErr)
}

/**
 * getParent
 * @api GET /form/attribute/group/tree/parent
 * @param params - 查询参数
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @responseTypes TreeDataItemVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
 */
export const getParent = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/attribute/group/tree/parent', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/attribute/group/update
 * @param params - 查询参数
 * @param data - 请求体数据（类型: FormSchemaAttributeGroupVO）
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @dataType FormSchemaAttributeGroupVO
 * @requestTypes FormSchemaAttributeGroupVO
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: FormSchemaAttributeGroupVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /form/attribute/group/update/list
 * @param params - 查询参数
 * @param data - 请求体数据
 * @param showSuccess - 是否显示成功提示（默认: true）
 * @param showLoading - 是否显示加载中（默认: false）
 * @param showErr - 是否显示错误提示（默认: true）
 * @requestTypes FormSchemaAttributeGroupVO[]
 * @see {@link @/apis/types/formSchemaAttributeGroupPortalControllerTypes} - 相关类型定义
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
export const formSchemaAttributeGroupUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/form/attribute/group/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

