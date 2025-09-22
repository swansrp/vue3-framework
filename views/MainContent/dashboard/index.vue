<template>
  <div class="personal-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <h1>{{ currentRoute.meta.title }}</h1>
      <div class="header-actions">
        <a-button @click="refreshDashboard" type="primary">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 页面主体 -->
    <div class="dashboard-main">
      <!-- 左侧指标树 -->
      <indicator-tree
        :collapsed="sidebarCollapsed" :common-indicators="commonIndicators"
        :expanded-common-keys="expandedCommonKeys" :expanded-personal-keys="expandedPersonalKeys"
        :personal-indicators="personalIndicators" :selected-common-indicators="selectedCommonIndicators"
        :selected-personal-indicators="selectedPersonalIndicators" @update:collapsed="updateSidebarCollapsed"
        @update:selected-common="updateSelectedCommonIndicators"
        @update:selected-personal="updateSelectedPersonalIndicators" @add-indicator="openIndicatorConfig"
        @edit-indicator="openIndicatorConfig" @delete-indicator="deleteIndicator" @add-dashboard="addDashboard"
        @delete-dashboard="deleteDashboard" @reload-data="loadDashboardData" />

      <!-- 主体图表区域 -->
      <div class="dashboard-content">
        <chart-grid
          :indicators="displayedIndicators" :loading="loading" @add-indicator="addDashboard"
          @edit-indicator="editIndicatorFromChart" @delete-indicator="deleteDashboard"
          @resize-indicator="handleResizeIndicator" @reorder-indicators="handleReorderIndicators" />
      </div>
    </div>

    <!-- 图表配置弹窗 -->
    <chart-config-modal
      v-model:visible="chartConfigModalVisible" :table-id="tableId" :edit-data="currentEditData"
      :is-edit-mode="isEditMode" @save="handleChartConfigSave" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import IndicatorTree from './components/IndicatorTree.vue'
import ChartGrid from './components/ChartGrid.vue'
import ChartConfigModal from './components/ChartConfigModal.vue'
import {
  addPersonalDashboard,
  deletePersonalDashboard,
  deletePersonalStatistic,
  getCommonStatistic,
  getPersonalDashboard,
  getPersonalStatistic,
  updatePersonalDashboard
} from './api'
import type { DashboardItem, IndicatorNode } from './types'

// 路由参数
const { currentRoute } = useRouter()
const route = currentRoute.value
const tableId = computed(
    () =>
        (route.query
            ? route.query.tableId
                ? route.query.tableId
                : undefined
            : undefined) as string
)

// 页面状态
const loading = ref(false)
const sidebarCollapsed = ref(false)

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
  return dashboardItems.value
})
// 右侧图表项
const dashboardItems = ref<DashboardItem[]>([])

// 工具：根据 id 在树中查找节点
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
const loadDashboardData = async () => {
  try {
    loading.value = true

    // 并行加载通用/个人指标树与个人 dashboard 配置
    const [commonResp, personalResp, dashboardResp] = await Promise.all([
      getCommonStatistic(tableId.value),
      getPersonalStatistic(tableId.value),
      getPersonalDashboard(tableId.value)
    ])

    commonIndicators.value = commonResp.payload || []
    personalIndicators.value = personalResp.payload || []

    // 以 getDashboard 的顺序与大小为准，根据实际接口返回格式映射
    const dashboardItemsData = (dashboardResp.payload || [])
        .map((d: any) => {
          const item = {
            id: d.id,
            title: d.title ?? '',
            displayOrder: Number(d.order ?? 0),
            xGrid: Number(d.xGrid ?? d.xgrid ?? 2),
            yGrid: Number(d.yGrid ?? d.ygrid ?? 2),
            xPosition: Number(d.xPosition ?? d.xposition ?? 1),
            yPosition: Number(d.yPosition ?? d.yposition ?? 1),
            show: true, // 默认显示
            commonStatistic: d.commonStatistic,
            config: {
              tableId: tableId.value,
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

    const personalIds = dashboardItemsData
        .filter((item: DashboardItem) => item.commonStatistic !== '1')
        .map((item: DashboardItem) => item.indicatorId)

    // 更新选中的指标，只选中实际存在于dashboard中的指标
    selectedCommonIndicators.value = commonIds
    selectedPersonalIndicators.value = personalIds

    // 获取需要展开的节点keys
    const commonExpandedKeys = new Set<string>()
    const personalExpandedKeys = new Set<string>()

    // 为通用指标添加展开的节点
    commonIds.forEach((id: string) => {
      const parentKeys: string[] = getParentNodeKeys(commonIndicators.value, id)
      parentKeys.forEach((key: string) => commonExpandedKeys.add(key))
    })

    // 为个人指标添加展开的节点
    personalIds.forEach((id: string) => {
      const parentKeys: string[] = getParentNodeKeys(personalIndicators.value, id)
      parentKeys.forEach((key: string) => personalExpandedKeys.add(key))
    })

    // 更新展开的节点keys
    expandedCommonKeys.value = Array.from(commonExpandedKeys)
    expandedPersonalKeys.value = Array.from(personalExpandedKeys)
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    message.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 刷新仪表盘
const refreshDashboard = () => {
  loadDashboardData()
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
    await loadDashboardData()
  } catch (error) {
    console.error('重新加载数据失败:', error)
    message.error('重新加载数据失败')
  }
}

// 删除指标
const deleteIndicator = async (indicatorId: string) => {
  await deletePersonalStatistic(indicatorId)
  await loadDashboardData()
}

// 计算新卡片的位置（确保能容纳2x2大小）
const calculateNewCardPosition = (
    currentItems: DashboardItem[],
    cardSize: { xGrid: number; yGrid: number } = { xGrid: 2, yGrid: 2 }
): { xPosition: number; yPosition: number } => {
  // 默认网格列数
  const gridColumns = 7

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

  // 从左到右，从上到下寻找第一个能容纳指定大小的空位
  let y = 1
  while (y <= 100) { // 限制搜索范围防止无限循环
    for (let x = 1; x <= gridColumns - cardSize.xGrid + 1; x++) {
      if (canPlaceAt(x, y, cardSize.xGrid, cardSize.yGrid)) {
        return { xPosition: x, yPosition: y }
      }
    }
    y++
  }

  // 如果找不到合适的位置，放在最底部（所有现有组件下方）
  const maxY = Math.max(
      ...currentItems.map(item => (item.yPosition || 1) + (item.yGrid || 1) - 1),
      0
  )
  return { xPosition: 1, yPosition: maxY + 1 }
}

const addDashboard = async (indicatorIds: string[]) => {
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
        commonStatistic: '',
        xGrid: cardSize.xGrid,
        yGrid: cardSize.yGrid,
        xPosition: position.xPosition,
        yPosition: position.yPosition,
        show: true,
        config: {},
        statisticId: indicatorId
      } as DashboardItem

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
    await addPersonalDashboard(dashboardItemsData, tableId.value)

    // 刷新数据
    await loadDashboardData()

    message.success(`成功添加 ${indicatorIds.length} 个组件，默认大小为 2x2`)
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

    // 删除每个匹配的dashboard项（允许部分失败）
    const deleteResults = await Promise.allSettled(
        dashboardIds.map(async (id) => {
          try {
            const result = await deletePersonalDashboard(id)
            return { id, success: true, result }
          } catch (error) {
            console.error(`删除dashboard项 ${id} 失败:`, error)
            return { id, success: false, error }
          }
        })
    )

    // 统计删除结果
    const successCount = deleteResults.filter(result =>
        result.status === 'fulfilled' && result.value.success
    ).length
    const failureCount = deleteResults.length - successCount

    if (failureCount > 0) {
      console.warn(`${failureCount} 个dashboard项删除失败，${successCount} 个删除成功`)
    }

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

    // 强制触发响应式更新
    selectedCommonIndicators.value = [...selectedCommonIndicators.value]
    selectedPersonalIndicators.value = [...selectedPersonalIndicators.value]

    // 刷新数据，并保持当前更新后的选中状态
    // 注意：不要在loadDashboardData后覆盖选中状态，让其自然更新
    await loadDashboardData()

    // 显示删除结果消息
    if (failureCount === 0) {
      message.success(`删除成功，共删除 ${successCount} 项`)
    } else if (successCount > 0) {
      message.warning(`部分删除成功：${successCount} 项成功，${failureCount} 项失败`)
    } else {
      message.error(`删除失败，${failureCount} 项删除失败`)
    }
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

// 组件挂载
onMounted(() => {
  if (tableId.value) {
    loadDashboardData()
  }
})

// 组件卸载前清理防抖定时器
onUnmounted(() => {
  debouncedResizeHandler.cancel()
  debouncedLayoutHandler.cancel()
})
</script>

<style lang="less" scoped>
.personal-dashboard {
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
    }
  }
}
</style>
