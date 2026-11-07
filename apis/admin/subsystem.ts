import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// '/admin/subsystem'
const buildPostApi = (url: string, domain: string| undefined) => buildPostApiByType(url, apiType.subsystem, domain)
const buildGetApi = (url: string, domain: string| undefined) => buildGetApiByType(url, apiType.subsystem, domain)

// 应用管理（子系统注册表 ac_subsystem 维护面，方案B 棒5）：
// /query 行自带 partnerAppKey（服务端翻译）；/update body 必带 appCode 供后端定位行（后端写入前自行钉死不改）；
// /enable /disable /delete 的 IdReqVO.id＝appCode（业务主键），删除遇菜单引用后端拒（request 层展示后端错误信息）
export const getSubsystemTable = (data: any, domain: string| undefined) =>
  request(buildPostApi('/query', domain), {}, data, false, false) as Promise<any>
export const addSubsystem = (data: any, domain: string| undefined) =>
  request(buildPostApi('/add', domain), {}, data, true, false) as Promise<any>
export const updateSubsystem = (data: any, domain: string| undefined) =>
  request(buildPostApi('/update', domain), {}, data, true, false) as Promise<any>
export const enableSubsystem = (appCode: string, domain: string| undefined) =>
  request(buildPostApi('/enable', domain), {}, { id: appCode }, true, false) as Promise<any>
export const disableSubsystem = (appCode: string, domain: string| undefined) =>
  request(buildPostApi('/disable', domain), {}, { id: appCode }, true, false) as Promise<any>
export const deleteSubsystem = (appCode: string, domain: string| undefined) =>
  request(buildPostApi('/delete', domain), {}, { id: appCode }, true, false) as Promise<any>
// 可绑定渠道下拉项：[{id, appKey, remark, status}]——🔴 绝不含 appSecret（服务端投影收死）
export const getPartnerOptions = (domain: string| undefined) =>
  request(buildGetApi('/partner-options', domain), {}, {}, false, false) as Promise<any>

// 渠道页「注册子系统」入口：POST /web/partner/admin/register-subsystem（走 channel apiType）
// 渠道名 remark + 子系统字段 → 一个事务建 ac_partner + ac_subsystem，返回 {appKey, appSecret, appCode} 一次性展示
export const registerSubsystemFromChannel = (data: any, domain: string| undefined) =>
  request(buildPostApiByType('/register-subsystem', apiType.channel, domain), {}, data, true, false) as Promise<any>
