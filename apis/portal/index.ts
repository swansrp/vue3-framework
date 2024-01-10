import {request} from '@/framework/network/request'
import {
    addRequest,
    apiType,
    baseDomain,
    buildGetApiByType,
    buildPostApiByType,
    deleteRequest,
    generalQueryRequest,
    getByIdRequest, getTreeDataRequest,
    updateListRequest, updateOrderRequest,
    updateRequest, updateTreePidRequest
} from '@/framework/apis'
import {QueryType, UpdateOrderType, UpdatePidType} from '@/framework/components/common/portal/type'

export const getById = (tableId: string, id: string) =>
    getByIdRequest(apiType.portal + '/' + tableId, id) as Promise<any>

export const addEntity = (tableId: string, entity: object) =>
    addRequest(apiType.portal + '/' + tableId, entity) as Promise<any>

export const updateEntity = (tableId: string, entity: object) =>
    updateRequest(apiType.portal + '/' + tableId, entity) as Promise<any>

export const updateEntityList = (tableId: string, entity: Array<any>) =>
    updateListRequest(apiType.portal + '/' + tableId, entity) as Promise<any>

export const deleteEntity = (tableId: string, id: string) =>
    deleteRequest(apiType.portal + '/' + tableId, id) as Promise<any>

export const generalQuery = (tableId: string, query: QueryType) =>
    generalQueryRequest(apiType.portal + '/' + tableId, query.conditionList, query.sortList, query.pageSize, query.currentPage) as Promise<any>

export const advancedQuery = (tableId: string, query: QueryType) =>
    generalQueryRequest(apiType.portal + '/' + tableId, query.conditionList, query.sortList, query.pageSize, query.currentPage) as Promise<any>

export const getTreeData = (tableId: string) =>
    getTreeDataRequest(apiType.portal + '/' + tableId) as Promise<any>

export const updateTreePid = (tableId: string, data: UpdatePidType) =>
    updateTreePidRequest(apiType.portal + '/' + tableId, data) as Promise<any>

export const updateOrder = (tableId: string, data: Array<UpdateOrderType>) =>
    updateOrderRequest(apiType.portal + '/' + tableId, data) as Promise<any>
