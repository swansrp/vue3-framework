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
        :personal-indicators="personalIndicators"
        :selected-common-indicators="selectedCommonIndicators"
        :selected-personal-indicators="selectedPersonalIndicators"
        @update:collapsed="updateSidebarCollapsed"
        @update:selected-common="updateSelectedCommonIndicators"
        @update:selected-personal="updateSelectedPersonalIndicators"
        @add-indicator="openIndicatorConfig"
        @edit-indicator="openIndicatorConfig"
        @delete-indicator="deleteIndicator"
      />

      <!-- 主体图表区域 -->
      <div class="dashboard-content">
        <chart-grid
          :indicators="displayedIndicators"
          :loading="loading"
          @add-indicator="openIndicatorConfig"
          @edit-indicator="editIndicatorFromChart"
          @delete-indicator="deleteIndicator"
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
  deletePersonalStatistic,
  getCommonStatistic,
  getDashboard,
  getPersonalStatistic,
  updateDashboardOrder,
  updatePersonalDashboard,
  updatePersonalStatistic
} from './api'
import type { DashboardItem, IndicatorNode } from './types'

// 开发环境下的测试数据
const isDevelopment = process.env.NODE_ENV === 'development'

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

// 加载仪表盘数据
const loadDashboardData = async () => {
  try {
    loading.value = true

    // 并行加载通用/个人指标树与个人 dashboard 配置
    const [commonResp, personalResp, dashboardResp] = await Promise.all([
      getCommonStatistic(tableId.value),
      getPersonalStatistic(tableId.value),
      getDashboard(tableId.value)
    ])

    commonIndicators.value = commonResp.payload || []
    personalIndicators.value = personalResp.payload || []

    // 以 getDashboard 的顺序与大小为准，根据实际接口返回格式映射
    const dashboardItemsData = (dashboardResp.payload || []).map((d: any) => {
      const item = {
        id: String(d.id ?? ''),
        title: d.title ?? '',
        displayOrder: Number(d.order ?? 0),
        xGrid: Number(d.xGrid ?? d.xgrid ?? 1),
        yGrid: Number(d.yGrid ?? d.ygrid ?? 1),
        show: true, // 默认显示
        commonStatistic: d.commonStatistic,
        config: typeof d.indicator === 'string' ? (() => {
          try {
            return JSON.parse(d.indicator)
          } catch {
            return {}
          }
        })() : (d.indicator ?? {}),
        indicatorId: d.statisticId
      }
      console.log('Dashboard item:', item.title, 'xGrid:', item.xGrid, 'yGrid:', item.yGrid)
      return item
    }).sort((a: DashboardItem, b: DashboardItem) => a.displayOrder - b.displayOrder)

    dashboardItems.value = dashboardItemsData

    // 根据 dashboard 数据中的 statisticId 选中左侧树节点
    // 分别检查通用指标和个人指标树
    console.log('======', dashboardItemsData)

    const commonIds = dashboardItemsData
      .filter((item: DashboardItem) => item.commonStatistic === '1')
      .map((item: DashboardItem) => item.indicatorId)

    const personalIds = dashboardItemsData
      .filter((item: DashboardItem) => item.commonStatistic !== '1')
      .map((item: DashboardItem) => item.indicatorId)

    console.log('loadDashboardData', commonIds, personalIds)

    nextTick(() => {
      // 更新选中的指标，保持现有选中状态的基础上添加新的选中项
      selectedCommonIndicators.value = [...new Set([...selectedCommonIndicators.value, ...commonIds])]
      selectedPersonalIndicators.value = [...new Set([...selectedPersonalIndicators.value, ...personalIds])]
    })

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
  if (selected.length !== selectedCommonIndicators.value.length ||
    !selected.every(id => selectedCommonIndicators.value.includes(id))) {
    selectedCommonIndicators.value = selected
  }
  addPersonalDashboard(selectedCommonIndicators.value)
  console.log('updateSelectedCommonIndicators', selectedCommonIndicators.value)
}

// 更新选中的个人指标
const updateSelectedPersonalIndicators = (selected: string[]) => {
  if (selected.length !== selectedPersonalIndicators.value.length ||
    !selected.every(id => selectedPersonalIndicators.value.includes(id))) {
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
  const node = findNodeById(commonIndicators.value, item.indicatorId || item.id) ||
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
  message.success('删除成功')
}

// 保存右侧图表顺序
const saveDashboardOrder = async (newOrder: DashboardItem[]) => {
  try {
    const payload = newOrder.map((item, index) => ({ id: item.id, showOrder: index }))
    await updateDashboardOrder(payload)
  } catch (error) {
    console.error('保存图表顺序失败:', error)
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
