import {Method} from 'axios'
import {name} from '@/../package.json'
import {download, request, upload} from '@/framework/network/request'
import {QuerySortType, QueryType, UpdateOrderType, UpdatePidType} from '@/framework/components/common/Portal/type'
import {ConditionType} from '@/framework/components/common/AdvancedSearch/type'

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
    config: '/config',
    portal: '/portal'
}

const web = '/web'
Object.entries(apiType).forEach(([key, value]) => apiType[key] = web + value)

const baseUrl = import.meta.env.VITE_baseURL + baseDomain + web

const requestMethod = {
    GET: 'GET' as Method,
    POST: 'POST' as Method,
    DELETE: 'DELETE' as Method,
    PUT: 'PUT' as Method
}

const commonUrl = {
    GET_BY_ID: '/id',
    ADD: '/insert',
    GENERAL_QUERY: '/general/query',
    ADVANCED_QUERY: '/advanced/query',
    UPDATE: '/update',
    UPDATE_LIST: '/update/list',
    DELETE: '/delete',
    TREE: '/tree/data',
    TREE_PID: '/pid',
    ORDER: '/order/update',
    EXPORT_DATA: '/advanced/query/export',
    EXPORT_TEMPLATE: '/template/export',
    IMPORT_ADD: '/import/add',
    IMPORT_ADD_PROGRESS: '/import/add/progress'
}

const buildApi = (
    baseDomain: string,
    url: string,
    method: Method,
    version = '1.0',
    type: string
) => ({baseDomain, url: type + url, method, version})

const buildGetApiByType = (
    url: string,
    type = web,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, url, requestMethod.GET, version, type)

const buildPostApiByType = (
    url: string,
    type = web,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, url, requestMethod.POST, version, type)

const getByIdApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.GET_BY_ID, requestMethod.GET, version, type)

const getTreeApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.TREE, requestMethod.GET, version, type)

const updateTreePidApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.TREE_PID, requestMethod.POST, version, type)

const updateOrderApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.ORDER, requestMethod.POST, version, type)

const generalQueryApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.GENERAL_QUERY, requestMethod.POST, version, type)

const advancedQueryApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_QUERY, requestMethod.POST, version, type)

const addApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.ADD, requestMethod.POST, version, type)

const updateApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.UPDATE, requestMethod.POST, version, type)

const updateListApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.UPDATE_LIST, requestMethod.POST, version, type)

const deleteApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.DELETE, requestMethod.POST, version, type)

const exportDataApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.EXPORT_DATA, requestMethod.POST, version, type)

const exportTemplateApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.EXPORT_TEMPLATE, requestMethod.GET, version, type)

const importAddDataApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.IMPORT_ADD, requestMethod.GET, version, type)

const importAddProgressApi = (
    type: string,
    domain: string = baseDomain,
    version = '1.0'
) => buildApi(domain, commonUrl.IMPORT_ADD_PROGRESS, requestMethod.GET, version, type)

const addRequest = (
    type: string,
    data: object,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(addApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const deleteRequest = (
    type: string,
    id: string,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(deleteApi(type, domain), {}, {id}, showSuccess, showLoading) as Promise<any>

const updateRequest = (
    type: string,
    data: object,
    params: object = {},
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(updateApi(type, domain), params, data, showSuccess, showLoading) as Promise<any>

const updateListRequest = (
    type: string,
    data: object,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(updateListApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const generalQueryRequest = (
    type: string,
    conditionList: Array<any>,
    sortList: Array<any>,
    pageSize: number,
    currentPage: number,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true
) => request(generalQueryApi(type, domain), {}, {
    conditionList,
    sortList,
    pageSize,
    currentPage
}, showSuccess, showLoading) as Promise<any>

const advancedQueryRequest = (
    type: string,
    condition: ConditionType,
    sortList: Array<QuerySortType>,
    pageSize: number,
    currentPage: number,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true
) => request(advancedQueryApi(type, domain), {}, {
    condition,
    sortList,
    pageSize,
    currentPage
}, showSuccess, showLoading) as Promise<any>

const getByIdRequest = (
    type: string,
    id: string,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true
) => request(getByIdApi(type, domain), {id}, {}, showSuccess, showLoading) as Promise<any>

const getTreeDataRequest = (
    type: string,
    domain: string = baseDomain,
    showSuccess = false,
    showLoading = true
) => request(getTreeApi(type, domain), {}, {}, showSuccess, showLoading) as Promise<any>

const updateTreePidRequest = (
    type: string,
    data: UpdatePidType,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(updateTreePidApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const updateOrderRequest = (
    type: string,
    data: Array<UpdateOrderType>,
    domain: string = baseDomain,
    showSuccess = true,
    showLoading = true
) => request(updateOrderApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

const exportDataRequest = (
    type: string,
    data: QueryType,
    fileName: string,
    domain: string = baseDomain
) => download(exportDataApi(type, domain), fileName, {}, data) as Promise<any>

const exportTemplateRequest = (
    type: string,
    fileName: string,
    domain: string = baseDomain
) => download(exportTemplateApi(type, domain), fileName, {}, {}) as Promise<any>

const importAddRequest = (
    type: string,
    data: QueryType,
    domain: string = baseDomain
) => upload(importAddDataApi(type, domain), {}, data) as Promise<any>

const importAddProgressRequest = (
    type: string,
    domain: string = baseDomain
) => request(importAddProgressApi(type, domain), {}) as Promise<any>

export {
    web,
    baseUrl,
    apiType,
    baseDomain,
    buildGetApiByType,
    buildPostApiByType,
    getByIdRequest,
    getTreeDataRequest,
    updateTreePidRequest,
    updateOrderRequest,
    generalQueryRequest,
    advancedQueryRequest,
    addRequest,
    updateRequest,
    updateListRequest,
    deleteRequest,
    exportDataRequest,
    exportTemplateRequest,
    importAddRequest,
    importAddProgressRequest
}
