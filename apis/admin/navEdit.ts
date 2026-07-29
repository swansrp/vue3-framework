import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.navEdit)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.navEdit)

// Main Menu主菜单的增改（内容）查
export const getMainMenu = () => request(buildGetApi('/main/tree')) as Promise<any>
export const updateMainMenu = (data: object, showSuccess = true) => request(buildPostApi('/update'),{}, data, showSuccess) as Promise<any>
export const addMainMenu = (data: object, showSuccess = true) => request(buildPostApi('/add/main'), {}, data, showSuccess) as Promise<any>

// Sub Menu子菜单的增改（内容）查
export const getSubMenu = (params: object) => request(buildGetApi('/sub/tree'), params) as Promise<any>
export const addSubMenu = (data: object, showSuccess = true) => request(buildPostApi('/add/sub'), {}, data, showSuccess) as Promise<any>
export const addMenuButton = (data: object, showSuccess = true) => request(buildPostApi('/add/button'), {}, data, showSuccess) as Promise<any>
export const addMenuContent = (data: object, showSuccess = true) => request(buildPostApi('/add/content'), {}, data, showSuccess) as Promise<any>
export const updateSubMenu = (data: object, showSuccess = true) => request(buildPostApi('/update'),{}, data, showSuccess) as Promise<any>

// Main Menu主菜单和Sub Menu子菜单 删除 和 顺序更新
export const deleteMainMenu = (data: object, showSuccess = true) => request(buildPostApi('/delete'), {}, data, showSuccess) as Promise<any>
export const updateMenuOrder = (data: any) => request(buildPostApi('/order/update'), {}, data, true) as Promise<any>
export const changePID = (data: object) => request(buildPostApi('/pid'), {}, data, true) as Promise<any>
export const getCompletePermissionTree = () => request(buildGetApi('/tree'), {}, {}, false, false) as Promise<any>

export const getUserMenuTree = (customerNumber: string) => request(buildGetApi('/user/permit'), { customerNumber }, {}, false, false) as Promise<any>
export const getUserPermitSource = (menuId: string|number, customerNumber: string) => request(buildGetApi('/user/permit/source'), { menuId, customerNumber }, {}, false, false) as Promise<any>
export const getPermitSource = (menuId: string|number, customerNumber: string) => request(buildGetApi('/permit/targets'), { menuId, customerNumber }, {}, false, false) as Promise<any>
