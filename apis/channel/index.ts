import {request} from "@/framework/network/request";
import {apiType} from "@/apis"
import {buildGetApiByType, buildPostApiByType} from "@/framework/apis";

// '/sms-manage'
const buildPostApi = (url: string, domain: string) => buildPostApiByType(url, apiType.channel, domain)

export const getSequenceChannelList = (domain: string, name: string, dictName='MDM_PLATFORM_DICT') =>
  request(buildGetApiByType('/list/label', '/web/dict', domain), {dictName, name}, {}, false, false) as Promise<any>
export const getSequenceChannelTable = (domain: string, data: any) =>
  request(buildPostApi('/query', domain), {}, data, false, false) as Promise<any>
export const addSequenceChannelTable = (domain: string, platform: string) =>
  request(buildPostApi('/add', domain), {}, {platform}, true, false) as Promise<any>
export const deleteSequenceChannelTable = (domain: string, id: string) =>
  request(buildPostApi('/delete', domain), {}, {id}, true, false) as Promise<any>
export const editSequenceChannelTable = (domain: string, data: any) =>
  request(buildPostApi('/update', domain), {}, data, true, false) as Promise<any>
