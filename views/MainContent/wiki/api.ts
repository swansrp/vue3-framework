/**
 * Wiki模块API接口定义
 */

import type { 
  CollaboratorApproveParams, 
  CollaboratorRequestParams, 
  ShareCodeGenerateParams,
  ShareCodeResponse,
  ShareCodeUseParams,
  WikiCollaborator, 
  WikiFormData, 
  WikiPage, 
  WikiQueryParams, 
  WikiSortParams, 
  WikiTreeNode 
} from './types'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

// ========== 页面相关接口 ==========

/**
 * 获取Wiki页面树形结构
 * @param params 查询参数
 */
export const getWikiTree = async (params?: WikiQueryParams): Promise<WikiTreeNode[]> => {
  const api = buildGetApiByType('/wiki/tree', '')
  const res = await request(api, params || {}, {}, false, false, true)
  return (res.payload || []) as WikiTreeNode[]
}

/**
 * 获取单个Wiki页面详情
 * @param id 页面ID
 */
export const getWikiPage = async (id: string): Promise<WikiPage> => {
  const api = buildGetApiByType('/wiki/page/' + id, '')
  const res = await request(api, {}, {}, false, false, true)
  return res.payload as WikiPage
}

/**
 * 新增Wiki页面
 * @param data 页面数据
 */
export const addWikiPage = async (data: WikiFormData): Promise<WikiPage> => {
  const api = buildPostApiByType('/wiki/page', '')
  const res = await request(api, {}, data, true, false, true)
  return res.payload as WikiPage
}

/**
 * 更新Wiki页面
 * @param id 页面ID
 * @param data 页面数据
 */
export const updateWikiPage = async (id: string, data: WikiFormData): Promise<WikiPage> => {
  const api = buildPostApiByType('/wiki/page/' + id, '')
  const res = await request(api, {}, data, true, false, true)
  return res.payload as WikiPage
}

/**
 * 删除Wiki页面
 * @param id 页面ID
 */
export const deleteWikiPage = async (id: string): Promise<boolean> => {
  const api = buildPostApiByType('/wiki/delete/page/' + id, '')
  const res = await request(api, {}, {}, true, false, true)
  return res.status.code === 0
}

/**
 * 更新页面排序/移动页面
 * @param params 排序参数
 */
export const sortWikiPage = async (params: WikiSortParams[]): Promise<void> => {
  const api = buildPostApiByType('/wiki/page/sort', '')
  await request(api, {}, params, true, false, true)
}

/**
 * 更新页面排序/移动页面
 * @param id id
 * @param pid 新的父级ID
 */
export const pidWikiPage = async (id: string, pid: string): Promise<void> => {
  const api = buildPostApiByType('/wiki/page/pid', '')
  await request(api, { id, pid }, {}, true, false, true)
}

/**
 * 搜索Wiki页面
 * @param keyword 搜索关键词
 */
export const searchWikiPages = async (keyword: string): Promise<WikiPage[]> => {
  const api = buildGetApiByType('/wiki/search', '')
  const res = await request(api, { keyword }, {}, false, false, true)
  return (res.payload || []) as WikiPage[]
}

/**
 * 获取公开页面（无需登录）
 * @param id 页面ID
 */
export const getPublicWikiPage = async (id: string): Promise<WikiPage> => {
  const api = buildGetApiByType('/wiki/public/' + id, '')
  const res = await request(api, {}, {}, false, false, true)
  return res.payload as WikiPage
}

/**
 * 获取公开Wiki页面树形结构（无需登录）
 * @param params 查询参数
 */
export const getPublicWikiTree = async (params?: WikiQueryParams): Promise<WikiTreeNode[]> => {
  const api = buildGetApiByType('/wiki/public/tree', '')
  const res = await request(api, params || {}, {}, false, false, true)
  return (res.payload || []) as WikiTreeNode[]
}

/**
 * 搜索公开Wiki页面
 * @param keyword 搜索关键词（无需登录）
 */
export const searchPublicWikiPages = async (keyword: string): Promise<WikiPage[]> => {
  const api = buildGetApiByType('/wiki/public/search', '')
  const res = await request(api, { keyword }, {}, false, false, true)
  return (res.payload || []) as WikiPage[]
}

// ========== 协作者相关接口 ==========

/**
 * 申请编辑权限
 * @param params 申请参数
 */
export const requestCollaboratorAccess = async (params: CollaboratorRequestParams): Promise<boolean> => {
  const api = buildPostApiByType('/wiki/collaborator/request', '')
  const res = await request(api, {}, params, true, false, true)
  return res.status.code === 0
}

/**
 * 获取页面协作者列表
 * @param pageId 页面ID
 */
export const getCollaborators = async (pageId: string): Promise<WikiCollaborator[]> => {
  const api = buildGetApiByType('/wiki/collaborator/list/' + pageId, '')
  const res = await request(api, {}, {}, false, false, true)
  return (res.payload || []) as WikiCollaborator[]
}

/**
 * 获取待审批的申请
 * @param pageId 页面ID
 */
export const getPendingRequests = async (pageId: string): Promise<WikiCollaborator[]> => {
  const api = buildGetApiByType('/wiki/collaborator/pending/' + pageId, '')
  const res = await request(api, {}, {}, false, false, true)
  return (res.payload || []) as WikiCollaborator[]
}

/**
 * 审批协作申请
 * @param params 审批参数
 */
export const approveCollaborator = async (params: CollaboratorApproveParams): Promise<boolean> => {
  const api = buildPostApiByType('/wiki/collaborator/approve', '')
  const res = await request(api, {}, params, true, false, true)
  return res.status.code === 0
}

/**
 * 移除协作者
 * @param pageId 页面ID
 * @param userId 用户ID
 */
export const removeCollaborator = async (pageId: string, userId: string): Promise<boolean> => {
  const api = buildPostApiByType('/wiki/collaborator/delete/' + pageId + '/' + userId, '')
  const res = await request(api, {}, {}, true, false, true)
  return res.status.code === 0
}

/**
 * 更新协作者权限
 * @param pageId 页面ID
 * @param userId 用户ID
 * @param permission 新权限
 */
export const updateCollaboratorPermission = async (
  pageId: string, 
  userId: string, 
  permission: string
): Promise<boolean> => {
  const api = buildPostApiByType('/wiki/collaborator/permission', '')
  const res = await request(api, {}, { pageId, userId, permission }, true, false, true)
  return res.status.code === 0
}

/**
 * 获取我的协作页面
 */
export const getMyCollaborations = async (): Promise<WikiCollaborator[]> => {
  const api = buildGetApiByType('/wiki/collaborator/my', '')
  const res = await request(api, {}, {}, false, false, true)
  return (res.payload || []) as WikiCollaborator[]
}

/**
 * 生成分享码
 * @param params 分享参数
 */
export const generateShareCode = async (params: ShareCodeGenerateParams): Promise<ShareCodeResponse> => {
  const api = buildGetApiByType('/wiki/collaborator/share', '')
  const res = await request(api, {
    pageId: params.pageId,
    permission: params.permission,
    expiredSeconds: params.expiredSeconds,
    password: params.password
  }, {}, false, false, true)
  return res.payload as ShareCodeResponse
}

/**
 * 使用分享码获取权限
 * @param params 分享码参数
 */
export const useShareCode = async (params: ShareCodeUseParams): Promise<void> => {
  const api = buildPostApiByType('/wiki/collaborator/share', '')
  await request(api, {
    shareCode: params.shareCode,
    password: params.password
  }, {}, true, false, true)
}
