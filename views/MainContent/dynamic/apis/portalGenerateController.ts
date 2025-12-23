// ==================== Portal Generate Controller API ====================
// 项目: mpbe-api
// 文件: portalGenerateController.ts
// Tag: Portal配置生成
// Tag Description: Portal Generate Controller
// ============================================================

import type { GeneratePortalReq, PortalReq } from './types/portalGenerateControllerTypes'

import { buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 为Dataset生成Portal配置
 * @api POST /portal/generate/dataset
 * @dataType GeneratePortalReq
 * @requestTypes GeneratePortalReq
 * @see {@link @/apis/types/portalGenerateControllerTypes} - 相关类型定义
 */
export const generatePortalForDataset = (data?: GeneratePortalReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/portal/generate/dataset', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 刷新Dataset对应的Portal配置
 * @api POST /portal/generate/dataset/refresh
 * @dataType PortalReq
 * @requestTypes PortalReq
 * @see {@link @/apis/types/portalGenerateControllerTypes} - 相关类型定义
 */
export const refreshPortalForDataset = (data?: PortalReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/portal/generate/dataset/refresh', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 为Matrix生成Portal配置
 * @api POST /portal/generate/matrix
 * @dataType GeneratePortalReq
 * @requestTypes GeneratePortalReq
 * @see {@link @/apis/types/portalGenerateControllerTypes} - 相关类型定义
 */
export const generatePortalForMatrix = (data?: GeneratePortalReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/portal/generate/matrix', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 刷新Matrix对应的Portal配置
 * @api POST /portal/generate/matrix/refresh
 * @dataType PortalReq
 * @requestTypes PortalReq
 * @see {@link @/apis/types/portalGenerateControllerTypes} - 相关类型定义
 */
export const refreshPortalForMatrix = (data?: PortalReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/portal/generate/matrix/refresh', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

