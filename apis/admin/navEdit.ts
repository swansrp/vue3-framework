import { apiType, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.navEdit)
const buildPostApi = (url: string) => buildPostApiByType(url, apiType.navEdit)

// appCode：按应用作用域查询/写入（主系统开放口集成方案B 棒6）
// 语义：缺省/空＝平台自身（NULL）——不传该参数，绝不传任何宿主项目名之类的哨兵值。
// GET 一律走 query 参数 appCode；POST 对象 body 合并 appCode 字段、数组 body（order/update）逐项合并；
// 平台自身上下文时不携带，行为与历史版本完全一致（后端 add 族 body 显式优先、未携带按父行继承）。
const appCodeQuery = (appCode?: string) => (appCode ? { appCode } : {})
const withAppCode = (data: object, appCode?: string) => (appCode ? { ...data, appCode } : data)
const withAppCodeList = (list: any[], appCode?: string) =>
  appCode ? list.map((item) => ({ ...item, appCode })) : list

// Main Menu主菜单的增改（内容）查
export const getMainMenu = (appCode?: string) => request(buildGetApi('/main/tree'), appCodeQuery(appCode)) as Promise<any>
export const updateMainMenu = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/update'),{}, withAppCode(data, appCode), showSuccess) as Promise<any>
export const addMainMenu = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/add/main'), {}, withAppCode(data, appCode), showSuccess) as Promise<any>

// Sub Menu子菜单的增改（内容）查
export const getSubMenu = (params: object, appCode?: string) => request(buildGetApi('/sub/tree'), { ...params, ...appCodeQuery(appCode) }) as Promise<any>
export const addSubMenu = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/add/sub'), {}, withAppCode(data, appCode), showSuccess) as Promise<any>
export const addMenuButton = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/add/button'), {}, withAppCode(data, appCode), showSuccess) as Promise<any>
export const addMenuContent = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/add/content'), {}, withAppCode(data, appCode), showSuccess) as Promise<any>
export const updateSubMenu = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/update'),{}, withAppCode(data, appCode), showSuccess) as Promise<any>

// Main Menu主菜单和Sub Menu子菜单 删除 和 顺序更新
export const deleteMainMenu = (data: object, showSuccess = true, appCode?: string) => request(buildPostApi('/delete'), {}, withAppCode(data, appCode), showSuccess) as Promise<any>
export const updateMenuOrder = (data: any, appCode?: string) => request(buildPostApi('/order/update'), {}, withAppCodeList(data, appCode), true) as Promise<any>
export const changePID = (data: object, appCode?: string) => request(buildPostApi('/pid'), {}, withAppCode(data, appCode), true) as Promise<any>
export const getCompletePermissionTree = (appCode?: string) => request(buildGetApi('/tree'), appCodeQuery(appCode), {}, false, false) as Promise<any>

export const getUserMenuTree = (customerNumber: string, appCode?: string) => request(buildGetApi('/user/permit'), { customerNumber, ...appCodeQuery(appCode) }, {}, false, false) as Promise<any>
export const getUserPermitSource = (menuId: string|number, customerNumber: string) => request(buildGetApi('/user/permit/source'), { menuId, customerNumber }, {}, false, false) as Promise<any>
export const getPermitSource = (menuId: string|number, customerNumber: string) => request(buildGetApi('/permit/targets'), { menuId, customerNumber }, {}, false, false) as Promise<any>
