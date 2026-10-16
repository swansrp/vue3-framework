
import type { OrderItem } from './common'

export interface PageMapstringobject {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  records?: object[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface TreeDataResVO {
  children?: TreeDataResVO[]
  key?: object
  pid?: object
  title?: string
}

export interface IdPidReqVO {
  /** id */
  id?: string
  /** pid */
  pid?: object
}

export interface TreeDataItemVO {
  key?: object
  pid?: object
  title?: string
}

export type PageMapstringobjectResponse = ResponseDataType & {
  payload: PageMapstringobject
}

export type PageMapstringobjectListResponse = ResponseDataType & {
  payload: PageMapstringobject[]
}

export type PageMapstringobjectPageResponse = ResponseDataType & {
  payload: {
    records: PageMapstringobject[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type TreeDataResVOResponse = ResponseDataType & {
  payload: TreeDataResVO
}

export type TreeDataResVOListResponse = ResponseDataType & {
  payload: TreeDataResVO[]
}

export type TreeDataResVOPageResponse = ResponseDataType & {
  payload: {
    records: TreeDataResVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type IdPidReqVOResponse = ResponseDataType & {
  payload: IdPidReqVO
}

export type IdPidReqVOListResponse = ResponseDataType & {
  payload: IdPidReqVO[]
}

export type IdPidReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdPidReqVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type TreeDataItemVOResponse = ResponseDataType & {
  payload: TreeDataItemVO
}

export type TreeDataItemVOListResponse = ResponseDataType & {
  payload: TreeDataItemVO[]
}

export type TreeDataItemVOPageResponse = ResponseDataType & {
  payload: {
    records: TreeDataItemVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

