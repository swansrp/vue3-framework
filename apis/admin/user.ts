import {request} from '@/framework/network/request'
import {buildGetApiByType, buildPostApiByType} from '@/framework/apis'

const buildPostApi = (url: string) => buildPostApiByType(url)
const buildGetApi = (url: string) => buildGetApiByType(url)

export const passwordReset = (customerNumber: string) => request(buildPostApi('/password/reset'), {}, {customerNumber}, true, false) as Promise<any>
export const userDisable = (customerNumber: string) => request(buildPostApi('/portal/user/disable'), {customerNumber}, {}, true, false) as Promise<any>
export const userEnable = (customerNumber: string) => request(buildPostApi('/portal/user/enable'), {customerNumber}, {}, true, false) as Promise<any>
