<template>
  <div class="general-dashboard-page">
    <!-- 顶部头部区域 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          {{ pageTitle }}
        </h1>
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
            v-if="displayedDashboardItems.length > 0"
            :indicators="displayedDashboardItems"
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
              <p v-if="activeKeys.length === 0">
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
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: '通用仪表盘',
  gridColumns: 7
})

// 手风琴当前激活的key
const activeKeys = ref<string[]>([])

// 当前选中的树节点（用于过滤显示的图表）
const selectedNodeKey = ref<string | null>(null)
const selectedTableId = ref<string | null>(null)

// 页面状态
const loading = ref(false)

// 数据状态 - 按 tableId 存储
const tableDataMap = ref<Record<string, {
  indicators: IndicatorNode[]
  dashboardItems: DashboardItem[]
}>>({})

// 统一的网格列数配置
const GRID_COLUMNS = computed(() => props.gridColumns)

// 加载指定表的数据
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
      const itemsWithTableId = dashboardResp.payload.map((item: any) => {
        const indicatorIdValue = item.statisticId !== undefined && item.statisticId !== null
          ? String(item.statisticId)
          : undefined

        return {
          ...item,
          indicatorId: indicatorIdValue,
          config: {
            ...(item.config || {}),
            tableId: tableId,
            indicator: item.indicator
          }
        }
      })
      dashboardItems.push(...itemsWithTableId)
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
  if (activeKeys.value.length === 0) {
    return []
  }

  // 如果没有选中任何节点，不显示图表（等待用户点击）
  if (!selectedNodeKey.value || !selectedTableId.value) {
    return []
  }

  const displayedItems: DashboardItem[] = []
  const newItems: DashboardItem[] = [] // 需要自动布局的新指标

  // 只处理选中节点所属的表
  const tableId = selectedTableId.value
  const data = tableDataMap.value[tableId]
  if (!data) {
    return []
  }

  // 提取选中节点下的叶子指标
  const selectedNode = findNodeInTree(data.indicators, selectedNodeKey.value)
  if (!selectedNode) {
    return []
  }
  
  const leafIndicators = extractLeafIndicatorsFromNode(selectedNode)
  
  // 为每个指标创建或获取 DashboardItem
  for (const indicator of leafIndicators) {
    if (!indicator.id) continue

    // 查找是否已经在 dashboardItems 中
    const existingItem = data.dashboardItems.find(
      item => String(item.indicatorId) === String(indicator.id)
    )

    if (existingItem) {
      // 使用已有的配置（保持原有位置）
      displayedItems.push(existingItem)
    } else {
      // 创建新的 DashboardItem（自动布局）
      newItems.push({
        id: `temp-${indicator.id}`,
        title: indicator.title || '未命名指标',
        displayOrder: 999,
        commonStatistic: indicator.id,
        xGrid: indicator.defaultXGrid || 4,
        yGrid: indicator.defaultYGrid || 3,
        xPosition: 1, // 临时值，自动布局时计算
        yPosition: 1, // 临时值，自动布局时计算
        show: true,
        config: {
          tableId: tableId,
          indicator: indicator.indicator
        },
        indicatorId: indicator.id
      } as DashboardItem)
    }
  }

  // 对已有项按 displayOrder 排序
  displayedItems.sort((a, b) => a.displayOrder - b.displayOrder)

  // 自动布局新项
  if (newItems.length > 0) {
    // 找到已占用的最大 Y 位置
    let maxY = 1
    displayedItems.forEach(item => {
      const itemBottom = item.yPosition + (item.yGrid || 1)
      if (itemBottom > maxY) {
        maxY = itemBottom
      }
    })

    // 自动布局算法：从已占用区域的下一行开始
    let currentX = 1
    let currentY = maxY

    newItems.forEach(item => {
      const itemWidth = item.xGrid || 4

      // 检查当前行是否放得下
      if (currentX + itemWidth - 1 > GRID_COLUMNS.value) {
        // 换到下一行
        currentX = 1
        currentY = currentY + (item.yGrid || 3)
      }

      item.xPosition = currentX
      item.yPosition = currentY

      // 移动到下一个位置
      currentX += itemWidth
    })

    displayedItems.push(...newItems)
  }

  return displayedItems
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

<style scoped lang="less">
.general-dashboard-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  overflow: hidden;

  // 顶部头部区域
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

    .header-left {
      display: flex;
      align-items: center;

      .page-title {
        padding-left: 15px;
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #262626;
      }
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  // 下方左右分栏区域
  .page-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;

    // 左侧手风琴指标树区域
    .indicator-tree-wrapper {
      width: 280px;
      flex-shrink: 0;
      background: #fff;
      border-right: 1px solid #e8e8e8;
      overflow-y: auto;
      overflow-x: hidden;

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

      .indicator-collapse {
        border: none;
        background: transparent;

        :deep(.ant-collapse-item) {
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }
        }

        :deep(.ant-collapse-header) {
          padding: 14px 12px;
          font-size: 16px;
          font-weight: 500;
          color: #262626;
          background: #fff;
          transition: all 0.3s;

          &:hover {
            background: #fafafa;
          }
        }

        :deep(.ant-collapse-item-active) {
          .ant-collapse-header {
            background: #f5f5f5;
            border-left: 3px solid #1890ff;
            padding-left: 9px;
          }
        }

        :deep(.ant-collapse-content) {
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
        }

        :deep(.ant-collapse-content-box) {
          padding: 0;
        }

        .table-id-tag {
          display: inline-block;
          padding: 2px 10px;
          font-size: 12px;
          color: transparent;
          background: transparent;
          border-radius: 12px;
          font-weight: normal;
          user-select: text;
          cursor: text;
        }

        .tree-content {
          background: #fafafa;

          :deep(.indicator-tree-panel) {
            background: transparent;
            border: none;
          }
        }
      }
    }

    // 右侧图表区域
    .charts-area {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: #f0f2f5;
      scroll-behavior: smooth;
      display: flex;
      flex-direction: column;

      // 节点过滤横幅
      .node-filter-banner {
        flex-shrink: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 12px 20px;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        animation: slideDown 0.3s ease-out;

        .banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;

          .banner-icon {
            font-size: 16px;
            display: flex;
            align-items: center;
            opacity: 0.9;
          }

          .banner-text {
            font-size: 14px;
            line-height: 1.5;

            strong {
              font-weight: 600;
              color: #fff;
              background: rgba(255, 255, 255, 0.15);
              padding: 2px 8px;
              border-radius: 4px;
              margin: 0 4px;
            }
          }
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

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

      .charts-grid-wrapper {
        flex: 1;
        padding: 16px;

        :deep(.chart-grid-container) {
          width: 100%;
        }

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

        .empty-state {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          min-height: 400px;

          .empty-content {
            text-align: center;
            color: #999;

            .empty-icon {
              font-size: 64px;
              color: #d9d9d9;
              margin-bottom: 16px;
            }

            p {
              font-size: 12px;
              color: #8c8c8c;
              margin: 0;
            }
          }
        }
      }
    }
  }
}
</style>
