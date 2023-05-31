import {request} from "@/framework/network/request";
import {apiType, buildPostApiByType} from "@/framework/apis"

const buildPostApi = (url: string) => buildPostApiByType(url, apiType.competitor)

export const getCompetitorList = (name: string) => request(buildPostApi("/query"), {},{name, pageSize: 50},false,false) as Promise<any>
