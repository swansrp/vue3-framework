import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.groupArea)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.groupArea)

export const getUserGroupAreaTree = (entityId: string) => request(buildGetApi("/area/tree"), {entityId}, {}, false, false) as Promise<any>
export const getUserGroupAreaList = (entityId: string) => request(buildGetApi("/bind/list"), {entityId}, {}, false, false) as Promise<any>
export const updateUserGroupArea = (entityId: string, attachIdList: Array<string>) => request(buildPostApi("/replace"), {}, {entityId, attachIdList}, true) as Promise<any>
