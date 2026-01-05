// ==================== Dataset Config Controller Types ====================
// 项目: mpbe-api
// 文件: datasetConfigControllerTypes.ts
// Tag: Dataset配置管理
// Tag Description: Dataset Config Controller
// ============================================================

// ResponseDataType 是全局类型，不需要导入

export interface DatasetConfigRes {
  /** 数据集列配置列表 */
  columns?: SysDatasetColumn[]
  /** 数据集ID */
  datasetId?: number
  /** 数据集关联表配置列表 */
  tables?: SysDatasetTable[]
}

export interface SysDatasetColumn {
  /** 字段别名 */
  columnAlias?: string
  /** 字段SQL表达式 */
  columnSql?: string
  /** 创建时间 */
  createAt?: string
  /** 创建者 */
  createBy?: string
  /** 关联的数据集ID */
  datasetId?: number
  /** 前端显示排序 */
  displayOrder?: number
  /** 主键ID */
  id?: number
  /** 是否是聚合字段 */
  isAggregate?: string
  /** 是否显示在结果集中 */
  isVisible?: string
  /** 备注 */
  remark?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新者 */
  updateBy?: string
}

export interface DatasetColumnReq {
  /** 字段别名 */
  columnAlias: string
  /** 字段SQL表达式 */
  columnSql: string
  /** 关联的数据集ID */
  datasetId: number
  /** 前端显示排序 */
  displayOrder?: number
  /** 主键ID（更新时必填） */
  id?: number
  /** 是否是聚合字段（Y/N） */
  isAggregate?: string
  /** 是否显示在结果集中（Y/N） */
  isVisible?: string
  /** 备注 */
  remark?: string
}

export interface IdReqVO {
  /** id */
  id?: string
}

export interface IdOrderReqVO {
  /** id */
  id?: object
  /** 显示顺序 */
  showOrder?: number
}

export interface DatasetConfigReq {
  /** 数据源配置名称（可选，为空则使用默认数据源） */
  dataSource?: string
  /** 关联的数据集ID（parseSql预览时可为空，parseSqlAndSave保存时必填） */
  datasetId?: number
  /** 数据集名称（当新增保存时必填，替换保存可为空） */
  datasetName?: string
  /** 备注 */
  remark?: string
  /** 完整的SELECT SQL语句 */
  sql: string
}

export interface SysDatasetTable {
  /** 创建时间 */
  createAt?: string
  /** 创建者 */
  createBy?: string
  /** 关联的数据集ID */
  datasetId?: number
  /** 主键ID */
  id?: number
  /** ON条件（主表可为空） */
  joinCondition?: string
  /** JOIN类型（主表可为空） */
  joinType?: string
  /** 备注 */
  remark?: string
  /** 表别名 */
  tableAlias?: string
  /** 表顺序 */
  tableOrder?: number
  /** 关联表SQL */
  tableSql?: string
  /** 更新时间 */
  updateAt?: string
  /** 更新者 */
  updateBy?: string
}

export type DatasetConfigResResponse = ResponseDataType & {
  payload: DatasetConfigRes
}

export type DatasetConfigResListResponse = ResponseDataType & {
  payload: DatasetConfigRes[]
}

export type DatasetConfigResPageResponse = ResponseDataType & {
  payload: {
    records: DatasetConfigRes[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type SysDatasetColumnResponse = ResponseDataType & {
  payload: SysDatasetColumn
}

export type SysDatasetColumnListResponse = ResponseDataType & {
  payload: SysDatasetColumn[]
}

export type SysDatasetColumnPageResponse = ResponseDataType & {
  payload: {
    records: SysDatasetColumn[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type DatasetColumnReqResponse = ResponseDataType & {
  payload: DatasetColumnReq
}

export type DatasetColumnReqListResponse = ResponseDataType & {
  payload: DatasetColumnReq[]
}

export type DatasetColumnReqPageResponse = ResponseDataType & {
  payload: {
    records: DatasetColumnReq[]
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

export type DatasetConfigReqResponse = ResponseDataType & {
  payload: DatasetConfigReq
}

export type DatasetConfigReqListResponse = ResponseDataType & {
  payload: DatasetConfigReq[]
}

export type DatasetConfigReqPageResponse = ResponseDataType & {
  payload: {
    records: DatasetConfigReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export interface DatasetSqlRes {
  /** 数据集ID */
  datasetId?: number
  /** 拼装后的SQL（可选包含字段备注注释） */
  sql?: string
}

export type DatasetSqlResResponse = ResponseDataType & {
  payload: DatasetSqlRes
}
