import {request} from "@/framework/network/request";
import {buildGetApiByType} from "@/framework/apis"
import {apiType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.week)

export const getRangeByWeek = (version: string) => request(buildGetApi("/convert"), {version},{},false,false) as Promise<any>
export const getWeekByDate = (version: string) => request(buildGetApi("/date/convert"), {version},{},false,false) as Promise<any>
