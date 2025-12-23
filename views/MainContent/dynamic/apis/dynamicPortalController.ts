// ==================== Dynamic Portal Controller API ====================
// 项目: mpbe-api
// 文件: dynamicPortalController.ts
// Tag: 动态Portal接口
// Tag Description: Dynamic Portal Controller
// ============================================================

import type { AdvancedQueryReq, AdvancedStatisticReq, AdvancedSummaryReq, GeneralStatisticReq, GeneralSummaryReq, IdPidReqVO, IdReqVO, QueryConditionReq } from './types/dynamicPortalControllerTypes'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 统计个数
 * @api POST /dynamic/portal/{portalName}/advanced/count
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdvancedCount = (portalName: string | number, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据
 * @api POST /dynamic/portal/{portalName}/advanced/query
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes PageMapstringobject
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdvancedQuery = (portalName: string | number, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询数据(不分页)
 * @api POST /dynamic/portal/{portalName}/advanced/select
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdvancedSelect = (portalName: string | number, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dynamic/portal/{portalName}/advanced/statistic
 * @dataType AdvancedStatisticReq
 * @requestTypes AdvancedStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdvancedStatistic = (portalName: string | number, data?: AdvancedStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dynamic/portal/{portalName}/advanced/summary
 * @dataType AdvancedSummaryReq
 * @requestTypes AdvancedSummaryReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdvancedSummary = (portalName: string | number, data?: AdvancedSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 高级查询树形数据
 * @api POST /dynamic/portal/{portalName}/advanced/tree/data
 * @dataType AdvancedQueryReq
 * @requestTypes AdvancedQueryReq
 * @responseTypes TreeDataResVO[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const getTreeDataAdvanced = (portalName: string | number, data?: AdvancedQueryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/advanced/tree/data', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据
 * @api POST /dynamic/portal/{portalName}/delete
 * @dataType IdReqVO
 * @requestTypes IdReqVO
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicDeleteItem = (portalName: string | number, data?: IdReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/delete', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 删除数据列表
 * @api POST /dynamic/portal/{portalName}/delete/list
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicDeleteList = (portalName: string | number, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/delete/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 个数统计
 * @api POST /dynamic/portal/{portalName}/general/count
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicGeneralCount = (portalName: string | number, data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/general/count', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据
 * @api POST /dynamic/portal/{portalName}/general/query
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @responseTypes PageMapstringobject
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicGeneralQuery = (portalName: string | number, data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/general/query', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 通用查询数据(不分页)
 * @api POST /dynamic/portal/{portalName}/general/select
 * @dataType QueryConditionReq
 * @requestTypes QueryConditionReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicGeneralSelect = (portalName: string | number, data?: QueryConditionReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/general/select', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 指标统计
 * @api POST /dynamic/portal/{portalName}/general/statistic
 * @dataType GeneralStatisticReq
 * @requestTypes GeneralStatisticReq
 * @responseTypes StatisticRes[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicGeneralStatistic = (portalName: string | number, data?: GeneralStatisticReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/general/statistic', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 汇总
 * @api POST /dynamic/portal/{portalName}/general/summary
 * @dataType GeneralSummaryReq
 * @requestTypes GeneralSummaryReq
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicGeneralSummary = (portalName: string | number, data?: GeneralSummaryReq, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/general/summary', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 根据id获取详情
 * @api GET /dynamic/portal/{portalName}/id
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicQueryById = (portalName: string | number, params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dynamic/portal/${portalName}/id', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 添加数据
 * @api POST /dynamic/portal/{portalName}/insert
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicAdd = (portalName: string | number, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/insert', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 变更顺序
 * @api POST /dynamic/portal/{portalName}/order/update
 * @requestTypes IdOrderReqVO[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicUpdateOrder = (portalName: string | number, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/order/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 变更父节点
 * @api POST /dynamic/portal/{portalName}/pid
 * @dataType IdPidReqVO
 * @requestTypes IdPidReqVO
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicUpdatePid = (portalName: string | number, data?: IdPidReqVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/pid', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 获取兄弟节点
 * @api GET /dynamic/portal/{portalName}/tree/brothers
 * @responseTypes TreeDataItemVO[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const getBrothers = (portalName: string | number, params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dynamic/portal/${portalName}/tree/brothers', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 获取子节点
 * @api GET /dynamic/portal/{portalName}/tree/children
 * @responseTypes TreeDataItemVO[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const getChildren = (portalName: string | number, params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dynamic/portal/${portalName}/tree/children', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 获取树形数据
 * @api GET /dynamic/portal/{portalName}/tree/data
 * @responseTypes TreeDataResVO[]
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const getTreeData = (portalName: string | number, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dynamic/portal/${portalName}/tree/data', '')
  return request(api, {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 获取父节点
 * @api GET /dynamic/portal/{portalName}/tree/parent
 * @responseTypes TreeDataItemVO
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const getParent = (portalName: string | number, params?: {
  /** id */
  id?: string
}, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/dynamic/portal/${portalName}/tree/parent', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据
 * @api POST /dynamic/portal/{portalName}/update
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicUpdate = (portalName: string | number, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/update', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

/**
 * 更新数据列表
 * @api POST /dynamic/portal/{portalName}/update/list
 * @see {@link @/apis/types/dynamicPortalControllerTypes} - 相关类型定义
 */
export const dynamicUpdateList = (portalName: string | number, data?: any, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/dynamic/portal/${portalName}/update/list', '')
  return request(api, {}, data || {}, showSuccess, showLoading, showErr)
}

