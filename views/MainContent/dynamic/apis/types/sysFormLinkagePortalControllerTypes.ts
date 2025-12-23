// ==================== Sys Form Linkage Portal Controller Types ====================
// 项目: mpbe-api
// 文件: sysFormLinkagePortalControllerTypes.ts
// Tag: 动态配置 - 表单联动配置
// Tag Description: Sys Form Linkage Portal Controller
// ============================================================

// ResponseDataType 是全局类型，不需要导入

export interface AdvancedQueryReq {
  /** 查询条件 */
  condition?: AdvancedQuery
  /** 当前页 */
  currentPage?: number
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 排序 */
  sortList?: SortVO[]
}

/**
 * 分页响应类型 - 原始类型: Page«SysFormLinkageVO»
 * @description 这个接口描述了分页响应的结构，其中 records 字段包含 SysFormLinkageVO 类型的数组
 */
export interface PageSysFormLinkageVO {
  countId?: string
  current?: number
  maxLimit?: number
  optimizeCountSql?: boolean
  orders?: OrderItem[]
  pages?: number
  /** 分页数据列表 - 包含 SysFormLinkageVO 类型的数组 */
  records?: SysFormLinkageVO[]
  searchCount?: boolean
  size?: number
  total?: number
}

export interface OrderItem {
  asc?: boolean
  column?: string
}

export interface SysFormLinkageVO {
  /** 执行脚本(JS) */
  actionScript?: string
  /** 条件脚本(JS) */
  conditionScript?: string
  /** 创建时间 */
  createAt?: string
  /** 创建人工号 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 表单配置ID */
  formConfigId?: number
  /** 主键ID */
  id?: number
  /** 是否启用 */
  isEnabled?: string
  /** 联动名称 */
  linkageName?: string
  /** 优先级 */
  priority?: number
  /** 排序 */
  sort?: number
  /** 目标字段(逗号分隔) */
  targetFields?: string
  /** 触发事件(change/blur/focus) */
  triggerEvent?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新人工号 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export interface AdvancedStatisticReq {
  /** 查询条件 */
  condition?: AdvancedQuery
  /** 当前页 */
  currentPage?: number
  majorCondition?: string
  metricColumn?: Metric[]
  metricCondition?: MetricCondition[]
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
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
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  /** 排序 */
  sortList?: SortVO[]
}

export interface IdReqVO {
  /** id */
  id?: string
}

export interface QueryConditionReq {
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  sortList?: SortVO[]
}

export interface GeneralStatisticReq {
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  majorCondition?: string
  metricColumn?: Metric[]
  metricCondition?: MetricCondition[]
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  sort?: number
  sortList?: SortVO[]
  statisticColumn?: KeyValueResVO[]
}

export interface GeneralSummaryReq {
  columns?: string[]
  conditionList?: ConditionVO[]
  /** 当前页 */
  currentPage?: number
  /** 每页大小 */
  pageSize?: number
  /** 动态字段逻辑 */
  selectColumnCondition?: object
  sortList?: SortVO[]
}

export interface IdOrderReqVO {
  /** id */
  id?: object
  /** 显示顺序 */
  showOrder?: number
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

export type PageSysFormLinkageVOResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO
}

export type PageSysFormLinkageVOListResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO[]
}

export type PageSysFormLinkageVOPageResponse = ResponseDataType & {
  payload: PageSysFormLinkageVO
}

export type SysFormLinkageVOResponse = ResponseDataType & {
  payload: SysFormLinkageVO
}

export type SysFormLinkageVOListResponse = ResponseDataType & {
  payload: SysFormLinkageVO[]
}

export type SysFormLinkageVOPageResponse = ResponseDataType & {
  payload: {
    records: SysFormLinkageVO[]
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

