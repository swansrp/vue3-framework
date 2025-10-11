import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.account)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.account)
export const getStaffList = (deptIdList: Array<string>, name = '') => request(buildPostApi(''), {}, {
  deptIdList,
  name
}, false, false) as Promise<any>
export const getAccountInfo = (names: Array<string>, active = true) => request(buildPostApi('/search'), { active }, names, false, false) as Promise<any>
export const getDepartmentTree = () => request(buildGetApi('/department/tree'), {}, {}, false, false) as Promise<any>
export const getStaff = (name: any) =>
    request(buildPostApi('/search'), {}, name, false, false) as Promise<any>
