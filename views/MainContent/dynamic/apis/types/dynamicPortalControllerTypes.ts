// ==================== Dynamic Portal Controller Types ====================
// 项目: mpbe-api
// 文件: dynamicPortalControllerTypes.ts
// Tag: 动态Portal接口
// Tag Description: Dynamic Portal Controller
// ============================================================

// ResponseDataType 是全局类型，不需要导入

export interface AdvancedQueryReq {
  /** 查询条件 */
  condition?: AdvancedQuery
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  /** 排序 */
  sortList?: SortVO[]
}

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

export interface AdvancedStatisticReq {
  /** 查询条件 */
  condition?: AdvancedQuery
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  majorCondition?: string
  metricColumn?: Metric[]
  metricCondition?: MetricCondition[]
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  sort?: number
  /** 排序 */
  sortList?: SortVO[]
  statisticColumn?: KeyValueResVO[]
}

export interface StatisticRes {
  children?: StatisticRes[]
  metric?: string
  metricColumn?: string
  metricLabel?: string
  statistic?: number
}

export interface AdvancedSummaryReq {
  columns?: string[]
  /** 查询条件 */
  condition?: AdvancedQuery
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  /** 排序 */
  sortList?: SortVO[]
}

export interface TreeDataResVO {
  children?: TreeDataResVO[]
  key?: object
  pid?: object
  title?: string
}

export interface IdReqVO {
  /** id */
  id?: string
}

export interface QueryConditionReq {
  /** 查询条件 */
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  /** 排序 */
  sortList?: SortVO[]
}

export interface GeneralStatisticReq {
  /** 查询条件 */
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  majorCondition?: string
  metricColumn?: Metric[]
  metricCondition?: MetricCondition[]
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  sort?: number
  /** 排序 */
  sortList?: SortVO[]
  statisticColumn?: KeyValueResVO[]
}

export interface GeneralSummaryReq {
  columns?: string[]
  /** 查询条件 */
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  /** 去重 */
  distinct?: string
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 返回字段列表 */
  selectColumnList?: string[]
  /** 排序 */
  sortList?: SortVO[]
}

export interface IdOrderReqVO {
  /** id */
  id?: object
  /** 显示顺序 */
  showOrder?: number
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

export interface AdvancedQuery {
  /** 0 and 1 or */
  andOr?: string
  /** 条件列表 */
  conditionList?: AdvancedQuery[]
  /** 日期格式 */
  dateFormat?: string
  /** 字段名 */
  property?: string
  /** 查询关系 */
  relation?: number
  /** 查询值 */
  value?: object[]
}

export interface SortVO {
  property?: string
  type?: number
}

export interface OrderItem {
  asc?: boolean
  column?: string
}

export interface Metric {
  column?: string
  dictMap?: object
}

export interface MetricCondition {
  condition?: AdvancedQuery
  label?: string
  value?: string
}

export interface KeyValueResVO {
  label?: string
  value?: string
}

export interface ConditionVO {
  /** 日期格式 */
  dateFormat?: string
  /** 字段名 */
  property?: string
  /** 查询关系 */
  relation?: number
  /** 查询值 */
  value?: object[]
}

export type AdvancedQueryReqResponse = ResponseDataType & {
  payload: AdvancedQueryReq
}

export type AdvancedQueryReqListResponse = ResponseDataType & {
  payload: AdvancedQueryReq[]
}

export type AdvancedQueryReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedQueryReq[]
    total: number
    currentPage: number
    pageSize: number
  }
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

export type AdvancedStatisticReqResponse = ResponseDataType & {
  payload: AdvancedStatisticReq
}

export type AdvancedStatisticReqListResponse = ResponseDataType & {
  payload: AdvancedStatisticReq[]
}

export type AdvancedStatisticReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedStatisticReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type StatisticResResponse = ResponseDataType & {
  payload: StatisticRes
}

export type StatisticResListResponse = ResponseDataType & {
  payload: StatisticRes[]
}

export type StatisticResPageResponse = ResponseDataType & {
  payload: {
    records: StatisticRes[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type AdvancedSummaryReqResponse = ResponseDataType & {
  payload: AdvancedSummaryReq
}

export type AdvancedSummaryReqListResponse = ResponseDataType & {
  payload: AdvancedSummaryReq[]
}

export type AdvancedSummaryReqPageResponse = ResponseDataType & {
  payload: {
    records: AdvancedSummaryReq[]
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

export type IdReqVOResponse = ResponseDataType & {
  payload: IdReqVO
}

export type IdReqVOListResponse = ResponseDataType & {
  payload: IdReqVO[]
}

export type IdReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdReqVO[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type QueryConditionReqResponse = ResponseDataType & {
  payload: QueryConditionReq
}

export type QueryConditionReqListResponse = ResponseDataType & {
  payload: QueryConditionReq[]
}

export type QueryConditionReqPageResponse = ResponseDataType & {
  payload: {
    records: QueryConditionReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type GeneralStatisticReqResponse = ResponseDataType & {
  payload: GeneralStatisticReq
}

export type GeneralStatisticReqListResponse = ResponseDataType & {
  payload: GeneralStatisticReq[]
}

export type GeneralStatisticReqPageResponse = ResponseDataType & {
  payload: {
    records: GeneralStatisticReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type GeneralSummaryReqResponse = ResponseDataType & {
  payload: GeneralSummaryReq
}

export type GeneralSummaryReqListResponse = ResponseDataType & {
  payload: GeneralSummaryReq[]
}

export type GeneralSummaryReqPageResponse = ResponseDataType & {
  payload: {
    records: GeneralSummaryReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type IdOrderReqVOResponse = ResponseDataType & {
  payload: IdOrderReqVO
}

export type IdOrderReqVOListResponse = ResponseDataType & {
  payload: IdOrderReqVO[]
}

export type IdOrderReqVOPageResponse = ResponseDataType & {
  payload: {
    records: IdOrderReqVO[]
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

