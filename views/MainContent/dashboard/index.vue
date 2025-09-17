<template>
  <div class="personal-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <h1>{{ currentRoute.meta.title }}</h1>
      <div class="header-actions">
        <a-button type="primary" @click="openIndicatorConfig()">
          <PlusOutlined />
          添加指标
        </a-button>
        <a-button @click="refreshDashboard">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 页面主体 -->
    <div class="dashboard-main">
      <!-- 左侧指标树 -->
      <indicator-tree
        :collapsed="sidebarCollapsed"
        :common-indicators="commonIndicators"
        :expanded-common-keys="expandedCommonKeys"
        :expanded-personal-keys="expandedPersonalKeys"
        :personal-indicators="personalIndicators"
        :selected-common-indicators="selectedCommonIndicators"
        :selected-personal-indicators="selectedPersonalIndicators"
        @update:collapsed="updateSidebarCollapsed"
        @update:selected-common="updateSelectedCommonIndicators"
        @update:selected-personal="updateSelectedPersonalIndicators"
        @add-indicator="openIndicatorConfig"
        @edit-indicator="openIndicatorConfig"
        @delete-indicator="deleteIndicator"
        @add-dashboard="addDashboard"
        @delete-dashboard="deleteDashboard"
        @reload-data="loadDashboardData"
      />

      <!-- 主体图表区域 -->
      <div class="dashboard-content">
        <chart-grid
          :indicators="displayedIndicators"
          :loading="loading"
          @add-indicator="addDashboard"
          @edit-indicator="editIndicatorFromChart"
          @delete-indicator="deleteDashboard"
          @resize-indicator="handleResizeIndicator"
          @reorder-indicators="handleReorderIndicators"
        />
      </div>
    </div>

    <!-- 配置弹窗 -->
    <dashboard-config-modal
      v-model:visible="configModalVisible"
      :config="currentConfig"
      :mode="configMode"
      :table-id="tableId"
      @save="saveConfig"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import IndicatorTree from './components/IndicatorTree.vue'
import ChartGrid from './components/ChartGrid.vue'
import DashboardConfigModal from './components/DashboardConfigModal.vue'
import {
  addPersonalDashboard,
  addPersonalStatistic,
  deletePersonalDashboard,
  deletePersonalStatistic,
  getCommonStatistic,
  getPersonalDashboard,
  getPersonalStatistic,
  updatePersonalDashboard,
  updatePersonalStatistic
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
const configModalVisible = ref(false)
const currentConfig = ref<IndicatorNode | null>(null)
const configMode = ref<any>('add')

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
        console.log(`Found node ${ id }, parents:`, parents)
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
  console.log(`Parent keys for node ${ id }:`, result)
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
            xGrid: Number(d.xGrid ?? d.xgrid ?? 1),
            yGrid: Number(d.yGrid ?? d.ygrid ?? 1),
            xPosition: Number(d.xPosition ?? d.xposition ?? 1),
            yPosition: Number(d.yPosition ?? d.yposition ?? 1),
            show: true, // 默认显示
            commonStatistic: d.commonStatistic,
            config:
                typeof d.indicator === 'string'
                    ? (() => {
                      try {
                        return JSON.parse(d.indicator)
                      } catch {
                        return {}
                      }
                    })()
                    : d.indicator ?? {},
            indicatorId: d.statisticId
          }
          console.log(
              'Dashboard item:',
              item.title,
              'xGrid:',
              item.xGrid,
              'yGrid:',
              item.yGrid,
              'xPosition:',
              item.xPosition,
              'yPosition:',
              item.yPosition
          )
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

    console.log('loadDashboardData - commonIds:', commonIds)
    console.log('loadDashboardData - personalIds:', personalIds)
    console.log('loadDashboardData - commonIndicators:', commonIndicators.value)
    console.log('loadDashboardData - personalIndicators:', personalIndicators.value)

    // 更新选中的指标，保持现有选中状态的基础上添加新的选中项
    selectedCommonIndicators.value = [
      ...new Set([...selectedCommonIndicators.value, ...commonIds])
    ]
    selectedPersonalIndicators.value = [
      ...new Set([...selectedPersonalIndicators.value, ...personalIds])
    ]

    console.log('Updated selectedCommonIndicators:', selectedCommonIndicators.value)
    console.log('Updated selectedPersonalIndicators:', selectedPersonalIndicators.value)

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

    console.log('Updated expandedCommonKeys:', expandedCommonKeys.value)
    console.log('Updated expandedPersonalKeys:', expandedPersonalKeys.value)
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
  console.log('updateSelectedCommonIndicators', selectedCommonIndicators.value)
}

// 更新选中的个人指标
const updateSelectedPersonalIndicators = (selected: string[]) => {
  if (
      selected.length !== selectedPersonalIndicators.value.length ||
      !selected.every((id) => selectedPersonalIndicators.value.includes(id))
  ) {
    selectedPersonalIndicators.value = selected
  }
  console.log('updateSelectedCommonIndicators', selectedPersonalIndicators.value)
}

// 打开指标配置
const openIndicatorConfig = (config?: IndicatorNode) => {
  currentConfig.value = config || null
  configMode.value = config ? 'edit' : 'add'
  configModalVisible.value = true
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

// 保存配置
const saveConfig = async (config: IndicatorNode) => {
  try {
    loading.value = true

    if (configMode.value === 'add') {
      // 新增个人指标
      await addPersonalStatistic(config)
    } else {
      // 更新个人指标
      await updatePersonalStatistic(config)
    }

    await loadDashboardData()
    configModalVisible.value = false
    message.success('保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error('保存失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 删除指标
const deleteIndicator = async (indicatorId: string) => {
  await deletePersonalStatistic(indicatorId)
  await loadDashboardData()
}

// 计算新卡片的位置
const calculateNewCardPosition = (
    currentItems: DashboardItem[]
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
        occupiedCells.add(`${ x },${ y }`)
      }
    }
  })

  // 从左到右，从上到下寻找第一个空位
  let y = 1
  while (true) {
    for (let x = 1; x <= gridColumns; x++) {
      // 检查位置(x, y)是否被占用
      if (!occupiedCells.has(`${ x },${ y }`)) {
        // 检查这个位置是否足够放置一个1x1的卡片
        // （在这个简单实现中，我们只检查卡片的起始位置）
        return { xPosition: x, yPosition: y }
      }
    }
    y++

    // 防止无限循环的安全检查
    if (y > 1000) {
      // 如果找不到合适的位置，放在最后一行的下一个位置
      return { xPosition: 1, yPosition: y }
    }
  }
}

const addDashboard = async (indicatorIds: string[]) => {
  console.log('Adding dashboard for indicators:', indicatorIds)
  try {
    // 获取当前已有的仪表盘项，用于计算新卡片的位置
    const currentItems = [...dashboardItems.value]

    // 为每个indicatorId创建dashboard项
    const dashboardItemsData = indicatorIds.map((indicatorId, index) => {
      // 计算新卡片的位置
      const position = calculateNewCardPosition(currentItems)

      // 将新添加的卡片也加入到currentItems中，确保下一个卡片不会与它重叠
      currentItems.push(({
        id: '',
        title: '',
        displayOrder: 0,
        commonStatistic: '',
        xGrid: 1,
        yGrid: 1,
        xPosition: position.xPosition,
        yPosition: position.yPosition,
        show: true,
        config: {},
        statisticId: indicatorId
      } as unknown) as DashboardItem)

      return {
        statisticId: indicatorId,
        xGrid: 1,
        yGrid: 1,
        xPosition: position.xPosition,
        yPosition: position.yPosition
      }
    })

    // 调用API添加dashboard项
    await addPersonalDashboard(dashboardItemsData, tableId.value)
    // 刷新数据
    await loadDashboardData()
  } catch (error) {
    console.error('添加仪表盘项失败:', error)
    message.error('添加仪表盘项失败')
  }
}

const deleteDashboard = async (indicatorIds: string[]) => {
  console.log('Deleting dashboard for indicators:', indicatorIds)
  try {
    // 获取当前dashboard项
    const currentItems = dashboardItems.value

    // 找到需要删除的dashboard项ID
    const itemsToDelete = currentItems
        .filter((item) => item.indicatorId && indicatorIds.includes(item.indicatorId))
        .map((item) => item.id)

    // 删除每个匹配的dashboard项
    const deletePromises = itemsToDelete.map((id) => deletePersonalDashboard(id))
    await Promise.all(deletePromises)

    // 刷新数据
    await loadDashboardData()
  } catch (error) {
    console.error('删除仪表盘项失败:', error)
    message.error('删除仪表盘项失败')
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

// 处理图表调整大小
const handleResizeIndicator = async (
    indicatorId: string,
    xGrid: number,
    yGrid: number
) => {
  // 保存到服务器（更新单个图表尺寸）
  await updatePersonalDashboard({ id: indicatorId, xGrid, yGrid })
  await loadDashboardData()
}

// 处理图表重新排序
const handleReorderIndicators = async (newOrder: DashboardItem[]) => {
  await saveDashboardOrder(newOrder)
  await loadDashboardData()
}

// 组件挂载
onMounted(() => {
  console.log(tableId.value)
  if (tableId.value) {
    loadDashboardData()
  }
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
