import {request} from "@/framework/network/request";
import {apiType} from "@/apis"
import {buildGetApiByType, buildPostApiByType} from "@/framework/apis";

// '/sms-manage'
const buildPostApi = (url: string, domain: string| undefined) => buildPostApiByType(url, apiType.channel, domain)

export const getSequenceChannelList = (name: string, dictName: string, domain: string | undefined) =>
  request(buildGetApiByType('/list/label', '/web/dict', domain), {dictName, name}, {}, false, false) as Promise<any>
export const getSequenceChannelTable = (data: any, domain: string| undefined) =>
  request(buildPostApi('/query', domain), {}, data, false, false) as Promise<any>
export const addSequenceChannelTable = (platform: string, domain: string| undefined) =>
  request(buildPostApi('/add', domain), {}, {platform}, true, false) as Promise<any>
export const deleteSequenceChannelTable = (id: string, domain: string| undefined) =>
  request(buildPostApi('/delete', domain), {}, {id}, true, false) as Promise<any>
export const editSequenceChannelTable = (data: any, domain: string| undefined) =>
  request(buildPostApi('/update', domain), {}, data, true, false) as Promise<any>
