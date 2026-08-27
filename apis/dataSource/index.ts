import {
  baseDomain,
  buildGetApiByType,
  buildPostApiByType,
  addRequest,
  deleteRequest,
  generalQueryRequest,
  updateRequest
} from '@/framework/apis'
import { request } from '@/framework/network/request'

// 数据源管理已下沉 forge（dataset/matrix/问数共用），接口前缀随之迁移
const dsType = '/forge/datasource'
const dsAdminApi = dsType + '/admin'
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, dsType, domain)
const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, dsType, domain)

export const queryDataSources = (conditionList: Array<any>, sortList: Array<any>, pageSize: number, currentPage: number, domain: string = baseDomain) =>
  generalQueryRequest(dsAdminApi, undefined, conditionList, sortList, pageSize, currentPage, domain)

export const addDataSource = (data: object, domain: string = baseDomain) => addRequest(dsAdminApi, data, domain)

export const updateDataSource = (data: object, domain: string = baseDomain) => updateRequest(dsAdminApi, {}, data, domain)

export const deleteDataSource = (id: string, domain: string = baseDomain) => deleteRequest(dsAdminApi, id, domain)

export const refreshDataSources = (domain: string = baseDomain) =>
  request(buildPostApi('/admin/refresh', domain), {}, {}, true, true) as Promise<any>

export const testDataSource = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/test', domain), {}, data, true, true) as Promise<any>

// 可用数据源名称（yml 静态定义 + 数据源管理配置），dataset 等下拉选择用
export const listDataSourceNames = (domain: string = baseDomain) =>
  request(buildGetApi('/admin/names', domain), {}, {}, false, false) as Promise<any>
