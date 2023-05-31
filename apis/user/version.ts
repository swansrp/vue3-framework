import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.version)

export const getRangeByWeek = (version: string) => request(buildGetApi("/convert"), {version},{},false,false) as Promise<any>
export const getWeekByDate = (version: string) => request(buildGetApi("/date/convert"), {version},{},false,false) as Promise<any>
