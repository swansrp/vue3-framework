import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, post } from '@/framework/network/request'

/**
 * 获取当前用户在指定用户组类型和绑定类型下的绑定值列表
 * <p>
 * 调用 GET /web/group/bind/my 接口，按当前登录用户的数据权限范围递归展开，
 * 返回去重后的 attachValue 列表。
 *
 * @param groupType 用户组类型（如 FM_GROUP）
 * @param bindType 绑定类型（如 fm_cost_dept）
 * @returns 绑定值字符串数组
 */
export const getMyBindValues = async (groupType: string, bindType: string): Promise<string[]> => {
    const api = buildGetApiByType('/group/bind/my')
    const res = await get(api, { groupType, bindType }, {}, false, false)
    // 防御：payload 异常（非数组）时返回空数组，避免下游 .map 报错
    return Array.isArray(res?.payload) ? res.payload : []
}

/**
 * 获取用户组已绑定列表
 * @param entityId 用户组id
 * @param bindType 绑定类型
 * @param showSuccess 是否显示成功提示
 * @param showLoading 是否显示加载中
 */
export const getGroupBindList = (entityId: any, bindType: string, showSuccess = false, showLoading = true) => {
    const api = buildGetApiByType('/group/bind/bind/list')
    return get(api, { entityId, bindType }, {}, showSuccess, showLoading)
}

/**
 * 获取单条绑定信息
 * @param entityId 用户组id
 * @param attachId 绑定目标值
 * @param bindType 绑定类型
 * @param showSuccess 是否显示成功提示
 * @param showLoading 是否显示加载中
 */
export const getGroupBindInfo = (entityId: any, attachId: any, bindType: string, showSuccess = false, showLoading = false) => {
    const api = buildGetApiByType('/group/bind/bind/info')
    return get(api, { entityId, attachId, bindType }, {}, showSuccess, showLoading)
}

/**
 * 替换绑定（全量替换）
 * @param entityId 用户组id
 * @param bindType 绑定类型
 * @param attachValues 绑定目标值列表
 */
export const replaceGroupBind = (entityId: any, bindType: string, attachValues: Array<any>) => {
    const api = buildPostApiByType('/group/bind/replace')
    return post(api, { entityId, bindType }, attachValues, true)
}

/**
 * 修改绑定信息（更新 extraData）
 * @param entityId 用户组id
 * @param attachId 绑定目标值
 * @param bindType 绑定类型
 * @param data 绑定属性对象
 */
export const updateGroupBindInfo = (entityId: any, attachId: any, bindType: string, data: any) => {
    const api = buildPostApiByType('/group/bind/bind/info')
    return post(api, { entityId, attachId, bindType }, data, true)
}
