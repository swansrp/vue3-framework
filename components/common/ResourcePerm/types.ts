// 通用资源权限组件类型定义

/**
 * 资源节点（组件内部标准化格式）
 */
export interface PermResourceNode {
  id: string
  name: string
  children?: PermResourceNode[]
}

/**
 * 字段名映射配置
 * 调用方传入的原始数据字段名可能各不相同，通过此配置告诉组件如何识别
 *
 * 示例：
 * - 指标树 { id, title, children } → { id: 'id', name: 'title', children: 'children' }
 * - 部门树 { value, title, children } → { id: 'value', name: 'title', children: 'children' }
 * - 用户组 { id, name, children } → 默认值，无需配置
 */
export interface PermFieldNames {
  /** 节点唯一标识字段名，默认 'id' */
  id?: string
  /** 节点显示名称字段名，默认 'name' */
  name?: string
  /** 子节点字段名，默认 'children' */
  children?: string
}

export const DEFAULT_FIELD_NAMES: Required<PermFieldNames> = {
  id: 'id',
  name: 'name',
  children: 'children'
}

/**
 * 将原始数据按 fieldNames 标准化为 PermResourceNode[]
 */
export function normalizeResources(raw: any[], fieldNames: Required<PermFieldNames>): PermResourceNode[] {
  const { id: idKey, name: nameKey, children: childrenKey } = fieldNames
  return (raw || []).map((node: any) => ({
    id: String(node[idKey] ?? ''),
    name: String(node[nameKey] ?? ''),
    children: Array.isArray(node[childrenKey]) && node[childrenKey].length > 0
      ? normalizeResources(node[childrenKey], fieldNames)
      : undefined
  }))
}
