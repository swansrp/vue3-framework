import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildPostApi = (url: string) => buildPostApiByType(url, apiType.deptUser)
const buildGetApi = (url: string) => buildGetApiByType(url, apiType.deptUser)
export const getDeptUserList = (entityId: string) => request(buildGetApi('/bind/list'),{ entityId }, {}, false, false) as Promise<any>

export const bindDeptUserList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/bind/batch'),{}, { entityId, attachIdList }, true, false) as Promise<any>
export const unbindDeptUser = (entityId: string, attachId: string) => request(buildPostApi('/unbind'),{}, { entityId, attachId }, true, false) as Promise<any>
export const unbindDeptUserList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/unbind/batch'),{}, { entityId, attachIdList }, true, false) as Promise<any>

export const getBindUser = (deptId: string, name='', dataScope='') => request(buildGetApi('/bind/list/search'), { deptId, name, dataScope }, {}, false, false) as Promise<any>

export const bindUserDeptList = (entityId: string, attachIdList: Array<string|number>, dataScope: string) => request(buildPostApi('/bind/batch/dataScope'), {}, { entityId, attachIdList, dataScope }, true) as Promise<any>
export const unbindUserDeptList = (entityId: string, attachId: string) => request(buildPostApi('/unbind'), {}, { entityId, attachId }, true) as Promise<any>
export const unbindAllUserDeptList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/unbind/batch'), {}, { entityId, attachIdList }, true) as Promise<any>

export const editUserPermission = (dataScope: string, groupId: string, userId: string) => request(buildPostApi('/data/scope'), {}, { dataScope, groupId, userId }, true) as Promise<any>