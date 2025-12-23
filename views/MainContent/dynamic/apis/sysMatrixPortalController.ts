// ==================== Sys Matrix Portal Controller API ====================
// 项目: mpbe-api
// 文件: sysMatrixPortalController.ts
// Tag: 动态配置 - 矩阵管理
// Tag Description: Sys Matrix Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdReqVO, ImportChangeLogReqVO, ImportMatrixReq, QueryConditionReq, SysMatrixVO } from './types/sysMatrixPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /forge/matrix/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedCount = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /forge/matrix/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageSysMatrixVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedQuery = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 数据导出
 * @api POST /forge/matrix/advanced/query/export
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedQueryExport = (params?: {
  /** name */
  name?: string
}, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/query/export', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /forge/matrix/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes SysMatrixVO[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedSelect = (data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedStatistic = (data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdvancedSummary = (data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 创建物理表
 * @api POST /forge/matrix/create-table
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const createPhysicalTable = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/create-table', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /forge/matrix/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixDeleteItem = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /forge/matrix/delete/list
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixDeleteList = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导出变更日志
 * @api GET /forge/matrix/export-changelog
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const exportChangeLog = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/export-changelog', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导出DDL语句
 * @api GET /forge/matrix/export-ddl
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const exportDDL = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/export-ddl', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /forge/matrix/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixGeneralCount = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /forge/matrix/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageSysMatrixVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixGeneralQuery = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /forge/matrix/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes SysMatrixVO[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixGeneralSelect = (data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /forge/matrix/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixGeneralStatistic = (data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /forge/matrix/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixGeneralSummary = (data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /forge/matrix/id
 * @responseTypes SysMatrixVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixQueryById = (params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入变更日志
 * @api POST /forge/matrix/import-changelog
 * @dataType ImportChangeLogReqVO
 * @requestTypes ImportChangeLogReqVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const importChangeLog = (data?: ImportChangeLogReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/import-changelog', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入DDL语句
 * @api POST /forge/matrix/import-ddl
 * @dataType ImportMatrixReq
 * @requestTypes ImportMatrixReq
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const importDDL = (data?: ImportMatrixReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/import-ddl', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入新增
 * @api POST /forge/matrix/import/add
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixImportAdd = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/import/add', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取导入新增进度
 * @api GET /forge/matrix/import/add/progress
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixImportAddProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/import/add/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改
 * @api POST /forge/matrix/import/update
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixImportUpdate = (params?: {
  /** name */
  name?: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/import/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 导入修改进度
 * @api GET /forge/matrix/import/update/progress
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixImportUpdateProgress = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/import/update/progress', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /forge/matrix/insert
 * @dataType SysMatrixVO
 * @requestTypes SysMatrixVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixAdd = (data?: SysMatrixVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * updateOrder
 * @api POST /forge/matrix/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixUpdateOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 同步表结构
 * @api POST /forge/matrix/sync-table
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const syncTableStructure = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/sync-table', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 模版导出
 * @api GET /forge/matrix/template/export
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixTemplateExport = (params?: {
  /** name */
  name?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix/template/export', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 清空表数据
 * @api POST /forge/matrix/truncate-table
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const truncateTable = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/truncate-table', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix/update
 * @dataType SysMatrixVO
 * @requestTypes SysMatrixVO
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixUpdate = (params?: {
  /** strict */
  strict?: boolean
}, data?: SysMatrixVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix/update/list
 * @requestTypes SysMatrixVO[]
 * @see {@link @/apis/types/sysMatrixPortalControllerTypes} - 相关类型定义
 */
export const sysMatrixUpdateList = (params?: {
  /** strict */
  strict?: boolean
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix/update/list', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

