// 个人仪表盘API接口定义

import { get, post } from '@/framework/network/request'
import { apiType, baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import type { DashboardItem, IndicatorNode } from './types'
import { addEntity, deleteEntity, updateEntitySelective, updateOrder, updateTreePid } from '@/framework/apis/portal'
import { UpdateOrderType, UpdatePidType } from '@/framework/components/common/Portal/type'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/dashboard', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/dashboard', domain)
// 获取通用指标数据
export const getCommonStatistic = (tableId: string) => get(buildGetApi('/statistic/common'), {
  tableId
}, {}, false, false) as Promise<any>

// 获取个人指标数据
export const getPersonalStatistic = (tableId: string) => get(buildGetApi('/statistic/personal'), {
  tableId
}, {}, false, false) as Promise<any>

// 指标树父节点
export const updateStatisticPid = (data: UpdatePidType) => updateTreePid('portal/dashboard/statistic', data)

// 指标树顺序
export const updateStatisticOrder = (data: Array<UpdateOrderType>) => updateOrder('portal/dashboard/statistic', data)

// 新增个人指标
export const addPersonalStatistic = (data: Partial<IndicatorNode>) => addEntity('portal/dashboard/statistic', { ...data, customerNumber: '1' })

// 新增通用指标
export const addCommonStatistic = (data: Partial<IndicatorNode>) => addEntity('portal/dashboard/statistic', { ...data, customerNumber: '0' })

// 更新个人指标
export const updatePersonalStatistic = (data: Partial<IndicatorNode>) => updateEntitySelective('portal/dashboard/statistic', { ...data, customerNumber: '1' })

// 更新通用指标
export const updateCommonStatistic = (data: Partial<IndicatorNode>) => updateEntitySelective('portal/dashboard/statistic', { ...data, customerNumber: '0' })

// 删除个人指标
export const deletePersonalStatistic = (id: string) => deleteEntity('portal/dashboard/statistic', id)

// 删除通用指标
export const deleteCommonStatistic = (id: string) => deleteEntity('portal/dashboard/statistic', id)

// 获取图表配置
export const getPersonalDashboard = (tableId: string) => get(buildGetApi(''), {
  tableId
}, {}, false, false) as Promise<any>

// 更新图表顺序
export const updateDashboardOrder = (data: Array<UpdateOrderType>) => updateOrder('portal/dashboard', data)

// 新增图表
export const addPersonalDashboard = (data: Partial<DashboardItem>[], tableId: string) => post(buildPostApi(''), { tableId }, data, false, false) as Promise<any>

// 更新图表配置
export const updatePersonalDashboard = (data: Partial<DashboardItem>) => updateEntitySelective('portal/dashboard', data)

// 删除图表
export const deletePersonalDashboard = (id: string) => deleteEntity('portal/dashboard', id, undefined, false, false) as Promise<any>
