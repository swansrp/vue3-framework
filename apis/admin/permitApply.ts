import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.permitApply)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.permitApply)

// 提交权限申请
export const submitPermitApply = (menuId: number, reason: string, userId: number) => 
  request(buildPostApi('/submit'), {}, { menuId, reason, userId }, true) as Promise<any>

// 查询我的申请
export const getMyApplyList = (userId: number) => 
  request(buildGetApi('/my/list'), { userId }, {}, false) as Promise<any>

// 查询待审核申请(管理员)
export const getPendingApplyList = () => 
  request(buildGetApi('/pending/list'), {}, {}, false) as Promise<any>

// 审核申请
export const auditPermitApply = (id: number, status: string, auditRemark: string, auditBy: string) => 
  request(buildPostApi('/audit'), {}, { id, status, auditRemark, auditBy }, true) as Promise<any>

// 撤销用户权限
export const revokePermission = (userId: number, menuId: number) => 
  request(buildPostApi('/revoke'), {}, { userId, menuId }, true) as Promise<any>

// 分页查询申请记录
export const queryApplyList = () => 
  request(buildPostApi('/query'), {}, {}, false) as Promise<any>
