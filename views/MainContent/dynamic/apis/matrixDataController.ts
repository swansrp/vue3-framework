// ==================== Matrix Data Controller API ====================
// 项目: mpbe-api
// 文件: matrixDataController.ts
// Tag: 动态配置 - 矩阵数据操作
// Tag Description: Matrix Data Controller
// ============================================================

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 删除数据
 * @api POST /forge/matrix-data/delete
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const matrixDataDeleteItem = (params?: {
  /** matrixId */
  matrixId: number
  /** id */
  id: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-data/delete', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 插入数据
 * @api POST /forge/matrix-data/insert
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const insert = (params?: {
  /** matrixId */
  matrixId: number
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-data/insert', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 查询单条数据
 * @api GET /forge/matrix-data/select
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const selectById = (params?: {
  /** matrixId */
  matrixId: number
  /** id */
  id: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-data/select', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 根据条件查询
 * @api POST /forge/matrix-data/select-by-condition
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const selectByCondition = (params?: {
  /** matrixId */
  matrixId: number
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-data/select-by-condition', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 查询列表
 * @api GET /forge/matrix-data/select-list
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const selectList = (params?: {
  /** matrixId */
  matrixId: number
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/forge/matrix-data/select-list', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /forge/matrix-data/update
 * @see {@link @/apis/types/matrixDataControllerTypes} - 相关类型定义
 */
export const matrixDataUpdate = (params?: {
  /** matrixId */
  matrixId: number
  /** id */
  id: string
}, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/forge/matrix-data/update', '')
  return request(api, params || {}, data || {}, showSuccess, showLoading, showErr)
}

