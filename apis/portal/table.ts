// ==================== Portal Table Configuration API ====================
// DarkTable 配置相关接口
// ============================================================

import { baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

export interface IdOrderReqVO {
  /** id */
  id?: object
  /** 显示顺序 */
  showOrder?: number
}

export interface PortalTableVO {
  /** 左侧筛选栏的宽度 */
  filterWidth?: number
  /** 主键 ID */
  id?: number
  /** 筛选条目间隔 */
  paddingTd?: number
  /** 标题间隔 */
  paddingTh?: number
  /** 表格配置名称 */
  portalName?: string
  /** 状态 */
  status?: string
  /** 表格 code */
  tableCode?: string
  /** 要排除显示的列 */
  filterColumns?: string
  /** 是否可以下载 */
  downloadAble?: string
  /** 是否透视报表模式 */
  pivotMode?: string
  /** 透视行维度字段(逗号分隔) */
  groupByFields?: string
  /** 透视度量列配置JSON */
  pivotMeasures?: string
}

export interface PortalPivotColumnVO {
  /** 主键 ID */
  id?: number
  /** table_id */
  tableId?: number
  /** 列标识 */
  itemValue?: string
  /** 表头名称 */
  itemName?: string
  /** 列条件json */
  condition?: string
  /** 显示顺序 */
  displayOrder?: number
  /** 状态 */
  status?: string
}

/** 透视度量列 */
export interface PivotMeasureVO {
  /** 度量字段名 */
  field: string
  /** 度量显示名 */
  label?: string
  /** 聚合方式 sum/count/countDistinct/avg/min/max */
  agg?: string
}

/** 透视聚合查询请求 */
export interface PivotReqVO {
  /** 查询条件 */
  condition?: any
  /** 聚合后行排序(作用于 group by 后的结果, 区别于 condition 内层数据排序) */
  sortList?: Array<{ property: string, type: number }>
  /** 行维度列 */
  groupColumns: Array<{ value: string, label: string }>
  /** 父表头列 */
  pivotColumns: Array<{ value: string, label: string, condition: any }>
  /** 度量列 */
  measures: Array<PivotMeasureVO>
}

export interface PortalTableFilterVO {
  /** 是否允许清空 */
  allowClear?: string
  /** 筛选条件 */
  condition?: string
  /** 默认值 */
  defaultValue?: string
  /** 字典项 */
  dictCode?: string
  /** 显示顺序 */
  displayOrder?: number
  /** 筛选条目类型 */
  filterType?: string
  /** 主键 ID */
  id?: number
  /** 筛选条目编码 */
  code?: string
  /** 筛选条目标签 */
  label?: string
  /** 是否多选 */
  multiple?: string
  /** 占位文本 */
  placeholder?: string
  /** 状态 */
  status?: string
  /** table_id */
  tableId?: number
}

// ==================== Portal Table 基础配置接口 ====================

/**
 * 根据 portalId 获取表格配置列表
 * @api POST /admin/portal/table/advanced/query
 */
export const getPortalTableList = (portalName: string | undefined, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/advanced/query', '')
  return request(api, {}, {
    condition: {
      conditionList: [{ property: 'portalName', relation: 1, value: [portalName] }]
    }, pageSize: 100
  }, showSuccess, showLoading, showErr)
}

/**
 * 根据 tableCode 获取表格配置列表
 * @api POST /admin/portal/table/advanced/query
 */
export const getPortalTableByCode = (tableCode: string | undefined, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/general/select', '')
  return request(api, {}, {
    conditionList: [{ property: 'tableCode', relation: 1, value: [tableCode] }]
  }, showSuccess, showLoading, showErr)
}

/**
 * 根据 id 获取表格配置详情
 * @api GET /admin/portal/table/id
 */
export const getPortalTableById = (id: number, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/admin/portal/table/id', '')
  return request(api, { id }, {}, showSuccess, showLoading, showErr)
}

/**
 * 新增表格配置
 * @api POST /admin/portal/table/insert
 */
export const addPortalTable = (data: PortalTableVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/insert', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 更新表格配置
 * @api POST /admin/portal/table/update
 */
export const updatePortalTable = (data: PortalTableVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/update', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 删除表格配置
 * @api POST /admin/portal/table/delete
 */
export const deletePortalTable = (id: number, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/delete', '')
  return request(api, {}, { id }, showSuccess, showLoading, showErr)
}

// ==================== Portal Table Filter 筛选项配置接口 ====================

/**
 * 根据 tableId 获取筛选项配置列表
 * @api POST /admin/portal/table/filter/advanced/query
 */
export const getPortalTableFilterList = (tableId: number, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/advanced/query', '')
  return request(api, {}, {
    condition: {
      conditionList: [{ property: 'tableId', relation: 1, value: [tableId] }]
    }, sortList: [{ property: 'displayOrder', type: 0 }], pageSize: 100
  }, showSuccess, showLoading, showErr)
}

/**
 * 根据 id 获取筛选项配置详情
 * @api GET /admin/portal/table/filter/id
 */
export const getPortalTableFilterById = (id: number, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/admin/portal/table/filter/id', '')
  return request(api, { id }, {}, showSuccess, showLoading, showErr)
}

/**
 * 新增筛选项配置
 * @api POST /admin/portal/table/filter/insert
 */
export const addPortalTableFilter = (data: PortalTableFilterVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/insert', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 批量新增筛选项配置
 * @api POST /admin/portal/table/filter/insert/list
 */
export const addPortalTableFilterList = (data: PortalTableFilterVO[], showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/insert/list', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 更新筛选项配置
 * @api POST /admin/portal/table/filter/update
 */
export const updatePortalTableFilter = (data: PortalTableFilterVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/update', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 删除筛选项配置
 * @api POST /admin/portal/table/filter/delete
 */
export const deletePortalTableFilter = (id: number, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/delete', '')
  return request(api, {}, { id }, showSuccess, showLoading, showErr)
}

/**
 * 批量删除筛选项配置
 * @api POST /admin/portal/table/filter/delete/list
 */
export const deletePortalTableFilterList = (ids: number[], showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/delete/list', '')
  return request(api, {}, ids, showSuccess, showLoading, showErr)
}

/**
 * 更新筛选项排序
 * @api POST /admin/portal/table/filter/order/update
 */
export const updatePortalTableFilterOrder = (data: IdOrderReqVO[], showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/filter/order/update', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

// ==================== Portal Pivot Column 透视列配置接口 ====================

/**
 * 根据 tableId 获取透视列配置列表
 * @api POST /admin/portal/table/pivot/column/advanced/query
 */
export const getPortalPivotColumnList = (tableId: number, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/advanced/query', '')
  return request(api, {}, {
    condition: {
      conditionList: [{ property: 'tableId', relation: 1, value: [tableId] }]
    }, sortList: [{ property: 'displayOrder', type: 0 }], pageSize: 100
  }, showSuccess, showLoading, showErr)
}

/**
 * 新增透视列配置
 * @api POST /admin/portal/table/pivot/column/insert
 */
export const addPortalPivotColumn = (data: PortalPivotColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/insert', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 批量新增透视列配置(单请求事务提交)
 * @api POST /admin/portal/table/pivot/column/insert/list
 */
export const addPortalPivotColumnList = (dataList: PortalPivotColumnVO[], showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/insert/list', '')
  return request(api, {}, dataList, showSuccess, showLoading, showErr)
}

/**
 * 更新透视列配置
 * @api POST /admin/portal/table/pivot/column/update
 */
export const updatePortalPivotColumn = (data: PortalPivotColumnVO, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/update', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 批量更新透视列显示顺序
 * @api POST /admin/portal/table/pivot/column/order/update
 */
export const updatePortalPivotColumnOrder = (data: IdOrderReqVO[], showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/order/update', '')
  return request(api, {}, data, showSuccess, showLoading, showErr)
}

/**
 * 删除透视列配置
 * @api POST /admin/portal/table/pivot/column/delete
 */
export const deletePortalPivotColumn = (id: number, showSuccess = true, showLoading = false, showErr = true) => {
  const api = buildPostApiByType('/admin/portal/table/pivot/column/delete', '')
  return request(api, {}, { id }, showSuccess, showLoading, showErr)
}

// ==================== 透视聚合查询接口 ====================

/**
 * 透视聚合查询
 * @api POST {portalUrl}/pivot
 * @param portalUrl Portal 配置的访问地址(即实体域 url)
 * @param req 透视请求
 */
export const pivotQuery = (portalUrl: string, req: PivotReqVO, domain: string = baseDomain, showLoading = true) => {
  const api = buildPostApiByType('/pivot', portalUrl, domain)
  return request(api, {}, req, false, showLoading, true) as Promise<any>
}

// ==================== 类型导出 ====================
/**
 * 筛选类型枚举
 */
export const FILTER_TYPE_OPTIONS = [
  { label: '输入框', value: 'input' },
  { label: '下拉选择', value: 'select' },
  { label: '树形下拉列表', value: 'treeSelect' },
  { label: '日期选择', value: 'date' },
  { label: '日期范围选择', value: 'dateRange' },
  { label: '月份选择', value: 'month' },
  { label: '年份选择', value: 'year' },
  { label: '数字输入', value: 'number' }
]

