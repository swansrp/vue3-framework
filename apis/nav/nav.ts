import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.navEdit)

export const getSelectNameList = () => request(buildGetApi("/getSelectNameList")) as Promise<any>
export const getCascadeAreaList = () => request(buildGetApi("/getCascadeAreaList")) as Promise<any>

