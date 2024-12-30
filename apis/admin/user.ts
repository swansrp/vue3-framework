import {request} from '@/framework/network/request'
import {buildGetApiByType, buildPostApiByType} from '@/framework/apis'

const buildPostApi = (url: string) => buildPostApiByType(url)
const buildGetApi = (url: string) => buildGetApiByType(url)

export const passwordReset = (customerNumber: string) => request(buildPostApi('/password/reset'), {}, {customerNumber}, true, false) as Promise<any>
export const userDisable = (customerNumber: string) => request(buildPostApi('/portal/user/disable'), {customerNumber}, {}, true, false) as Promise<any>
export const userEnable = (customerNumber: string) => request(buildPostApi('/portal/user/enable'), {customerNumber}, {}, true, false) as Promise<any>
export const userExisted = (phoneNumber?: string, email?: string, userName?: string, name?: string, idNumber?: string) =>
    request(buildGetApi('/user/existed'), {phoneNumber, email, userName, name, idNumber}, {}, true, false, false) as Promise<any>
export const userAlreadyExisted = (phoneNumber?: string, email?: string, userName?: string, name?: string, idNumber?: string) =>
  request(buildGetApi('/user/already/existed'), {phoneNumber, email, userName, name, idNumber}, {}, true, false, false) as Promise<any>
