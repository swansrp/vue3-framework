import {request} from "@/framework/network/request";
import {
    apiType,
    buildGetApiByType,
    buildPostApiByType,
    deleteRequest,
    generalQueryRequest,
    updateRequest
} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.config)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.config)
const configAdmin = apiType.config + "/admin"

export const getConfig = (configKey: string) => request(buildGetApi(""), {configKey}) as Promise<any>

export const queryParams = (conditionList: Array<any>, sortList: Array<any>, pageSize: number, currentPage: number) =>
    generalQueryRequest(configAdmin, conditionList, sortList, pageSize, currentPage)
export const updateParams = (data: object) => updateRequest(configAdmin, data)
export const deleteParams = (id: string) => deleteRequest(configAdmin, id)

export const refreshParams = () =>
    request(buildPostApi("/admin/refresh"), {}, {}, true, true) as Promise<any>
