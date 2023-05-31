import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.messageEdit)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.messageEdit)

// Main Menu主菜单的增改（内容）查
export const getMessageTemplateByValue = (params: object) => request(buildGetApi("/template"), params, {}, false, false) as Promise<any>
export const addMessageTemplate = (data: object) => request(buildPostApi("/template/add"), {}, data, true, false) as Promise<any>
export const deleteMessageTemplate = (data: object) => request(buildPostApi("/template/delete"), {}, data, true, false) as Promise<any>

export const syncMessageTemplate = () => request(buildPostApi("/template/sync"), {}, {}, true, false) as Promise<any>
export const sendMessage = (data: object) => request(buildPostApi("/send"), {}, data, true, false) as Promise<any>
export const getHistoryMessageSend = (params: object) => request(buildGetApi("/history"), params, {}, false, false) as Promise<any>

