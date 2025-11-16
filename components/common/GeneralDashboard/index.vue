<template>
  <div class="general-dashboard-page">
    <!-- 顶部头部区域 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          {{ pageTitle }}
        </h1>
      </div>

      <!-- 右侧筛选区域（通过插槽从外部传入） -->
      <div class="header-right">
        <slot name="filters"></slot>
      </div>
    </div>

    <!-- 下方左右分栏区域 -->
    <div class="page-content">
      <!-- 左侧手风琴指标树区域 -->
      <div class="indicator-tree-wrapper">
        <a-collapse
          v-model:active-key="activeKeys"
          accordion
          class="indicator-collapse"
          @change="handleCollapseChange"
        >
          <a-collapse-panel
            v-for="config in tableConfigs"
            :key="config.tableId"
            :header="config.tableName"
          >
            <!-- 面板头部右侧 -->
            <template #extra>
              <span class="table-id-tag">{{ config.tableId }}</span>
            </template>

            <!-- 面板内容：指标树 -->
            <div class="tree-content">
              <simple-indicator-tree
                :indicators="getIndicatorsForTable(config.tableId)"
                :selected-node-key="selectedNodeKey"
                @node-click="handleNodeClick"
              />
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>

      <!-- 右侧图表区域 -->
      <div class="charts-area">
        <!-- 当前查看节点提示横幅 -->
        <div
          v-if="selectedNodeKey && currentNodeTitle"
          class="node-filter-banner"
        >
          <div class="banner-content">
            <span class="banner-icon">
              <FilterOutlined />
            </span>
            <span class="banner-text">
              当前显示: <strong>{{ currentNodeTitle }}</strong> 下的所有图表
            </span>
          </div>
        </div>

        <!-- 图表网格 -->
        <div class="charts-grid-wrapper">
          <!-- 有选中指标时显示图表 -->
          <chart-grid
            v-if="filteredDashboardItems.length > 0"
            :indicators="filteredDashboardItems"
            :loading="loading"
            :grid-columns="GRID_COLUMNS"
            :can-edit-common-indicators="false"
            :can-edit-personal-indicators="false"
            :can-delete-common-indicators="false"
            :can-delete-personal-indicators="false"
            :can-resize-common-indicators="false"
            :can-resize-personal-indicators="false"
            :can-drag="false"
          />

          <!-- 没有图表时显示提示 -->
          <div
            v-else
            class="empty-state"
          >
            <div class="empty-content">
              <BarChartOutlined class="empty-icon" />
              <p v-if="activeKeys === undefined || activeKeys.length === 0">
                请在左侧展开折叠面板以查看图表
              </p>
              <p v-else>
                请在左侧点击树节点以查看图表
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChartOutlined, FilterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import SimpleIndicatorTree from './SimpleIndicatorTree.vue'

import {
  getCommonDashboard,
  getCommonStatistic
} from '@/framework/components/common/chartConfig/api'
import ChartGrid from '@/framework/components/common/chartConfig/ChartGrid.vue'
import type { DashboardItem, IndicatorNode } from '@/framework/components/common/chartConfig/types'
import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

// 定义表配置接口
export interface TableConfig {
  tableId: string
  tableName: string
}

// Props
interface Props {
  pageTitle?: string
  tableConfigs: TableConfig[]
  gridColumns?: number
  globalConditions?: ConditionListType // 外部传入的全局筛选条件
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: '通用仪表盘',
  gridColumns: 7,
  globalConditions: () => ({ conditionList: [], andOr: '0' })
})

// 手风琴当前激活的key
const activeKeys = ref<string[]>([])

// 当前选中的树节点（用于过滤显示的图表）
const selectedNodeKey = ref<string | null>(null)
const selectedTableId = ref<string | null>(null)

// 页面状态
const loading = ref(false)

// 按表存储数据
const tableDataMap = ref<Record<string, {
  indicators: IndicatorNode[]
  dashboardItems: DashboardItem[]
}>>({})

// 统一的网格列数配置
const GRID_COLUMNS = computed(() => props.gridColumns)

// ================== 全局筛选条件处理 ==================
// （外部传入的条件通过 props.globalConditions）

// ================== 数据加载 ==================
const loadTableData = async (tableId: string) => {
  // 如果已经加载过，不重复加载
  if (tableDataMap.value[tableId]) {
    return
  }

  try {
    loading.value = true

    const indicators: IndicatorNode[] = []
    const dashboardItems: DashboardItem[] = []

    // 加载该表的指标
    const indicatorResp = await getCommonStatistic(tableId)
    if (indicatorResp?.payload) {
      indicators.push(...indicatorResp.payload)
    }

    // 加载该表的仪表盘配置
    const dashboardResp = await getCommonDashboard(tableId)
    if (dashboardResp?.payload) {
      dashboardItems.push(...dashboardResp.payload.map((item: any) => ({ ...item,
        indicatorId: item.statisticId != null ? String(item.statisticId) : undefined,
        config: { ...(item.config || {}), tableId, indicator: item.indicator }
      })))
    }

    // 存储该表的数据
    tableDataMap.value[tableId] = {
      indicators,
      dashboardItems
    }
  } catch (error) {
    console.error(`加载表 ${tableId} 数据失败:`, error)
  } finally {
    loading.value = false
  }
}

// 手风琴变化时加载对应的数据并清空图表显示
const handleCollapseChange = (keys: any) => {
  const keysArray = Array.isArray(keys) ? keys : [keys]

  // 清空当前选中的节点，切换面板时不显示图表
  selectedNodeKey.value = null
  selectedTableId.value = null

  // 懒加载：只加载新展开面板的数据
  keysArray.forEach((tableId: string) => {
    if (!tableDataMap.value[tableId]) {
      loadTableData(tableId)
    }
  })
}

// 获取指定表的指标树数据
const getIndicatorsForTable = (tableId: string): IndicatorNode[] => {
  const data = tableDataMap.value[tableId]
  return data?.indicators || []
}

// 从指定节点提取所有叶子节点（递归）
const extractLeafIndicatorsFromNode = (node: IndicatorNode): IndicatorNode[] => {
  const leaves: IndicatorNode[] = []

  const traverse = (currentNode: IndicatorNode) => {
    if (currentNode.children && currentNode.children.length > 0) {
      currentNode.children.forEach(child => traverse(child))
    } else {
      leaves.push(currentNode)
    }
  }

  traverse(node)
  return leaves
}

// 在指标树中查找指定的节点
const findNodeInTree = (nodes: IndicatorNode[], targetKey: string): IndicatorNode | null => {
  for (const node of nodes) {
    if (node.key === targetKey || node.id === targetKey) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, targetKey)
      if (found) return found
    }
  }
  return null
}

// 查找节点的父节点
const findParentNode = (nodes: IndicatorNode[], targetKey: string, parent: IndicatorNode | null = null): IndicatorNode | null => {
  for (const node of nodes) {
    if (node.key === targetKey || node.id === targetKey) {
      return parent
    }
    if (node.children && node.children.length > 0) {
      const found = findParentNode(node.children, targetKey, node)
      if (found !== null) return found
    }
  }
  return null
}

// 根据当前展开的折叠面板和选中的节点显示图表
const displayedDashboardItems = computed((): DashboardItem[] => {
  // 如果没有展开任何面板，不显示图表
  if (activeKeys.value === undefined || activeKeys.value.length === 0) {
    return []
  }

  // 如果没有选中任何节点，不显示图表（等待用户点击）
  if (!selectedNodeKey.value || !selectedTableId.value) {
    return []
  }

  const data = tableDataMap.value[selectedTableId.value]
  if (!data) return []

  const selectedNode = findNodeInTree(data.indicators, selectedNodeKey.value)
  if (!selectedNode) return []

  const leaves = extractLeafIndicatorsFromNode(selectedNode)
  const existing: DashboardItem[] = []
  const newItems: DashboardItem[] = []

  leaves.forEach(ind => {
    const ex = data.dashboardItems.find(d => String(d.indicatorId) === String(ind.id))
    if (ex) {
      existing.push(ex)
    } else {
      newItems.push({
        id: `temp-${ind.id}`,
        title: ind.title || '未命名指标',
        displayOrder: 999,
        commonStatistic: ind.id,
        xGrid: ind.defaultXGrid || 4,
        yGrid: ind.defaultYGrid || 3,
        xPosition: 1,
        yPosition: 1,
        show: true,
        config: { tableId: selectedTableId.value, indicator: ind.indicator },
        indicatorId: ind.id
      } as DashboardItem)
    }
  })

  existing.sort((a, b) => a.displayOrder - b.displayOrder)

  if (newItems.length) {
    let maxY = 1
    existing.forEach(item => {
      const bottom = item.yPosition + (item.yGrid || 1)
      if (bottom > maxY) maxY = bottom
    })

    let curX = 1
    let curY = maxY

    newItems.forEach(item => {
      const w = item.xGrid || 4
      if (curX + w - 1 > GRID_COLUMNS.value) {
        curX = 1
        curY += item.yGrid || 3
      }
      item.xPosition = curX
      item.yPosition = curY
      curX += w
    })

    existing.push(...newItems)
  }

  return existing
})

// ================== 全局筛选条件合并 ==================
const filteredDashboardItems = computed((): DashboardItem[] => {
  const base = displayedDashboardItems.value
  if (!base.length) return []

  // 如果没有全局筛选条件，直接返回
  if (!props.globalConditions || !props.globalConditions.conditionList || props.globalConditions.conditionList.length === 0) {
    return base.map(i => ({ ...i }))
  }

  // 将全局筛选条件合并到每个图表的配置中
  return base.map(item => {
    const cloned: DashboardItem = { ...item, config: { ...item.config } }
    let cfg: any
    try {
      cfg = typeof cloned.config.indicator === 'string'
          ? JSON.parse(cloned.config.indicator || '{}')
          : (cloned.config.indicator || {})
    } catch {
      cfg = {}
    }

    if (!cfg.filterConditions) {
      cfg.filterConditions = { conditionList: [], andOr: '0' }
    }
    if (!Array.isArray(cfg.filterConditions.conditionList)) {
      cfg.filterConditions.conditionList = []
    }

    // 将外部传入的全局筛选条件通过 AND 关系连接到原有条件
    // 原有条件和全局条件之间是 AND 关系
    if (props.globalConditions && props.globalConditions.conditionList.length > 0) {
      // 如果原有条件为空，直接使用全局条件
      if (cfg.filterConditions.conditionList.length === 0) {
        cfg.filterConditions = props.globalConditions
      } else {
        // 原有条件和全局条件通过 AND 连接
        cfg.filterConditions = {
          property: null,
          value: null,
          relation: null,
          conditionList: [
            cfg.filterConditions, // 原有条件作为一个整体
            props.globalConditions // 全局条件作为一个整体
          ],
          andOr: '0' // 0 表示 AND
        }
      }
    }

    cloned.config.indicator = JSON.stringify(cfg)
    return cloned
  })
})

// 处理树节点点击
const handleNodeClick = (nodeKey: string) => {
  // 查找节点所属的表
  let currentTableId: string | null = null
  
  for (const [tableId, data] of Object.entries(tableDataMap.value)) {
    const node = findNodeInTree(data.indicators, nodeKey)
    if (node) {
      currentTableId = tableId
      break
    }
  }

  if (!currentTableId) {
    message.warning('未找到该节点所属的表')
    return
  }

  // 获取节点数据
  const data = tableDataMap.value[currentTableId]
  const clickedNode = findNodeInTree(data.indicators, nodeKey)

  if (!clickedNode) {
    return
  }

  // 判断是否为叶子节点
  const hasChildren = clickedNode.children && clickedNode.children.length > 0

  if (hasChildren) {
    // 非叶子节点：显示该节点下的所有子图表
    selectedNodeKey.value = nodeKey
    selectedTableId.value = currentTableId
    
    // 滚动到顶部
    setTimeout(() => {
      const chartsArea = document.querySelector('.charts-area')
      if (chartsArea) {
        chartsArea.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 100)
  } else {
    // 叶子节点：显示父节点下的所有子图表，并滚动到该叶子节点对应的图表
    const parentNode = findParentNode(data.indicators, nodeKey)
    
    if (parentNode) {
      // 有父节点：显示父节点下的所有子节点
      selectedNodeKey.value = parentNode.key || parentNode.id
      selectedTableId.value = currentTableId
    } else {
      // 顶层叶子节点：显示所有图表
      selectedNodeKey.value = null
      selectedTableId.value = null
    }
    
    // 等待视图更新后滚动到对应图表
    setTimeout(() => {
      const targetChart = displayedDashboardItems.value.find(
        item => String(item.indicatorId) === String(clickedNode.id)
      )

      if (!targetChart) {
        message.warning('该图表在未展开的面板中，请先展开对应的面板')
        return
      }

      // 使用 setTimeout 确保 DOM 已更新
      setTimeout(() => {
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
    }, 50)
  }
}

// 获取当前选中节点的标题（用于横幅显示）
const currentNodeTitle = computed(() => {
  if (!selectedNodeKey.value || !selectedTableId.value) {
    return ''
  }
  
  const data = tableDataMap.value[selectedTableId.value]
  if (!data) return ''
  
  const node = findNodeInTree(data.indicators, selectedNodeKey.value)
  return node?.title || ''
})

// 页面初始化
onMounted(() => {
  // 不自动展开任何面板，等待用户手动操作
})
</script>

<style scoped lang="less" src="./css/generalDashboard.less"></style>