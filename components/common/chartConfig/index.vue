<template>
  <div class="talent-review-dashboard">
    <!-- 页面头部 -->
    <div
      v-if="showHeader"
      class="dashboard-header"
    >
      <h1 v-if="title !== ''">
        {{ title || currentRoute.meta.title }}
      </h1>
      <div class="header-actions">
        <slot name="header-actions">
          <a-button
            type="primary"
            :loading="headerRefreshing"
            @click="handleRefreshDataOnly"
          >
            <ReloadOutlined />
            刷新数据
          </a-button>
          <a-button
            :loading="headerRearranging"
            @click="handleRearrangeChartsOnly"
          >
            <AppstoreOutlined />
            重新排列
          </a-button>
          <a-button @click="openPermManager">
            权限配置
          </a-button>
          <a-button
            :loading="headerColorNormalizing"
            @click="handleColorNormalize"
          >
            <BgColorsOutlined />
            颜色规整
          </a-button>
          <a-button
            :loading="headerSelectingAll"
            @click="handleSelectAll"
          >
            <CheckOutlined />
            选中所有
          </a-button>
          <a-dropdown>
            <a-button>
              <CopyOutlined />
              {{ batchSelectedIndicators.length > 0 ? `批量操作(${batchSelectedIndicators.length})` : '批量操作' }}
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item
                  key="copy"
                  :disabled="batchSelectedIndicators.length === 0 || batchCopying"
                  @click="handleBatchCopy"
                >
                  <CopyOutlined /> 复制选中
                </a-menu-item>
                <a-menu-item
                  key="edit"
                  :disabled="batchSelectedIndicators.length === 0"
                  @click="batchEditModalVisible = true"
                >
                  <EditOutlined /> 批量编辑
                </a-menu-item>
                <a-menu-item
                  key="colorNormalize"
                  :disabled="batchSelectedIndicators.length === 0 || batchColorNormalizing"
                  @click="handleBatchColorNormalize"
                >
                  <BgColorsOutlined /> 颜色规整选中
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item
                  key="delete"
                  danger
                  :disabled="batchSelectedIndicators.length === 0 || batchDeleting"
                  @click="handleBatchDelete"
                >
                  <DeleteOutlined /> 批量删除
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button
            danger
            :loading="headerClosingAll"
            @click="handleCloseAll"
          >
            <CloseOutlined />
            关闭所有
          </a-button>
        </slot>
      </div>
    </div>

    <!-- 页面主体 -->
    <div class="dashboard-main">
      <!-- 左侧指标树 -->
      <indicator-tree
        v-if="showIndicatorTree"
        ref="indicatorTreeRef"
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
        @add-indicator="handleAddIndicator"
        @edit-indicator="handleEditIndicator"
        @copy-indicator="handleCopyIndicator"
        @delete-indicator="deleteIndicator"
        @add-dashboard="addDashboardFromTree"
        @delete-dashboard="deleteDashboardFromTree"
        @reload-data="loadDashboardData"
        @node-title-click="handleNodeTitleClick"
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
          :portal-config="portalConfig"
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
      :parent-node="currentParentNode"
      :is-edit-mode="isEditMode"
      :is-common-indicator="!showPersonalIndicators"
      @save="handleChartConfigSave"
    />

    <!-- 资源权限配置弹窗 -->
    <ResourcePermManager
      v-model:visible="permVisible"
      :resource-type="permResourceType"
      :resources="permResources"
      :field-names="{ id: 'id', name: 'title', children: 'children' }"
    />

    <!-- 批量编辑弹窗 -->
    <BatchEditModal
      v-model:open="batchEditModalVisible"
      :selected-indicators="batchSelectedIndicators"
      :is-common-indicator="!showPersonalIndicators"
      @applied="handleBatchEditApplied"
    />
  </div>
</template>

<script lang="ts" setup>
import { AppstoreOutlined, BgColorsOutlined, CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, readonly, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  addCommonDashboard,
  addPersonalDashboard,
  addCommonStatistic,
  addPersonalStatistic,
  deleteCommonStatistic,
  deletePersonalDashboard,
  deletePersonalStatistic,
  getCommonDashboard,
  getCommonStatistic,
  getPersonalDashboard,
  getPersonalStatistic,
  updateCommonStatistic,
  updatePersonalDashboard,
  updatePersonalStatistic
} from './api'
import { debounce } from './debounce'
import { collectLeaves, findNodeById, findNodeByIdOrKey as findNodeInIndicatorTree, getParentNodeKeys } from './treeUtils'
import type { DashboardItem, IndicatorNode } from './types'

import { getPortalConfig } from '@/framework/apis/portal/config'
import { getIndicatorConfig, updateEntityListSelective } from '@/framework/apis/portal'
import BatchEditModal from '@/framework/components/common/chartConfig/BatchEditModal.vue'
import ChartConfigModal from '@/framework/components/common/chartConfig/ChartConfigModal.vue'
import ChartGrid from '@/framework/components/common/chartConfig/ChartGrid.vue'
import IndicatorTree from '@/framework/components/common/chartConfig/IndicatorTree.vue'
import ResourcePermManager from '@/framework/components/common/ResourcePerm/ResourcePermManager.vue'
import { useResourcePerm } from '@/framework/components/common/ResourcePerm/useResourcePerm'
import { getNameHashColor } from '@/framework/utils/colorUtils'


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
const GRID_COLUMNS = 12

// 页面状态
const loading = ref(false)
const sidebarCollapsed = ref(false)
const isInitialLoad = ref(true) // 页面初始化标志，用于防止初次加载时显示成功提示

// Portal配置缓存
const portalConfig = ref<any>(null)

// 组件引用
const chartGridRef = ref()
const indicatorTreeRef = ref()

// 图表配置弹窗状态
const chartConfigModalVisible = ref(false)
const currentEditData = ref<IndicatorNode | null>(null)
const currentParentNode = ref<IndicatorNode | null>(null) // 父节点（用于添加子节点）
const isEditMode = ref(false)

// 资源权限弹窗状态
const { permVisible, permResourceType, permResources, openPerm } = useResourcePerm()

// 批量操作状态
const batchEditModalVisible = ref(false)
const batchCopying = ref(false)
const batchDeleting = ref(false)

// 批量选中的指标（基于左侧树勾选状态）
const batchSelectedIndicators = computed<IndicatorNode[]>(() => {
  // 合并通用指标和个人指标中勾选的叶子节点
  const pickSelectedLeaves = (nodes: IndicatorNode[], selectedIds: string[]): IndicatorNode[] =>
    collectLeaves(nodes).filter(node => selectedIds.includes(node.id))

  const commonSelected = pickSelectedLeaves(commonIndicators.value, selectedCommonIndicators.value)
  const personalSelected = pickSelectedLeaves(personalIndicators.value, selectedPersonalIndicators.value)
  return [...commonSelected, ...personalSelected]
})

// 批量复制
const handleBatchCopy = async () => {
  const selectedNodes = batchSelectedIndicators.value
  if (selectedNodes.length === 0) {
    message.warning('请先在左侧树中勾选要复制的指标')
    return
  }

  batchCopying.value = true
  try {
    let successCount = 0

    for (const indicatorNode of selectedNodes) {
      // 复制指标配置，创建新指标
      const isCommon = !props.showPersonalIndicators || props.useCommonDashboard
      const newIndicatorData: Partial<IndicatorNode> = {
        title: `${indicatorNode.title} - 副本`,
        subTitle: indicatorNode.subTitle || '',
        description: indicatorNode.description || '',
        tableId: computedTableId.value,
        pid: indicatorNode.pid || '',
        order: (indicatorNode.order || 0) + 1,
        show: true,
        indicator: indicatorNode.indicator
          ? (typeof indicatorNode.indicator === 'string'
            ? indicatorNode.indicator
            : JSON.stringify(indicatorNode.indicator))
          : ''
      }

      // 创建新指标
      let newIndicatorId: string
      if (isCommon) {
        const resp = await addCommonStatistic(newIndicatorData)
        newIndicatorId = resp?.payload?.id || resp?.payload
      } else {
        const resp = await addPersonalStatistic(newIndicatorData)
        newIndicatorId = resp?.payload?.id || resp?.payload
      }

      if (newIndicatorId) {
        // 将新指标添加到dashboard
        const cardSize = { xGrid: indicatorNode.defaultXGrid || 2, yGrid: indicatorNode.defaultYGrid || 2 }
        const currentItems = [...dashboardItems.value]
        const position = calculateNewCardPosition(currentItems, cardSize)

        const dashboardData = [{
          statisticId: String(newIndicatorId),
          xGrid: cardSize.xGrid,
          yGrid: cardSize.yGrid,
          xPosition: position.xPosition,
          yPosition: position.yPosition
        }]

        if (props.useCommonDashboard) {
          await addCommonDashboard(dashboardData, computedTableId.value!)
        } else {
          await addPersonalDashboard(dashboardData, computedTableId.value!)
        }
        successCount++
      }
    }

    // 刷新数据
    await loadDashboardData()

    // 自动重新排列
    try {
      const itemsToReorganize = displayedIndicators.value
      if (itemsToReorganize && itemsToReorganize.length > 0) {
        const reorganized = reorganizeChartsLayout(itemsToReorganize)
        await saveReorganizedLayout(reorganized)
        await loadDashboardData(true)
      }
    } catch (e) {
      console.warn('复制后自动布局失败', e)
    }

    message.success(`成功复制 ${successCount} 个指标`)
  } catch (error) {
    console.error('批量复制失败:', error)
    message.error('批量复制失败，请重试')
  } finally {
    batchCopying.value = false
  }
}

// 批量删除
const handleBatchDelete = () => {
  const selectedNodes = batchSelectedIndicators.value
  if (selectedNodes.length === 0) {
    message.warning('请先在左侧树中勾选要删除的指标')
    return
  }

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除勾选的 ${selectedNodes.length} 个指标及其图表吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      batchDeleting.value = true
      try {
        // 删除指标节点本身（左侧树）
        for (const node of selectedNodes) {
          const isCommon = !!findNodeInIndicatorTree(commonIndicators.value, node.id)
          if (isCommon) {
            await deleteCommonStatistic(node.id)
          } else {
            await deletePersonalStatistic(node.id)
          }
        }
        // 刷新数据（左侧树 + 右侧图表）
        await loadDashboardData()
        message.success(`成功删除 ${selectedNodes.length} 个指标`)
      } catch (error) {
        console.error('批量删除失败:', error)
        message.error('批量删除失败，请重试')
      } finally {
        batchDeleting.value = false
      }
    }
  })
}

// 批量编辑完成后的回调
const handleBatchEditApplied = async () => {
  // 重新加载数据并刷新图表
  await loadDashboardData(true)
  if (chartGridRef.value && typeof chartGridRef.value.refreshAllCharts === 'function') {
    await chartGridRef.value.refreshAllCharts()
  }
}

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
    return dashboardItems.value.filter(item => item.commonStatistic === '1')
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

// 工具函数（findNodeInIndicatorTree/findNodeById/getParentNodeKeys）已提取至 ./treeUtils

// 加载仪表盘数据
const loadDashboardData = async (skipSelectionUpdate = false) => {
  const tableId = computedTableId.value
  if (!tableId) {
    console.warn('tableId为空，无法加载仪表盘数据')
    return
  }

  try {
    loading.value = true

    // 并行加载通用/个人指标树、个人 dashboard 配置和 Portal 配置
    const [commonResp, personalResp, dashboardResp, configResp] = await Promise.all([
      getCommonStatistic(tableId),
      getPersonalStatistic(tableId),
      props.useCommonDashboard ? getCommonDashboard(tableId) : getPersonalDashboard(tableId),
      getPortalConfig(tableId).catch(err => {
        console.error(`加载 Portal 配置失败:`, err)
        return null
      })
    ])

    // 保存 Portal 配置
    if (configResp?.payload) {
      portalConfig.value = configResp.payload
      portalConfig.value.tableId = tableId
    }

    // 映射字段名：数据库使用 snake_case，前端使用 camelCase
    const mapIndicatorFields = (indicators: any[]): IndicatorNode[] => {
      return indicators.map((ind: any) => ({
        ...ind,
        defaultXGrid: ind.defaultXGrid ?? ind.default_x_grid ?? undefined,
        defaultYGrid: ind.defaultYGrid ?? ind.default_y_grid ?? undefined
      }))
    }

    commonIndicators.value = mapIndicatorFields(commonResp.payload || [])
    personalIndicators.value = mapIndicatorFields(personalResp.payload || [])

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

        return {
          id: d.id,
          title: d.title ?? '',
          subTitle: d.subTitle ?? '',
          description: d.description ?? '',
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

// 头部按钮 loading 状态
const headerRefreshing = ref(false)
const headerRearranging = ref(false)

// 只刷新数据（不重新排列）
const refreshDataOnly = async () => {
  try {
    await loadDashboardData()
    message.success('数据刷新完成')
  } catch (error) {
    console.error('刷新数据失败:', error)
    message.error('刷新数据失败，请重试')
  }
}

// 只重新排列图表（不刷新数据）
const rearrangeChartsOnly = async () => {
  try {
    // 基于当前显示范围（只通用或通用+个人）进行布局重排
    const itemsToReorganize = displayedIndicators.value

    if (itemsToReorganize && itemsToReorganize.length > 0) {
      // 按顺序重新排列图表布局（仅作用于当前显示集合）
      const reorganizedItems = reorganizeChartsLayout(itemsToReorganize)

      // 保存新的布局到服务器（仅更新当前显示集合的坐标尺寸）
      await saveReorganizedLayout(reorganizedItems)

      // 再次加载数据以显示新布局
      await loadDashboardData()
    } else {
      message.warning('暂无图表需要排列')
    }
  } catch (error) {
    console.error('重新排列失败:', error)
    message.error('重新排列失败，请重试')
  }
}

// 头部按钮 handler（带 loading）
const handleRefreshDataOnly = async () => {
  headerRefreshing.value = true
  try { await refreshDataOnly() } finally { headerRefreshing.value = false }
}
const handleRearrangeChartsOnly = async () => {
  headerRearranging.value = true
  try { await rearrangeChartsOnly() } finally { headerRearranging.value = false }
}

// 关闭所有图表
const headerClosingAll = ref(false)
const handleCloseAll = () => {
  const items = displayedIndicators.value
  if (!items || items.length === 0) {
    message.warning('暂无图表可关闭')
    return
  }
  Modal.confirm({
    title: '确认关闭所有',
    content: `确定要关闭全部 ${items.length} 个图表吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      headerClosingAll.value = true
      try {
        const indicatorIds = items.map(item => item.indicatorId).filter(Boolean) as string[]
        await deleteDashboard(indicatorIds)
      } finally {
        headerClosingAll.value = false
      }
    }
  })
}

// 一次性颜色初始化规整：为未配色的指标项按名称哈希回写颜色，并用指标颜色重写存量图表的 itemColors
const headerColorNormalizing = ref(false)

const doColorNormalize = async (scopeNodes?: IndicatorNode[]) => {
  const tableId = computedTableId.value
  if (!tableId) {
    message.warning('tableId为空，无法执行颜色规整')
    return
  }

  // 1. 拉取指标组树，递归收集所有带指标项的分组
  const resp = await getIndicatorConfig(tableId)
  const groups: any[] = []
  const walkGroups = (nodes: any[]) => {
    if (!Array.isArray(nodes)) return
    nodes.forEach((node: any) => {
      if (Array.isArray(node?.items) && node.items.length > 0) groups.push(node)
      if (Array.isArray(node?.children) && node.children.length > 0) walkGroups(node.children)
    })
  }
  walkGroups(resp?.payload || [])

  // 2. 未配置颜色的指标项按名称哈希生成默认色，批量回写 sys_portal_indicator（已手配的保留）
  const indicatorUpdates: Array<{ id: string; color: string }> = []
  groups.forEach((group: any) => {
    group.items.forEach((item: any) => {
      if (!item.color) {
        item.color = getNameHashColor(item.title)
        if (item.id) indicatorUpdates.push({ id: String(item.id), color: item.color })
      }
    })
  })
  if (indicatorUpdates.length > 0) {
    await updateEntityListSelective('portal/indicator', indicatorUpdates, undefined, false, false)
  }

  // 3. 构建 groupValue -> itemValue -> color 映射，供存量图表配置取色
  const groupColorMap: Record<string, Record<string, string>> = {}
  groups.forEach((group: any) => {
    const itemMap: Record<string, string> = groupColorMap[String(group.key)] || {}
    group.items.forEach((item: any) => {
      itemMap[String(item.key)] = item.color
    })
    groupColorMap[String(group.key)] = itemMap
  })

  // 4. 遍历存量图表配置，放弃现有颜色，按二级维度优先规则用指标颜色重写 dataMetrics[].itemColors
  let chartUpdated = 0
  let chartFailed = 0
  const normalizeNode = async (node: IndicatorNode, isCommon: boolean) => {
    if (!node.indicator) return
    let config: any
    try {
      config = typeof node.indicator === 'string' ? JSON.parse(node.indicator) : JSON.parse(JSON.stringify(node.indicator))
    } catch (e) {
      console.warn(`指标 ${node.title} 配置解析失败，跳过颜色规整`, e)
      return
    }

    // 二级维度优先，其次一级维度；无维度项（如树形堆叠）或无数据指标的跳过
    const dimension = (config?.secondDimension?.indicatorItems?.length ? config.secondDimension : null) ||
      (config?.firstDimension?.indicatorItems?.length ? config.firstDimension : null)
    if (!dimension || !Array.isArray(config?.dataMetrics) || config.dataMetrics.length === 0) return

    const itemMap = groupColorMap[String(dimension.groupValue)] || {}
    const itemColors: Record<string, string> = {}
    dimension.indicatorItems.forEach((item: any) => {
      itemColors[String(item.itemValue)] = itemMap[String(item.itemValue)] || getNameHashColor(item.itemName)
    })
    config.dataMetrics.forEach((metric: any) => {
      metric.itemColors = { ...itemColors }
    })

    try {
      const updateData = { id: node.id, indicator: JSON.stringify(config) }
      if (isCommon) {
        await updateCommonStatistic(updateData)
      } else {
        await updatePersonalStatistic(updateData)
      }
      chartUpdated++
    } catch (err) {
      console.error(`规整指标 ${node.title} 颜色失败:`, err)
      chartFailed++
    }
  }

  // 规整目标：传入 scopeNodes 时仅规整指定图表（批量操作），否则全量
  const commonLeafIds = new Set(collectLeaves(commonIndicators.value).map(node => node.id))
  let targets: Array<{ node: IndicatorNode; isCommon: boolean }>
  if (scopeNodes && scopeNodes.length > 0) {
    targets = scopeNodes.map(node => ({ node, isCommon: commonLeafIds.has(node.id) }))
  } else {
    targets = collectLeaves(commonIndicators.value).map(node => ({ node, isCommon: true }))
    if (props.showPersonalIndicators && !props.useCommonDashboard) {
      targets.push(...collectLeaves(personalIndicators.value).map(node => ({ node, isCommon: false })))
    }
  }
  for (const { node, isCommon } of targets) {
    await normalizeNode(node, isCommon)
  }

  // 5. 刷新数据并重新渲染图表
  await loadDashboardData(true)
  if (chartGridRef.value && typeof chartGridRef.value.refreshAllCharts === 'function') {
    await chartGridRef.value.refreshAllCharts()
  }

  if (chartFailed > 0) {
    message.warning(`颜色规整完成：回写指标颜色 ${indicatorUpdates.length} 项，规整图表 ${chartUpdated} 个，失败 ${chartFailed} 个`)
  } else {
    message.success(`颜色规整完成：回写指标颜色 ${indicatorUpdates.length} 项，规整图表 ${chartUpdated} 个`)
  }
}

const handleColorNormalize = () => {
  Modal.confirm({
    title: '确认颜色规整',
    content: '将为未配置颜色的指标项按名称生成默认颜色，并将所有图表的维度颜色统一替换为指标配置的颜色（图表现有颜色将被覆盖），是否继续？',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      headerColorNormalizing.value = true
      try {
        await doColorNormalize()
      } catch (error) {
        console.error('颜色规整失败:', error)
        message.error('颜色规整失败，请重试')
      } finally {
        headerColorNormalizing.value = false
      }
    }
  })
}

// 批量操作：仅规整左侧勾选的图表颜色
const batchColorNormalizing = ref(false)
const handleBatchColorNormalize = () => {
  const selectedNodes = batchSelectedIndicators.value
  if (selectedNodes.length === 0) {
    message.warning('请先在左侧树中勾选要规整颜色的指标')
    return
  }
  Modal.confirm({
    title: '确认颜色规整',
    content: `将把勾选的 ${selectedNodes.length} 个图表的维度颜色统一替换为指标配置的颜色（图表现有颜色将被覆盖），是否继续？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      batchColorNormalizing.value = true
      try {
        await doColorNormalize(selectedNodes)
      } catch (error) {
        console.error('颜色规整失败:', error)
        message.error('颜色规整失败，请重试')
      } finally {
        batchColorNormalizing.value = false
      }
    }
  })
}

// 选中所有（左侧树筛选后的全部叶子指标一键打开）
const headerSelectingAll = ref(false)
const handleSelectAll = async () => {
  // 获取左侧树筛选后的所有叶子指标ID
  const filteredIds: string[] = indicatorTreeRef.value?.getFilteredLeafIndicatorIds?.() ?? []
  if (filteredIds.length === 0) {
    message.warning('左侧指标树无可打开的指标')
    return
  }

  // 排除已经在仪表盘上显示的指标，避免重复添加
  const existingIds = new Set(
    dashboardItems.value.map(item => item.indicatorId).filter(Boolean)
  )
  const idsToAdd = filteredIds.filter(id => !existingIds.has(id))

  if (idsToAdd.length === 0) {
    message.info('所有指标均已在仪表盘中显示')
    return
  }

  headerSelectingAll.value = true
  try {
    await addDashboardFromTree(idsToAdd)
  } finally {
    headerSelectingAll.value = false
  }
}

// 更新侧边栏折叠状态
const updateSidebarCollapsed = (collapsed: boolean) => {
  sidebarCollapsed.value = collapsed
}

// 处理节点标题点击，滚动到对应的图表
const handleNodeTitleClick = (indicatorId: string) => {
  // 在当前显示的仪表盘项中查找对应的图表
  const targetChart = displayedIndicators.value.find(
    item => String(item.indicatorId) === String(indicatorId)
  )

  if (!targetChart) {
    console.warn('未找到对应的图表，indicatorId:', indicatorId)
    return
  }

  // 使用 nextTick 确保 DOM 已更新
  setTimeout(() => {
    // 通过图表的 id 来定位 DOM 元素
    const chartElement = document.querySelector(`[data-chart-id="${targetChart.id}"]`)

    if (chartElement) {
      // 滚动到图表位置
      chartElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })

      // 添加高亮效果
      chartElement.classList.add('chart-highlight')
      setTimeout(() => {
        chartElement.classList.remove('chart-highlight')
      }, 2000)
    } else {
      console.warn('未找到图表 DOM 元素，chartId:', targetChart.id)
    }
  }, 100)
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

// 处理添加指标事件（可能是添加根节点或添加子节点）
const handleAddIndicator = (parentNode?: IndicatorNode) => {
  if (parentNode) {
    // 有父节点，说明是添加子节点
    openIndicatorConfig(parentNode, true)
  } else {
    // 没有父节点，说明是添加根节点
    openIndicatorConfig()
  }
}

// 处理复制指标事件
const handleCopyIndicator = (indicator: IndicatorNode) => {
  // 使用编辑模式打开配置弹窗，但是设置为新增模式
  currentEditData.value = indicator
  currentParentNode.value = null
  isEditMode.value = false // 设置为新增模式，这样保存时会创建新的图表
  chartConfigModalVisible.value = true
}

// 处理编辑指标事件
const handleEditIndicator = (indicator: IndicatorNode) => {
  openIndicatorConfig(indicator, false)
}

// 打开权限配置弹窗（传入全部通用指标原始数据 + fieldNames）
const openPermManager = () => {
  openPerm('sys_portal_dashboard_statistic', commonIndicators.value)
}

// 打开指标配置（左下角按钮和编辑按钮使用）
// parentNode参数：如果传入，表示要为该节点添加子节点
const openIndicatorConfig = (parentOrConfig?: IndicatorNode, isAddingChild = false) => {
  // 重置父节点状态
  currentParentNode.value = null

  // 如果是新增指标（左下角按钮），打开图表配置弹窗
  if (!parentOrConfig) {
    currentEditData.value = null
    isEditMode.value = false
    chartConfigModalVisible.value = true
    return
  }

  // 如果明确标记为添加子节点
  if (isAddingChild) {
    // 这是添加子节点的情况，parentOrConfig是父节点
    currentParentNode.value = parentOrConfig
    currentEditData.value = null
    isEditMode.value = false
    chartConfigModalVisible.value = true
    return
  }

  // 否则是编辑指标的情况
  const config = parentOrConfig
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

// 从指标树中获取指标的默认尺寸
const getIndicatorDefaultSize = (indicatorId: string): { xGrid: number; yGrid: number } => {
  // 先在通用指标中查找
  const commonNode = findNodeById(commonIndicators.value, indicatorId)
  if (commonNode) {
    if (commonNode.defaultXGrid && commonNode.defaultYGrid) {
      return { xGrid: commonNode.defaultXGrid, yGrid: commonNode.defaultYGrid }
    }
  }

  // 再在个人指标中查找
  const personalNode = findNodeById(personalIndicators.value, indicatorId)
  if (personalNode) {
    if (personalNode.defaultXGrid && personalNode.defaultYGrid) {
      return { xGrid: personalNode.defaultXGrid, yGrid: personalNode.defaultYGrid }
    }
  }

  // 默认返回 2x2
  return { xGrid: 2, yGrid: 2 }
}

// 更新指标的默认尺寸到数据库
const updateIndicatorDefaultSize = async (indicatorId: string, xGrid: number, yGrid: number) => {
  try {
    // 判断是通用指标还是个人指标
    const isCommon = !!findNodeById(commonIndicators.value, indicatorId)

    // 调用对应的更新API保存到服务器
    if (isCommon) {
      await updateCommonStatistic({
        id: indicatorId,
        defaultXGrid: xGrid,
        defaultYGrid: yGrid
      })
    } else {
      await updatePersonalStatistic({
        id: indicatorId,
        defaultXGrid: xGrid,
        defaultYGrid: yGrid
      })
    }
  } catch (error) {
    console.error('更新指标默认尺寸失败:', error)
  }
}

const addDashboard = async (indicatorIds: string[], isCommon = false) => {
  try {
    // 获取当前已有的仪表盘项，用于计算新卡片的位置
    let currentItems = [...dashboardItems.value]

    // 为每个indicatorId创建dashboard项
    const dashboardItemsData = indicatorIds.map((indicatorId, index) => {
      // 从指标配置中获取用户自定义的默认尺寸
      const cardSize = getIndicatorDefaultSize(indicatorId)

      // 计算新卡片的位置（使用用户自定义的尺寸）
      const position = calculateNewCardPosition(currentItems, cardSize)

      // 将新添加的卡片也加入到currentItems中，确保下一个卡片不会与它重叠
      const newCard: DashboardItem = {
        id: `temp_${indicatorId}_${index}`, // 临时ID，避免重复
        title: '',
        subTitle: '',
        description: '',
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

    // 调用API添加dashboard项（会保存到服务器）
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

    // 在删除前，将当前尺寸保存到指标的默认尺寸中（用于之后恢复）
    const updatePromises = itemsToDelete
      .filter(item => item.indicatorId)
      .map(item =>
        updateIndicatorDefaultSize(
          item.indicatorId!,
          item.xGrid || 2,
          item.yGrid || 2
        )
      )

    // 等待所有尺寸更新完成
    await Promise.all(updatePromises)

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

// 防抖后的调整大小处理函数
const debouncedResizeHandler = debounce(async (
  indicatorId: string,
  xGrid: number,
  yGrid: number
) => {
  try {
    // 找到对应的卡片，获取其 indicatorId（统计指标ID）
    const dashboardItem = dashboardItems.value.find(item => item.id === indicatorId)

    if (dashboardItem && dashboardItem.indicatorId) {
      // 更新指标的默认尺寸到数据库
      await updateIndicatorDefaultSize(dashboardItem.indicatorId, xGrid, yGrid)
    }

    // 保存到服务器（更新当前 dashboard 项的尺寸）
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

// 配置变更后的完整刷新：重载指标树+仪表盘数据，并强制刷新图表卡片（不重排布局）
const refreshAfterConfigChange = async () => {
  await loadDashboardData(true)
  if (chartGridRef.value && typeof chartGridRef.value.refreshAllCharts === 'function') {
    await chartGridRef.value.refreshAllCharts()
  }
}

// 暴露给父组件的方法
defineExpose({
  refreshDashboard,
  refreshDataOnly,
  rearrangeChartsOnly,
  loadDashboardData,
  addDashboard,
  deleteDashboard,
  forceRecalculateLayout,
  refreshAfterConfigChange,
  openPermManager,
  dashboardItems: readonly(dashboardItems),
  loading: readonly(loading)
})
</script>

<style lang="less" scoped>
.talent-review-dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
      margin-left: auto;
    }
  }

  .dashboard-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;

    .dashboard-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      scroll-behavior: smooth;

      // 自定义滚动条样式
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f5f5f5;
      }

      &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;

        &:hover {
          background: #bfbfbf;
        }
      }

      // 图表高亮效果
      :deep(.chart-highlight) {
        animation: highlight-pulse 0.6s ease-in-out;
        box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.3) !important;
        transform: scale(1.02);
        transition: all 0.3s ease;
      }

      @keyframes highlight-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.7);
        }

        50% {
          box-shadow: 0 0 0 10px rgba(24, 144, 255, 0.3);
        }

        100% {
          box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.3);
        }
      }

      &.full-width {
        // 当不显示指标树时，图表区域占满整个宽度
        width: 100%;
      }
    }
  }
}
</style>
