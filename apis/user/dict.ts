import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.dict)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.dict)

// Main Menu主菜单的增改（内容）查
export const getDictNameList = (params: object) => request(buildGetApi("/item/admin/list/dictTitle"), params, {}, false, false) as Promise<any>
export const getDictItemByName = (params: object) => request(buildGetApi("/item/admin/list/dictName"), params,{},false,false) as Promise<any>

export const addDict = (data: object) => request(buildPostApi("/admin/add"), {}, data) as Promise<any>
export const deleteDict = (data: object) => request(buildPostApi("/admin/delete"), {}, data, true) as Promise<any>

export const updateDictItemOrder = (data: object) => request(buildPostApi("/item/admin/order/update"), {}, data, true) as Promise<any>

export const updateDictItemSetDefault = (data: object) => request(buildPostApi("/item/admin/default/item/update"), {}, data, true) as Promise<any>

export const updateDictItem = (data: object) => request(buildPostApi("/item/admin/update"), {}, data, true) as Promise<any>

export const deleteDictItem = (data: object) => request(buildPostApi("/item/admin/delete"), {}, data, true) as Promise<any>

export const addDictItem = (data: object) => request(buildPostApi("/item/admin/add"), {}, data, true) as Promise<any>
