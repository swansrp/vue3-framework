import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildPostApi = (url: string) => buildPostApiByType(url, apiType.roleUser)
const buildGetApi = (url: string) => buildGetApiByType(url, apiType.roleUser)
export const getRoleUserList = (entityId: string) => request(buildGetApi('/bind/list'),{ entityId }, {}, false, false) as Promise<any>

export const bindRoleUserList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/bind/batch'),{}, { entityId, attachIdList }, true, false) as Promise<any>
export const unbindRoleUser = (entityId: string, attachId: string) => request(buildPostApi('/unbind'),{}, { entityId, attachId }, true, false) as Promise<any>
export const unbindRoleUserList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/unbind/batch'),{}, { entityId, attachIdList }, true, false) as Promise<any>
