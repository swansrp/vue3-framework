/**
 * Wiki模块类型定义
 */

/** Wiki页面基础信息 */
export interface WikiPage {
  /** 页面ID */
  id: string
  /** 页面标题 */
  title: string
  /** 页面内容(JSON格式) */
  content: string
  /** 页面内容(HTML格式) */
  contentHtml: string
  /** Markdown源码内容(可选) */
  contentMarkdown?: string
  /** 编辑模式:'0'-富文本,'1'-Markdown */
  mode?: string
  /** 父级页面ID，顶级为null */
  parentId: string | null
  /** 排序号 */
  sortOrder: number
  /** 作者用户ID */
  authorId: string
  /** 作者名称 */
  authorName: string
  /** 内容更新时间 */
  modifyAt: string
  /** 状态: 1-草稿, 2-已发布 */
  status: string
  /** 是否公开: 0-私有, 1-公开 */
  isPublic: string
  /** 浏览次数 */
  viewCount: number
  /** 版本号 */
  version: number
  /** 创建时间 */
  createAt: string
  /** 更新时间 */
  updateAt: string
  /** 创建人 */
  createBy: string
  /** 更新人 */
  updateBy: string
  /** 是否可编辑(当前用户) */
  canEdit?: boolean
  /** 是否是作者(当前用户) */
  isAuthor?: boolean
}

/** Wiki树形节点 */
export interface WikiTreeNode {
  key: string
  title: string
  parentId: string | null
  sortOrder: number
  children?: WikiTreeNode[]
  /** 是否是叶子节点 */
  isLeaf?: boolean
  /** 作者ID */
  authorId?: string
}

/** Wiki页面表单数据 */
export interface WikiFormData {
  id?: string
  title: string
  content: string
  contentHtml: string
  contentMarkdown?: string
  /** 编辑模式:'0'-富文本,'1'-Markdown */
  mode?: string
  parentId: string | null
  isPublic?: string
}

/** 编辑器模式 */
export type EditorMode = 'rich' | 'markdown'

/** 查询参数 */
export interface WikiQueryParams {
  /** 搜索关键词 */
  keyword?: string
  /** 父级ID */
  parentId?: string | null
}

/** 排序请求参数 */
export interface WikiSortParams {
  /** 页面ID */
  id: string
  /** 新的排序号 */
  showOrder: number
}

/** 操作模式 */
export type WikiMode = 'view' | 'edit' | 'add'

/** 协作者信息 */
export interface WikiCollaborator {
  /** 页面ID */
  pageId: string
  /** 用户ID */
  userId: string
  /** 用户名称 */
  userName: string
  /** 权限类型: 1-只读, 2-编辑 */
  permission: string
  /** 状态: 0-待审批, 1-已通过, 2-已拒绝 */
  status: string
  /** 申请说明 */
  requestMsg?: string
  /** 创建时间 */
  createAt: string
}

/** 权限申请参数 */
export interface CollaboratorRequestParams {
  pageId: string
  permission?: string
  requestMsg?: string
}

/** 权限审批参数 */
export interface CollaboratorApproveParams {
  pageId: string
  userId: string
  approved: boolean
}
