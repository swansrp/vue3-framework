// ==================== Sys Matrix Column Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysMatrixColumnPortalController.ts
// Tag: 动态配置 - 矩阵字段管理
// Tag Description: Sys Matrix Column Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysMatrixColumnVO } from './types/sysMatrixColumnPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /forge/matrix-column/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /forge/matrix-column/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysMatrixColumnVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /forge/matrix-column/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /forge/matrix-column/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysMatrixColumnVO[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix-column/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix-column/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /forge/matrix-column/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /forge/matrix-column/delete/list
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /forge/matrix-column/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /forge/matrix-column/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysMatrixColumnVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /forge/matrix-column/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysMatrixColumnVO[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix-column/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix-column/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /forge/matrix-column/id
 * @responseTypes SysMatrixColumnVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-column/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /forge/matrix-column/import/add
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /forge/matrix-column/import/add/progress
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-column/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /forge/matrix-column/import/update
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /forge/matrix-column/import/update/progress
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-column/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /forge/matrix-column/insert
 * @dataType SysMatrixColumnVO
 * @requestTypes SysMatrixColumnVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnAdd = (data?: SysMatrixColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /forge/matrix-column/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /forge/matrix-column/template/export
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-column/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix-column/update
 * @dataType SysMatrixColumnVO
 * @requestTypes SysMatrixColumnVO
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysMatrixColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix-column/update/list
 * @requestTypes SysMatrixColumnVO[]
 * @see {@link @/apis/types/sysMatrixColumnPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixColumnUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-column/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

