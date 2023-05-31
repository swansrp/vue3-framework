import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.issue)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.issue)


export const getGeneralIssueType = () => request(buildGetApi("/tab"), {module: 'GENERAL_TRACKING'}, {}, false, false) as Promise<any>
export const getTraditionIssueType = () => request(buildGetApi("/tab"), {module: 'TRADITION_TRACKING'}, {}, false, false) as Promise<any>
export const getProcessingIssueType = () => request(buildGetApi("/tab"), {module: 'PROCESS'}, {}, false, false) as Promise<any>

export const getIssue = (params: object) => request(buildGetApi(""), params,{}, false, false) as Promise<any>
export const addIssue = (data: object) => request(buildPostApi("/add"), {}, data, true, false) as Promise<any>
export const updateIssue = (data: object) => request(buildPostApi("/update"), {}, data, true, false) as Promise<any>
export const deleteIssue = (data: object) => request(buildPostApi("/delete"), {}, data, true, false) as Promise<any>

export const addSatisfaction = (data: object) => request(buildPostApi("/satisfaction/add"), {}, data, true, false) as Promise<any>

