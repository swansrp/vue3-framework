// ==================== Dataset Config Controller API ====================
// 项目: mpbe-api
// 文件: datasetConfigController.ts
// Tag: Dataset配置管理
// Tag Description: Dataset Config Controller
// ============================================================

import type { DatasetColumnReq, DatasetConfigReq, IdReqVO } from './types/datasetConfigControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 获取指定datasetId的完整配置
 * @api GET /dataset/config
 * @responseTypes DatasetConfigRes
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const getConfig = (params?: {
  /** datasetId */
  datasetId: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/config', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 根据ID获取单个列配置
 * @api GET /dataset/config/column
 * @responseTypes SysDatasetColumn
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const getColumnById = (params?: {
  /** id */
  id: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/config/column', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 新增列配置
 * @api POST /dataset/config/column/add
 * @dataType DatasetColumnReq
 * @requestTypes DatasetColumnReq
 * @responseTypes SysDatasetColumn
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const datasetConfigAddColumn = (data?: DatasetColumnReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/column/add', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除列配置
 * @api POST /dataset/config/column/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const deleteColumn = (data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/column/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取指定datasetId的所有列配置
 * @api GET /dataset/config/column/list
 * @responseTypes SysDatasetColumn[]
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const getColumns = (params?: {
  /** datasetId */
  datasetId: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/config/column/list', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新列配置
 * @api POST /dataset/config/column/update
 * @dataType DatasetColumnReq
 * @requestTypes DatasetColumnReq
 * @responseTypes SysDatasetColumn
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const datasetConfigUpdateColumn = (data?: DatasetColumnReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/column/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 批量更新列显示顺序
 * @api POST /dataset/config/column/update/order
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const datasetConfigUpdateColumnsOrder = (data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/column/update/order', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 解析SQL生成配置（仅预览，不保存，datasetId可为空）
 * @api POST /dataset/config/parse
 * @dataType DatasetConfigReq
 * @requestTypes DatasetConfigReq
 * @responseTypes DatasetConfigRes
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const parseSql = (data?: DatasetConfigReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/parse', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 解析SQL并新增保存配置（datasetId可为空，自动创建）
 * @api POST /dataset/config/save
 * @dataType DatasetConfigReq
 * @requestTypes DatasetConfigReq
 * @responseTypes DatasetConfigRes
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const parseSqlAndSave = (data?: DatasetConfigReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dataset/config/save', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取指定datasetId的SQL（基于已保存的表/列配置拼装，可选择包含列备注注释）
 * @api GET /dataset/config/sql
 * @responseTypes DatasetSqlRes
 * @see {@link @/apis/types/datasetConfigControllerTypes} - 相关类型定义
 */
export const getSql = (params?: {
  /** datasetId */
  datasetId: number
  /** 是否包含列备注注释（默认false） */
  includeRemarks?: boolean
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dataset/config/sql', '')
  return request(api, params || ({} as any), {}, showSuccess, showLoading, showErr)
}
