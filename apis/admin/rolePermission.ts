import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.rolePermission)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.rolePermission)


// 角色自身的增删改查
export const getRoleList = (name='') => request(buildPostApi("/query"),{}, {name}, false, false) as Promise<any>
export const deleteRole = (id: string) => request(buildPostApi("/delete"),{}, {id}, true) as Promise<any>
export const addRole = (roleName: string) => request(buildPostApi("/add"), {}, {roleName}, true) as Promise<any>
export const editRole = (role: object) => request(buildPostApi("/update"), {}, role, true) as Promise<any>


// 角色对应权限的增删改查
export const getRolePermissionListById = (entityId: string) => request(buildGetApi("/bind/list"), {entityId}, {}, false) as Promise<any>
export const getRolePermissionTree = (entityId: string) => request(buildGetApi("/menu/tree"), {entityId}, {}, false) as Promise<any>
export const bindRolePermission = (entityId: string, attachId: string) => request(buildPostApi("/bind"), {}, {entityId, attachId}, true, false) as Promise<any>
export const unbindRolePermission = (entityId: string, attachId: string) => request(buildPostApi("/unbind"), {entityId}, {entityId, attachId}, true, false) as Promise<any>

