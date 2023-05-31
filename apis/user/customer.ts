import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.customer)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.customer)

export const getTabs = () => request(buildGetApi("/tab"), {}, {}, false, false) as Promise<any>
export const getCustomer = (data: object) => request(buildPostApi("/visit/query"), {}, data, false, false) as Promise<any>

export const getAllCustomer = (visitType: string) => request(buildPostApi("/query"), {}, {name: '', pageSize: 100, visitType}, false, false) as Promise<any>
export const addCustomer = (data: object) => request(buildPostApi("/add"), {}, data, true, false) as Promise<any>
export const updateCustomer = (data: object) => request(buildPostApi(""), {}, data, true, false) as Promise<any>

export const deleteCustomer = (data: object) => request(buildPostApi("/delete"), {}, data, true, false) as Promise<any>
