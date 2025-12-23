// ==================== Sys Dataset Table Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysDatasetTablePortalController.ts
// Tag: Forge - 数据集配置 - 数据集关联表
// Tag Description: Sys Dataset Table Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, QueryConditionReq, SysDatasetTableVO } from './types/sysDatasetTablePortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /dataset/table/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /dataset/table/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysDatasetTableVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /dataset/table/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /dataset/table/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysDatasetTableVO[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/table/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/table/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /dataset/table/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /dataset/table/delete/list
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /dataset/table/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /dataset/table/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysDatasetTableVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /dataset/table/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysDatasetTableVO[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dataset/table/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dataset/table/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /dataset/table/id
 * @responseTypes SysDatasetTableVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/table/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /dataset/table/import/add
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /dataset/table/import/add/progress
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/table/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /dataset/table/import/update
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /dataset/table/import/update/progress
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/table/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /dataset/table/insert
 * @dataType SysDatasetTableVO
 * @requestTypes SysDatasetTableVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableAdd = (data?: SysDatasetTableVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /dataset/table/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /dataset/table/template/export
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/table/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/table/update
 * @dataType SysDatasetTableVO
 * @requestTypes SysDatasetTableVO
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysDatasetTableVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dataset/table/update/list
 * @requestTypes SysDatasetTableVO[]
 * @see {@link @/apis/types/sysDatasetTablePortalControllerTypes} - 相关类型定义
 */
export const sysDatasetTableUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/table/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

