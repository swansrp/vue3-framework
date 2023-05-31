import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.navEdit)
// const buildPostApi = (url: string) => buildPostApiByType(url, apiType.navEdit)


export const getTopNavList = () => request(buildGetApi("/menu/main/tree")) as Promise<any>
export const getLeftNavList = (params: object) => request(buildGetApi("/menu/sub/tree"), params) as Promise<any>
export const getSelectNameList = () => request(buildGetApi("/getSelectNameList")) as Promise<any>
export const getCascadeAreaList = () => request(buildGetApi("/getCascadeAreaList")) as Promise<any>
export const getTableData = () => request(buildGetApi("/getTableData")) as Promise<any>
