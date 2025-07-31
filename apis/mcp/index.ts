import { get, post } from '@/framework/network/request'
import { baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, '/sys/mcp/config', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, '/sys/mcp/config', domain)

export const getMcpEndpoint = (baseUrl = baseDomain) => get(buildGetApi('/endpoint', baseUrl), undefined, undefined, false, false, false)
export const getMcpList = (endpoint: string, type: string, baseUrl = baseDomain) => get(buildGetApi('', baseUrl), {
  endpoint,
  type
}, undefined, false, false, false)
export const updateMcpDescription = (endPoint: string, type: string, name: string, description: string, baseUrl = baseDomain) => post(buildPostApi('/description', baseUrl), undefined, {
  endPoint,
  type,
  name,
  description
}, true, false, false)