import {
  addRequest,
  advancedQueryRequest,
  advancedSelectRequest,
  advancedSummaryRequest,
  bindAllRequest,
  bindBatchRequest,
  bindReplaceAllRequest,
  bindReplaceBatchRequest,
  bindRequest,
  deleteRequest,
  exportDataRequest,
  exportTemplateRequest,
  generalQueryRequest,
  generalSelectRequest,
  generalSummaryRequest,
  getAllBindListRequest,
  getByIdRequest,
  getTreeDataRequest,
  importAddProgressRequest,
  importAddRequest,
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

export const getById = (url: string, id: string, baseDomain?: string) =>
  getByIdRequest('/' + url, id, baseDomain) as Promise<any>

export const addEntity = (url: string, entity: object, baseDomain?: string) =>
  addRequest('/' + url, entity, baseDomain) as Promise<any>

export const updateEntity = (url: string, entity: object, baseDomain?: string) =>
  updateRequest('/' + url, {strict: true}, entity, baseDomain) as Promise<any>

export const updateEntitySelective = (url: string, entity: object, baseDomain?: string) =>
  updateRequest('/' + url, {strict: false}, entity, baseDomain) as Promise<any>

export const updateEntityList = (url: string, entity: Array<any>, baseDomain?: string) =>
  updateListRequest('/' + url, {strict: true}, entity, baseDomain) as Promise<any>

export const updateEntityListSelective = (url: string, entity: Array<any>, baseDomain?: string) =>
  updateListRequest('/' + url, {strict: false}, entity, baseDomain) as Promise<any>

export const deleteEntity = (url: string, id: string, baseDomain?: string) =>
  deleteRequest('/' + url, id, baseDomain) as Promise<any>

export const advancedQuery = (url: string, query: QueryType, baseDomain?: string) =>
  advancedQueryRequest('/' + url, query.condition, query.sortList, query.pageSize, query.currentPage, baseDomain) as Promise<any>

export const generalQuery = (url: string, query: QueryType, baseDomain?: string) =>
  generalQueryRequest('/' + url, query.conditionList, query.sortList, query.pageSize, query.currentPage, baseDomain) as Promise<any>

export const generalSelect = (url: string, query: QueryType, baseDomain?: string) =>
  generalSelectRequest('/' + url, query.conditionList, query.sortList, baseDomain) as Promise<any>

export const generalSummary = (url: string, query: QueryType, columns: Array<string>, baseDomain?: string) =>
  generalSummaryRequest('/' + url, query.conditionList, query.sortList, columns, baseDomain) as Promise<any>

export const advancedSelect = (url: string, query: QueryType, baseDomain?: string) =>
  advancedSelectRequest('/' + url, query.condition, query.sortList, baseDomain) as Promise<any>

export const advancedSummary = (url: string, query: QueryType, columns: Array<string>, baseDomain?: string) =>
  advancedSummaryRequest('/' + url, query.condition, query.sortList, columns, baseDomain) as Promise<any>

export const getTreeData = (url: string, query: QueryType, baseDomain?: string) =>
  getTreeDataRequest('/' + url, query, baseDomain) as Promise<any>

export const updateTreePid = (url: string, data: UpdatePidType, baseDomain?: string) =>
  updateTreePidRequest('/' + url, data, baseDomain) as Promise<any>

export const updateOrder = (url: string, data: Array<UpdateOrderType>, baseDomain?: string) =>
  updateOrderRequest('/' + url, data, baseDomain) as Promise<any>

export const exportData = (url: string, name: string, query: QueryType, fileName: string, baseDomain?: string) =>
  exportDataRequest('/' + url, name, query, fileName, baseDomain) as Promise<any>

export const exportTemplate = (url: string, name: string, fileName: string, baseDomain?: string) =>
  exportTemplateRequest('/' + url, name, fileName, baseDomain) as Promise<any>

export const importAdd = (url: string, name: string, file: object, onUploadProgress: Function, baseDomain?: string) =>
  importAddRequest('/' + url, name, file, onUploadProgress, baseDomain) as Promise<any>

export const importAddProgress = (url: string, name: string, baseDomain?: string) =>
  importAddProgressRequest('/' + url, name, baseDomain) as Promise<any>

export const getAllBindList = (entity: string, attach: string, entityId: any, baseDomain?: string) =>
  getAllBindListRequest('/' + entity + '/' + attach, entityId, baseDomain) as Promise<any>

export const queryBindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string) =>
  queryBindListRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain) as Promise<any>

export const queryUnbindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string) =>
  queryUnbindListRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain) as Promise<any>

export const bindAttach = (entity: string, attach: string, entityId: any, attachId: any, baseDomain?: string) =>
  bindRequest('/' + entity + '/' + attach, entityId, attachId, baseDomain) as Promise<any>

export const unbindAttach = (entity: string, attach: string, entityId: any, attachId: any, baseDomain?: string) =>
  unbindRequest('/' + entity + '/' + attach, entityId, attachId, baseDomain) as Promise<any>

export const bindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string) =>
  bindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain) as Promise<any>

export const unbindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string) =>
  unbindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain) as Promise<any>

export const bindReplaceBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>, baseDomain?: string) =>
  bindReplaceBatchRequest('/' + entity + '/' + attach, entityId, attachIdList, baseDomain) as Promise<any>

export const bindReplaceAllAttach = (entity: string, attach: string, entityId: any, attachQuery: QueryType, baseDomain?: string) =>
  bindReplaceAllRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain) as Promise<any>

export const bindAllAttach = (entity: string, attach: string, entityId: any, attachQuery = {} as QueryType, baseDomain?: string) =>
  bindAllRequest('/' + entity + '/' + attach, entityId, attachQuery, baseDomain) as Promise<any>

export const unbindAllAttach = (entity: string, attach: string, entityId: any, baseDomain?: string) =>
  unbindAllRequest('/' + entity + '/' + attach, entityId, baseDomain) as Promise<any>
