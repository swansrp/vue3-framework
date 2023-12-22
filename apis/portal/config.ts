import {get, post} from '@/framework/network/request'
import {apiType, baseDomain, buildGetApiByType, buildPostApiByType} from '@/framework/apis'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/admin', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/admin', domain)

export const getPortalList = (name: string) =>
    get(buildGetApi('/list'), {name}) as Promise<any>

export const getPortalConfig = (name: string) =>
    get(buildGetApi('/config'), {name}) as Promise<any>

export const updatePortalConfig = (portalConfig: any) =>
    post(buildPostApi('/config'), undefined, portalConfig) as Promise<any>

export const updatePortalColumnOrder = (idOrderReq: any) =>
    post(buildPostApi('/column/order'), undefined, idOrderReq) as Promise<any>

export const updatePortalColumn = (column: any) =>
    post(buildPostApi('/column'), undefined, column) as Promise<any>
