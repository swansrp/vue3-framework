import { baseDomain, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * 智能问数（smart-query）三端点前端 API（§45 协议）：
 * - plan：semantic_query → 校验 + SQL + portalConfig/indicator/queryContext 推导
 * - 取数两路（statistic/query）复用通用 portal 管线：plan 返回的 portalConfig.url
 *   即 'web/insight/smart-query'，ChartCard/穿透表自动拼 /advanced/statistic、
 *   /advanced/query，故此处不再单独封装
 */
const smartQueryType = '/insight/smart-query'
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, smartQueryType, domain)

export const planSmartQuery = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/plan', domain), {}, data, true, false) as Promise<any>
