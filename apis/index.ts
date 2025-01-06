import { Method } from 'axios'
import { name } from '@/../package.json'
import { download, request, upload } from '@/framework/network/request'
import { QuerySortType, QueryType, UpdateOrderType, UpdatePidType } from '@/framework/components/common/Portal/type'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'

const baseDomain = '/' + name
const apiType: any = {
  navEdit: '/admin/menu',
  permit: '/permit',
  dict: '/dict',
  nav: '/api',
  common: '',
  menu: '/menu',
  account: '/account',
  channel: '/partner/admin',
  rolePermission: '/admin/role/menu',
  roleUser: '/admin/role/user',
  userRole: '/admin/user/role',
  userGroup: '/group/user',
  week: '/week',
  auth: '',
  config: '/config',
  portal: '/portal'
}

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
  GENERAL_SELECT: '/general/select',
  GENERAL_SUMMARY: '/general/summary',
  ADVANCED_QUERY: '/advanced/query',
  ADVANCED_SELECT: '/advanced/select',
  ADVANCED_SUMMARY: '/advanced/summary',
  UPDATE: '/update',
  UPDATE_LIST: '/update/list',
  DELETE: '/delete',
  DELETE_LIST: '/delete/list',
  TREE: '/advanced/tree/data',
  TREE_PID: '/pid',
  ORDER: '/order/update',
  EXPORT_DATA: '/advanced/query/export',
  EXPORT_TEMPLATE: '/template/export',
  IMPORT_ADD: '/import/add',
  IMPORT_ADD_PROGRESS: '/import/add/progress',
  BIND_ALL_LIST: '/bind/list',
  BIND_LIST: '/bind/advanced/query',
  UNBIND_LIST: '/unbind/advanced/query',
  ATTACH_LIST: '/attach/advanced/query',
  BIND: '/bind',
  BIND_BATCH: '/bind/batch',
  UNBIND: '/unbind',
  UNBIND_BATCH: '/unbind/batch',
  BIND_REPLACE: '/replace',
  BIND_REPLACE_ALL: '/advanced/replace',
  BIND_ALL: '/bind/all',
  UNBIND_ALL: '/unbind/all',
  BIND_INFO: '/bind/info',
  BIND_INFO_LIST: '/bind/info/list'
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
  type = '',
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, url, requestMethod.GET, version, type)

const buildPostApiByType = (
  url: string,
  type = '',
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
) => buildApi(domain, commonUrl.TREE, requestMethod.POST, version, type)

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

const generalSelectApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.GENERAL_SELECT, requestMethod.POST, version, type)

const generalSummaryApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.GENERAL_SUMMARY, requestMethod.POST, version, type)

const advancedQueryApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_QUERY, requestMethod.POST, version, type)

const advancedSelectApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_SELECT, requestMethod.POST, version, type)

const advancedSummaryApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_SUMMARY, requestMethod.POST, version, type)

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

const deleteListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.DELETE_LIST, requestMethod.POST, version, type)

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
) => buildApi(domain, commonUrl.IMPORT_ADD, requestMethod.POST, version, type)

const importAddProgressApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.IMPORT_ADD_PROGRESS, requestMethod.GET, version, type)

const bindAllListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_ALL_LIST, requestMethod.GET, version, type)

const bindListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_LIST, requestMethod.POST, version, type)

const unbindListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.UNBIND_LIST, requestMethod.POST, version, type)

const attachListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ATTACH_LIST, requestMethod.POST, version, type)

const bindApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND, requestMethod.POST, version, type)

const unbindApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.UNBIND, requestMethod.POST, version, type)

const bindBatchApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_BATCH, requestMethod.POST, version, type)

const unbindBatchApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.UNBIND_BATCH, requestMethod.POST, version, type)

const bindReplaceApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_REPLACE, requestMethod.POST, version, type)

const bindReplaceAllApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_REPLACE_ALL, requestMethod.POST, version, type)

const bindAllApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_ALL, requestMethod.POST, version, type)

const unbindAllApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.UNBIND_ALL, requestMethod.POST, version, type)

const bindInfoApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_INFO, requestMethod.POST, version, type)

const bindInfoListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_INFO_LIST, requestMethod.POST, version, type)

export const addRequest = (
  type: string,
  data: object,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(addApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

export const deleteRequest = (
  type: string,
  id: string,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(deleteApi(type, domain), {}, {id}, showSuccess, showLoading) as Promise<any>

export const deleteListRequest = (
  type: string,
  params: object = {},
  data: object,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(deleteListApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

export const updateRequest = (
  type: string,
  params: object = {},
  data: object,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(updateApi(type, domain), params, data, showSuccess, showLoading) as Promise<any>

export const updateListRequest = (
  type: string,
  params: object = {},
  data: object,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(updateListApi(type, domain), params, data, showSuccess, showLoading) as Promise<any>

export const generalQueryRequest = (
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

export const generalSelectRequest = (
  type: string,
  conditionList: Array<any>,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(generalSelectApi(type, domain), {}, {
  conditionList,
  sortList
}, showSuccess, showLoading) as Promise<any>

export const generalSummaryRequest = (
  type: string,
  conditionList: Array<any>,
  sortList: Array<QuerySortType>,
  columns: Array<string>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(generalSummaryApi(type, domain), {}, {
  conditionList,
  sortList,
  columns
}, showSuccess, showLoading) as Promise<any>

export const advancedQueryRequest = (
  type: string,
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  pageSize: number,
  currentPage: number,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedQueryApi(type, domain), {}, {
  condition,
  sortList,
  pageSize,
  currentPage
}, showSuccess, showLoading) as Promise<any>

export const advancedSelectRequest = (
  type: string,
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedSelectApi(type, domain), {}, {
  condition,
  sortList
}, showSuccess, showLoading) as Promise<any>

export const advancedSummaryRequest = (
  type: string,
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  columns: Array<string>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedSummaryApi(type, domain), {}, {
  condition,
  sortList,
  columns
}, showSuccess, showLoading) as Promise<any>

export const getByIdRequest = (
  type: string,
  id: string,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getByIdApi(type, domain), {id}, {}, showSuccess, showLoading) as Promise<any>

export const getTreeDataRequest = (
  type: string,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getTreeApi(type, domain), {}, query, showSuccess, showLoading) as Promise<any>

export const updateTreePidRequest = (
  type: string,
  data: UpdatePidType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(updateTreePidApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

export const updateOrderRequest = (
  type: string,
  data: Array<UpdateOrderType>,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(updateOrderApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

export const exportDataRequest = (
  type: string,
  params: string,
  data: QueryType,
  fileName: string,
  domain: string = baseDomain
) => download(exportDataApi(type, domain), fileName, {name: params}, data) as Promise<any>

export const exportTemplateRequest = (
  type: string,
  params: string,
  fileName: string,
  domain: string = baseDomain
) => download(exportTemplateApi(type, domain), fileName, {name: params}, {}) as Promise<any>

export const importAddRequest = (
  type: string,
  params: string,
  body: object,
  onUploadProgress: Function,
  domain: string = baseDomain
) => upload(importAddDataApi(type, domain), {name: params}, body, onUploadProgress) as Promise<any>

export const importAddProgressRequest = (
  type: string,
  params: string,
  domain: string = baseDomain
) => request(importAddProgressApi(type, domain), {name: params}, {}, false, false, true) as Promise<any>

export const getAllBindListRequest = (
  type: string,
  entityId: any,
  domain: string = baseDomain
) => request(bindAllListApi(type, domain), {entityId}, {}) as Promise<any>

export const queryBindListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain
) => request(bindListApi(type, domain), {}, {entityId, ...query}) as Promise<any>

export const queryUnbindListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain
) => request(unbindListApi(type, domain), {}, {entityId, ...query}) as Promise<any>

export const queryAttachListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain
) => request(attachListApi(type, domain), {}, {entityId, ...query}) as Promise<any>

export const bindRequest = (
  type: string,
  entityId: any,
  attachId: any,
  domain: string = baseDomain
) => request(bindApi(type, domain), {}, {attachId, entityId}) as Promise<any>

export const unbindRequest = (
  type: string,
  entityId: any,
  attachId: any,
  domain: string = baseDomain
) => request(unbindApi(type, domain), {}, {attachId, entityId}) as Promise<any>

export const bindBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain
) => request(bindBatchApi(type, domain), {}, {attachIdList, entityId}) as Promise<any>

export const unbindBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain
) => request(unbindBatchApi(type, domain), {}, {attachIdList, entityId}) as Promise<any>

export const bindReplaceAllRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain
) => request(bindReplaceAllApi(type, domain), {}, {entityId, ...query}) as Promise<any>

export const bindReplaceBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain
) => request(bindReplaceApi(type, domain), {}, {entityId, attachIdList}) as Promise<any>

export const bindAllRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain
) => request(bindAllApi(type, domain), {}, {entityId, ...query}) as Promise<any>

export const unbindAllRequest = (
  type: string,
  entityId: any,
  domain: string = baseDomain
) => request(unbindAllApi(type, domain), {}, {entityId}) as Promise<any>

export const bindInfoRequest = (
  type: string,
  entityId: any,
  attachId: any,
  data: any,
  strict: boolean,
  domain: string = baseDomain
) => request(bindInfoApi(type, domain), {entityId, strict}, {attachId, data}) as Promise<any>

export const bindInfoListRequest = (
  type: string,
  entityId: any,
  data: Array<any>,
  strict: boolean,
  domain: string = baseDomain
) => request(bindInfoListApi(type, domain), {entityId, strict}, data) as Promise<any>


export {
  apiType,
  baseDomain,
  buildGetApiByType,
  buildPostApiByType
}
