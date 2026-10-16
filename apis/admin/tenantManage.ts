import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// 不新增 apis/index.ts 的 apiType 键（并行会话纪律：只动点名两文件）——type 段就地常量给出，
// 与 apiType 值同形态（'/tenant/portal' 拼进 buildApi 的 url 前缀）
const TENANT_PORTAL_TYPE = '/tenant/portal'

const buildGetApi = (url: string) => buildGetApiByType(url, TENANT_PORTAL_TYPE)
const buildPostApi = (url: string) => buildPostApiByType(url, TENANT_PORTAL_TYPE)

// ==================== 平台档面（类级 AuthAdmin） ====================

export const getTenantList = () => request(buildGetApi('/list'), {}, {}, false, false) as Promise<any>

export const getTenantDetail = (id: string | number) => request(buildGetApi('/detail'), { id }, {}, false, false) as Promise<any>

export const createTenant = (name: string, code = '') => request(buildPostApi('/create'), { name, code }, {}, true) as Promise<any>

export const updateTenant = (id: string | number, name: string, code = '') => request(buildPostApi('/update'), { id, name, code }, {}, true) as Promise<any>

export const disableTenant = (id: string | number) => request(buildPostApi('/disable'), { id }, {}, true) as Promise<any>

// ==================== 本租户面（方法级登录档豁免，后端 service 现查判权） ====================

export const getMyTenantMembers = (tenantId: string | number) => request(buildGetApi('/my/members'), { tenantId }, {}, false, false) as Promise<any>

export const addMyTenantMember = (tenantId: string | number, userId: string | number, isAdmin = false) => request(buildPostApi('/my/member/add'), { tenantId, userId, isAdmin }, {}, true) as Promise<any>

export const removeMyTenantMember = (tenantId: string | number, userId: string | number) => request(buildPostApi('/my/member/remove'), { tenantId, userId }, {}, true) as Promise<any>

export const setMyTenantMemberAdmin = (tenantId: string | number, userId: string | number, isAdmin: boolean) => request(buildPostApi('/my/member/admin'), { tenantId, userId, isAdmin }, {}, true) as Promise<any>
