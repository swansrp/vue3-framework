import {get, post} from '@/framework/network/request'
import {apiType, baseDomain, buildGetApiByType, buildPostApiByType} from '@/framework/apis'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/admin', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/admin', domain)

export const getPortalList = (name: string) =>
    get(buildGetApi('/list'), {name}) as Promise<any>

export const deletePortalConfig = (name: string) =>
    post(buildPostApi('/config/delete'), undefined, {name}) as Promise<any>

export const getPortalConfig = (name: string) =>
    get(buildGetApi('/config'), {name}) as Promise<any>

export const updatePortalConfig = (portalConfig: any, silent: boolean) =>
    post(buildPostApi('/config'), undefined, portalConfig, !silent, !silent) as Promise<any>

export const updatePortalColumnOrder = (idOrderReq: any) =>
    post(buildPostApi('/column/order'), undefined, idOrderReq) as Promise<any>

export const updatePortalColumn = (column: any, silent: boolean) =>
    post(buildPostApi('/column'), undefined, column, !silent, !silent) as Promise<any>
