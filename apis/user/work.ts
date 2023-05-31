import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.work)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.work)

export const getWorkTabs = () => request(buildGetApi("/tab"), {}, {}, false, false) as Promise<any>
export const getWorkData = (data: object) => request(buildPostApi("/query"), {}, data, false, false) as Promise<any>
export const updateWorkData = (data: object) => request(buildPostApi("/update"), {}, data, true, true) as Promise<any>
export const deleteWorkData = (data: object) => request(buildPostApi("/delete"), {}, data, true, true) as Promise<any>
export const addWorkData = (data: object) => request(buildPostApi("/add"), {}, data, true, true) as Promise<any>

