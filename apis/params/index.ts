import {request} from "@/framework/network/request";
import {
    baseDomain,
    apiType,
    buildGetApiByType,
    buildPostApiByType,
    deleteRequest,
    generalQueryRequest,
    updateRequest
} from "@/framework/apis";

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.config, domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.config, domain)
const configAdminApi = apiType.config + '/admin'

export const getConfig = (configKey: string) => request(buildGetApi(""), {configKey}) as Promise<any>

export const queryParams = (conditionList: Array<any>, sortList: Array<any>, pageSize: number, currentPage: number, domain: string = baseDomain) =>
    generalQueryRequest(configAdminApi, conditionList, sortList, pageSize, currentPage, domain)
export const updateParams = (data: object, domain: string = baseDomain) => updateRequest(configAdminApi, data, domain)
export const deleteParams = (id: string, domain: string = baseDomain) => deleteRequest(configAdminApi, id, domain)

export const refreshParams = (domain: string = baseDomain) =>
    request(buildPostApi("/admin/refresh", domain), {}, {}, true, true) as Promise<any>
