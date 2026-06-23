/**
 * 批量同步图表配置：扫描所有图表的 indicator 配置与当前指标树对比，
 * 识别新增/删除/顺序变化的维度项，供用户逐图表审查并确认保存。
 */

import { getIndicatorConfig } from '@/framework/apis/portal'
import {
  getCommonStatistic,
  getPersonalStatistic,
  updateCommonStatistic,
  updatePersonalStatistic
} from '@/framework/components/common/chartConfig/api'

// ─── 类型定义 ────────────────────────────────────────────

/** 单个维度的变更类型 */
export type ChangeType = 'added' | 'removed' | 'reordered'

/** 一条变更记录 */
export interface DimChange {
  type: ChangeType
  label: string       // 显示名称，如 "2025"
  oldOrder?: number   // 仅在 reordered 时有
  newOrder?: number   // 仅在 reordered 时有
}

/** 一个分组的变更摘要（第一维度或第二维度） */
export interface GroupDiff {
  groupName: string
  groupValue: string
  changes: DimChange[]
  // 合并后的完整 items（给用户预览最终效果）
  mergedItems: Array<{ itemName: string; itemValue: string }>
  // 同步后实际可见的 items（考虑用户之前取消的项）
  visibleItems: Array<{ itemName: string; itemValue: string }>
}

/** 单个图表的扫描结果 */
export interface ChartDiff {
  id: string
  statisticId: string  // 后端实体 ID（Long），用于更新
  title: string
  isCommon: boolean
  indicator: any  // 原始 indicator 字段（JSON 字符串或对象）
  /** true=该图表配置与树有差异 */
  hasChanges: boolean
  /** 一级维度变更 */
  firstDimension?: GroupDiff
  /** 二级维度变更 */
  secondDimension?: GroupDiff
}

/** 扫描结果 */
export interface ScanResult {
  tableId: string
  total: number         // 总图表数
  changed: number       // 有差异的图表数
  charts: ChartDiff[]   // 每个图表的 diff
}

// ─── 核心逻辑（与 dashboard.vue 保持一致） ────────────────

/** 解析条件组 */
function parseConditionGroup(raw: any): { conditionList: any[]; andOr: '0' | '1' } {
  if (!raw) return { conditionList: [], andOr: '0' }
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    const andOr = (obj.andOr === '1' ? '1' : '0') as '0' | '1'
    const conditionList = Array.isArray(obj.conditionList) ? obj.conditionList : []
    return { conditionList, andOr }
  } catch {
    return { conditionList: [], andOr: '0' }
  }
}

/** 在指标树中查找匹配的分组（传入 treeData 而非 ref） */
function findGroupInTree(
  key: string | number | undefined,
  title: string | undefined,
  treeData: any[]
): any | null {
  const stack: any[] = [...(treeData || [])]
  while (stack.length) {
    const node = stack.shift()
    if (!node) continue
    if ((key !== undefined && String(node.key) === String(key)) ||
        (title && node.title === title)) {
      return node
    }
    if (node.children && node.children.length) {
      stack.push(...node.children)
    }
  }
  return null
}

/**
 * 同步 visible 数组：已有可见项中仍存在的保持可见；
 * 只有真正新增的 item（旧配置中不存在的）默认设为可见。
 * 旧配置中已有但被用户取消的项，保持不选中。
 */
function reconcileVisibleDimensions(
  oldVisible: string[] | undefined | null,
  oldAllItems: Array<{ itemName: string; itemValue: string }>,
  mergedItems: Array<{ itemName: string; itemValue: string }>
): string[] {
  const oldAllNames = new Set(oldAllItems.map(i => i.itemName))
  const mergedNames = mergedItems.map(i => i.itemName)

  // 保留原有可见项中仍然存在的
  const preserved = (oldVisible || []).filter(name => mergedNames.includes(name))

  // 只有真正新增的（在 mergedItems 中但不在旧完整列表中的）才默认可见
  const genuinelyNew = mergedNames.filter(name => !oldAllNames.has(name))

  return [...preserved, ...genuinelyNew]
}

/**
 * 将已保存的分组与指标树合并（与 dashboard.vue 的 reconcileDimensionWithTree 一致）
 * @returns 合并后的对象，或 null（输入为空）
 */
function reconcileDimensionWithTree(
  savedGroup: any,
  treeGroup: any | null
): any | null {
  if (!savedGroup) return null

  const savedItems: Array<{ itemName: string; itemValue: string; queryConditions: any }>
    = savedGroup.indicatorItems || []

  if (!treeGroup) {
    // 分组在树中已不存在，使用保存的数据原样
    return {
      groupName: savedGroup.groupName,
      groupValue: String(savedGroup.groupValue),
      indicatorItems: savedItems.map((it: any) => ({
        itemName: it.itemName,
        itemValue: String(it.itemValue),
        queryConditions: parseConditionGroup(it.queryConditions)
      }))
    }
  }

  const treeItemMap = new Map((treeGroup.items || []).map((it: any) => [String(it.key), it]))
  const savedItemKeys = new Set(savedItems.map((it: any) => String(it.itemValue)))

  // 保留已存在条目（按保存的顺序），只保留树中还存在的
  const preserved = savedItems
    .filter((it: any) => treeItemMap.has(String(it.itemValue)))
    .map((it: any) => ({
      itemName: it.itemName,
      itemValue: String(it.itemValue),
      queryConditions: parseConditionGroup(it.queryConditions)
    }))

  // 追加新增的条目（树中有但保存配置中没有的）
  const added = (treeGroup.items || [])
    .filter((it: any) => !savedItemKeys.has(String(it.key)))
    .map((it: any) => ({
      itemName: it.title,
      itemValue: String(it.key),
      queryConditions: parseConditionGroup(it.condition)
    }))

  return {
    groupName: savedGroup.groupName || treeGroup.title,
    groupValue: String(savedGroup.groupValue),
    indicatorItems: [...preserved, ...added]
  }
}

// ─── Diff 计算 ────────────────────────────────────────────

/**
 * 计算一个分组的变更摘要
 */
function computeGroupDiff(
  savedGroup: any,
  treeGroup: any | null
): GroupDiff | undefined {
  if (!savedGroup) return undefined

  const savedItems: Array<{ itemName: string; itemValue: string }>
    = savedGroup.indicatorItems || []
  const changes: DimChange[] = []

  if (!treeGroup) {
    // 树中已不存在此分组 → 整体标记删除
    savedItems.forEach((item) => {
      changes.push({ type: 'removed', label: item.itemName })
    })
    return {
      groupName: savedGroup.groupName,
      groupValue: String(savedGroup.groupValue),
      changes,
      mergedItems: savedItems.map((it: any) => ({
        itemName: it.itemName,
        itemValue: String(it.itemValue)
      })),
      visibleItems: savedItems.map((it: any) => ({
        itemName: it.itemName,
        itemValue: String(it.itemValue)
      }))
    }
  }

  const treeItemMap = new Map((treeGroup.items || []).map((it: any) => [String(it.key), it]))
  const savedItemKeys = new Set(savedItems.map((it: any) => String(it.itemValue)))

  // 找已删除的（保存中有，树中没有）
  savedItems.forEach((item) => {
    if (!treeItemMap.has(String(item.itemValue))) {
      changes.push({ type: 'removed', label: item.itemName })
    }
  })

  // 找新增的（树中有，保存中没有）
  ;(treeGroup.items || []).forEach((it: any) => {
    if (!savedItemKeys.has(String(it.key))) {
      changes.push({ type: 'added', label: it.title || it.key })
    }
  })

  // 找顺序变化的（相同 keys，但顺序不同）
  const savedKeys = savedItems
    .filter((item) => treeItemMap.has(String(item.itemValue)))
    .map((item) => String(item.itemValue))
  const treeKeys = (treeGroup.items || []).map((it: any) => String(it.key))

  let orderChanged = false
  const savedOrdered = savedKeys.join(',')
  // 过滤出 treeKeys 中存在于 savedKeys 的部分，看顺序
  const treeOrderedFiltered = treeKeys.filter((k: string) => savedKeys.includes(k)).join(',')
  if (savedOrdered !== treeOrderedFiltered && savedKeys.length > 1) {
    orderChanged = true
  }

  if (orderChanged) {
    changes.push({ type: 'reordered', label: '排序变更' })
  }

  // 计算合并后的所有 items（与 reconcileDimensionWithTree 逻辑一致）
  const preserved = savedItems
    .filter((item) => treeItemMap.has(String(item.itemValue)))
  const addedItems = (treeGroup.items || [])
    .filter((it: any) => !savedItemKeys.has(String(it.key)))
    .map((it: any) => ({ itemName: it.title, itemValue: String(it.key) }))

  return {
    groupName: savedGroup.groupName,
    groupValue: String(savedGroup.groupValue),
    changes,
    mergedItems: [
      ...preserved.map((it: any) => ({ itemName: it.itemName, itemValue: String(it.itemValue) })),
      ...addedItems
    ],
    visibleItems: [
      ...preserved.map((it: any) => ({ itemName: it.itemName, itemValue: String(it.itemValue) })),
      ...addedItems
    ]
  }
}

// ─── 对外 API ────────────────────────────────────────────

/** 将树形结构的图表配置扁平化为叶子节点列表 */
function flattenTreeToLeaves(nodes: any[]): any[] {
  const result: any[] = []
  const walk = (arr: any[]) => {
    if (!Array.isArray(arr)) return
    for (const node of arr) {
      // 有 indicator 字段的才是实际图表叶子节点
      if (node.indicator) {
        result.push(node)
      }
      if (node.children && node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

/**
 * 扫描图表配置，与当前指标树对比，返回每个图表的变更摘要（不执行保存）。
 * @param tableId 表 ID（portalName）
 * @param selectedGroupValue 可选，仅扫描第一/第二维度与指定分组相关的图表
 */
export async function scanAllCharts(tableId: string, selectedGroupValue?: string): Promise<ScanResult> {
  // 并行加载指标树 + 所有图表配置
  const [treeResp, commonResp, personalResp] = await Promise.all([
    getIndicatorConfig(tableId),
    getCommonStatistic(tableId),
    getPersonalStatistic(tableId)
  ])

  const treeData = treeResp.payload || []

  // 树形 → 扁平化，提取所有叶子节点
  // DashboardStatisticVO.id 即 statisticId（Long），与更新接口使用的 ID 一致
  const allItems: Array<{ id: string; statisticId: string; title: string; isCommon: boolean; indicator: any }> = [
    ...flattenTreeToLeaves(commonResp.payload || []).map((d: any) => ({
      ...d,
      id: String(d.id),
      statisticId: String(d.id),
      isCommon: true
    })),
    ...flattenTreeToLeaves(personalResp.payload || []).map((d: any) => ({
      ...d,
      id: String(d.id),
      statisticId: String(d.id),
      isCommon: false
    }))
  ]

  // 如果指定了选中分组，过滤出第一/第二维度引用该分组的图表
  let filteredItems = allItems
  if (selectedGroupValue) {
    console.log('[SyncDebug] scanAllCharts filter - selectedGroupValue:', selectedGroupValue,
      'total charts:', allItems.length)
    filteredItems = allItems.filter((item) => {
      if (!item.indicator) {
        console.log('[SyncDebug] filter skip - no indicator:', item.title)
        return false
      }
      let p: any
      try {
        p = typeof item.indicator === 'string' ? JSON.parse(item.indicator) : item.indicator
      } catch {
        console.log('[SyncDebug] filter skip - parse error:', item.title)
        return false
      }
      const firstVal = p.firstDimension ? String(p.firstDimension.groupValue) : null
      const secondVal = p.secondDimension ? String(p.secondDimension.groupValue) : null
      const matchFirst = firstVal === String(selectedGroupValue)
      const matchSecond = secondVal === String(selectedGroupValue)
      console.log('[SyncDebug] filter chart:', item.title,
        'firstDim:', p.firstDimension?.groupName, '=', firstVal,
        'secondDim:', p.secondDimension?.groupName, '=', secondVal,
        'match:', matchFirst || matchSecond)
      return matchFirst || matchSecond
    })
    console.log('[SyncDebug] filter result - matched:', filteredItems.length, 'out of', allItems.length)
  }

  const charts: ChartDiff[] = []
  let changedCount = 0

  for (const item of filteredItems) {
    const diff: ChartDiff = {
      id: item.id,
      statisticId: item.statisticId,
      title: item.title || '(未命名)',
      isCommon: item.isCommon,
      indicator: item.indicator,
      hasChanges: false
    }

    if (!item.indicator) {
      charts.push(diff)
      continue
    }

    let parsed: any
    try {
      parsed = typeof item.indicator === 'string'
        ? JSON.parse(item.indicator)
        : item.indicator
    } catch {
      charts.push(diff)
      continue
    }

    // 检测维度是否与选中分组匹配
    const matchFirst = selectedGroupValue
      ? parsed.firstDimension && String(parsed.firstDimension.groupValue) === String(selectedGroupValue)
      : true
    const matchSecond = selectedGroupValue
      ? parsed.secondDimension && String(parsed.secondDimension.groupValue) === String(selectedGroupValue)
      : true

    console.log('[SyncDebug] scan chart:', item.title,
      'matchFirst:', matchFirst, '(firstDim:', parsed.firstDimension?.groupName, '=', parsed.firstDimension?.groupValue, ')',
      'matchSecond:', matchSecond, '(secondDim:', parsed.secondDimension?.groupName, '=', parsed.secondDimension?.groupValue, ')',
      'selectedGroupValue:', selectedGroupValue)

    // 扫描一级维度（未指定分组 或 该维度匹配选中分组时）
    if (parsed.firstDimension && matchFirst) {
      const treeGroup = findGroupInTree(
        parsed.firstDimension.groupValue,
        parsed.firstDimension.groupName,
        treeData
      )
      console.log('[SyncDebug] firstDim scan -', parsed.firstDimension.groupName,
        'treeGroup found:', !!treeGroup,
        'tree items count:', treeGroup?.items?.length || 0,
        'saved items:', JSON.stringify(parsed.firstDimension.indicatorItems?.map((i: any) => i.itemName)),
        'tree items:', JSON.stringify(treeGroup?.items?.map((i: any) => i.title)))
      const groupDiff = computeGroupDiff(parsed.firstDimension, treeGroup)
      console.log('[SyncDebug] firstDim diff - changes:', groupDiff?.changes?.length || 0,
        'changes:', JSON.stringify(groupDiff?.changes || []))
      if (groupDiff) {
        // 即使 indicatorItems 无变化，也要检查 visibleFirstDimensions 是否缺少新增项
        const oldVisible = parsed.visibleFirstDimensions
        const oldAllItems = parsed.firstDimension.indicatorItems || []
        const reconciledVisible = reconcileVisibleDimensions(oldVisible, oldAllItems, groupDiff.mergedItems)
        const currentlyVisible = oldVisible || []
        const missingFromVisible = reconciledVisible.filter(name => !currentlyVisible.includes(name))
        if (missingFromVisible.length > 0) {
          // 新增项在 visible 列表中缺失 → 需设为可见
          missingFromVisible.forEach(name => {
            groupDiff.changes.push({ type: 'added' as ChangeType, label: name + ' (需设为可见)' })
          })
          groupDiff.visibleItems = reconciledVisible.map(name => {
            const found = groupDiff.mergedItems.find(i => i.itemName === name)
            return found || { itemName: name, itemValue: name }
          })
        } else if (groupDiff.changes.length > 0) {
          // 有 item 变更，正常计算 visibleItems
          const visibleNames = reconcileVisibleDimensions(
            oldVisible, oldAllItems, groupDiff.mergedItems
          )
          groupDiff.visibleItems = visibleNames.map(name => {
            const found = groupDiff.mergedItems.find(i => i.itemName === name)
            return found || { itemName: name, itemValue: name }
          })
        }
        if (groupDiff.changes.length > 0) {
          diff.firstDimension = groupDiff
          diff.hasChanges = true
        }
      }
    }

    // 扫描二级维度（未指定分组 或 该维度匹配选中分组时）
    if (parsed.secondDimension && matchSecond) {
      const treeGroup2 = findGroupInTree(
        parsed.secondDimension.groupValue,
        parsed.secondDimension.groupName,
        treeData
      )
      console.log('[SyncDebug] secondDim scan -', parsed.secondDimension.groupName,
        'treeGroup found:', !!treeGroup2,
        'tree items count:', treeGroup2?.items?.length || 0,
        'saved items:', JSON.stringify(parsed.secondDimension.indicatorItems?.map((i: any) => i.itemName)),
        'tree items:', JSON.stringify(treeGroup2?.items?.map((i: any) => i.title)))
      const groupDiff2 = computeGroupDiff(parsed.secondDimension, treeGroup2)
      console.log('[SyncDebug] secondDim diff - changes:', groupDiff2?.changes?.length || 0,
        'changes:', JSON.stringify(groupDiff2?.changes || []))
      if (groupDiff2) {
        // 即使 indicatorItems 无变化，也要检查 visibleSecondDimensions 是否缺少新增项
        const oldVisible = parsed.visibleSecondDimensions
        const oldAllItems = parsed.secondDimension.indicatorItems || []
        const reconciledVisible = reconcileVisibleDimensions(oldVisible, oldAllItems, groupDiff2.mergedItems)
        const currentlyVisible = oldVisible || []
        const missingFromVisible = reconciledVisible.filter(name => !currentlyVisible.includes(name))
        if (missingFromVisible.length > 0) {
          // 新增项在 visible 列表中缺失 → 需设为可见
          missingFromVisible.forEach(name => {
            groupDiff2.changes.push({ type: 'added' as ChangeType, label: name + ' (需设为可见)' })
          })
          groupDiff2.visibleItems = reconciledVisible.map(name => {
            const found = groupDiff2.mergedItems.find(i => i.itemName === name)
            return found || { itemName: name, itemValue: name }
          })
        } else if (groupDiff2.changes.length > 0) {
          // 有 item 变更，正常计算 visibleItems
          const visibleNames = reconcileVisibleDimensions(
            oldVisible, oldAllItems, groupDiff2.mergedItems
          )
          groupDiff2.visibleItems = visibleNames.map(name => {
            const found = groupDiff2.mergedItems.find(i => i.itemName === name)
            return found || { itemName: name, itemValue: name }
          })
        }
        if (groupDiff2.changes.length > 0) {
          diff.secondDimension = groupDiff2
          diff.hasChanges = true
        }
      }
    }

    console.log('[SyncDebug] scan result for', item.title, '- hasChanges:', diff.hasChanges)
    if (diff.hasChanges) changedCount++
    charts.push(diff)
  }

  console.log('[SyncDebug] scanAllCharts result - total:', allItems.length,
    'filtered:', filteredItems.length, 'changed:', changedCount)

  return {
    tableId,
    total: allItems.length,
    changed: changedCount,
    charts
  }
}

/**
 * 对单个图表的 indicator 配置执行合并，并保存到数据库。
 * @param treeData 当前指标树数据（scanAllCharts 时已加载）
 */
export async function applyChartSyncWithTree(
  chartId: string,
  statisticId: string,
  isCommon: boolean,
  oldIndicatorStr: string,
  treeData: any[]
): Promise<boolean> {
  let parsed: any
  try {
    parsed = typeof oldIndicatorStr === 'string'
      ? JSON.parse(oldIndicatorStr)
      : oldIndicatorStr
  } catch {
    return false
  }

  let hasChanges = false

  // ── 辅助函数：处理一个维度的合并及 visible 同步 ──
  function syncDimension(
    dimKey: 'firstDimension' | 'secondDimension',
    visibleKey: 'visibleFirstDimensions' | 'visibleSecondDimensions'
  ) {
    const dim = parsed[dimKey]
    if (!dim) return

    const treeGroup = findGroupInTree(dim.groupValue, dim.groupName, treeData)
    const reconciled = reconcileDimensionWithTree(dim, treeGroup)
    if (!reconciled) return

    const itemsChanged = JSON.stringify(dim.indicatorItems) !== JSON.stringify(reconciled.indicatorItems)
    const oldVisible = parsed[visibleKey]
    const oldAllItems = dim.indicatorItems || []

    // 即使 item 没变也要计算正确的 visible 列表
    const newVisible = reconcileVisibleDimensions(
      oldVisible,
      oldAllItems,
      reconciled.indicatorItems
    )
    const visibleChanged = JSON.stringify(oldVisible || []) !== JSON.stringify(newVisible)

    if (itemsChanged) {
      hasChanges = true
      parsed[dimKey] = reconciled
      parsed[visibleKey] = newVisible
    } else if (visibleChanged) {
      // 仅 visible 变化也需要保存
      hasChanges = true
      // indicatorItems 不变，但 mergedItems 可能变了（影响 visible 计算）
      // reconciled 中的 indicatorItems 与 dim.indicatorItems 相同（itemsChanged 为 false）
      // 但 visible 数组需要更新
      parsed[visibleKey] = newVisible
    }
  }

  syncDimension('firstDimension', 'visibleFirstDimensions')
  syncDimension('secondDimension', 'visibleSecondDimensions')

  if (!hasChanges) return false

  const syncedFirst = parsed.firstDimension
  const syncedSecond = parsed.secondDimension
  const syncedVisibleFirst = parsed.visibleFirstDimensions
  const syncedVisibleSecond = parsed.visibleSecondDimensions

  // 构建新的 indicator JSON，使用 statisticId 作为更新 ID
  const newIndicator = JSON.stringify({
    ...parsed,
    firstDimension: syncedFirst,
    secondDimension: syncedSecond,
    visibleFirstDimensions: syncedVisibleFirst,
    visibleSecondDimensions: syncedVisibleSecond
  })

  // 保存
  const updateData = { id: statisticId, indicator: newIndicator }
  if (isCommon) {
    await updateCommonStatistic(updateData)
  } else {
    await updatePersonalStatistic(updateData)
  }

  return true
}
