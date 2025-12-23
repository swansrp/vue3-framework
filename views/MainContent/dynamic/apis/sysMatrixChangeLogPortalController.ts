// ==================== Sys Matrix Change Log Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysMatrixChangeLogPortalController.ts
// Tag: 动态配置 - 矩阵表结构变更日志
// Tag Description: Sys Matrix Change Log Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, ImportChangeLogReqVO, QueryConditionReq, SysMatrixChangeLogVO } from './types/sysMatrixChangeLogPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /forge/matrix-change-log/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /forge/matrix-change-log/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysMatrixChangeLogVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /forge/matrix-change-log/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /forge/matrix-change-log/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysMatrixChangeLogVO[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix-change-log/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix-change-log/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /forge/matrix-change-log/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /forge/matrix-change-log/delete/list
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导出变更日志
 * @api GET /forge/matrix-change-log/export/log
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const exportChangeLog = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-change-log/export/log', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /forge/matrix-change-log/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /forge/matrix-change-log/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysMatrixChangeLogVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /forge/matrix-change-log/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysMatrixChangeLogVO[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix-change-log/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix-change-log/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /forge/matrix-change-log/id
 * @responseTypes SysMatrixChangeLogVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-change-log/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /forge/matrix-change-log/import/add
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /forge/matrix-change-log/import/add/progress
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-change-log/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入变更日志
 * @api POST /forge/matrix-change-log/import/log
 * @dataType ImportChangeLogReqVO
 * @requestTypes ImportChangeLogReqVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const importChangeLog = (data?: ImportChangeLogReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/import/log', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /forge/matrix-change-log/import/update
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /forge/matrix-change-log/import/update/progress
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-change-log/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /forge/matrix-change-log/insert
 * @dataType SysMatrixChangeLogVO
 * @requestTypes SysMatrixChangeLogVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogAdd = (data?: SysMatrixChangeLogVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /forge/matrix-change-log/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /forge/matrix-change-log/template/export
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-change-log/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix-change-log/update
 * @dataType SysMatrixChangeLogVO
 * @requestTypes SysMatrixChangeLogVO
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysMatrixChangeLogVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix-change-log/update/list
 * @requestTypes SysMatrixChangeLogVO[]
 * @see {@link @/apis/types/sysMatrixChangeLogPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixChangeLogUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-change-log/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

