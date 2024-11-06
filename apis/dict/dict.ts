import { request } from "@/framework/network/request";
import { apiType, baseDomain, buildGetApiByType, buildPostApiByType } from "@/framework/apis"

const buildGetApi = (url: string, baseDomain: string) => buildGetApiByType(url, apiType.dict, baseDomain)
const buildPostApi = (url: string, baseDomain: string) => buildPostApiByType(url, apiType.dict, baseDomain)

// Main Menu主菜单的增改（内容）查
export const getDictNameList = (params: object, domain = baseDomain) => request(buildGetApi("/item/admin/list/dictTitle", domain), params, {}, false, false) as Promise<any>
export const getDictItemByName = (params: object, domain = baseDomain) => request(buildGetApi("/item/admin/list/dictName", domain), params, {}, false, false) as Promise<any>

export const addDict = (data: object, domain = baseDomain) => request(buildPostApi("/admin/add", domain), {}, data) as Promise<any>
export const deleteDict = (data: object, domain = baseDomain) => request(buildPostApi("/admin/delete", domain), {}, data, true) as Promise<any>

export const updateDictItemOrder = (data: object, domain = baseDomain) => request(buildPostApi("/item/admin/order/update", domain), {}, data, true) as Promise<any>

export const updateDictItemSetDefault = (data: object, domain = baseDomain) => request(buildPostApi("/item/admin/default/item/update", domain), {}, data, true) as Promise<any>

export const updateDictItem = (data: object, domain = baseDomain) => request(buildPostApi("/item/admin/update", domain), {}, data, true) as Promise<any>

export const deleteDictItem = (data: object, domain = baseDomain) => request(buildPostApi("/item/admin/delete", domain), {}, data, true) as Promise<any>

export const addDictItem = (data: object, domain = baseDomain) => request(buildPostApi("/item/admin/add", domain), {}, data, true) as Promise<any>

export const getAllTreeDict = (domain = baseDomain) => request(buildGetApi("/tree/admin/all", domain), {}, {}, true) as Promise<any>