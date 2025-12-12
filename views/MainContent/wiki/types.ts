/**
 * Wiki模块类型定义
 */

/** Wiki页面基础信息 */
export interface WikiPage {
  /** 页面ID */
  id: string
  /** 页面标题 */
  title: string
  /** 页面内容(HTML) */
  content: string
  /** 父级页面ID，顶级为null */
  parentId: string | null
  /** 排序号 */
  sortOrder: number
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 创建人 */
  createBy: string
  /** 更新人 */
  updateBy: string
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
}

/** Wiki页面表单数据 */
export interface WikiFormData {
  id?: string
  title: string
  content: string
  parentId: string | null
}

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
  /** 新的父级ID */
  parentId: string | null
  /** 新的排序号 */
  sortOrder: number
}

/** 操作模式 */
export type WikiMode = 'view' | 'edit' | 'add'
