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

export const getById = (url: string, id: string) =>
  getByIdRequest('/' + url, id) as Promise<any>

export const addEntity = (url: string, entity: object) =>
  addRequest('/' + url, entity) as Promise<any>

export const updateEntity = (url: string, entity: object) =>
  updateRequest('/' + url, {strict: true}, entity) as Promise<any>

export const updateEntitySelective = (url: string, entity: object) =>
  updateRequest('/' + url, {strict: false}, entity) as Promise<any>

export const updateEntityList = (url: string, entity: Array<any>) =>
  updateListRequest('/' + url, {strict: true}, entity) as Promise<any>

export const updateEntityListSelective = (url: string, entity: Array<any>) =>
  updateListRequest('/' + url, {strict: false}, entity) as Promise<any>

export const deleteEntity = (url: string, id: string) =>
  deleteRequest('/' + url, id) as Promise<any>

export const advancedQuery = (url: string, query: QueryType) =>
  advancedQueryRequest('/' + url, query.condition, query.sortList, query.pageSize, query.currentPage) as Promise<any>

export const advancedSelect = (url: string, query: QueryType) =>
  advancedSelectRequest('/' + url, query.condition, query.sortList) as Promise<any>

export const advancedSummary = (url: string, query: QueryType, columns: Array<string>) =>
  advancedSummaryRequest('/' + url, query.condition, query.sortList, columns) as Promise<any>

export const getTreeData = (url: string, query: QueryType) =>
  getTreeDataRequest('/' + url, query) as Promise<any>

export const updateTreePid = (url: string, data: UpdatePidType) =>
  updateTreePidRequest('/' + url, data) as Promise<any>

export const updateOrder = (url: string, data: Array<UpdateOrderType>) =>
  updateOrderRequest('/' + url, data) as Promise<any>

export const exportData = (url: string, name: string, query: QueryType, fileName: string) =>
  exportDataRequest('/' + url, name, query, fileName) as Promise<any>

export const exportTemplate = (url: string, name: string, fileName: string) =>
  exportTemplateRequest('/' + url, name, fileName) as Promise<any>

export const importAdd = (url: string, name: string, file: object, onUploadProgress: Function) =>
  importAddRequest('/' + url, name, file, onUploadProgress) as Promise<any>

export const importAddProgress = (url: string, name: string) =>
  importAddProgressRequest('/' + url, name) as Promise<any>

export const getAllBindList = (entity: string, attach: string, entityId: any) =>
  getAllBindListRequest('/' + entity + '/' + attach, entityId) as Promise<any>

export const queryBindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType) =>
  queryBindListRequest('/' + entity + '/' + attach, entityId, attachQuery) as Promise<any>

export const queryUnbindList = (entity: string, attach: string, entityId: any, attachQuery: QueryType) =>
  queryUnbindListRequest('/' + entity + '/' + attach, entityId, attachQuery) as Promise<any>

export const bindAttach = (entity: string, attach: string, entityId: any, attachId: any) =>
  bindRequest('/' + entity + '/' + attach, entityId, attachId) as Promise<any>

export const unbindAttach = (entity: string, attach: string, entityId: any, attachId: any) =>
  unbindRequest('/' + entity + '/' + attach, entityId, attachId) as Promise<any>

export const bindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>) =>
  bindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList) as Promise<any>

export const unbindBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>) =>
  unbindBatchRequest('/' + entity + '/' + attach, entityId, attachIdList) as Promise<any>

export const bindReplaceBatchAttach = (entity: string, attach: string, entityId: any, attachIdList: Array<any>) =>
  bindReplaceBatchRequest('/' + entity + '/' + attach, entityId, attachIdList) as Promise<any>

export const bindReplaceAllAttach = (entity: string, attach: string, entityId: any, attachQuery: QueryType) =>
  bindReplaceAllRequest('/' + entity + '/' + attach, entityId, attachQuery) as Promise<any>

export const bindAllAttach = (entity: string, attach: string, entityId: any, attachQuery = {} as QueryType) =>
  bindAllRequest('/' + entity + '/' + attach, entityId, attachQuery) as Promise<any>

export const unbindAllAttach = (entity: string, attach: string, entityId: any) =>
  unbindAllRequest('/' + entity + '/' + attach, entityId) as Promise<any>
