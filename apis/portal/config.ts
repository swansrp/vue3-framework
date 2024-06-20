import { get, post } from '@/framework/network/request'
import { apiType, baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/admin', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/admin', domain)

export const getPortalList = (name: string, roleId: any) => get(buildGetApi('/list'), {name, roleId}) as Promise<any>

export const deletePortalConfig = (id: any) => post(buildPostApi('/config/delete'), undefined, {id}) as Promise<any>

export const getPortalConfig = (name: string, roleId?: any) => get(buildGetApi('/config'), {
  name,
  roleId
}) as Promise<any>

export const updatePortalConfig = (portalConfig: any, silent: boolean) => post(buildPostApi('/config'), undefined, portalConfig, !silent, !silent) as Promise<any>

export const updatePortalColumnOrder = (idOrderReq: any) => post(buildPostApi('/column/order'), undefined, idOrderReq) as Promise<any>

export const updatePortalColumn = (column: any, silent: boolean) => post(buildPostApi('/column'), undefined, column, !silent, !silent) as Promise<any>

export const existedPortalConfig = (name: string, roleId: any) => get(buildGetApi('/config/existed'), {
  name,
  roleId
}, {}, false, false, false) as Promise<any>

export const copyPortalConfig = (sourceConfigId: any, targetName: string, targetDisplayName: string) => post(buildPostApi('/config/copy'), {}, {
  sourceConfigId,
  targetName,
  targetDisplayName
}) as Promise<any>

export const getBindRole = () => post(buildGetApi('/role'), {}, {}) as Promise<any>

export const bindRole = (roleId: any, templateRoleId: any) => post(buildPostApi('/role/bind'), {}, {
  roleId,
  templateRoleId
}) as Promise<any>

export const unbindRole = (roleId: any) => post(buildPostApi('/role/unbind'), {}, {roleId}) as Promise<any>
