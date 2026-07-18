import { Method } from 'axios'

import { baseDomain } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 用户组通用绑定 API（对应后端 auth 模块 GroupBindController: /web/group/bind）
 *
 * 与 portal 的绑定 API 区别：
 * - 通过 bindType（query 参数）区分不同绑定场景，后端不依赖字典
 * - label 由前端用本地已加载字典补全，后端只返回 value + extraData
 *
 * 后端接口签名：
 * - GET  /web/group/bind/bind/list?entityId=&bindType=         → [{value, ...extra}]
 * - GET  /web/group/bind/bind/info?entityId=&attachId=&bindType= → {value, ...extra}
 * - POST /web/group/bind/replace?entityId=&bindType=            body: [attachValue...]
 * - POST /web/group/bind/bind/info?entityId=&attachId=&bindType= body: {...extraData}
 */
const TYPE_PREFIX = '/group/bind'

/**
 * 构造 ApiType（与 apis/index.ts 的 buildApi 同构）
 * type 前缀固定为 '/group/bind'，url 为具体子路径
 */
const buildApi = (url: string, method: Method) => ({
  baseDomain,
  url: TYPE_PREFIX + url,
  method,
  version: '1.0'
})

/**
 * 获取已绑定列表（仅返回 value + extraData 字段，label 需前端本地匹配）
 */
export const getGroupBindList = (
  entityId: any,
  bindType: string,
  showSuccess = true,
  showLoading = true
) =>
  request(buildApi('/bind/list', 'GET'), { entityId, bindType }, {}, showSuccess, showLoading) as Promise<any>

/**
 * 获取单条绑定信息
 */
export const getGroupBindInfo = (
  entityId: any,
  attachId: any,
  bindType: string,
  showSuccess = false,
  showLoading = false
) =>
  request(buildApi('/bind/info', 'GET'), { entityId, attachId, bindType }, {}, showSuccess, showLoading) as Promise<any>

/**
 * 替换绑定（按 groupId + bindType 维度全量替换）
 * @param attachValueList 绑定目标值列表（全量）
 */
export const replaceGroupBind = (
  entityId: any,
  bindType: string,
  attachValueList: Array<any>,
  showSuccess = true,
  showLoading = true
) =>
  request(buildApi('/replace', 'POST'), { entityId, bindType }, attachValueList, showSuccess, showLoading) as Promise<any>

/**
 * 修改绑定信息（更新 extraData，整体覆盖）
 * @param data 绑定属性对象，将序列化为 JSON 存入 extra_data
 */
export const updateGroupBindInfo = (
  entityId: any,
  attachId: any,
  bindType: string,
  data: any,
  showSuccess = true,
  showLoading = true
) =>
  request(buildApi('/bind/info', 'POST'), { entityId, attachId, bindType }, data, showSuccess, showLoading) as Promise<any>

/**
 * 查询当前登录用户在指定 groupType + bindType 下的绑定值（按数据权限递归展开）
 * 对应后端 `GET /web/group/bind/my`
 * 权限范围：ALL=该groupType所有组、SUBORDINATE=本组+递归子组、其他=仅本组
 * @returns 去重后的 attachValue 列表
 */
export const getMyBindValues = (
  groupType: string,
  bindType: string,
  showSuccess = false,
  showLoading = false
) =>
  request(buildApi('/my', 'GET'), { groupType, bindType }, {}, showSuccess, showLoading) as Promise<any>
