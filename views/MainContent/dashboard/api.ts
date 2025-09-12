// 个人仪表盘API接口定义

import { get, post } from '@/framework/network/request'
import { apiType, baseDomain, buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { IndicatorTreeNode } from '@/framework/views/MainContent/dashboard/types'

const buildGetApi = (url: string, domain: string = baseDomain) => buildGetApiByType(url, apiType.portal + '/dashboard', domain)
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, apiType.portal + '/dashboard', domain)

// 获取通用指标数据
export const getCommonIndicators = (tableId: string) => get(buildGetApi('/indicator/common'), {
  tableId
}, {}, false, false) as Promise<any>

// 获取个人指标数据
export const getPersonalIndicators = (tableId: string) => get(buildGetApi('/indicator/personal'), {
  tableId
}, {}, false, false) as Promise<any>

// 保存指标树数据
export const saveIndicatorTree = (tableId: string, data: IndicatorTreeNode[]) => post(buildPostApi('/indicator/tree'), {
  tableId
}, data, false, false) as Promise<any>

// 新增个人指标
export const addPersonalIndicator = (tableId: string, data: Partial<IndicatorTreeNode>) => post(buildPostApi('/indicator/add'), {
  tableId
}, data, false, false) as Promise<any>

// 更新个人指标
export const updatePersonalIndicator = (tableId: string, data: Partial<IndicatorTreeNode>) => post(buildPostApi('/indicator'), {
  tableId
}, data, false, false) as Promise<any>

// 删除个人指标
export const deleteIndicatorApi = (tableId: string, indicatorId: string) => post(buildPostApi('/indicator/delete'), {
  tableId, indicatorId
}, {}, false, false) as Promise<any>