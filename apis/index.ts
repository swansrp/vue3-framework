import {Method} from "axios"

const apiType: any = {
    navEdit: '/admin/menu',
    permit: '/permit',
    dict: '/dict',
    nav: '/api',
    common: '',
    menu: '/menu',
    messageEdit: '/admin/sms',
    project: '/project',
    issue: '/issue',
    partner: '/partner',
    competitor: '/competitor',
    customer: '/customer',
    work: '/work/issue',
    version: '/version',
    account: '/account',
    rolePermission: '/admin/role/menu',
    roleUser: '/admin/role/user',
    userRole: '/admin/user/role',
    userGroup: '/group/user',
    auth: '',
    groupArea: '/group/area'
}

const web = '/web'
Object.entries(apiType).forEach(([key, value]) => apiType[key] = web + value)

const requestMethod = {
    GET: "GET" as Method,
    POST: "POST" as Method,
    DELETE: "DELETE" as Method,
    PUT: "PUT" as Method,
}

const buildApi = (
    url: string,
    method: Method,
    version = "1.0",
    type: string
) => ({url: type + url, method, version})

const buildGetApiByType = (
    url: string,
    type: string,
    version = "1.0"
) => buildApi(url, requestMethod.GET, version, type)

const buildPostApiByType = (
    url: string,
    type: string,
    version = "1.0"
) => buildApi(url, requestMethod.POST, version, type)

export {apiType, buildGetApiByType, buildPostApiByType}
