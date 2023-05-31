import {request} from "@/framework/network/request";
import {apiType, buildGetApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.menu)

export const getMenuSubTree = (menuId: string) => request(buildGetApi("/sub/tree"), {menuId}, {}, false, false) as Promise<any>
