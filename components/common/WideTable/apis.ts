import { buildGetApiByType } from '../../../apis'
import { request } from '../../../network/request'

/**
 * 获取宽表配置详情（含字段列表）
 * @api GET /web/form/widetable/detail
 */
export const getWideTableConfigDetail = (params?: {
  configId: number
}, showSuccess = false, showLoading = false, showErr = true) => {
  const api = buildGetApiByType('/form/widetable/detail', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}

/**
 * 查询宽表数据
 * @api GET /web/form/widetable/queryData
 */
export const queryWideTableData = (params?: {
  configId: number
}, showSuccess = false, showLoading = true, showErr = true) => {
  const api = buildGetApiByType('/form/widetable/queryData', '')
  return request(api, params || {}, {}, showSuccess, showLoading, showErr)
}
