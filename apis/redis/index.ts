import { baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, post } from '@/framework/network/request'

const type = '/admin/redis'
const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, type, domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, type, domain)

/** 获取Key树形结构（按 ":" 分隔） */
export const getRedisKeyTree = (baseUrl = baseDomain) =>
  get(buildGetApi('/tree', baseUrl), undefined, undefined, false, true, false)

/** 查询Redis Key列表 */
export const getRedisKeyList = (
  params: { pattern?: string; keyPrefix?: string; currentPage?: number; pageSize?: number },
  baseUrl = baseDomain
) => get(buildGetApi('/list', baseUrl), params, undefined, false, true, false)

/** 获取Key详情（含Value） */
export const getRedisKeyDetail = (key: string, baseUrl = baseDomain) =>
  get(buildGetApi('/detail', baseUrl), { key }, undefined, false, true, false)

/** 删除单个Key */
export const deleteRedisKey = (key: string, baseUrl = baseDomain) =>
  post(buildPostApi('/delete', baseUrl), undefined, { key }, true, true, false)

/** 批量删除Key */
export const deleteRedisKeyList = (keys: string[], baseUrl = baseDomain) =>
  post(buildPostApi('/delete/list', baseUrl), undefined, keys, true, true, false)

/** 修改Key过期时间 */
export const updateRedisKeyExpire = (key: string, ttl: number, baseUrl = baseDomain) =>
  post(buildPostApi('/expire', baseUrl), undefined, { key, ttl }, true, true, false)
