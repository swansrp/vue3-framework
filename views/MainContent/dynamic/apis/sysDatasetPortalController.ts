// ==================== Sys Dataset Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysDatasetPortalController.ts
// Tag: Forge - 数据集配置 - 数据集主表
// Tag Description: Sys Dataset Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysDatasetVO } from './types/sysDatasetPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /dataset/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /dataset/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysDatasetVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /dataset/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /dataset/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysDatasetVO[]
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /dataset/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /dataset/delete/list
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /dataset/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /dataset/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysDatasetVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /dataset/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysDatasetVO[]
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /dataset/id
 * @responseTypes SysDatasetVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /dataset/import/add
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /dataset/import/add/progress
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /dataset/import/update
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /dataset/import/update/progress
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /dataset/insert
 * @dataType SysDatasetVO
 * @requestTypes SysDatasetVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetAdd = (data?: SysDatasetVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /dataset/template/export
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/update
 * @dataType SysDatasetVO
 * @requestTypes SysDatasetVO
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysDatasetVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/update/list
 * @requestTypes SysDatasetVO[]
 * @see {@link @/apis/types/sysDatasetPortalControllerTypes} - 相关类型定义
 */
export const sysDatasetUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

