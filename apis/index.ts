import {Method} from "axios"
import {name} from "@/../package.json"
import {request} from "@/framework/network/request";

const baseDomain = '/' + name
const apiType: any = {
    navEdit: '/admin/menu',
    permit: '/permit',
    dict: '/dict',
    nav: '/api',
    common: '',
    menu: '/menu',
    account: '/account',
    channel: '/channel',
    rolePermission: '/admin/role/menu',
    roleUser: '/admin/role/user',
    userRole: '/admin/user/role',
    userGroup: '/group/user',
    week: '/week',
    auth: '',
    config: '/config'
}

const web = '/web'
Object.entries(apiType).forEach(([key, value]) => apiType[key] = web + value)

const baseUrl = import.meta.env.VITE_baseURL + baseDomain + web

const requestMethod = {
    GET: "GET" as Method,
    POST: "POST" as Method,
    DELETE: "DELETE" as Method,
    PUT: "PUT" as Method,
}

const commonUrl = {
    GET_BY_ID: "/id",
    ADD: "/add",
    GENERAL_QUERY: "/general/query",
    UPDATE: "/update",
    DELETE: "/delete"
}

const buildApi = (
    baseDomain: string,
    url: string,
    method: Method,
    version = "1.0",
    type: string
) => ({baseDomain, url: type + url, method, version})

const buildGetApiByType = (
    url: string,
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, url, requestMethod.GET, version, type)

const buildPostApiByType = (
    url: string,
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, url, requestMethod.POST, version, type)

const getByIdApi = (
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, commonUrl.GET_BY_ID, requestMethod.GET, version, type)

const generalQueryApi = (
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, commonUrl.GENERAL_QUERY, requestMethod.POST, version, type)

const addApi = (
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, commonUrl.ADD, requestMethod.POST, version, type)

const updateApi = (
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, commonUrl.UPDATE, requestMethod.POST, version, type)

const deleteApi = (
    type: string,
    domain: string = baseDomain,
    version = "1.0",
) => buildApi(domain, commonUrl.DELETE, requestMethod.POST, version, type)

const addRequest = (
    type: string,
    data: object,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true,
) => request(addApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const deleteRequest = (
    type: string,
    id: string,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true,
) => request(deleteApi(type, domain), {}, {id}, showSuccess, showLoading) as Promise<any>

const updateRequest = (
    type: string,
    data: object,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true,
) => request(updateApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const generalQueryRequest = (
    type: string,
    conditionList: Array<any>,
    sortList: Array<any>,
    pageSize: number,
    currentPage: number,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true,
) => request(generalQueryApi(type, domain), {}, {
    conditionList,
    sortList,
    pageSize,
    currentPage
}, showSuccess, showLoading) as Promise<any>

const getByIdRequest = (
    type: string,
    id: string,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true,
) => request(getByIdApi(type, domain), {id}, {}, showSuccess, showLoading) as Promise<any>

export {
    baseUrl,
    apiType,
    baseDomain,
    buildGetApiByType,
    buildPostApiByType,
    getByIdRequest,
    generalQueryRequest,
    addRequest,
    updateRequest,
    deleteRequest
}
