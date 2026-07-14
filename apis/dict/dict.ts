import { apiType, baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string, baseDomain: string) => buildGetApiByType(url, apiType.dict, baseDomain)
const buildPostApi = (url: string, baseDomain: string) => buildPostApiByType(url, apiType.dict, baseDomain)

// Main Menu主菜单的增改（内容）查
export const getDictNameList = (params: object, domain = baseDomain) => request(buildGetApi('/item/admin/list/dictTitle', domain), params, {}, false, false) as Promise<any>
export const getDictItemByName = (params: object, domain = baseDomain) => request(buildGetApi('/item/admin/list/dictName', domain), params, {}, false, false) as Promise<any>

export const addDict = (data: object, domain = baseDomain) => request(buildPostApi('/admin/add', domain), {}, data) as Promise<any>
export const deleteDict = (data: object, domain = baseDomain) => request(buildPostApi('/admin/delete', domain), {}, data, true) as Promise<any>

export const updateDictItemOrder = (data: object, domain = baseDomain) => request(buildPostApi('/item/admin/order/update', domain), {}, data, true) as Promise<any>

export const updateDictItemSetDefault = (data: object, domain = baseDomain) => request(buildPostApi('/item/admin/default/item/update', domain), {}, data, true) as Promise<any>

export const updateDictItem = (data: object, domain = baseDomain) => request(buildPostApi('/item/admin/update', domain), {}, data, true) as Promise<any>

export const deleteDictItem = (data: object, domain = baseDomain) => request(buildPostApi('/item/admin/delete', domain), {}, data, true) as Promise<any>

export const addDictItem = (data: object, domain = baseDomain) => request(buildPostApi('/item/admin/add', domain), {}, data, true) as Promise<any>

export const getDictByDictName = (params: object, domain = baseDomain) => request(buildGetApi('', domain), params, {}, false, false) as Promise<any>

export const getAllTreeDict = (domain = baseDomain) => request(buildGetApi('/tree/admin/all', domain), {}, {}, true) as Promise<any>

// ==================== 动态字典 ====================

/** 操作符类型 */
export type DynamicDictOperator = '=' | '!=' | 'IS NULL' | 'IS NOT NULL' | 'LIKE'

/** 动态字典筛选条件 */
export interface DynamicDictCondition {
  /** 列名 */
  column: string
  /** 操作符 */
  operator: DynamicDictOperator
  /** 值（IS NULL/IS NOT NULL 时可留空） */
  value?: string
}

/** 动态字典请求 */
export interface DynamicDictReq {
  /** 字典编码（保存配置时必填） */
  dictCode?: string
  /** 字典显示名称（保存配置时必填） */
  dictName?: string
  /** 数据源名称（可选，为空则使用默认数据源） */
  dataSource?: string
  /** 数据库名（可选，为空则不限定库） */
  database?: string
  /** 表名（必填，支持 table 或 db.table 格式） */
  tableName: string
  /** value字段列名（必填，字典项的值） */
  valueColumn: string
  /** label字段列名（必填，字典项的显示名称） */
  labelColumn: string
  /** 排序方式（可选，如: 'value ASC' 或 'label DESC'），默认按 value ASC */
  orderBy?: string
  /** 筛选条件（可选，支持多种操作符） */
  conditions?: DynamicDictCondition[]
}

/** 动态字典配置（列表返回） */
export interface DynamicDictConfig {
  id: number
  dictCode: string
  dictName: string
  dataSource?: string
  database?: string
  tableName: string
  valueColumn: string
  labelColumn: string
  orderBy?: string
  conditions?: string
  valid?: string
}

export interface KeyValueVO {
  value: string
  label: string
}

/** 动态生成字典选项（预览查询） */
export const getDynamicDict = (data: DynamicDictReq, domain = baseDomain) =>
  request(buildPostApi('/dynamic', domain), {}, data, false, true) as Promise<any>

/** 保存动态字典配置 */
export const saveDynamicDictConfig = (data: DynamicDictReq, domain = baseDomain) =>
  request(buildPostApi('/dynamic/config', domain), {}, data, true, true) as Promise<any>

/** 获取动态字典配置列表 */
export const getDynamicDictConfigList = (domain = baseDomain) =>
  request(buildGetApi('/dynamic/config', domain), {}, {}, true, true) as Promise<any>

/** 删除动态字典配置 */
export const deleteDynamicDictConfig = (id: number, domain = baseDomain) =>
  request(buildPostApi('/dynamic/config/delete', domain), {}, { id }, true, true) as Promise<any>
