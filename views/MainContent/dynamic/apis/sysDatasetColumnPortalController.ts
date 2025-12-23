// ==================== Sys Dataset Column Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysDatasetColumnPortalController.ts
// Tag: Forge - 数据集配置 - 数据集列配置
// Tag Description: Sys Dataset Column Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysDatasetColumnVO } from './types/sysDatasetColumnPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /dataset/column/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /dataset/column/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysDatasetColumnVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /dataset/column/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /dataset/column/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysDatasetColumnVO[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/column/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/column/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /dataset/column/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /dataset/column/delete/list
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /dataset/column/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /dataset/column/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysDatasetColumnVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /dataset/column/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysDatasetColumnVO[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/column/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/column/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /dataset/column/id
 * @responseTypes SysDatasetColumnVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/column/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /dataset/column/import/add
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /dataset/column/import/add/progress
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/column/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /dataset/column/import/update
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /dataset/column/import/update/progress
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/column/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /dataset/column/insert
 * @dataType SysDatasetColumnVO
 * @requestTypes SysDatasetColumnVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnAdd = (data?: SysDatasetColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /dataset/column/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /dataset/column/template/export
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/column/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/column/update
 * @dataType SysDatasetColumnVO
 * @requestTypes SysDatasetColumnVO
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysDatasetColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/column/update/list
 * @requestTypes SysDatasetColumnVO[]
 * @see {@link @/apis/types/sysDatasetColumnPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetColumnUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/column/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

