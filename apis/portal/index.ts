import {
  addListRequest,
  addRequest,
  advancedCountRequest,
  advancedQueryRequest,
  advancedSelectRequest,
  advancedStatisticRequest,
  advancedSummaryRequest,
  bindAllRequest,
  bindBatchRequest,
  bindInfoListRequest,
  bindInfoRequest,
  bindReplaceAllRequest,
  bindReplaceBatchRequest,
  bindRequest, buildGetApiByType,
  deleteListRequest,
  deleteRequest,
  exportDataRequest,
  exportTemplateRequest,
  generalCountRequest,
  generalQueryRequest,
  generalSelectRequest,
  generalStatisticRequest,
  generalSummaryRequest,
  getAllBindListRequest,
  getBindInfoRequest,
  getByIdRequest,
  getTreeBrothersDataRequest,
  getTreeChildrenDataRequest,
  getTreeDataRequest,
  getTreeParentDataRequest,
  importAddProgressRequest,
  importAddRequest,
  queryAttachListRequest,
  queryBindListRequest,
  queryUnbindListRequest,
  unbindAllRequest,
  unbindBatchRequest,
  unbindRequest,
  updateListRequest,
  updateOrderRequest,
  updateRequest,
  updateTreePidRequest
} from '@/framework/apis'
import { QueryType, UpdateOrderType, UpdatePidType } from '@/framework/components/common/Portal/type'
import { get } from '@/framework/network/request'

export const getById = (url: string, id: string, baseDomain?: string, showSuccess = true, showLoading = true) =>
  getByIdRequest('/' + url, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const addEntity = (url: string, entity: object, baseDomain?: string, showSuccess = true, showLoading = true) =>
  addRequest('/' + url, entity, baseDomain, showSuccess, showLoading) as Promise<any>

export const addEntityList = (url: string, entityList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  addListRequest('/' + url, entityList, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateEntity = (url: string, entity: object, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateRequest('/' + url, { strict: true }, entity, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateEntitySelective = (url: string, entity: object, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateRequest('/' + url, { strict: false }, entity, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateEntityList = (url: string, entity: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateListRequest('/' + url, { strict: true }, entity, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateEntityListSelective = (url: string, entity: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateListRequest('/' + url, { strict: false }, entity, baseDomain, showSuccess, showLoading) as Promise<any>

export const deleteEntity = (url: string, id: string, baseDomain?: string, showSuccess = true, showLoading = true) =>
  deleteRequest('/' + url, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const deleteEntityList = (url: string, id: Array<string>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  deleteListRequest('/' + url, {}, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const advancedQuery = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = false, selectColumnList?: string[], distinct?: string) =>
  advancedQueryRequest('/' + url, query.selectColumnCondition,  query.condition, query.sortList, query.pageSize, query.currentPage, baseDomain, showSuccess, showLoading, selectColumnList, distinct) as Promise<any>

export const generalQuery = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = false, selectColumnList?: string[], distinct?: string) =>
  generalQueryRequest('/' + url, query.selectColumnCondition,  query.conditionList, query.sortList, query.pageSize, query.currentPage, baseDomain, showSuccess, showLoading, selectColumnList, distinct) as Promise<any>

export const generalSelect = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = true, selectColumnList?: string[], distinct?: string) =>
  generalSelectRequest('/' + url, query.selectColumnCondition,  query.conditionList, query.sortList, baseDomain, showSuccess, showLoading, selectColumnList, distinct) as Promise<any>

export const generalSummary = (url: string, query: QueryType, columns: Array<string>, baseDomain?: string, showSuccess = true, showLoading = false) =>
  generalSummaryRequest('/' + url, query.selectColumnCondition,  query.conditionList, query.sortList, columns, baseDomain, showSuccess, showLoading) as Promise<any>

export const generalCount = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  generalCountRequest('/' + url, query.selectColumnCondition,  query.conditionList, query.sortList, baseDomain, showSuccess, showLoading) as Promise<any>

export const generalStatistic = (url: string, query: QueryType, sort: 0 | 1 | null, metricColumn: Array<{column: string, dictMap: any}>, metricCondition: Array<any>, statisticColumn: Array<{value: string, label: string}>, majorCondition='1', baseDomain?: string, showSuccess = true, showLoading = false) =>
  generalStatisticRequest('/' + url, query.selectColumnCondition,  query.conditionList, sort, metricColumn, metricCondition, statisticColumn, majorCondition, baseDomain, showSuccess, showLoading) as Promise<any>

export const advancedSelect = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = true, selectColumnList?: string[], distinct?: string) =>
  advancedSelectRequest('/' + url, query.selectColumnCondition,  query.condition, query.sortList, baseDomain, showSuccess, showLoading, selectColumnList, distinct) as Promise<any>

export const advancedSummary = (url: string, query: QueryType, columns: Array<string>, baseDomain?: string, showSuccess = true, showLoading = false) =>
  advancedSummaryRequest('/' + url, query.selectColumnCondition,  query.condition, query.sortList, columns, baseDomain, showSuccess, showLoading) as Promise<any>

export const advancedCount = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  advancedCountRequest('/' + url, query.selectColumnCondition,  query.condition, query.sortList, baseDomain, showSuccess, showLoading) as Promise<any>

export const advancedStatistic = (url: string, query: QueryType, sort: 0 | 1 | null, metricColumn: Array<{column: string, dictMap: any}>, metricCondition: Array<any>, statisticColumn: Array<{value: string, label: string}>,  majorCondition='1', baseDomain?: string, showSuccess = true, showLoading = false) =>
  advancedStatisticRequest('/' + url, query.selectColumnCondition,  query.condition, sort, metricColumn, metricCondition, statisticColumn, majorCondition, baseDomain, showSuccess, showLoading) as Promise<any>

export const getTreeData = (url: string, query: QueryType, baseDomain?: string, showSuccess = true, showLoading = false) =>
  getTreeDataRequest('/' + url, query, baseDomain, showSuccess, showLoading) as Promise<any>

export const getTreeParentData = (url: string, id: any, baseDomain?: string, showSuccess = true, showLoading = false) =>
  getTreeParentDataRequest('/' + url, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const getTreeChildrenData = (url: string, id: any, baseDomain?: string, showSuccess = true, showLoading = false) =>
  getTreeChildrenDataRequest('/' + url, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const getTreeBrothersData = (url: string, id: any, baseDomain?: string, showSuccess = true, showLoading = false) =>
  getTreeBrothersDataRequest('/' + url, id, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateTreePid = (url: string, data: UpdatePidType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateTreePidRequest('/' + url, data, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateOrder = (url: string, data: Array<UpdateOrderType>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  updateOrderRequest('/' + url, data, baseDomain, showSuccess, showLoading) as Promise<any>

export const exportData = (url: string, name: string, query: QueryType, fileName: string, baseDomain?: string) =>
  exportDataRequest('/' + url, name, query, fileName, baseDomain) as Promise<any>

export const exportTemplate = (url: string, name: string, fileName: string, baseDomain?: string) =>
  exportTemplateRequest('/' + url, name, fileName, baseDomain) as Promise<any>

export const importAdd = (url: string, name: string, file: object, onUploadProgress: Function, baseDomain?: string) =>
  importAddRequest('/' + url, name, file, onUploadProgress, baseDomain) as Promise<any>

export const importAddProgress = (url: string, name: string, baseDomain?: string) =>
  importAddProgressRequest('/' + url, name, baseDomain) as Promise<any>

export const getAllBindList = (entity: string, attach: string, entityId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  getAllBindListRequest('/' + entity + '/' + attach, entityId, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryBindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryBindListRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryUnbindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryUnbindListRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryAttachList = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryAttachListRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindAttach = (entity: string, attach: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindRequest('/' + entity + '/' + attach, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindAttach = (entity: string, attach: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindRequest('/' + entity + '/' + attach, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindReplaceBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindReplaceBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindReplaceAllAttach = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindReplaceAllRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindAllAttach = (entity: string, attach: string, entityId: any, attachQuery = {} as QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindAllRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindAllAttach = (entity: string, attach: string, entityId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindAllRequest('/' + entity + '/' + attach, entityId, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateBindInfo = (entity: string, attach: string, entityId: any, attachId: any, data: any, strict = true, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindInfoRequest('/' + entity + '/' + attach, entityId, attachId, data, strict, baseDomain, showSuccess, showLoading) as Promise<any>

export const getBindInfo = (entity: string, attach: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = false, showLoading = false) =>
  getBindInfoRequest('/' + entity + '/' + attach, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateBindInfoList = (entity: string, attach: string, entityId: any, data: Array<any>, strict = true, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindInfoListRequest('/' + entity + '/' + attach, entityId, data, strict, baseDomain, showSuccess, showLoading) as Promise<any>

export const getAllBindListByUrl = (url: string, entityId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  getAllBindListRequest(url, entityId, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryBindListByUrl = (url: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryBindListRequest(url, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryUnbindListByUrl = (url: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryUnbindListRequest(url, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const queryAttachListByUrl = (url: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  queryAttachListRequest(url, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindAttachByUrl = (url: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindRequest(url, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindAttachByUrl = (url: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindRequest(url, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindBatchAttachByUrl = (url: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindBatchRequest(url, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindBatchAttachByUrl = (url: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindBatchRequest(url, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindReplaceBatchAttachByUrl = (url: string, entityId: any, attachIdList: Array<any>, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindReplaceBatchRequest(url, entityId, attachIdList, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindReplaceAllAttachByUrl = (url: string, entityId: any, attachQuery: QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindReplaceAllRequest(url, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const bindAllAttachByUrl = (url: string, entityId: any, attachQuery = {} as QueryType, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindAllRequest(url, entityId, attachQuery, baseDomain, showSuccess, showLoading) as Promise<any>

export const unbindAllAttachByUrl = (url: string, entityId: any, baseDomain?: string, showSuccess = true, showLoading = true) =>
  unbindAllRequest(url, entityId, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateBindInfoByUrl = (url: string, entityId: any, attachId: any, data: any, strict = true, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindInfoRequest(url, entityId, attachId, data, strict, baseDomain, showSuccess, showLoading) as Promise<any>

export const getBindInfoByUrl = (url: string, entityId: any, attachId: any, baseDomain?: string, showSuccess = false, showLoading = false) =>
  getBindInfoRequest(url, entityId, attachId, baseDomain, showSuccess, showLoading) as Promise<any>

export const updateBindInfoListByUrl = (url: string, entityId: any, data: Array<any>, strict = true, baseDomain?: string, showSuccess = true, showLoading = true) =>
  bindInfoListRequest(url, entityId, data, strict, baseDomain, showSuccess, showLoading) as Promise<any>

export const getIndicatorConfig = (name: string) => get(buildGetApiByType('portal/indicator/group/indicator/tree'), { tableId: name }) as Promise<any>