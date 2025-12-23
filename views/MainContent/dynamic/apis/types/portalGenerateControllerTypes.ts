// ==================== Portal Generate Controller Types ====================
// 项目: mpbe-api
// 文件: portalGenerateControllerTypes.ts
// Tag: Portal配置生成
// Tag Description: Portal Generate Controller
// ============================================================

// ResponseDataType 是全局类型，不需要导入

export interface GeneratePortalReq {
  /** 数据模式:MATRIX/DATASET */
  dataMode: string
  /** Dataset ID（DATASET模式必填） */
  datasetId?: number
  /** Portal中文显示名称 */
  displayName?: string
  /** Matrix表ID（MATRIX模式必填） */
  matrixId?: number
  /** Portal名称 */
  portalName: string
}

export interface PortalReq {
  /** 数据源格式 */
  dataMode?: string
  /** 管理表格名称 */
  name?: string
  /** 相关动态表id */
  referenceId?: number
  /** 对应角色 */
  roleId?: number
}

export type GeneratePortalReqResponse = ResponseDataType & {
  payload: GeneratePortalReq
}

export type GeneratePortalReqListResponse = ResponseDataType & {
  payload: GeneratePortalReq[]
}

export type GeneratePortalReqPageResponse = ResponseDataType & {
  payload: {
    records: GeneratePortalReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

export type PortalReqResponse = ResponseDataType & {
  payload: PortalReq
}

export type PortalReqListResponse = ResponseDataType & {
  payload: PortalReq[]
}

export type PortalReqPageResponse = ResponseDataType & {
  payload: {
    records: PortalReq[]
    total: number
    currentPage: number
    pageSize: number
  }
}

