// 指标树通用工具函数
// 统一 chartConfig 各组件中重复的树遍历/查找/排序/叶子判定逻辑

import type { IndicatorNode } from './types'

// 按谓词深度优先查找节点（通用底层实现）
export const findNode = (
  tree: IndicatorNode[],
  predicate: (node: IndicatorNode) => boolean
): IndicatorNode | null => {
  for (const node of tree) {
    if (predicate(node)) return node
    if (node.children) {
      const found = findNode(node.children, predicate)
      if (found) return found
    }
  }
  return null
}

// 在树中按 key 查找节点（深度优先）
export const findNodeInTree = (tree: IndicatorNode[], key: string): IndicatorNode | null =>
  findNode(tree, node => node.key === key)

// 在树中按 id 查找节点（深度优先）
export const findNodeById = (tree: IndicatorNode[], id: string): IndicatorNode | null =>
  findNode(tree, node => node.id === id)

// 在树中按 id 或 key 查找节点（深度优先）
export const findNodeByIdOrKey = (tree: IndicatorNode[], idOrKey: string): IndicatorNode | null =>
  findNode(tree, node => node.id === idOrKey || node.key === idOrKey)

// 获取指定 id 节点的所有祖先节点 key（从根到父，自顶向下）
export const getParentNodeKeys = (tree: IndicatorNode[], id: string): string[] => {
  const result: string[] = []

  const findParents = (nodes: IndicatorNode[], parents: string[]): boolean => {
    for (const node of nodes) {
      if (node.id === id) {
        result.push(...parents)
        return true
      }
      if (node.children) {
        if (findParents(node.children, [...parents, node.key])) {
          return true
        }
      }
    }
    return false
  }

  findParents(tree, [])
  return result
}

// 按 order 字段递归排序节点数组（无 order 时回退按 title 排序）
export const sortNodesByOrder = (nodes: IndicatorNode[]): IndicatorNode[] => {
  return [...nodes].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return 1
    return (a.title || '').localeCompare(b.title || '')
  }).map(node => ({
    ...node,
    children: node.children ? sortNodesByOrder(node.children) : undefined
  }))
}

// 收集所有叶子节点（无子节点者）
export const collectLeaves = (nodes: IndicatorNode[]): IndicatorNode[] => {
  const result: IndicatorNode[] = []
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      result.push(node)
    } else {
      result.push(...collectLeaves(node.children))
    }
  }
  return result
}

// 收集所有叶子节点的 id
export const collectLeafIds = (nodes: IndicatorNode[]): string[] =>
  collectLeaves(nodes).map(node => node.id).filter(Boolean) as string[]

// 判定节点是否为叶子节点
// 判定优先级：isLeaf 属性 → 是否有实际指标数据(items/indicator) → 是否无子节点
export const isLeafNode = (node: IndicatorNode): boolean => {
  if (node.isLeaf !== undefined) {
    return node.isLeaf
  }
  const hasIndicatorData = (node.items && node.items.length > 0) ||
    (node.indicator && typeof node.indicator === 'object' && Object.keys(node.indicator).length > 0)
  if (hasIndicatorData) {
    return true
  }
  return (!node.children || node.children.length === 0)
}
