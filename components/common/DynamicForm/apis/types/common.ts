// ==================== 公共类型定义 ====================
// 项目: mpbe-api
// 文件: common.ts
// 说明: 多个控制器共享的类型定义
// ============================================================

/**
 * 全局响应数据类型说明
 * @interface ResponseDataType
 * @description 所有API接口的统一响应格式
 * 
 * @property {Object} status - 响应状态信息
 * @property {number} status.code - 状态码，0表示成功，非0表示失败
 * @property {string} status.msg - 状态消息
 * @property {string} status.detailMsg - 详细错误信息
 * @property {any} payload - 响应数据载体，成功时包含实际返回的数据
 * 
 * @example
 * // 成功响应示例
 * {
 *   status: { code: 0, msg: 'success', detailMsg: '' },
 *   payload: { id: 1, name: 'example' }
 * }
 * 
 * // 失败响应示例
 * {
 *   status: { code: 1001, msg: 'error', detailMsg: '详细错误信息' },
 *   payload: null
 * }
 */
// ResponseDataType 是全局类型，已在框架中定义

// ==================== 共享类型定义 ====================
// 以下类型被多个控制器使用，提取到公共文件以避免重复定义

export interface OrderItem {
  asc?: boolean
  column?: string
}

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

export interface SchemaProductionVO {
  /** 创建时间 */
  createAt?: string
  /** 创建者 */
  createBy?: string
  /** 创建人 */
  createName?: string
  /** 产品描述 */
  description?: string
  /** 主键ID */
  id?: number
  /** 父ID */
  pid?: number
  /** 排序 */
  sort?: number
  /** 产品标题 */
  title?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新者 */
  updateBy?: string
  /** 更新人 */
  updateName?: string
}

export interface OrderItem {
  asc?: boolean
  column?: string
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
  /**
   * 查询关系类型
   * @description 定义查询条件的关系类型，对应FILTER_TYPE枚举
   * - 1: EQUAL (等于)
   * - 2: NOT_EQUAL (不等于)
   * - 3: GREATER (大于)
   * - 4: GREATER_EQUAL (大于等于)
   * - 5: LESS (小于)
   * - 6: LESS_EQUAL (小于等于)
   * - 7: NULL (为空)
   * - 8: NOT_NULL (不为空)
   * - 9: LIKE (模糊匹配)
   * - 10: NOT_LIKE (不匹配)
   * - 11: IN (包含于)
   * - 12: NOT_IN (不包含于)
   * - 13: BETWEEN (区间)
   * - 14: NOT_BETWEEN (不在区间)
   * - 15: CONTAIN (包含)
   * - 16: CONTAIN_IN_OR (包含其中之一)
   * - 17: CONTAIN_IN_AND (包含全部)
   * - 99: SELECT_APPLY (特殊应用查询)
   */
  relation?: number
  /** 查询值 */
  value?: Array<any>
}

export interface SortVO {
  property?: string
  type?: number
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
  value?: Array<any>
}

