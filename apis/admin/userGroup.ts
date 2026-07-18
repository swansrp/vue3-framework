import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.userGroup)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.userGroup)

export const getUserGroupType = (name='') => request(buildGetApi('/type'), { name }, {}, false, false) as Promise<any>
export const addUserGroupType = (data: { id: string; name: string }) => request(buildPostApi('/type/add'), {}, data, true) as Promise<any>
export const deleteUserGroupType = (id: string) => request(buildPostApi('/type/delete'), {}, { id }, true) as Promise<any>
export const getUserGroupById = (groupType: string) => request(buildGetApi('/tree'), { groupType }, {}, false, false) as Promise<any>
export const addUserGroupNode = (data: object) => request(buildPostApi('/add'), {}, data, true) as Promise<any>
export const editUserGroupNode = (data: object) => request(buildPostApi('/update'), {}, data, true) as Promise<any>
export const deleteUserGroupNode = (id: string) => request(buildPostApi('/delete'), {}, { id }, true) as Promise<any>
export const updateUserGroupNodeOrder = (data: object) => request(buildPostApi('/order/update'), {}, data, true) as Promise<any>
export const updateUserGroupNodePId = (id: string, pid: string) => request(buildPostApi('/pid'), {}, { id, pid }, true) as Promise<any>


export const getBindUser = (groupId: string, name='', dataScope='') => request(buildGetApi('/bind/list/search'), { groupId, name, dataScope }, {}, false, false) as Promise<any>

export const bindUserGroupList = (entityId: string, attachIdList: Array<string|number>, dataScope: string) => request(buildPostApi('/bind/batch/dataScope'), {}, { entityId, attachIdList, dataScope }, true) as Promise<any>
export const unbindUserGroupList = (entityId: string, attachId: string) => request(buildPostApi('/unbind'), {}, { entityId, attachId }, true) as Promise<any>
export const unbindAllUserGroupList = (entityId: string, attachIdList: Array<string|number>) => request(buildPostApi('/unbind/batch'), {}, { entityId, attachIdList }, true) as Promise<any>

export const editUserPermission = (dataScope: string, groupId: string, userId: string) => request(buildPostApi('/data/scope'), {}, { dataScope, groupId, userId }, true) as Promise<any>

export const getUserList = (name: string) => request(buildGetApi('/bind/list/all'), { name }, {}, true) as Promise<any>
export const getUserGroupTree = (groupName: string) => request(buildGetApiByType('/user/group/tree'), { groupName })
