import {get, post} from '@/framework/network/request'
import {apiType, baseDomain, buildGetApiByType, buildPostApiByType} from '@/framework/apis'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/admin', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/admin', domain)

export const getPortalList = (name: string) =>
    get(buildGetApi('/list'), {name}) as Promise<any>

export const deletePortalConfig = (id: any) =>
    post(buildPostApi('/config/delete'), undefined, {id}) as Promise<any>

export const getPortalConfig = (name: string) =>
    get(buildGetApi('/config'), {name}) as Promise<any>

export const updatePortalConfig = (portalConfig: any, silent: boolean) =>
    post(buildPostApi('/config'), undefined, portalConfig, !silent, !silent) as Promise<any>

export const updatePortalColumnOrder = (idOrderReq: any) =>
    post(buildPostApi('/column/order'), undefined, idOrderReq) as Promise<any>

export const updatePortalColumn = (column: any, silent: boolean) =>
    post(buildPostApi('/column'), undefined, column, !silent, !silent) as Promise<any>

export const existedPortalConfig = (name: string) =>
    get(buildGetApi('/config/existed'), {name}, {}, false, false, false) as Promise<any>

export const copyPortalConfig = (sourceConfigId: any, targetName: string, targetDisplayName: string) =>
    post(buildPostApi('/config/copy'), {}, {sourceConfigId, targetName, targetDisplayName}) as Promise<any>
