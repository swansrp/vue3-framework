import { apiType, buildGetApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'
const buildGetApi = (url: string) => buildGetApiByType(url, apiType.menu)
export const getRouteTree = () => request(buildGetApi('/tree'), {}, {}, false, true) as Promise<any>
