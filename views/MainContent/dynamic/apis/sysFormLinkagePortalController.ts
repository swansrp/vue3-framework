// ==================== Sys Form Linkage Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysFormLinkagePortalController.ts
// Tag: 动态配置 - 表单联动配置
// Tag Description: Sys Form Linkage Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysFormLinkageVO } from './types/sysFormLinkagePortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /forge/form-linkage/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /forge/form-linkage/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysFormLinkageVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /forge/form-linkage/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /forge/form-linkage/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysFormLinkageVO[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/form-linkage/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/form-linkage/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /forge/form-linkage/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /forge/form-linkage/delete/list
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 执行表单联动
 * @api POST /forge/form-linkage/execute
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const executeLinkage = (params?: {
  /** formConfigId */
  formConfigId: number
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/execute', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /forge/form-linkage/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /forge/form-linkage/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysFormLinkageVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /forge/form-linkage/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysFormLinkageVO[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/form-linkage/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/form-linkage/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /forge/form-linkage/id
 * @responseTypes SysFormLinkageVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-linkage/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /forge/form-linkage/import/add
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /forge/form-linkage/import/add/progress
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-linkage/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /forge/form-linkage/import/update
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /forge/form-linkage/import/update/progress
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-linkage/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /forge/form-linkage/insert
 * @dataType SysFormLinkageVO
 * @requestTypes SysFormLinkageVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageAdd = (data?: SysFormLinkageVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /forge/form-linkage/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /forge/form-linkage/template/export
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/form-linkage/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/form-linkage/update
 * @dataType SysFormLinkageVO
 * @requestTypes SysFormLinkageVO
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysFormLinkageVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/form-linkage/update/list
 * @requestTypes SysFormLinkageVO[]
 * @see {@link @/apis/types/sysFormLinkagePortalControllerTypes} - 相关类型定义
 */
export const sysFormLinkageUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/form-linkage/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

