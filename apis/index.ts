import {Method} from "axios"
import {name} from "@/../package.json"
const baseDomain = '/' + name
const apiType: any = {
    navEdit: '/admin/menu',
    permit: '/permit',
    dict: '/dict',
    nav: '/api',
    common: '',
    menu: '/menu',
    messageEdit: '/admin/sms',
    account: '/account',
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

const requestMethod = {
    GET: "GET" as Method,
    POST: "POST" as Method,
    DELETE: "DELETE" as Method,
    PUT: "PUT" as Method,
}

const buildApi = (
    baseDomain:string,
    url: string,
    method: Method,
    version = "1.0",
    type: string
) => ({baseDomain, url: type + url, method, version})

const buildGetApiByType = (
    url: string,
    type: string,
    version = "1.0",
    domain: string = baseDomain,
) => buildApi(domain, url, requestMethod.GET, version, type)

const buildPostApiByType = (
    url: string,
    type: string,
    version = "1.0",
    domain: string = baseDomain,
) => buildApi(domain, url, requestMethod.POST, version, type)

export {baseDomain, apiType, buildGetApiByType, buildPostApiByType}
