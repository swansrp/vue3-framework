import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.project)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.project)

export const getProjectNameList = (params: object) => request(buildGetApi("/candidate/tracking"), params, {}, false, false) as Promise<any>
export const getProcessingProjectNameList = (params: object) => request(buildGetApi("/candidate/processing"), params, {}, false, false) as Promise<any>


// 总包项目接口
export const generalQuery = (data: object) => request(buildPostApi("/general/query"), {}, data, false, false) as Promise<any>
export const generalAddProject = (data: object) => request(buildPostApi("/general/add"), {}, data, false, true) as Promise<any>
export const generalInitProject = (data: object) => request(buildPostApi("/general/init"), {}, data, true, false) as Promise<any>
export const generalGetProjectDetail = (params: object) => request(buildGetApi("/general/detail"), params, {}, false, false) as Promise<any>
export const generalDeleteReport = (params: object) => request(buildPostApi("/general/delete"), params, {},true, false) as Promise<any>
export const generalUpdateReport = (data: object) => request(buildPostApi("/general/detail"), {}, data, true, false) as Promise<any>
export const generalCopyLastWeekReport = (data: object) => request(buildPostApi("/general/last/version"), {}, data, true, false) as Promise<any>
export const generalUpdateWeekReportOrder = (data: object) => request(buildPostApi("/general/order/update"), {}, data, true, false) as Promise<any>
export const generalProjectInfo = (params: object) => request(buildGetApi("/general/info"), params, {}, false, false) as Promise<any>


// 传统项目接口
export const traditionQuery = (data: object) => request(buildPostApi("/tradition/query"), {}, data, false, false) as Promise<any>
export const traditionAddProject = (data: object) => request(buildPostApi("/tradition/add"), {}, data, false, true) as Promise<any>
export const traditionInitProject = (data: object) => request(buildPostApi("/tradition/init"), {}, data, true, true) as Promise<any>
export const traditionGetProjectDetail = (params: object) => request(buildGetApi("/tradition/detail"), params, {}, false, false) as Promise<any>
export const traditionDeleteReport = (params: object) => request(buildPostApi("/tradition/delete"), params, {},true, false) as Promise<any>
export const traditionUpdateReport = (data: object) => request(buildPostApi("/tradition/detail"), {}, data, true, false) as Promise<any>
export const traditionCopyLastWeekReport = (data: object) => request(buildPostApi("/tradition/last/version"), {}, data, true, false) as Promise<any>
export const traditionUpdateWeekReportOrder = (data: object) => request(buildPostApi("/tradition/order/update"), {}, data, true, false) as Promise<any>
export const traditionProjectInfo = (params: object) => request(buildGetApi("/tradition/info"), params, {}, false, false) as Promise<any>



// 项目执行情况接口
export const processQuery = (data: object) => request(buildPostApi("/process/query"), {}, data, false, false) as Promise<any>
export const processAddProject = (data: object) => request(buildPostApi("/process/add"), {}, data, false, true) as Promise<any>
export const processInitProject = (data: object) => request(buildPostApi("/process/init"), {}, data, true, false) as Promise<any>
export const processGetProjectDetail = (params: object) => request(buildGetApi("/process/detail"), params, {}, false, false) as Promise<any>
export const processDeleteReport = (params: object) => request(buildPostApi("/process/delete"), params, {},true, false) as Promise<any>
export const processCopyLastWeekReport = (data: object) => request(buildPostApi("/process/last/version"), {}, data, true, false) as Promise<any>
export const processUpdateWeekReportOrder = (data: object) => request(buildPostApi("/process/order/update"), {}, data, true, false) as Promise<any>
export const processProjectInfo = (params: object) => request(buildGetApi("/process/info"), params, {}, false, false) as Promise<any>
