import { apiType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// '/partner/admin'
const buildPostApi = (url: string, domain: string| undefined) => buildPostApiByType(url, apiType.channel, domain)

// 2026-10-21 去 MDM 化：渠道＝系统内部 SSO 子系统应用（AcPartner），与平台字典（MDM_PLATFORM_DICT）解耦。
// 清单 POST /query 不带 platform 条件＝全量；新增只收名称（remark），appKey/appSecret 由服务端生成
export const getSequenceChannelTable = (data: any, domain: string| undefined) =>
  request(buildPostApi('/query', domain), {}, data, false, false) as Promise<any>
export const addSequenceChannelTable = (data: { remark: string }, domain: string| undefined) =>
  request(buildPostApi('/add', domain), {}, data, true, false) as Promise<any>
export const deleteSequenceChannelTable = (id: string, domain: string| undefined) =>
  request(buildPostApi('/delete', domain), {}, { id }, true, false) as Promise<any>
export const editSequenceChannelTable = (data: any, domain: string| undefined) =>
  request(buildPostApi('/update', domain), {}, data, true, false) as Promise<any>
