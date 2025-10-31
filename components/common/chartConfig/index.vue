<template>
  <div class="talent-review-dashboard">
    <!-- 页面头部 -->
    <div
      v-if="showHeader"
      class="dashboard-header"
    >
      <h1>{{ title || currentRoute.meta.title }}</h1>
      <div class="header-actions">
        <slot name="header-actions">
          <a-button
            type="primary"
            @click="refreshDashboard"
          >
            <ReloadOutlined />
            刷新
          </a-button>
        </slot>
      </div>
    </div>

    <!-- 页面主体 -->
    <div class="dashboard-main">
      <!-- 左侧指标树 -->
      <indicator-tree
        v-if="showIndicatorTree"
        :collapsed="sidebarCollapsed"
        :common-indicators="commonIndicators"
        :expanded-common-keys="expandedCommonKeys"
        :expanded-personal-keys="expandedPersonalKeys"
        :personal-indicators="personalIndicators"
        :selected-common-indicators="selectedCommonIndicators"
        :selected-personal-indicators="selectedPersonalIndicators"
        :show-personal-indicators="showPersonalIndicators"
        :common-indicator-permissions="commonIndicatorPermissions"
        :personal-indicator-permissions="personalIndicatorPermissions"
        @update:collapsed="updateSidebarCollapsed"
        @update:selected-common="updateSelectedCommonIndicators"
        @update:selected-personal="updateSelectedPersonalIndicators"
        @add-indicator="openIndicatorConfig"
        @edit-indicator="openIndicatorConfig"
        @delete-indicator="deleteIndicator"
        @add-dashboard="addDashboardFromTree"
        @delete-dashboard="deleteDashboardFromTree"
        @reload-data="loadDashboardData"
      />

      <!-- 主体图表区域 -->
      <div
        class="dashboard-content"
        :class="{ 'full-width': !showIndicatorTree }"
      >
        <chart-grid
          ref="chartGridRef"
          :indicators="displayedIndicators"
          :loading="loading"
          :grid-columns="GRID_COLUMNS"
          :can-edit-common-indicators="canEditCommonIndicators"
          :can-edit-personal-indicators="canEditPersonalIndicators"
          :can-delete-common-indicators="commonIndicatorPermissions?.delete ?? true"
          :can-delete-personal-indicators="personalIndicatorPermissions?.delete ?? true"
          :can-resize-common-indicators="canResizeCommonIndicators"
          :can-resize-personal-indicators="canResizePersonalIndicators"
          @add-indicator="(ids: string[]) => addDashboard(ids, false)"
          @edit-indicator="editIndicatorFromChart"
          @delete-indicator="deleteDashboard"
          @resize-indicator="handleResizeIndicator"
          @reorder-indicators="handleReorderIndicators"
        />
      </div>
    </div>

    <!-- 图表配置弹窗 -->
    <chart-config-modal
      v-model:visible="chartConfigModalVisible"
      :table-id="computedTableId"
      :edit-data="currentEditData"
      :is-edit-mode="isEditMode"
      :is-common-indicator="!showPersonalIndicators"
      @save="handleChartConfigSave"
    />
  </div>
</template>

<script lang="ts" setup>
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref, readonly, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  addCommonDashboard,
  addPersonalDashboard,
  deletePersonalDashboard,
  deletePersonalStatistic,
  deleteCommonStatistic,
  getCommonStatistic,
  getCommonDashboard,
  getPersonalDashboard,
  getPersonalStatistic,
  updatePersonalDashboard
} from './api'
import type { DashboardItem, IndicatorNode } from './types'

import ChartConfigModal from '@/framework/components/common/chartConfig/ChartConfigModal.vue'
import ChartGrid from '@/framework/components/common/chartConfig/ChartGrid.vue'
import IndicatorTree from '@/framework/components/common/chartConfig/IndicatorTree.vue'


// 权限接口定义
interface IndicatorPermissions {
  edit?: boolean;
  delete?: boolean;
}

// 组件属性定义
interface Props {
  tableId?: string // 表ID，如果不传则从路由获取
  title?: string // 自定义标题
  showHeader?: boolean // 是否显示头部
  showIndicatorTree?: boolean // 是否显示指标树
  showPersonalIndicators?: boolean // 是否显示个人指标
  commonIndicatorPermissions?: IndicatorPermissions // 通用指标权限
  personalIndicatorPermissions?: IndicatorPermissions // 个人指标权限
  useCommonDashboard?: boolean // 是否使用通用Dashboard模式（只显示和操作通用指标的dashboard配置）
}

// 事件定义
interface Emits {
  (e: 'dashboard-loaded', items: DashboardItem[]): void
  (e: 'indicator-added', indicatorIds: string[]): void
  (e: 'indicator-deleted', indicatorIds: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showIndicatorTree: true,
  showPersonalIndicators: true,
  commonIndicatorPermissions: () => ({ edit: true, delete: true }),
  personalIndicatorPermissions: () => ({ edit: true, delete: true }),
  useCommonDashboard: false
})

const emit = defineEmits<Emits>()

// 路由信息
const { currentRoute } = useRouter()
const route = currentRoute.value

// 计算tableId - 支持props传入或从路由获取
const computedTableId = computed(() => {
  return props.tableId || (route.query?.tableId as string)
})

// 统一的网格列数配置
const GRID_COLUMNS = 7

// 页面状态
const loading = ref(false)
const sidebarCollapsed = ref(false)
const isInitialLoad = ref(true) // 页面初始化标志，用于防止初次加载时显示成功提示

// 组件引用
const chartGridRef = ref()

// 图表配置弹窗状态
const chartConfigModalVisible = ref(false)
const currentEditData = ref<IndicatorNode | null>(null)
const isEditMode = ref(false)

// 数据状态
const commonIndicators = ref<IndicatorNode[]>([])
const personalIndicators = ref<IndicatorNode[]>([])
const selectedCommonIndicators = ref<string[]>([])
const selectedPersonalIndicators = ref<string[]>([])
const expandedCommonKeys = ref<string[]>([])
const expandedPersonalKeys = ref<string[]>([])

// 计算属性 - 获取需要显示的指标（使用 getDashboard 的数据）
const displayedIndicators = computed<DashboardItem[]>(() => {
  // 如果使用通用Dashboard模式或不显示个人指标，只返回通用指标
  if (props.useCommonDashboard || !props.showPersonalIndicators) {
    // 如果不显示个人指标，只返回通用指标
    const commonItems = dashboardItems.value.filter(item => item.commonStatistic === '1')
    console.log(180, dashboardItems.value, commonItems)
    return commonItems
  }

  // 显示所有指标（通用指标 + 个人指标）
  return dashboardItems.value
})
// 右侧图表项
const dashboardItems = ref<DashboardItem[]>([])

// 向后兼容的权限计算属性（为ChartGrid等子组件提供）
const canEditCommonIndicators = computed(() => props.commonIndicatorPermissions?.edit ?? true)
const canEditPersonalIndicators = computed(() => props.personalIndicatorPermissions?.edit ?? true)
// 调整大小权限：通用指标即使不可编辑也可以调整大小，个人指标需要编辑权限才能调整大小
const canResizeCommonIndicators = computed(() => true) // 通用指标始终可以调整大小
const canResizePersonalIndicators = computed(() => props.personalIndicatorPermissions?.edit ?? true)
// 注意：删除权限已在IndicatorTree中直接使用新的权限对象结构

// 工具：根据 id 在树中查找节点
const findNodeInIndicatorTree = (tree: IndicatorNode[], nodeId: string): IndicatorNode | null => {
  for (const node of tree) {
    if (node.id === nodeId || node.key === nodeId) {
      return node
    }
    if (node.children) {
      const found = findNodeInIndicatorTree(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

const findNodeById = (nodes: IndicatorNode[], id: string): IndicatorNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}

// 工具：获取节点的所有父节点key
const getParentNodeKeys = (nodes: IndicatorNode[], id: string): string[] => {
  const result: string[] = []

  const findParents = (
    nodes: IndicatorNode[],
    id: string,
    parents: string[]
  ): boolean => {
    for (const node of nodes) {
      if (node.id === id) {
        result.push(...parents)
        return true
      }
      if (node.children) {
        if (findParents(node.children, id, [...parents, node.key])) {
          return true
        }
      }
    }
    return false
  }

  findParents(nodes, id, [])
  return result
}

// 加载仪表盘数据
const loadDashboardData = async (skipSelectionUpdate = false) => {
  const tableId = computedTableId.value
  if (!tableId) {
    console.warn('tableId为空，无法加载仪表盘数据')
    return
  }

  try {
    loading.value = true

    // 并行加载通用/个人指标树与个人 dashboard 配置
    const [commonResp, personalResp, dashboardResp] = await Promise.all([
      getCommonStatistic(tableId),
      getPersonalStatistic(tableId),
      props.useCommonDashboard ? getCommonDashboard(tableId) : getPersonalDashboard(tableId)
    ])

    commonIndicators.value = commonResp.payload || []
    personalIndicators.value = personalResp.payload || []

    // 构建通用/个人指标顺序映射（来自左侧树的 order）
    const buildOrderMap = (nodes: any[]): Record<string, number> => {
      const map: Record<string, number> = {}
      const walk = (arr: any[]) => {
        if (!Array.isArray(arr)) return
        arr.forEach((n: any) => {
          if (n && n.id !== undefined) map[String(n.id)] = Number(n.order ?? 0)
          if (Array.isArray(n.children) && n.children.length) walk(n.children)
        })
      }
      walk(nodes || [])
      return map
    }

    const commonOrderMap = buildOrderMap(commonIndicators.value)
    const personalOrderMap = buildOrderMap(personalIndicators.value)

    // 以指标树顺序为主，其次使用 dashboard 返回的 order，最后按 id 排序兜底
    const dashboardItemsData = (dashboardResp.payload || [])
      .map((d: any) => {
        const isCommon = String(d.commonStatistic) === '1'
        const orderFromTree = (isCommon ? commonOrderMap : personalOrderMap)[String(d.statisticId)]
        const displayOrder = orderFromTree ?? Number(d.order ?? 0)

        const item = {
          id: d.id,
          title: d.title ?? '',
          displayOrder,
          xGrid: Number(d.xGrid ?? d.xgrid ?? 2),
          yGrid: Number(d.yGrid ?? d.ygrid ?? 2),
          xPosition: Number(d.xPosition ?? d.xposition ?? 1),
          yPosition: Number(d.yPosition ?? d.yposition ?? 1),
          show: true, // 默认显示
          commonStatistic: d.commonStatistic,
          config: {
            tableId: tableId,
            indicator: d.indicator, // 保持原始格式，让ChartCard自己解析
            url: '', // 如果需要其他配置可以在这里添加
            columns: []
          },
          indicatorId: d.statisticId
        }
        return item
      })
      .sort((a: DashboardItem, b: DashboardItem) => a.displayOrder - b.displayOrder)

    dashboardItems.value = dashboardItemsData

    // 根据 dashboard 数据中的 statisticId 选中左侧树节点
    const commonIds = dashboardItemsData
      .filter((item: DashboardItem) => item.commonStatistic === '1')
      .map((item: DashboardItem) => item.indicatorId)
      .filter(Boolean) as string[]

    const personalIds = dashboardItemsData
      .filter((item: DashboardItem) => item.commonStatistic !== '1')
      .map((item: DashboardItem) => item.indicatorId)
      .filter(Boolean) as string[]

    // 更新选中的指标，只选中实际存在于dashboard中的指标
    if (!skipSelectionUpdate) {
      selectedCommonIndicators.value = commonIds
      selectedPersonalIndicators.value = personalIds
    }

    // 获取需要展开的节点keys
    const commonExpandedKeys = new Set<string>()
    const personalExpandedKeys = new Set<string>()

    // 为通用指标添加展开的节点
    commonIds.forEach((id: string) => {
      const parentKeys: string[] = getParentNodeKeys(commonIndicators.value, id)
      parentKeys.forEach((parentKey: string) => commonExpandedKeys.add(parentKey))
    })

    // 为个人指标添加展开的节点
    personalIds.forEach((id: string) => {
      const parentKeys: string[] = getParentNodeKeys(personalIndicators.value, id)
      parentKeys.forEach((parentKey: string) => personalExpandedKeys.add(parentKey))
    })

    // 更新展开的节点keys
    expandedCommonKeys.value = Array.from(commonExpandedKeys)
    expandedPersonalKeys.value = Array.from(personalExpandedKeys)

    // 发射事件
    emit('dashboard-loaded', dashboardItemsData)
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    message.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 按顺序重新排列图表布局
const reorganizeChartsLayout = (items: DashboardItem[]): DashboardItem[] => {
  if (!items || items.length === 0) return items

  // 创建一个副本数组，避免修改原数组
  const sortedItems = [...items]

  // 按照 displayOrder 排序，如果没有 displayOrder 则按 id 排序
  sortedItems.sort((a, b) => {
    const orderA = a.displayOrder || 0
    const orderB = b.displayOrder || 0

    if (orderA !== orderB) {
      return orderA - orderB
    }

    // 如果 displayOrder 相同，按 id 排序保证一致性
    return (a.id || '').localeCompare(b.id || '')
  })

  const gridColumns = GRID_COLUMNS
  const rearrangedItems: DashboardItem[] = []

  // 创建一个占用情况映射来跟踪哪些格子被占用
  const occupiedCells = new Set<string>()

  // 标记指定区域为已占用
  const markOccupied = (x: number, y: number, width: number, height: number) => {
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        occupiedCells.add(`${i},${j}`)
      }
    }
  }

  // 检查指定位置是否可以放置图表
  const canPlace = (x: number, y: number, width: number, height: number): boolean => {
    // 检查边界
    if (x + width - 1 > gridColumns || x < 1 || y < 1) {
      return false
    }

    // 检查是否有冲突
    for (let i = x; i < x + width; i++) {
      for (let j = y; j < y + height; j++) {
        if (occupiedCells.has(`${i},${j}`)) {
          return false
        }
      }
    }
    return true
  }

  // 找到最佳位置：优先填充上方空缺，然后从左到右
  const findBestPosition = (width: number, height: number): { x: number; y: number } => {
    // 计算最大已使用的行数，限制搜索范围
    const occupiedPositions = Array.from(occupiedCells).map(pos => parseInt(pos.split(',')[1]))
    const maxUsedY = occupiedPositions.length > 0 ? Math.max(...occupiedPositions) : 1

    // 搜索范围：从第1行开始，最多搜索到当前使用范围+2行
    const searchMaxY = Math.min(maxUsedY + 2, 20)

    for (let y = 1; y <= searchMaxY; y++) {
      for (let x = 1; x <= gridColumns - width + 1; x++) {
        if (canPlace(x, y, width, height)) {
          return { x, y }
        }
      }
    }

    // 如果找不到位置，在底部新开一行
    const fallbackY = Math.max(maxUsedY + 1, 1)
    return { x: 1, y: fallbackY }
  }

  // 重新排列每个图表
  for (const item of sortedItems) {
    const xGrid = item.xGrid || 2
    const yGrid = item.yGrid || 2

    // 找到最佳位置
    const position = findBestPosition(xGrid, yGrid)

    // 创建新的图表项
    const newItem = {
      ...item,
      xPosition: position.x,
      yPosition: position.y
    }

    rearrangedItems.push(newItem)

    // 标记这个位置为已占用
    markOccupied(position.x, position.y, xGrid, yGrid)
  }

  return rearrangedItems
}

// 保存重新排列后的图表位置
const saveReorganizedLayout = async (reorganizedItems: DashboardItem[]) => {
  try {
    // 批量更新所有图表的位置信息
    const updatePromises = reorganizedItems.map((item) => {
      return updatePersonalDashboard({
        id: item.id,
        xGrid: item.xGrid,
        yGrid: item.yGrid,
        xPosition: item.xPosition,
        yPosition: item.yPosition
      })
    })

    await Promise.all(updatePromises)
    message.success('图表重新排列完成')
  } catch (error) {
    console.error('保存重新排列的布局失败:', error)
    message.error('重新排列失败，请重试')
  }
}

// 刷新仪表盘（包含重新排列功能）
const refreshDashboard = async () => {
  try {
    // 先重新加载数据
    await loadDashboardData()

    // 基于当前显示范围（只通用或通用+个人）进行布局重排
    const itemsToReorganize = displayedIndicators.value

    if (itemsToReorganize && itemsToReorganize.length > 0) {
      // 按顺序重新排列图表布局（仅作用于当前显示集合）
      const reorganizedItems = reorganizeChartsLayout(itemsToReorganize)

      // 保存新的布局到服务器（仅更新当前显示集合的坐标尺寸）
      await saveReorganizedLayout(reorganizedItems)

      // 再次加载数据以显示新布局
      await loadDashboardData()
    }
  } catch (error) {
    console.error('刷新仪表盘失败:', error)
    message.error('刷新失败，请重试')
  }
}

// 更新侧边栏折叠状态
const updateSidebarCollapsed = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed
}

// 更新选中的通用指标
const updateSelectedCommonIndicators = (selected: string[]) => {
  if (
    selected.length !== selectedCommonIndicators.value.length ||
    !selected.every((id) => selectedCommonIndicators.value.includes(id))
  ) {
    selectedCommonIndicators.value = selected
  }
}

// 更新选中的个人指标
const updateSelectedPersonalIndicators = (selected: string[]) => {
  if (
    selected.length !== selectedPersonalIndicators.value.length ||
    !selected.every((id) => selectedPersonalIndicators.value.includes(id))
  ) {
    selectedPersonalIndicators.value = selected
  }
}

// 打开指标配置（左下角按钮和编辑按钮使用）
const openIndicatorConfig = (config?: IndicatorNode) => {
  // 如果是新增指标（左下角按钮），打开图表配置弹窗
  if (!config) {
    currentEditData.value = null
    isEditMode.value = false
    chartConfigModalVisible.value = true
    return
  }

  // 如果是编辑指标，都打开图表配置弹窗
  // 检查是否有缓存配置来决定是否为编辑模式
  let hasConfig = false
  if (config.indicator) {
    try {
      // 尝试解析indicator配置
      const parsedConfig = typeof config.indicator === 'string'
        ? JSON.parse(config.indicator)
        : config.indicator
      hasConfig = parsedConfig && parsedConfig.firstDimension
    } catch (error) {
      console.warn('解析指标配置失败:', error)
      hasConfig = false
    }
  }

  if (hasConfig) {
    // 有缓存配置，编辑模式
    currentEditData.value = config
    isEditMode.value = true
    chartConfigModalVisible.value = true
  } else {
    // 没有缓存配置，但有指标数据，仍然是编辑模式（只是没有图表配置）
    currentEditData.value = config
    isEditMode.value = true
    chartConfigModalVisible.value = true
  }
}

// 从右侧图表编辑入口打开对应左侧指标节点
const editIndicatorFromChart = (item: DashboardItem) => {
  const node =
    findNodeById(commonIndicators.value, item.indicatorId || item.id) ||
    findNodeById(personalIndicators.value, item.indicatorId || item.id)
  if (node) {
    openIndicatorConfig(node)
  }
}

// 处理图表配置保存
const handleChartConfigSave = async (_data: any) => {
  try {
    // ChartConfigModal组件已经处理了保存逻辑和消息提示
    // 这里只需要重新加载数据以更新左侧指标树
    // 如果是新增模式，跳过选中状态更新，保持原有选中状态
    const skipSelection = !isEditMode.value
    await loadDashboardData(skipSelection)

    // 刷新外面的卡片显示（强制重新渲染）
    if (chartGridRef.value && typeof chartGridRef.value.refreshAllCharts === 'function') {
      await chartGridRef.value.refreshAllCharts()
    }
  } catch (error) {
    console.error('重新加载数据失败:', error)
    message.error('重新加载数据失败')
  }
}

// 删除指标
const deleteIndicator = async (indicatorId: string) => {
  // 在指标树中查找指标对象以确定类型
  const commonNode = findNodeInIndicatorTree(commonIndicators.value, indicatorId)
  const personalNode = findNodeInIndicatorTree(personalIndicators.value, indicatorId)

  // 根据指标类型调用对应的删除API
  if (commonNode) {
    // 通用指标
    await deleteCommonStatistic(indicatorId)
  } else if (personalNode) {
    // 个人指标
    await deletePersonalStatistic(indicatorId)
  } else {
    console.error('未找到指标:', indicatorId)
    message.error('未找到要删除的指标')
    return
  }

  await loadDashboardData()
  emit('indicator-deleted', [indicatorId])
}

// 计算新卡片的位置（确保能容纳指定大小，优先左上角）
const calculateNewCardPosition = (
  currentItems: DashboardItem[],
  cardSize: { xGrid: number; yGrid: number } = { xGrid: 2, yGrid: 2 }
): { xPosition: number; yPosition: number } => {
  // 默认网格列数
  const gridColumns = GRID_COLUMNS

  // 如果没有卡片，从位置(1,1)开始
  if (currentItems.length === 0) {
    return { xPosition: 1, yPosition: 1 }
  }

  // 创建一个网格占用情况的映射
  const occupiedCells = new Set<string>()

  // 标记已占用的单元格
  currentItems.forEach((item) => {
    const xStart = item.xPosition || 1
    const yStart = item.yPosition || 1
    const xEnd = xStart + (item.xGrid || 1) - 1
    const yEnd = yStart + (item.yGrid || 1) - 1

    for (let x = xStart; x <= xEnd; x++) {
      for (let y = yStart; y <= yEnd; y++) {
        occupiedCells.add(`${x},${y}`)
      }
    }
  })

  // 检查指定位置是否能放置指定大小的组件
  const canPlaceAt = (x: number, y: number, width: number, height: number): boolean => {
    // 检查是否超出网格边界
    if (x + width - 1 > gridColumns || x < 1 || y < 1) {
      return false
    }

    // 检查所需的所有单元格是否都空闲
    for (let checkX = x; checkX < x + width; checkX++) {
      for (let checkY = y; checkY < y + height; checkY++) {
        if (occupiedCells.has(`${checkX},${checkY}`)) {
          return false
        }
      }
    }
    return true
  }

  // 计算当前网格的实际使用范围（避免无限搜索）
  const maxUsedY = currentItems.length > 0
    ? Math.max(...currentItems.map(item => (item.yPosition || 1) + (item.yGrid || 1) - 1))
    : 1

  // 搜索范围：从第1行开始，最多搜索到当前使用范围+3行（留一些扩展空间）
  const searchMaxY = Math.min(maxUsedY + 3, 20) // 最大搜索20行，防止无限循环

  // 从上到下，从左到右寻找第一个能容纳指定大小的空位
  // 这确保了优先选择最靠近左上角的位置
  for (let y = 1; y <= searchMaxY; y++) {
    for (let x = 1; x <= gridColumns - cardSize.xGrid + 1; x++) {
      if (canPlaceAt(x, y, cardSize.xGrid, cardSize.yGrid)) {
        return { xPosition: x, yPosition: y }
      }
    }
  }

  // 如果在合理范围内找不到位置，在最底部新开一行
  const fallbackY = maxUsedY + 1
  return { xPosition: 1, yPosition: fallbackY }
}

// 处理来自指标树的dashboard添加事件
const addDashboardFromTree = async (indicatorIds: string[]) => {
  // 需要确定这些指标是通用指标还是个人指标
  const commonIndicatorIds: string[] = []
  const personalIndicatorIds: string[] = []

  // 遍历indicatorIds，判断每个指标的类型
  indicatorIds.forEach(indicatorId => {
    // 在通用指标树中查找
    const commonNode = findNodeInIndicatorTree(commonIndicators.value, indicatorId)
    if (commonNode) {
      commonIndicatorIds.push(indicatorId)
    } else {
      // 在个人指标树中查找
      const personalNode = findNodeInIndicatorTree(personalIndicators.value, indicatorId)
      if (personalNode) {
        personalIndicatorIds.push(indicatorId)
      }
    }
  })

  // 基于左侧树的 order 对两类指标分别排序，保证以“顺序”添加
  const getOrderMap = (nodes: IndicatorNode[]): Record<string, number> => {
    const map: Record<string, number> = {}
    const walk = (arr: IndicatorNode[]) => {
      arr?.forEach((n) => {
        map[String(n.id)] = Number(n.order ?? 0)
        if (n.children && n.children.length) walk(n.children)
      })
    }
    walk(nodes || [])
    return map
  }

  const commonOrderMap = getOrderMap(commonIndicators.value)
  const personalOrderMap = getOrderMap(personalIndicators.value)

  const sortedCommon = [...commonIndicatorIds].sort((a, b) => (commonOrderMap[a] ?? 0) - (commonOrderMap[b] ?? 0))
  const sortedPersonal = [...personalIndicatorIds].sort((a, b) => (personalOrderMap[a] ?? 0) - (personalOrderMap[b] ?? 0))

  // 分别处理通用指标和个人指标（已按顺序）
  if (sortedCommon.length > 0) {
    await addDashboard(sortedCommon, true) // true表示是通用指标
  }
  if (sortedPersonal.length > 0) {
    await addDashboard(sortedPersonal, false) // false表示是个人指标
  }
}

// 处理来自指标树的dashboard删除事件
const deleteDashboardFromTree = async (indicatorIds: string[]) => {
  await deleteDashboard(indicatorIds)
}

const addDashboard = async (indicatorIds: string[], isCommon = false) => {
  try {
    // 获取当前已有的仪表盘项，用于计算新卡片的位置
    let currentItems = [...dashboardItems.value]

    // 为每个indicatorId创建dashboard项
    const dashboardItemsData = indicatorIds.map((indicatorId, index) => {
      // 计算新卡片的位置（确保2x2大小）
      const cardSize = { xGrid: 2, yGrid: 2 }
      const position = calculateNewCardPosition(currentItems, cardSize)

      // 将新添加的卡片也加入到currentItems中，确保下一个卡片不会与它重叠
      const newCard: DashboardItem = {
        id: `temp_${indicatorId}_${index}`, // 临时ID，避免重复
        title: '',
        displayOrder: 0,
        commonStatistic: isCommon ? '1' : '0', // 根据指标类型设置commonStatistic
        xGrid: cardSize.xGrid,
        yGrid: cardSize.yGrid,
        xPosition: position.xPosition,
        yPosition: position.yPosition,
        show: true,
        config: {},
        statisticId: indicatorId
      } as DashboardItem

      // 立即将新卡片添加到临时数组中，确保后续卡片计算位置时能避开这个位置
      currentItems.push(newCard)

      return {
        statisticId: indicatorId,
        xGrid: cardSize.xGrid,
        yGrid: cardSize.yGrid,
        xPosition: position.xPosition,
        yPosition: position.yPosition
      }
    })

    // 调用API添加dashboard项
    if (props.useCommonDashboard) {
      await addCommonDashboard(dashboardItemsData, computedTableId.value!)
    } else {
      await addPersonalDashboard(dashboardItemsData, computedTableId.value!)
    }

    // 刷新数据
    await loadDashboardData()

    // 自动按顺序重新排列当前视图（仅作用于当前显示集合）
    try {
      const itemsToReorganize = displayedIndicators.value
      if (itemsToReorganize && itemsToReorganize.length > 0) {
        const reorganized = reorganizeChartsLayout(itemsToReorganize)
        await saveReorganizedLayout(reorganized)
        await loadDashboardData(true)
      }
    } catch (e) {
      // 兜底：布局失败不影响新增成功
      console.warn('新增后自动布局失败', e)
    }

    // 只在非初始化期间显示成功提示
    if (!isInitialLoad.value) {
      message.success(`成功添加 ${indicatorIds.length} 个组件`)
    }
    emit('indicator-added', indicatorIds)
  } catch (error) {
    console.error('添加仪表盘项失败:', error)
    message.error('添加仪表盘项失败')
  }
}

// 删除操作状态管理
const isDeletingDashboard = ref(false)

const deleteDashboard = async (indicatorIds: string[]) => {
  // 防止重复删除操作
  if (isDeletingDashboard.value) {
    return
  }

  isDeletingDashboard.value = true

  // 添加超时保护，防止状态卡死
  const timeoutId = setTimeout(() => {
    console.warn('删除操作超时，重置状态')
    isDeletingDashboard.value = false
  }, 10000) // 10秒超时

  try {
    // 获取当前dashboard项
    const currentItems = dashboardItems.value

    // 找到需要删除的dashboard项ID和对应的指标信息
    // 支持两种匹配方式：按indicatorId匹配或按dashboard的id直接匹配
    const itemsToDelete = currentItems.filter((item) => {
      return (item.indicatorId && indicatorIds.includes(item.indicatorId)) ||
        indicatorIds.includes(item.id)
    })

    const dashboardIds = itemsToDelete.map((item) => item.id)
    const indicatorIdsToRemove = itemsToDelete.map((item) => item.indicatorId).filter(Boolean)

    if (dashboardIds.length === 0) {
      console.warn('No matching dashboard items found to delete')
      message.warning('未找到要删除的图表项')
      return
    }

    // 删除每个匹配的 dashboard 项（允许部分失败）
    const deleteResults = await Promise.all(
      dashboardIds.map(async (id) => {
        try {
          const result = await deletePersonalDashboard(id)
          return { status: 'fulfilled', value: { id, success: true, result } }
        } catch (error) {
          console.error(`删除 dashboard 项 ${id} 失败:`, error)
          return { status: 'rejected', reason: { id, success: false, error } }
        }
      })
    )

    // 统计删除结果
    const successCount = deleteResults.filter(
      (r: any) => r.status === 'fulfilled' && r.value.success
    ).length

    const failureCount = deleteResults.length - successCount

    if (failureCount > 0) {
      console.warn(`${failureCount} 个 dashboard 项删除失败，${successCount} 个删除成功`)
    }

    // 立即更新本地 dashboard 数据，移除已删除的项目
    dashboardItems.value = dashboardItems.value.filter(item =>
      !dashboardIds.includes(item.id)
    )

    // 同步更新左侧指标树的选中状态
    indicatorIdsToRemove.forEach((indicatorId) => {
      if (!indicatorId) return // 过滤掉undefined值

      // 从通用指标选中列表中移除
      if (selectedCommonIndicators.value.includes(indicatorId)) {
        selectedCommonIndicators.value = selectedCommonIndicators.value.filter(id => id !== indicatorId)
      }
      // 从个人指标选中列表中移除
      if (selectedPersonalIndicators.value.includes(indicatorId)) {
        selectedPersonalIndicators.value = selectedPersonalIndicators.value.filter(id => id !== indicatorId)
      }
    })

    // 延迟重新加载数据，确保服务器端删除操作完全生效
    // 跳过选中状态更新，保持当前手动设置的状态
    setTimeout(async () => {
      try {
        await loadDashboardData(true) // 跳过选中状态更新
      } catch (error) {
        console.error('延迟重新加载数据失败:', error)
      }
    }, 1000) // 延迟1秒

    // 显示删除结果消息
    if (failureCount === 0) {
      message.success(`删除成功，共删除 ${successCount} 项`)
    } else if (successCount > 0) {
      message.warning(`部分删除成功：${successCount} 项成功，${failureCount} 项失败`)
    } else {
      message.error(`删除失败，${failureCount} 项删除失败`)
    }

    emit('indicator-deleted', indicatorIdsToRemove.filter((id): id is string => typeof id === 'string'))
  } catch (error) {
    console.error('删除仪表盘项失败:', error)
    message.error('删除仪表盘项失败')
  } finally {
    // 清理超时定时器
    clearTimeout(timeoutId)
    // 重置删除状态
    isDeletingDashboard.value = false
  }
}

// 保存右侧图表顺序
const saveDashboardOrder = async (newOrder: DashboardItem[]) => {
  try {
    // 保存每个图表的位置信息
    const updatePromises = newOrder.map((item) => {
      return updatePersonalDashboard({
        id: item.id,
        xGrid: item.xGrid,
        yGrid: item.yGrid,
        xPosition: item.xPosition,
        yPosition: item.yPosition
      })
    })
    await Promise.all(updatePromises)
  } catch (error) {
    console.error('保存图表位置失败:', error)
  }
}

// 防抖函数，避免频繁请求
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  const debounced = (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }
  return debounced
}

// 防抖后的调整大小处理函数
const debouncedResizeHandler = debounce(async (
  indicatorId: string,
  xGrid: number,
  yGrid: number
) => {
  try {
    // 保存到服务器（更新单个图表尺寸）
    await updatePersonalDashboard({ id: indicatorId, xGrid, yGrid })
    await loadDashboardData()
  } catch (error) {
    console.error('调整图表大小失败:', error)
    message.error('调整图表大小失败')
  }
}, 300) // 300ms 防抖延迟

// 防抖后的批量布局保存处理函数
const debouncedLayoutHandler = debounce(async (
  newLayout: DashboardItem[]
) => {
  try {
    // 批量更新所有受影响组件的位置和大小
    const updatePromises = newLayout.map((item) => {
      return updatePersonalDashboard({
        id: item.id,
        xGrid: item.xGrid,
        yGrid: item.yGrid,
        xPosition: item.xPosition,
        yPosition: item.yPosition
      })
    })

    await Promise.all(updatePromises)
    await loadDashboardData()

    message.success('布局调整完成')
  } catch (error) {
    console.error('保存布局失败:', error)
    message.error('保存布局失败')
  }
}, 500) // 500ms 防抖延迟，因为布局操作可能更频繁

// 处理图表调整大小
const handleResizeIndicator = (
  indicatorId: string,
  xGrid: number,
  yGrid: number
) => {
  // 使用防抖函数来处理调整大小，避免拖拽过程中的重复请求
  debouncedResizeHandler(indicatorId, xGrid, yGrid)
}

// 处理图表重新排序
const handleReorderIndicators = async (newOrder: DashboardItem[]) => {
  // 检查是否是由调整大小触发的重新布局（包含多个组件位置变化）
  const hasPositionChanges = newOrder.some((newItem, index) => {
    const oldItem = dashboardItems.value[index]
    return oldItem && (
      oldItem.xPosition !== newItem.xPosition ||
      oldItem.yPosition !== newItem.yPosition ||
      oldItem.xGrid !== newItem.xGrid ||
      oldItem.yGrid !== newItem.yGrid
    )
  })

  if (hasPositionChanges) {
    // 这是一个布局重新计算，使用防抖处理
    debouncedLayoutHandler(newOrder)
  } else {
    // 这是一个简单的拖拽重新排序，立即保存
    await saveDashboardOrder(newOrder)
    await loadDashboardData()
  }
}

// 监听tableId变化，重新加载数据
watch(() => computedTableId.value, (newTableId, oldTableId) => {
  if (newTableId && newTableId !== oldTableId) {
    // 表ID变化时重置初始化状态，防止显示成功提示
    isInitialLoad.value = true
    loadDashboardData()

    // 3秒后允许显示成功提示
    setTimeout(() => {
      isInitialLoad.value = false
    }, 3000)
  }
})

// 组件挂载
onMounted(() => {
  if (computedTableId.value) {
    loadDashboardData()
  }

  // 设置定时器，3秒后允许显示成功提示（防止页面初次加载或刷新时的误提示）
  setTimeout(() => {
    isInitialLoad.value = false
  }, 3000)
})

// 组件卸载前清理防抖定时器
onUnmounted(() => {
  debouncedResizeHandler.cancel()
  debouncedLayoutHandler.cancel()
})

// 强制重新计算布局（用于弹窗初始化后的布局调整）
const forceRecalculateLayout = () => {
  if (chartGridRef.value && typeof chartGridRef.value.forceRecalculateLayout === 'function') {
    chartGridRef.value.forceRecalculateLayout()
  }
}

// 暴露给父组件的方法
defineExpose({
  refreshDashboard,
  loadDashboardData,
  addDashboard,
  deleteDashboard,
  forceRecalculateLayout,
  dashboardItems: readonly(dashboardItems),
  loading: readonly(loading)
})
</script>

<style lang="less" scoped>
.talent-review-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e8e8e8;

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #262626;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .dashboard-main {
    flex: 1;
    display: flex;
    overflow: hidden;

    .dashboard-content {
      flex: 1;
      overflow: auto;
      padding: 16px;

      &.full-width {
        // 当不显示指标树时，图表区域占满整个宽度
        width: 100%;
      }
    }
  }
}
</style>
