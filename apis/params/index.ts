import {
  baseDomain,
  apiType,
  buildGetApiByType,
  buildPostApiByType,
  deleteRequest,
  generalQueryRequest,
  generalStatisticRequest,
  updateRequest
} from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.config, domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.config, domain)
const configAdminApi = apiType.config + '/admin'

export const getConfig = (configKey: string) => request(buildGetApi(''), { configKey }) as Promise<any>

export const queryParams = (conditionList: Array<any>, sortList: Array<any>, pageSize: number, currentPage: number, domain: string = baseDomain) =>
  generalQueryRequest(configAdminApi, undefined, conditionList, sortList, pageSize, currentPage, domain)

// 参数分组计数: 后端 GROUP BY configGroup + count(1), 避免把全量明细拉到前端内存计数。
// statisticColumn.value 为空 = count(1); sort=1 按统计值倒序(同值顺序由调用方兜底)。
export const statisticParamGroups = (domain: string = baseDomain) =>
  generalStatisticRequest(
    configAdminApi,
    new Map(),
    [],
    1,
    [{ column: 'configGroup', dictMap: null }],
    [],
    [{ value: '', label: 'count' }],
    '0',
    domain
  ) as Promise<any>

export const updateParams = (data: object, domain: string = baseDomain) => updateRequest(configAdminApi, {}, data, domain)
export const deleteParams = (id: string, domain: string = baseDomain) => deleteRequest(configAdminApi, id, domain)

export const refreshParams = (domain: string = baseDomain) =>
    request(buildPostApi('/admin/refresh', domain), {}, {}, true, true) as Promise<any>
