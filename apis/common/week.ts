import { buildGetApiByType } from '@/framework/apis'
import { apiType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.week)

export const getRangeByWeek = (version: string) => request(buildGetApi('/convert'), { version },{},false,false) as Promise<any>
export const getWeekByDate = (date: string) => request(buildGetApi('/date/convert'), { date },{},false,false) as Promise<any>
