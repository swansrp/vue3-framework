// ==================== Sys Form Config Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysFormConfigPortalController.ts
// Tag: 动态配置 - 动态表单配置
// Tag Description: Sys Form Config Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysFormConfigVO } from './types/sysFormConfigPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /forge/form-config/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /forge/form-config/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysFormConfigVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /forge/form-config/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /forge/form-config/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysFormConfigVO[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/form-config/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/form-config/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /forge/form-config/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /forge/form-config/delete/list
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /forge/form-config/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /forge/form-config/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysFormConfigVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /forge/form-config/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysFormConfigVO[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/form-config/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/form-config/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /forge/form-config/id
 * @responseTypes SysFormConfigVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-config/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /forge/form-config/import/add
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /forge/form-config/import/add/progress
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-config/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /forge/form-config/import/update
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /forge/form-config/import/update/progress
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-config/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /forge/form-config/insert
 * @dataType SysFormConfigVO
 * @requestTypes SysFormConfigVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigAdd = (data?: SysFormConfigVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /forge/form-config/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /forge/form-config/template/export
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-config/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/form-config/update
 * @dataType SysFormConfigVO
 * @requestTypes SysFormConfigVO
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysFormConfigVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/form-config/update/list
 * @requestTypes SysFormConfigVO[]
 * @see {@link @/apis/types/sysFormConfigPortalControllerTypes} - 相关类型定义
 */
export const sysFormConfigUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-config/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

