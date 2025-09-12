<template>
  <div class="personal-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <h1>{{ dashboardTitle }}</h1>
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
        :selected-indicators="selectedIndicators"
        @update:collapsed="updateSidebarCollapsed"
        @update:selected="updateSelectedIndicators"
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
          @edit-indicator="openIndicatorConfig"
          @delete-indicator="deleteIndicator"
          @resize-indicator="handleResizeIndicator"
          @reorder-indicators="handleReorderIndicators"
        />
      </div>
    </div>

    <!-- 配置弹窗 -->
    <dashboard-config-modal
      v-model:visible="configModalVisible"
      :mode="configMode"
      :config="currentConfig"
      :table-id="tableId"
      @save="saveConfig"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import IndicatorTree from './components/IndicatorTree.vue'
import ChartGrid from './components/ChartGrid.vue'
import DashboardConfigModal from './components/DashboardConfigModal.vue'
import {
  addPersonalIndicator,
  deleteIndicatorApi,
  getCommonIndicators,
  getPersonalIndicators,
  saveIndicatorTree,
  updatePersonalIndicator
} from './api'
import type { IndicatorTreeNode } from './types'

// 开发环境下的测试数据
const isDevelopment = process.env.NODE_ENV === 'development'
import { commonIndicatorsTestData, personalIndicatorsTestData } from './testData'

// 路由参数
const { currentRoute } = useRouter()
const route = currentRoute.value
const tableId = computed(() => (route.query ? route.query.tableId ? route.query.tableId : undefined : undefined) as string)

// 页面状态
const loading = ref(false)
const sidebarCollapsed = ref(false)
const dashboardTitle = ref('个人仪表盘')

// 数据状态
const commonIndicators = ref<IndicatorTreeNode[]>([])
const personalIndicators = ref<IndicatorTreeNode[]>([])
const selectedIndicators = ref<string[]>([])

// 配置弹窗状态
const configModalVisible = ref(false)
const currentConfig = ref<IndicatorTreeNode | null>(null)
const configMode = ref<any>('add')

// 组件引用
const indicatorTreeRef = ref()

// 计算属性 - 获取需要显示的指标
const displayedIndicators = computed(() => {
  const result: IndicatorTreeNode[] = []

  const traverse = (nodes: IndicatorTreeNode[]) => {
    nodes.forEach(node => {
      // 如果节点需要显示，则添加到结果中
      if (node.show) {
        result.push(node)
      }

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  // 合并通用指标和个人指标
  const allIndicators = [...commonIndicators.value, ...personalIndicators.value]
  traverse(allIndicators)
  return result.sort((a, b) => a.displayOrder - b.displayOrder)
})

// 更新页面标题
const updateDocumentTitle = () => {
  document.title = `${ dashboardTitle.value } - ${ tableId.value }`
}

// 加载仪表盘数据
const loadDashboardData = async () => {
  try {
    loading.value = true
    // 在开发环境中，可以使用测试数据
    if (isDevelopment && tableId.value === 'test') {
      // 使用测试数据
      commonIndicators.value = commonIndicatorsTestData
      personalIndicators.value = personalIndicatorsTestData
      dashboardTitle.value = '测试仪表盘'
      updateDocumentTitle()
      return
    }

    // 并行加载通用指标和个人指标数据
    const [commonResp, personalResp] = await Promise.all([
      getCommonIndicators(tableId.value),
      getPersonalIndicators(tableId.value)
    ])

    commonIndicators.value = commonResp.payload || []
    personalIndicators.value = personalResp.payload || []

    updateDocumentTitle()
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

// 更新选中的指标
const updateSelectedIndicators = (selected: string[]) => {
  selectedIndicators.value = selected
}

// 打开指标配置
const openIndicatorConfig = (config?: IndicatorTreeNode) => {
  currentConfig.value = config || null
  configMode.value = config ? 'edit' : 'add'
  configModalVisible.value = true
}

// 保存配置
const saveConfig = async (config: IndicatorTreeNode) => {
  try {
    loading.value = true

    // 在测试环境中，模拟保存操作
    if (isDevelopment && tableId.value === 'test') {
      message.success('测试环境中配置已保存')
      configModalVisible.value = false
      return
    }

    if (configMode.value === 'add') {
      // 新增个人指标
      await addPersonalIndicator(tableId.value, config)
    } else {
      // 更新个人指标
      await updatePersonalIndicator(tableId.value, config)
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
  try {
    // 在测试环境中，模拟删除操作
    if (isDevelopment && tableId.value === 'test') {
      message.success('测试环境中指标已删除')
      return
    }

    await deleteIndicatorApi(tableId.value, indicatorId)
    await loadDashboardData()
    message.success('删除成功')
  } catch (error) {
    console.error('删除指标失败:', error)
    message.error('删除失败，请稍后重试')
  }
}

// 保存仪表盘状态
const saveDashboardState = async () => {
  try {
    // 在测试环境中，模拟保存操作
    if (isDevelopment && tableId.value === 'test') {
      console.log('测试环境中仪表盘状态已保存')
      return
    }

    // 合并通用指标和个人指标
    const allIndicators = [...commonIndicators.value, ...personalIndicators.value]
    // 保存整个指标树数据
    await saveIndicatorTree(tableId.value, allIndicators)
  } catch (error) {
    console.error('保存仪表盘状态失败:', error)
  }
}

// 处理图表调整大小
const handleResizeIndicator = async (indicatorId: string, xGrid: number, yGrid: number) => {
  try {
    // 在测试环境中，模拟调整大小操作
    if (isDevelopment && tableId.value === 'test') {
      // 更新本地数据
      const updateNode = (nodes: IndicatorTreeNode[]) => {
        nodes.forEach(node => {
          if (node.id === indicatorId) {
            node.xGrid = xGrid
            node.yGrid = yGrid
          }
          if (node.children) {
            updateNode(node.children)
          }
        })
      }

      // 更新通用指标
      updateNode(commonIndicators.value)
      // 更新个人指标
      updateNode(personalIndicators.value)

      message.success('测试环境中调整大小成功')
      return
    }

    // 更新本地数据
    const updateNode = (nodes: IndicatorTreeNode[]) => {
      nodes.forEach(node => {
        if (node.id === indicatorId) {
          node.xGrid = xGrid
          node.yGrid = yGrid
        }
        if (node.children) {
          updateNode(node.children)
        }
      })
    }

    // 更新通用指标
    updateNode(commonIndicators.value)
    // 更新个人指标
    updateNode(personalIndicators.value)

    // 保存到服务器
    await saveDashboardState()
    message.success('调整大小成功')
  } catch (error) {
    console.error('调整大小失败:', error)
    message.error('调整大小失败，请稍后重试')
    // 恢复原状态
    loadDashboardData()
  }
}

// 处理图表重新排序
const handleReorderIndicators = async (newOrder: IndicatorTreeNode[]) => {
  try {
    // 在测试环境中，模拟重新排序操作
    if (isDevelopment && tableId.value === 'test') {
      // 更新显示顺序
      newOrder.forEach((indicator, index) => {
        const updateNode = (nodes: IndicatorTreeNode[]) => {
          nodes.forEach(node => {
            if (node.id === indicator.id) {
              node.displayOrder = index
            }
            if (node.children) {
              updateNode(node.children)
            }
          })
        }
        // 更新通用指标
        updateNode(commonIndicators.value)
        // 更新个人指标
        updateNode(personalIndicators.value)
      })

      message.success('测试环境中重新排序成功')
      return
    }

    // 更新显示顺序
    newOrder.forEach((indicator, index) => {
      const updateNode = (nodes: IndicatorTreeNode[]) => {
        nodes.forEach(node => {
          if (node.id === indicator.id) {
            node.displayOrder = index
          }
          if (node.children) {
            updateNode(node.children)
          }
        })
      }
      // 更新通用指标
      updateNode(commonIndicators.value)
      // 更新个人指标
      updateNode(personalIndicators.value)
    })

    // 保存到服务器
    await saveDashboardState()
  } catch (error) {
    console.error('重新排序失败:', error)
    message.error('重新排序失败，请稍后重试')
    // 恢复原状态
    loadDashboardData()
  }
}

// 组件挂载
onMounted(() => {
  console.log(tableId.value)
  if (tableId.value) {
    loadDashboardData()
    updateDocumentTitle()
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