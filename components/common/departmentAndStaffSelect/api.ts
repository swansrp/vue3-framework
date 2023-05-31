import { request } from "@/framework/network/request"
import {apiType, buildGetApiByType, buildPostApiByType} from "@/framework/apis"

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.account)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.account)
export const geStaffList = (deptIdList: Array<string>, name='') => request(buildPostApi(""), {}, {deptIdList, name}, false, false) as Promise<any>
export const getDepartmentTree = () => request(buildGetApi("/department/tree"), {}, {}, false, false) as Promise<any>
