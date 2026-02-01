import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.groupPermission)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.groupPermission)


// 用户组自身的查询
export const getGroupList = (groupType = '') => request(buildGetApi('/web/group/user/tree'), { groupType }, {}, false, false) as Promise<any>

// 获取用户组成员 (GroupUserBindController)
export const getGroupMembers = (groupId: string) => request('/web/group/user/bind/list' as any, { entityId: groupId }, {}, false) as Promise<any>

// 解绑用户组成员 (GroupUserBindController)
export const unbindGroupUser = (groupId: string, userId: string) => request('/web/group/user/unbind' as any, { entityId: groupId }, { entityId: groupId, attachId: userId }, true) as Promise<any>

// 用户组对应权限的增删改查
export const getGroupPermissionListById = (entityId: string) => request(buildGetApi('/bind/list'), { entityId }, {}, false) as Promise<any>
export const getGroupPermissionTree = (entityId: string) => request(buildGetApi('/menu/tree'), { entityId }, {}, false) as Promise<any>
export const bindGroupPermission = (entityId: string, attachId: string) => request(buildPostApi('/bind'), {}, { entityId, attachId }, true, false) as Promise<any>
export const unbindGroupPermission = (entityId: string, attachId: string) => request(buildPostApi('/unbind'), { entityId }, { entityId, attachId }, true, false) as Promise<any>
