import { Method } from 'axios'


import { name } from '@/../package.json'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { QuerySortType, QueryType, UpdateOrderType, UpdatePidType } from '@/framework/components/common/Portal/type'
import { download, request, upload } from '@/framework/network/request'
// 独立计算 baseDomain，避免从 request.ts 导入 domain 导致的模块初始化 TDZ 问题
export const baseDomain = '/' + name

// 先导出 apiType,确保其他模块导入时已经初始化
export const apiType: any = {
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
  deptUser: '/admin/dept/user',
  userRole: '/admin/user/role',
  userGroup: '/group/user',
  userPermission: '/admin/user/menu',
  deptPermission: '/admin/dept/menu',
  groupPermission: '/admin/group/menu',
  permitApply: '/permit/apply',
  week: '/week',
  auth: '',
  config: '/config',
  portal: '/portal',
  tree: '/tree',
  treeAdmin: '/dict/tree/admin'
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
  ADD_LIST: '/insert/list',
  GENERAL_QUERY: '/general/query',
  GENERAL_SELECT: '/general/select',
  GENERAL_SUMMARY: '/general/summary',
  GENERAL_COUNT: '/general/count',
  GENERAL_STATISTIC: '/general/statistic',
  ADVANCED_QUERY: '/advanced/query',
  ADVANCED_SELECT: '/advanced/select',
  ADVANCED_SUMMARY: '/advanced/summary',
  ADVANCED_COUNT: '/advanced/count',
  ADVANCED_STATISTIC: '/advanced/statistic',
  UPDATE: '/update',
  UPDATE_LIST: '/update/list',
  DELETE: '/delete',
  DELETE_LIST: '/delete/list',
  TREE: '/advanced/tree/data',
  TREE_PARENT: '/tree/parent',
  TREE_CHILDREN: '/tree/children',
  TREE_BROTHERS: '/tree/brothers',
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
) => ({ baseDomain, url: type + url, method, version })

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

const getTreeParentApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.TREE_PARENT, requestMethod.GET, version, type)

const getTreeChildrenApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.TREE_CHILDREN, requestMethod.GET, version, type)

const getTreeBrothersApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.TREE_BROTHERS, requestMethod.GET, version, type)

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

const generalCountApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.GENERAL_COUNT, requestMethod.POST, version, type)

const generalStatisticApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.GENERAL_STATISTIC, requestMethod.POST, version, type)

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

const advancedCountApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_COUNT, requestMethod.POST, version, type)

const advancedStatisticApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADVANCED_STATISTIC, requestMethod.POST, version, type)

const addApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADD, requestMethod.POST, version, type)

const addListApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.ADD_LIST, requestMethod.POST, version, type)

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

const getBindInfoApi = (
  type: string,
  domain: string = baseDomain,
  version = '1.0'
) => buildApi(domain, commonUrl.BIND_INFO, requestMethod.GET, version, type)

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

export const addListRequest = (
  type: string,
  data: Array<any>,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(addListApi(type, domain), {}, data, showSuccess, showLoading) as Promise<any>

export const deleteRequest = (
  type: string,
  id: string,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(deleteApi(type, domain), {}, { id }, showSuccess, showLoading) as Promise<any>

export const deleteListRequest = (
  type: string,
  params: object = {},
  data: object,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(deleteListApi(type, domain), params, data, showSuccess, showLoading) as Promise<any>

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
  selectColumnCondition=new Map<string, any>(),
  conditionList: Array<any>,
  sortList: Array<any>,
  pageSize: number,
  currentPage: number,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true,
  selectColumnList?: string[],
  distinct?: string
) => request(generalQueryApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  conditionList,
  sortList,
  pageSize,
  currentPage,
  selectColumnList,
  distinct
}, showSuccess, showLoading) as Promise<any>

export const generalSelectRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  conditionList: Array<any>,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false,
  selectColumnList?: string[],
  distinct?: string
) => request(generalSelectApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  conditionList,
  sortList,
  selectColumnList,
  distinct
}, showSuccess, showLoading) as Promise<any>

export const generalSummaryRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  conditionList: Array<any>,
  sortList: Array<QuerySortType>,
  columns: Array<string>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(generalSummaryApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  conditionList,
  sortList,
  columns
}, showSuccess, showLoading) as Promise<any>

export const generalCountRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  conditionList: Array<any>,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(generalCountApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  conditionList,
  sortList
}, showSuccess, showLoading) as Promise<any>

export const generalStatisticRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  conditionList: Array<any>,
  sort: 0 | 1 | null,
  metricColumn: Array<{column: string, dictMap: any}>,
  metricCondition: Array<any>,
  statisticColumn: Array<any>,
  majorCondition = '0',
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(generalStatisticApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  conditionList,
  sort,
  metricColumn,
  metricCondition,
  statisticColumn,
  majorCondition,
}, showSuccess, showLoading) as Promise<any>

export const advancedQueryRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  pageSize: number,
  currentPage: number,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false,
  selectColumnList?: string[],
  distinct?: string
) => request(advancedQueryApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  condition,
  sortList,
  pageSize,
  currentPage,
  selectColumnList,
  distinct
}, showSuccess, showLoading) as Promise<any>

export const advancedSelectRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false,
  selectColumnList?: string[],
  distinct?: string
) => request(advancedSelectApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  condition,
  sortList,
  selectColumnList,
  distinct
}, showSuccess, showLoading) as Promise<any>

export const advancedSummaryRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  columns: Array<string>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedSummaryApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  condition,
  sortList,
  columns
}, showSuccess, showLoading) as Promise<any>

export const advancedCountRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  condition: ConditionType,
  sortList: Array<QuerySortType>,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedCountApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  condition,
  sortList
}, showSuccess, showLoading) as Promise<any>

export const advancedStatisticRequest = (
  type: string,
  selectColumnCondition=new Map<string, any>(),
  condition: ConditionType,
  sort: 0 | 1 | null,
  metricColumn: Array<{column: string, dictMap: any}>,
  metricCondition: Array<any>,
  statisticColumn: Array<any>,
  majorCondition = '0',
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = false
) => request(advancedStatisticApi(type, domain), {}, {
  selectColumnCondition: Object.fromEntries(selectColumnCondition),
  condition,
  sort,
  metricColumn,
  metricCondition,
  statisticColumn,
  majorCondition
}, showSuccess, showLoading) as Promise<any>

export const getByIdRequest = (
  type: string,
  id: string,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getByIdApi(type, domain), { id }, {}, showSuccess, showLoading) as Promise<any>

export const getTreeDataRequest = (
  type: string,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getTreeApi(type, domain), {}, query, showSuccess, showLoading) as Promise<any>

export const getTreeParentDataRequest = (
  type: string,
  id: any,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getTreeParentApi(type, domain), { id }, {}, showSuccess, showLoading) as Promise<any>

export const getTreeChildrenDataRequest = (
  type: string,
  id: any,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getTreeChildrenApi(type, domain), { id }, {}, showSuccess, showLoading) as Promise<any>

export const getTreeBrothersDataRequest = (
  type: string,
  id: any,
  domain: string = baseDomain,
  showSuccess = false,
  showLoading = true
) => request(getTreeBrothersApi(type, domain), { id }, {}, showSuccess, showLoading) as Promise<any>

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
) => download(exportDataApi(type, domain), fileName, { name: params }, data) as Promise<any>

export const exportTemplateRequest = (
  type: string,
  params: string,
  fileName: string,
  domain: string = baseDomain
) => download(exportTemplateApi(type, domain), fileName, { name: params }, {}) as Promise<any>

export const importAddRequest = (
  type: string,
  params: string,
  body: object,
  onUploadProgress: Function,
  domain: string = baseDomain
) => upload(importAddDataApi(type, domain), { name: params }, body, onUploadProgress) as Promise<any>

export const importAddProgressRequest = (
  type: string,
  params: string,
  domain: string = baseDomain
) => request(importAddProgressApi(type, domain), { name: params }, {}, false, false, true) as Promise<any>

export const getAllBindListRequest = (
  type: string,
  entityId: any,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindAllListApi(type, domain), { entityId }, {}, showSuccess, showLoading) as Promise<any>

export const queryBindListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindListApi(type, domain), {}, { entityId, ...query }, showSuccess, showLoading) as Promise<any>

export const queryUnbindListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(unbindListApi(type, domain), {}, { entityId, ...query }, showSuccess, showLoading) as Promise<any>

export const queryAttachListRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(attachListApi(type, domain), {}, { entityId, ...query }, showSuccess, showLoading) as Promise<any>

export const bindRequest = (
  type: string,
  entityId: any,
  attachId: any,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindApi(type, domain), {}, { attachId, entityId }, showSuccess, showLoading) as Promise<any>

export const unbindRequest = (
  type: string,
  entityId: any,
  attachId: any,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(unbindApi(type, domain), {}, { attachId, entityId }, showSuccess, showLoading) as Promise<any>

export const bindBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindBatchApi(type, domain), {}, { attachIdList, entityId }, showSuccess, showLoading) as Promise<any>

export const unbindBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(unbindBatchApi(type, domain), {}, { attachIdList, entityId }, showSuccess, showLoading) as Promise<any>

export const bindReplaceAllRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindReplaceAllApi(type, domain), {}, { entityId, ...query }, showSuccess, showLoading) as Promise<any>

export const bindReplaceBatchRequest = (
  type: string,
  entityId: any,
  attachIdList: Array<any>,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindReplaceApi(type, domain), {}, { entityId, attachIdList }, showSuccess, showLoading) as Promise<any>

export const bindAllRequest = (
  type: string,
  entityId: any,
  query: QueryType,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindAllApi(type, domain), {}, { entityId, ...query }, showSuccess, showLoading) as Promise<any>

export const unbindAllRequest = (
  type: string,
  entityId: any,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(unbindAllApi(type, domain), {}, { entityId }, showSuccess, showLoading) as Promise<any>

export const bindInfoRequest = (
  type: string,
  entityId: any,
  attachId: any,
  data: any,
  strict: boolean,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindInfoApi(type, domain), { entityId, strict }, {
  attachId,
  data
}, showSuccess, showLoading) as Promise<any>

export const getBindInfoRequest = (
  type: string,
  entityId: any,
  attachId: any,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(getBindInfoApi(type, domain), { entityId, attachId }, {}, showSuccess, showLoading) as Promise<any>

export const bindInfoListRequest = (
  type: string,
  entityId: any,
  data: Array<any>,
  strict: boolean,
  domain: string = baseDomain,
  showSuccess = true,
  showLoading = true
) => request(bindInfoListApi(type, domain), { entityId, strict }, data, showSuccess, showLoading) as Promise<any>


export {
  buildGetApiByType,
  buildPostApiByType
}
