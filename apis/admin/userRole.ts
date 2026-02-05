import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildPostApi = (url: string) => buildPostApiByType(url, apiType.userRole)
const buildGetApi = (url: string) => buildGetApiByType(url, apiType.userRole)

export const getUserRoleList = (entityId: string) => request(buildGetApi('/bind/list'),{ entityId }, {}, false, false) as Promise<any>
export const getUserPermissionTree = (userId: string) => request(buildGetApi('/menu/tree'),{ userId }, {}, false, false) as Promise<any>
export const replaceUserRoleList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/replace'),{}, { entityId, attachIdList }, true, false) as Promise<any>
