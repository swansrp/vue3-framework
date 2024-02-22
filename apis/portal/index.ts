import {
    addRequest,
    advancedQueryRequest,
    apiType,
    deleteRequest,
    exportDataRequest,
    exportTemplateRequest,
    getByIdRequest,
    getTreeDataRequest, importAddProgressRequest, importAddRequest,
    updateListRequest,
    updateOrderRequest,
    updateRequest,
    updateTreePidRequest
} from '@/framework/apis'
import {QueryType, UpdateOrderType, UpdatePidType} from '@/framework/components/common/Portal/type'

export const getById = (url: string, id: string) =>
    getByIdRequest(apiType.common + '/' + url, id) as Promise<any>

export const addEntity = (url: string, entity: object) =>
    addRequest(apiType.common + '/' + url, entity) as Promise<any>

export const updateEntity = (url: string, entity: object) =>
    updateRequest(apiType.common + '/' + url, {strict: true}, entity) as Promise<any>

export const updateEntitySelective = (url: string, entity: object) =>
    updateRequest(apiType.common + '/' + url, {strict: false}, entity) as Promise<any>

export const updateEntityList = (url: string, entity: Array<any>) =>
    updateListRequest(apiType.common + '/' + url, {strict: true}, entity) as Promise<any>

export const updateEntityListSelective = (url: string, entity: Array<any>) =>
    updateListRequest(apiType.common + '/' + url, {strict: false}, entity) as Promise<any>

export const deleteEntity = (url: string, id: string) =>
    deleteRequest(apiType.common + '/' + url, id) as Promise<any>

export const advancedQuery = (url: string, query: QueryType) =>
    advancedQueryRequest(apiType.common + '/' + url, query.condition, query.sortList, query.pageSize, query.currentPage) as Promise<any>

export const getTreeData = (url: string) =>
    getTreeDataRequest(apiType.common + '/' + url) as Promise<any>

export const updateTreePid = (url: string, data: UpdatePidType) =>
    updateTreePidRequest(apiType.common + '/' + url, data) as Promise<any>

export const updateOrder = (url: string, data: Array<UpdateOrderType>) =>
    updateOrderRequest(apiType.common + '/' + url, data) as Promise<any>

export const exportData = (url: string, name: string, query: QueryType, fileName: string) =>
    exportDataRequest(apiType.common + '/' + url, name, query, fileName) as Promise<any>

export const exportTemplate = (url: string, name: string, fileName: string) =>
    exportTemplateRequest(apiType.common + '/' + url, name, fileName) as Promise<any>

export const importAdd = (url: string, name: string, file: object, onUploadProgress: Function) =>
    importAddRequest(apiType.common + '/' + url, name, file, onUploadProgress) as Promise<any>

export const importAddProgress = (url: string, name: string) =>
    importAddProgressRequest(apiType.common + '/' + url, name) as Promise<any>
