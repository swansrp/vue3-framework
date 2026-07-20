// 通用资源权限 API
// 只与 resourceType（表名）+ resourceId（主键）打交道，完全业务无关

import { baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, post, request } from '@/framework/network/request'

const API_PREFIX = '/resource-perm'

const buildGetApi = (url: string) => buildGetApiByType(url, API_PREFIX, baseDomain)
const buildPostApi = (url: string) => buildPostApiByType(url, API_PREFIX, baseDomain)

export interface PermItem {
  subjectType: number // 0=角色 1=用户 2=用户组 3=部门
  subjectId: string
}

export interface ResourcePermRecord {
  id: number
  resourceType: string
  resourceId: string
  subjectType: number
  subjectId: string
  createBy: string
  createAt: string
}

/**
 * 查询某资源的全部授权记录
 */
export const getResourcePermList = (resourceType: string, resourceId: string) =>
  get(buildGetApi('/list'), { resourceType, resourceId }, {}, false, false) as Promise<{ payload: ResourcePermRecord[] }>

/**
 * 批量保存某资源的授权配置（全量覆盖）
 */
export const saveResourcePerm = (data: { resourceType: string; resourceId: string; perms: PermItem[] }) =>
  post(buildPostApi('/save'), {}, data, true) as Promise<any>

/**
 * 清空某资源的授权（恢复为不限制）
 */
export const clearResourcePerm = (resourceType: string, resourceId: string) =>
  request(
    { baseDomain, url: API_PREFIX + '/clear', method: 'DELETE', version: '1.0' },
    { resourceType, resourceId },
    {},
    true
  ) as Promise<any>

/**
 * 检查当前用户是否有某资源的权限
 */
export const checkResourcePerm = (resourceType: string, resourceId: string) =>
  get(buildGetApi('/check'), { resourceType, resourceId }, {}, false, false) as Promise<{ payload: boolean }>

/**
 * 查询某主体已授权的资源ID列表（反向查询）
 */
export const getResourcePermBySubject = (resourceType: string, subjectType: number, subjectId: string) =>
  get(buildGetApi('/list-by-subject'), { resourceType, subjectType, subjectId }, {}, false, false) as Promise<{ payload: string[] }>

/**
 * 按主体全量设置授权资源（反向配置，diff增删）
 */
export const saveResourcePermBySubject = (data: { resourceType: string; subjectType: number; subjectId: string; resourceIds: string[] }) =>
  post(buildPostApi('/save-by-subject'), {}, data, true) as Promise<any>
