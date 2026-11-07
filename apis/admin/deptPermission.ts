import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.deptPermission)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.deptPermission)

// 获取组织结构树(DepartmentController)
export const getDeptTree = () => request(buildGetApiByType('/account/department/tree'), {}, {}, false) as Promise<any>

// 获取部门成员(DepartmentController)
export const getDeptMembers = (deptId: string) => request(buildGetApiByType('/account/department/members'), { deptId }, {}, false) as Promise<any>

// 部门对应权限的增删改查
export const getDeptPermissionListById = (entityId: string) => request(buildGetApi('/bind/list'), { entityId }, {}, false) as Promise<any>
// appCode：按应用作用域查部门权限树（方案B 棒6）；缺省/空＝平台自身（不传该参数）
export const getDeptPermissionTree = (entityId: string, appCode?: string) => request(buildGetApi('/menu/tree'), { entityId, ...(appCode ? { appCode } : {}) }, {}, false) as Promise<any>
export const bindDeptPermission = (entityId: string, attachId: string) => request(buildPostApi('/bind'), {}, { entityId, attachId }, true, false) as Promise<any>
export const unbindDeptPermission = (entityId: string, attachId: string) => request(buildPostApi('/unbind'), { entityId }, { entityId, attachId }, true, false) as Promise<any>
