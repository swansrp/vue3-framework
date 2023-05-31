import { request } from "@/framework/network/request"
import {apiType, buildGetApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.common)

export const getDictList = (dictName: string) => request(buildGetApi("/dict"), {dictName},{},false,false) as Promise<any>
export const getTreeList = (dictName: string) => request(buildGetApi("/tree"), {dictName},{},false,false) as Promise<any>
