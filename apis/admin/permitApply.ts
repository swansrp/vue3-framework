import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.permitApply)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.permitApply)

// 权限树申请情况
export const getPermitApplyMenuTree = () =>
  request(buildGetApi('/menu/tree'), {}, {}, true) as Promise<any>

// 提交权限申请
export const submitPermitApply = (url: string, reason: string) =>
  request(buildPostApi(''), { url, reason }, {}, true) as Promise<any>

// 查询我的申请
export const getMyApplyList = (customerNumber: string, url: string) =>
  request(buildGetApi(''), { customerNumber, url }, {}, false) as Promise<any>

// 判断指定路径在系统中是否存在（是否为已登记页面）
export const checkPermitPathExists = (url: string) =>
  request(buildGetApi('/exists'), { url }, {}, false, false) as Promise<any>

// 通过申请
export const passApply = (id: string|number) =>
  request(buildPostApi('/approve'), { id }, {}, true) as Promise<any>

// 拒绝申请
export const rejectApply = (id: string|number, remark: string) =>
  request(buildPostApi('/reject'), { id, remark }, {}, true) as Promise<any>



