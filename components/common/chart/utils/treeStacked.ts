/**
 * 树形堆叠柱状图（treeStackedBar）核心工具
 *
 * 设计要点：
 * - 配置中仅存储树形字典引用（dictName + property + fieldType），不存树结构快照
 * - 渲染时通过 getTreeList 实时拉取 2 层树结构，字典调整后图表自动跟随，零维护
 * - 父节点作为 X 轴分类，每根柱子内部仅堆叠其直属子节点（非笛卡尔积）
 * - 仅支持 2 层树
 */
import { getTreeList } from '@/framework/apis/common/common'
import {
  ConditionGroup,
  DataMetric,
  IndicatorGroup,
  IndicatorItem,
  MetricCondition,
  TreeDimensionConfig
} from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'

/** 树节点（getTreeList 返回结构） */
export interface TreeDictNode {
  key?: string | number
  value: string | number
  label: string
  isLeaf?: boolean
  children?: TreeDictNode[]
}

/** 父节点 -> 子节点 分组结果 */
export interface TreeParentGroup {
  parentValue: string
  parentLabel: string
  children: { value: string; label: string }[]
}

/** 短时缓存：同一仪表盘多个图表/多次渲染复用同一份树结构，避免重复请求 */
const treeCache = new Map<string, { at: number; tree: TreeDictNode[] }>()
const TREE_CACHE_TTL = 60 * 1000

/**
 * 拉取树形字典结构（带短时缓存）
 */
export const fetchTreeDict = async (dictName: string, force = false): Promise<TreeDictNode[]> => {
  const cached = treeCache.get(dictName)
  if (!force && cached && Date.now() - cached.at < TREE_CACHE_TTL) {
    return cached.tree
  }
  const resp = await getTreeList(dictName)
  const tree: TreeDictNode[] = resp?.payload || []
  treeCache.set(dictName, { at: Date.now(), tree })
  return tree
}

/** 判断节点是否为叶子 */
const isLeafNode = (node: TreeDictNode) => node.isLeaf || !node.children?.length

/**
 * 解析出「父节点层」
 *
 * 树形字典接口返回的是带根节点的完整树：根节点（pid=null）作为唯一顶层。
 * 若不剥离根节点，根会被当成唯一的“父”，导致永远只有一根柱子的堆叠。
 * 因此：当顶层只有一个非叶子节点（即根节点）时，下钻一层，
 * 以根的子节点（第 2 层）作为父节点层，其子节点（第 3 层）作为叶子。
 * 若顶层本身就是多个节点（无统一根），则顶层即为父节点层。
 */
const resolveParentLevel = (tree: TreeDictNode[]): TreeDictNode[] => {
  if (tree.length === 1 && !isLeafNode(tree[0])) {
    return tree[0].children || []
  }
  return tree
}

/**
 * 将树拍平为「父 -> 子」分组列表（已剥离根节点）
 * 父节点 = 第 2 层，叶子 = 第 3 层；仅取拥有叶子子节点的父节点
 */
export const flattenTreeToParentGroups = (tree: TreeDictNode[]): TreeParentGroup[] => {
  const parentLevel = resolveParentLevel(tree)
  const groups: TreeParentGroup[] = []
  for (const node of parentLevel) {
    if (isLeafNode(node)) continue
    const children = (node.children || [])
      .filter(child => isLeafNode(child))
      .map(child => ({ value: String(child.value), label: child.label }))
    if (children.length === 0) continue
    groups.push({
      parentValue: String(node.value),
      parentLabel: node.label,
      children
    })
  }
  return groups
}

/** 叶子节点及其祖先 label 链(自外向内, 已剥离虚拟根) */
export interface TreeLeafPath {
  value: string
  label: string
  /** 从第 2 层(剥根后)到叶子父辈的 label 链; 叶子直接挂在根下时为空数组 */
  parentPath: string[]
}

/**
 * 递归收集所有叶子节点及其完整祖先 label 链(支持任意层父表头)
 * 与 flattenTreeToParentGroups 一样先剥离虚拟根; 树的每一层父节点都进入 parentPath,
 * 叶子作为透视列(condition=字段=叶子值), parentPath 作为其上层多层表头
 */
export const collectLeafPathGroups = (tree: TreeDictNode[]): TreeLeafPath[] => {
  const result: TreeLeafPath[] = []
  const walk = (nodes: TreeDictNode[], path: string[]) => {
    for (const node of nodes || []) {
      if (isLeafNode(node)) {
        result.push({ value: String(node.value), label: node.label, parentPath: [...path] })
      } else {
        walk(node.children || [], [...path, node.label])
      }
    }
  }
  walk(resolveParentLevel(tree), [])
  return result
}

/** 树形字典校验结果 */
export interface TreeValidationResult {
  valid: boolean
  message?: string
  parentCount: number
  leafCount: number
}

/**
 * 校验树形字典是否为可用的 2 层树（剥离根节点后：父节点 + 叶子节点）
 * - 空树：不可用
 * - 剥离根后父节点层均为叶子（只有 1 层）：无父子层级，无法堆叠
 * - 父节点的子节点仍非叶子（超过 2 层）：不支持
 * - 至少一个父节点拥有叶子子节点：可用
 */
export const validateTwoLevelTree = (tree: TreeDictNode[]): TreeValidationResult => {
  if (!tree || tree.length === 0) {
    return { valid: false, message: '该字典没有数据', parentCount: 0, leafCount: 0 }
  }

  const parentGroups = flattenTreeToParentGroups(tree)
  if (parentGroups.length > 0) {
    const leafCount = parentGroups.reduce((sum, g) => sum + g.children.length, 0)
    return { valid: true, parentCount: parentGroups.length, leafCount }
  }

  // 无可用父子结构：基于剥离根后的父节点层区分「平铺」与「超过2层」
  const parentLevel = resolveParentLevel(tree)
  if (parentLevel.length === 0) {
    return { valid: false, message: '该字典没有数据', parentCount: 0, leafCount: 0 }
  }
  const allParentLevelAreLeaves = parentLevel.every(node => isLeafNode(node))
  if (allParentLevelAreLeaves) {
    return { valid: false, message: '该字典剥离根节点后只有 1 层（平铺结构），无法用于树形堆叠', parentCount: 0, leafCount: parentLevel.length }
  }
  return { valid: false, message: '该字典层级超过 2 层，树形堆叠仅支持 2 层（父节点 + 叶子节点）', parentCount: 0, leafCount: 0 }
}

/**
 * 根据字段类型决定匹配关系：单选树用 EQUAL，多选合一树用 CONTAIN
 * 与 DictToIndicatorGenerator 生成指标条件时保持一致
 */
const relationByFieldType = (fieldType: string): FILTER_TYPE => {
  return fieldType === FIELD_TYPE.TREE ? FILTER_TYPE.EQUAL : FILTER_TYPE.CONTAIN
}

/**
 * 从指标项的查询条件中提取字典值（用于与树叶子节点匹配）
 */
const extractItemDictValue = (item: IndicatorItem): string | null => {
  try {
    const condList = item.queryConditions?.conditionList || []
    for (const cond of condList as any[]) {
      if (Array.isArray(cond?.value) && cond.value.length > 0) {
        return String(cond.value[0])
      }
    }
  } catch (e) {
    // 忽略解析失败
  }
  return null
}

/**
 * 构建 X 轴一级维度（父节点组）
 * 渲染管线的 X 轴取自 firstDimension，因此树形堆叠模式下
 * 用父节点合成一个"虚拟一级维度"，保证 X 轴为父节点而非叶子指标
 */
export const buildParentFirstDimension = (
  treeDimension: TreeDimensionConfig,
  parentGroups: TreeParentGroup[]
): IndicatorGroup => {
  return {
    groupName: treeDimension.displayName || '树形维度',
    groupValue: `tree__${treeDimension.dictName}`,
    indicatorItems: parentGroups.map(parent => ({
      itemName: parent.parentLabel,
      itemValue: parent.parentValue,
      queryConditions: { conditionList: [], andOr: '0' }
    }))
  }
}

/**
 * 构建树形堆叠的指标条件列表（核心）
 *
 * 与标准双维度笛卡尔积不同：只为「每个父节点 × 其直属子节点」生成条件，
 * label 形如 `父节点名&&子节点名`，从而复用现有双维度堆叠渲染管线，
 * 且每根柱子天然只堆叠自己的子节点（其余子节点无数据即为 0，不显示）。
 *
 * 条件来源优先级：
 * 1. 一级维度中已生成的叶子指标（condition 更精确，与指标集保持一致）
 * 2. 兜底：直接由树叶子值 + 字段类型推导条件
 */
export const buildTreeStackedMetricConditions = (
  treeDimension: TreeDimensionConfig,
  parentGroups: TreeParentGroup[],
  leafItems?: IndicatorItem[]
): MetricCondition[] => {
  const relation = relationByFieldType(treeDimension.fieldType)
  const conditions: MetricCondition[] = []

  // 建立 字典值 -> 指标项 的映射，便于按叶子值匹配
  const itemByValue = new Map<string, IndicatorItem>()
  ;(leafItems || []).forEach(item => {
    const dictValue = extractItemDictValue(item)
    if (dictValue !== null && !itemByValue.has(dictValue)) {
      itemByValue.set(dictValue, item)
    }
  })

  for (const parent of parentGroups) {
    for (const child of parent.children) {
      const matched = itemByValue.get(child.value)

      // 优先复用已生成指标的条件；否则按树叶子值推导
      const condition: ConditionGroup = matched?.queryConditions
        ? matched.queryConditions
        : {
            conditionList: [
              {
                property: treeDimension.property,
                relation,
                value: [child.value]
              } as any
            ],
            andOr: '0'
          }

      conditions.push({
        value: `${parent.parentValue}&&${child.value}`,
        label: `${parent.parentLabel}&&${child.label}`,
        condition
      })
    }
  }

  return conditions
}

/**
 * 树形堆叠取数的共享入口：拉取树结构 → 拍平为父子分组 → （可选）按可见性过滤 → 生成指标条件。
 * 配置弹窗预览（ChartDisplayArea）与仪表盘卡片（ChartCard）两条渲染链路复用此函数，避免逻辑重复。
 * @param treeDimension   树关系配置
 * @param visibleFirst    可见父节点名列表（空/不传表示全部可见）
 * @param visibleSecond   可见叶子节点名列表（空/不传表示全部可见）
 */
export const buildTreeStackedData = async (
  treeDimension: TreeDimensionConfig,
  visibleFirst?: string[],
  visibleSecond?: string[]
): Promise<{ parentGroups: TreeParentGroup[]; metricConditions: MetricCondition[] }> => {
  const tree = await fetchTreeDict(treeDimension.dictName)
  let parentGroups = flattenTreeToParentGroups(tree)

  if (visibleFirst && visibleFirst.length > 0) {
    parentGroups = parentGroups.filter(g => visibleFirst.includes(g.parentLabel))
  }
  if (visibleSecond && visibleSecond.length > 0) {
    parentGroups = parentGroups.map(g => ({
      ...g,
      children: g.children.filter(c => visibleSecond.includes(c.label))
    }))
  }

  return {
    parentGroups,
    metricConditions: buildTreeStackedMetricConditions(treeDimension, parentGroups)
  }
}

/**
 * 收集所有父节点下的叶子节点（去重，保持出现顺序）
 */
const collectAllLeaves = (parentGroups: TreeParentGroup[]) => {
  const seen = new Set<string>()
  const leaves: { value: string; label: string }[] = []
  for (const parent of parentGroups) {
    for (const child of parent.children) {
      if (!seen.has(child.value)) {
        seen.add(child.value)
        leaves.push(child)
      }
    }
  }
  return leaves
}

/**
 * 构建二级维度（全部叶子节点）
 * 使 hasSecondDimension 为 true，从而：
 * - 维度控制面板出现叶子节点可见性控制 Tab
 * - dimensionValueMap.second 建立 叶子名 -> 叶子值 映射，供颜色对齐使用
 */
export const buildLeafSecondDimension = (
  treeDimension: TreeDimensionConfig,
  parentGroups: TreeParentGroup[]
): IndicatorGroup => {
  const leaves = collectAllLeaves(parentGroups)
  return {
    groupName: `${treeDimension.displayName || '树形维度'}-子节点`,
    groupValue: `tree_leaf__${treeDimension.dictName}`,
    indicatorItems: leaves.map(leaf => ({
      itemName: leaf.label,
      itemValue: leaf.value,
      queryConditions: { conditionList: [], andOr: '0' }
    }))
  }
}

/** 确定性调色板：保证同一叶子节点多次渲染颜色稳定 */
const TREE_STACKED_PALETTE = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  '#fa541c', '#8c8c8c', '#9254de', '#ff7a45', '#36cfc9',
  '#ffc53d', '#597ef7', '#73d13d', '#ffa940', '#40a9ff'
]

/**
 * 为树形堆叠指标自动分配备子节点颜色（确定性，随叶子位置稳定）
 * 颜色以叶子值为键写入 itemColors，与 dimensionValueMap.second 的映射对齐
 */
export const assignTreeStackedColors = (
  dataMetrics: DataMetric[],
  parentGroups: TreeParentGroup[]
) => {
  const leaves = collectAllLeaves(parentGroups)
  dataMetrics.forEach(metric => {
    if (metric.chartType !== 'treeStackedBar') return
    if (!metric.itemColors) metric.itemColors = {}
    leaves.forEach((leaf, index) => {
      // 已手动配置过的颜色不覆盖
      if (!metric.itemColors[leaf.value]) {
        metric.itemColors[leaf.value] = TREE_STACKED_PALETTE[index % TREE_STACKED_PALETTE.length]
      }
    })
  })
}
