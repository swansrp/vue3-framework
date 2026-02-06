import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.userPermission)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.userPermission)

// 用户对应权限的增删改查
export const getUserPermissionListById = (entityId: string) => request(buildGetApi('/bind/list'), { entityId }, {}, false) as Promise<any>
export const getUserPermissionTree = (entityId: string) => request(buildGetApi('/menu/tree'), { entityId }, {}, false) as Promise<any>
export const bindUserPermission = (entityId: string, attachId: string) => request(buildPostApi('/bind'), {}, { entityId, attachId }, true, false) as Promise<any>
export const unbindUserPermission = (entityId: string, attachId: string) => request(buildPostApi('/unbind'), { entityId }, { entityId, attachId }, true, false) as Promise<any>
