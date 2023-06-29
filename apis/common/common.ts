import { request } from "@/framework/network/request"
import {apiType, buildGetApiByType, baseDomain} from "@/framework/apis"
import {Ref} from "vue";

const buildGetApi = (url: string, domain=baseDomain) => buildGetApiByType(url, apiType.common, domain)

export const getDictList = (dictName: string, domain=baseDomain) => request(buildGetApi("/dict", domain), {dictName},{},false,false) as Promise<any>
export const getTreeList = (dictName: string,  domain=baseDomain) => request(buildGetApi("/tree", domain), {dictName},{},false,false) as Promise<any>
export const getDictListByDictName = (dictName: string, targetVar: Ref, domain=baseDomain) => getDictList(dictName, domain).then(res => targetVar.value = res.payload)
