/**
 * Wiki模块API接口定义
 * 
 * 后端需要实现以下接口：
 */

import type { WikiFormData, WikiPage, WikiQueryParams, WikiSortParams, WikiTreeNode } from './types'

import { get, post } from '@/framework/network/request'

/** API基础路径 */
const BASE_URL = '/wiki'

/**
 * ========================================
 * 后端API接口清单
 * ========================================
 * 
 * 1. GET /wiki/tree
 *    描述: 获取Wiki页面树形结构
 *    请求参数: WikiQueryParams (keyword?: string)
 *    响应: WikiTreeNode[]
 * 
 * 2. GET /wiki/page/{id}
 *    描述: 获取单个Wiki页面详情
 *    路径参数: id - 页面ID
 *    响应: WikiPage
 * 
 * 3. POST /wiki/page
 *    描述: 新增Wiki页面
 *    请求体: WikiFormData
 *    响应: WikiPage
 * 
 * 4. PUT /wiki/page/{id}
 *    描述: 更新Wiki页面
 *    路径参数: id - 页面ID
 *    请求体: WikiFormData
 *    响应: WikiPage
 * 
 * 5. DELETE /wiki/page/{id}
 *    描述: 删除Wiki页面（同时删除子页面）
 *    路径参数: id - 页面ID
 *    响应: boolean
 * 
 * 6. PUT /wiki/page/sort
 *    描述: 更新页面排序/移动页面
 *    请求体: WikiSortParams
 *    响应: boolean
 * 
 * 7. GET /wiki/search
 *    描述: 搜索Wiki页面
 *    请求参数: keyword - 搜索关键词
 *    响应: WikiPage[]
 */

/**
 * 获取Wiki页面树形结构
 * @param params 查询参数
 */
export const getWikiTree = (params?: WikiQueryParams): Promise<WikiTreeNode[]> => {
  return get(`${BASE_URL}/tree`, params)
}

/**
 * 获取单个Wiki页面详情
 * @param id 页面ID
 */
export const getWikiPage = (id: string): Promise<WikiPage> => {
  return get(`${BASE_URL}/page/${id}`)
}

/**
 * 新增Wiki页面
 * @param data 页面数据
 */
export const addWikiPage = (data: WikiFormData): Promise<WikiPage> => {
  return post(`${BASE_URL}/page`, data)
}

/**
 * 更新Wiki页面
 * @param id 页面ID
 * @param data 页面数据
 */
export const updateWikiPage = (id: string, data: WikiFormData): Promise<WikiPage> => {
  return post(`${BASE_URL}/page/${id}`, data, { method: 'PUT' })
}

/**
 * 删除Wiki页面
 * @param id 页面ID
 */
export const deleteWikiPage = (id: string): Promise<boolean> => {
  return post(`${BASE_URL}/page/${id}`, {}, { method: 'DELETE' })
}

/**
 * 更新页面排序/移动页面
 * @param params 排序参数
 */
export const sortWikiPage = (params: WikiSortParams): Promise<boolean> => {
  return post(`${BASE_URL}/page/sort`, params, { method: 'PUT' })
}

/**
 * 搜索Wiki页面
 * @param keyword 搜索关键词
 */
export const searchWikiPages = (keyword: string): Promise<WikiPage[]> => {
  return get(`${BASE_URL}/search`, { keyword })
}
