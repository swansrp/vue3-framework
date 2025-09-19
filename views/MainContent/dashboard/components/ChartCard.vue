<template>
  <div :class="{ 'chart-card-loading': loading, dragging: isDragging }" class="chart-card" @mousedown="startDrag">
    <!-- 卡片头部 -->
    <div class="chart-card-header">
      <div class="header-title">
        <h3>{{ indicator.title || '未命名指标' }}</h3>
      </div>
      <div class="header-actions">
        <a-tooltip title="编辑">
          <EditOutlined @click="$emit('edit')" />
        </a-tooltip>
        <a-dropdown :trigger="['click']">
          <a-tooltip title="更多操作">
            <EllipsisOutlined />
          </a-tooltip>
          <template #overlay>
            <a-menu>
              <a-menu-item key="refresh" @click="refreshChart">
                <ReloadOutlined />
                刷新
              </a-menu-item>
              <a-menu-item key="rename" @click="renameChart">
                <EditOutlined />
                重命名
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="delete" @click="$emit('delete')">
                <DeleteOutlined />
                删除
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="chart-card-content">
      <div v-if="loading" class="chart-loading">
        <a-spin />
      </div>
      <div v-else-if="hasValidConfig && safeChartData.length > 0" class="chart-container">
        <!-- 直接使用 UniversalChart 组件渲染图表 -->
        <UniversalChart
          v-if="isInitialized && !isDestroyed" ref="chartRef" :data="safeChartData"
          :data-metrics="indicatorConfig?.dataMetrics || []" :categories="chartCategories || []"
          :chart-type="chartType || 'bar'" :dimension-value-map="dimensionValueMap || { first: {}, second: {} }"
          :loading="chartLoading" :title="''" :subtitle="''" height="100%" @click="handleChartClick" />
      </div>
      <div v-else class="chart-empty">
        <BarChartOutlined class="empty-icon" />
        <p>{{ hasValidConfig ? '暂无数据' : '未配置图表' }}</p>
      </div>

      <!-- 蓝色虚线框 - 拖拽放置区域 -->
      <div
        :class="{ visible: showDropZone }" class="drop-zone" @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop">
        <div class="drop-zone-content">
          <div class="drop-zone-indicator"></div>
          <!--          <div class="drop-zone-text">拖拽到此处放置</div>-->
        </div>
      </div>
    </div>

    <!-- 调整大小的拖拽手柄 -->
    <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
    <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
    <div class="resize-handle corner" @mousedown="startResize('corner', $event)"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UniversalChart from '@/framework/components/common/Portal/dashboard/indicator/dashboard/UniversalChart.vue'
import type { DashboardItem } from '../types'
import { message } from 'ant-design-vue'
import { BarChartOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { advancedStatisticRequest } from '@/framework/apis'
import { getPortalConfig } from '@/framework/apis/portal/config'

interface Props {
  indicator: DashboardItem;
  loading: boolean;
  gridUnitWidth: number;
  gridUnitHeight: number;
  gridColumns: number;
}

interface Emits {
  (e: 'edit'): void;

  (e: 'delete'): void;

  (e: 'resize', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'resize-preview', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'card-drop', event: DragEvent): void;

  (e: 'drag-start', event: MouseEvent, indicator: DashboardItem): void

  (e: 'drag-end', event: MouseEvent): void
}

const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<Props>(), {
  indicator: () => ({}) as DashboardItem,
  loading: false,
  gridUnitWidth: 0,
  gridUnitHeight: 120,
  gridColumns: 5
})

// 组件引用
const chartRef = ref()

// 组件状态管理
const isDestroyed = ref(false)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

// 调整大小状态
const isResizing = ref(false)
const resizeDirection = ref<'right' | 'bottom' | 'corner'>('right')
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(1)
const startHeight = ref(1)
const lastXGrid = ref(1)
const lastYGrid = ref(1)

// 拖拽放置区域状态
const showDropZone = ref(false)

// 图表相关状态
const chartLoading = ref(false)
const chartData = ref<any[]>([])
const portalConfig = ref<any>(null)

// 避免在组件初始化时立即触发loadChartData
let isInitialized = false

// 解析保存的指标配置
const indicatorConfig = computed(() => {
  try {
    if (!props.indicator.config || !props.indicator.config.indicator) {
      return null
    }
    const configStr = props.indicator.config.indicator
    return typeof configStr === 'string' ? JSON.parse(configStr) : configStr
  } catch (error) {
    console.error('解析指标配置失败:', error)
    return null
  }
})

// 判断是否有有效配置
const hasValidConfig = computed(() => {
  return indicatorConfig.value &&
    indicatorConfig.value.firstDimension &&
    indicatorConfig.value.dataMetrics &&
    indicatorConfig.value.dataMetrics.length > 0
})

// 安全的图表数据，确保类型正确
const safeChartData = computed(() => {
  return Array.isArray(chartData.value) ? chartData.value : []
})

// 图表类型
const chartType = computed(() => {
  const firstMetric = indicatorConfig.value?.dataMetrics?.[0]
  return firstMetric?.chartType || 'bar'
})

// 图表分类（x轴）
const chartCategories = computed(() => {
  if (!chartData.value.length) return []
  // 从数据中提取第一维度值作为分类
  const categories = [...new Set(chartData.value.map((item: any) => item.metricLabel.split('&&')[0]))]
  return categories
})

// 图表副标题
const chartSubtitle = computed(() => {
  const config = indicatorConfig.value
  if (!config) return ''

  const firstDim = config.firstDimension?.groupName || '第一维度'
  const secondDim = config.secondDimension?.groupName

  return secondDim
    ? `按${firstDim}、${secondDim}和统计指标分组`
    : `按${firstDim}和统计指标分组`
})

// 维度值映射
const dimensionValueMap = computed(() => {
  const config = indicatorConfig.value
  if (!config) return { first: {}, second: {} }

  const first: Record<string, string> = {}
  const second: Record<string, string> = {}

  config.firstDimension?.indicatorItems?.forEach((item: any) => {
    first[item.itemName] = String(item.itemValue)
  })

  config.secondDimension?.indicatorItems?.forEach((item: any) => {
    second[item.itemName] = String(item.itemValue)
  })

  return { first, second }
})

// 加载Portal配置
const loadPortalConfig = async () => {
  try {
    const tableId = props.indicator.config?.tableId
    if (!tableId) {
      console.warn('缺少tableId，无法加载Portal配置')
      return
    }

    const response = await getPortalConfig(tableId)
    portalConfig.value = response.payload
    portalConfig.value.tableId = tableId
  } catch (error) {
    console.error('加载Portal配置失败:', error)
  }
}

// 将指标配置转换为API请求参数
const convertToRequestParams = (config: any) => {
  if (!config || !portalConfig.value) return null

  const metricConditions: any[] = []

  // 处理一级维度
  if (config.firstDimension?.indicatorItems) {
    if (config.secondDimension?.indicatorItems) {
      // 有二级维度，进行交叉组合
      config.firstDimension.indicatorItems.forEach((firstItem: any) => {
        config.secondDimension.indicatorItems.forEach((secondItem: any) => {
          metricConditions.push({
            value: `${config.firstDimension.groupValue}&&${firstItem.itemValue}&&${config.secondDimension.groupValue}&&${secondItem.itemValue}`,
            label: `${firstItem.itemName}&&${secondItem.itemName}`,
            condition: {
              andOr: '0',
              conditionList: [
                ...(firstItem.queryConditions?.conditionList || []),
                ...(secondItem.queryConditions?.conditionList || [])
              ]
            }
          })
        })
      })
    } else {
      // 只有一级维度
      config.firstDimension.indicatorItems.forEach((item: any) => {
        metricConditions.push({
          value: `${config.firstDimension.groupValue}&&${item.itemValue}`,
          label: item.itemName,
          condition: item.queryConditions
        })
      })
    }
  }

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: config.filterConditions?.andOr || '0'
    },
    sort: null,
    metricColumn: [],
    metricCondition: metricConditions,
    statisticColumn: config.dataMetrics?.map((metric: any) => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: ''
  }
}

// 加载图表数据
const loadChartData = async () => {
  if (!hasValidConfig.value || isDestroyed.value) {
    chartData.value = []
    return
  }

  try {
    chartLoading.value = true

    // 确保Portal配置已加载
    if (!portalConfig.value) {
      await loadPortalConfig()
    }

    if (!portalConfig.value) {
      console.warn('Portal配置未加载，跳过图表数据加载')
      return
    }

    const requestParams = convertToRequestParams(indicatorConfig.value)
    if (!requestParams) {
      console.warn('无法构建请求参数')
      return
    }

    // 调用统计API获取数据
    const response = await advancedStatisticRequest(
      portalConfig.value.url,
      new Map(Object.entries(requestParams.selectColumnCondition || {})),
      requestParams.condition,
      requestParams.sort,
      requestParams.metricColumn,
      requestParams.metricCondition,
      requestParams.statisticColumn,
      requestParams.majorCondition
    )

    if (response && response.payload && !isDestroyed.value) {
      chartData.value = response.payload
    } else {
      chartData.value = []
    }
  } catch (error) {
    console.error('加载图表数据失败:', error)
    if (!isDestroyed.value) {
      chartData.value = []
      message.error('加载图表数据失败')
    }
  } finally {
    if (!isDestroyed.value) {
      chartLoading.value = false
    }
  }
}

// 处理图表点击事件
const handleChartClick = (params: any) => {
  console.log('图表点击:', params)
  // 可以在这里实现点击跳转到详情等功能
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

// 防抖后的图表数据加载函数
const debouncedLoadChartData = debounce(() => {
  if (!isDestroyed.value && isInitialized) {
    loadChartData()
  }
}, 300) // 300ms 防抖延迟

// 监听配置变化
watch(
  () => props.indicator,
  () => {
    debouncedLoadChartData()
  },
  { deep: true }
)

// 刷新图表
const refreshChart = () => {
  loadChartData()
  message.success('图表已刷新')
}

// 重命名图表
const renameChart = () => {
  // 实现重命名逻辑
  message.info('重命名功能待实现')
}

// 开始拖拽
const startDrag = (event: MouseEvent) => {
  // 只有在点击卡片头部区域时才允许拖拽
  const target = event.target as HTMLElement
  if (target.closest('.header-actions') || target.closest('.resize-handle')) {
    return // 点击操作按钮或调整大小手柄时不触发拖拽
  }

  // 记录初始位置，但不立即设置为拖拽状态
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY

  // 添加临时监听器，等待真正的拖拽开始
  document.addEventListener('mousemove', onDragStart)
  document.addEventListener('mouseup', cancelDrag)
}

// 检测是否开始真正拖拽（移动超过阈值时）
const onDragStart = (event: MouseEvent) => {
  const deltaX = Math.abs(event.clientX - dragStartX.value)
  const deltaY = Math.abs(event.clientY - dragStartY.value)
  const dragThreshold = 5 // 拖拽阈值，移动超过5px才认为是拖拽

  if (deltaX > dragThreshold || deltaY > dragThreshold) {
    // 真正开始拖拽
    isDragging.value = true
    emit('drag-start', event, props.indicator)

    // 移除临时监听器，添加拖拽监听器
    document.removeEventListener('mousemove', onDragStart)
    document.removeEventListener('mouseup', cancelDrag)
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }
}

// 取消拖拽（点击但没有移动足够距离）
const cancelDrag = () => {
  // 清理临时监听器
  document.removeEventListener('mousemove', onDragStart)
  document.removeEventListener('mouseup', cancelDrag)
}

// 拖拽中
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return

  // 这里可以添加拖拽过程中的逻辑
  // 例如更新卡片位置等
  event.preventDefault()
}

// 停止拖拽
const stopDrag = (event: MouseEvent) => {
  isDragging.value = false

  emit('drag-end', event)

  // 移除全局事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 开始调整大小
const startResize = (direction: 'right' | 'bottom' | 'corner', event: MouseEvent) => {
  isResizing.value = true
  resizeDirection.value = direction
  startX.value = event.clientX
  startY.value = event.clientY
  startWidth.value = props.indicator.xGrid || 1
  startHeight.value = props.indicator.yGrid || 1
  lastXGrid.value = startWidth.value
  lastYGrid.value = startHeight.value

  // 显示拖拽放置区域
  showDropZone.value = true

  // 添加全局事件监听器
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)

  event.preventDefault()
}

// 调整大小中
const onResize = (event: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = event.clientX - startX.value
  const deltaY = event.clientY - startY.value

  // 基于实际传入的网格单位计算（仅记录，不立刻提交保存）
  const unitW = props.gridUnitWidth || 1
  const unitH = props.gridUnitHeight || 120
  let newXGrid = startWidth.value
  let newYGrid = startHeight.value

  if (resizeDirection.value === 'right' || resizeDirection.value === 'corner') {
    newXGrid = Math.max(1, Math.min(props.gridColumns, startWidth.value + Math.round(deltaX / unitW)))
  }

  if (resizeDirection.value === 'bottom' || resizeDirection.value === 'corner') {
    newYGrid = Math.max(1, startHeight.value + Math.round(deltaY / unitH))
  }

  // 仅记录，最终在 stopResize 时一次性提交
  lastXGrid.value = newXGrid
  lastYGrid.value = newYGrid
  // 实时预览更新大小（不触发保存）
  emit('resize-preview', props.indicator.id, lastXGrid.value, lastYGrid.value)

  event.preventDefault()
}

// 停止调整大小
const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = 'right'

  // 隐藏拖拽放置区域
  showDropZone.value = false

  // 移除全局事件监听器
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)

  // 在鼠标松开时一次性提交保存
  emit('resize', props.indicator.id, lastXGrid.value, lastYGrid.value)
}

// 处理拖拽悬停事件
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  // 可以在这里添加视觉反馈
}

// 处理放置事件
const handleDrop = (event: DragEvent) => {
  // 隐藏拖拽放置区域
  showDropZone.value = false

  // 发送放置事件给父组件
  emit('card-drop', event)
}

// 显示拖拽放置区域的方法（可以由父组件调用）
const showDropArea = () => {
  showDropZone.value = true
}

// 隐藏拖拽放置区域的方法（可以由父组件调用）
const hideDropArea = () => {
  showDropZone.value = false
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    await loadPortalConfig()
    isInitialized = true
    await loadChartData()
  } catch (error) {
    console.error('ChartCard初始化失败:', error)
  }
})

// 组件卸载前清理
onBeforeUnmount(() => {
  isDestroyed.value = true
  chartData.value = []
  portalConfig.value = null
  // 清理防抖定时器
  debouncedLoadChartData.cancel()
})

// 暴露方法给父组件使用
defineExpose({
  showDropArea,
  hideDropArea
})
</script>

<style lang="less" scoped>
.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #d9d9d9;
  }

  &.chart-card-loading {
    opacity: 0.7;
  }

  .chart-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    cursor: move; // 只在标题区域显示移动光标

    .header-title {
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #262626;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;

      .anticon {
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        color: #666;
        transition: all 0.3s;

        &:hover {
          background: #f0f0f0;
          color: #1890ff;
        }
      }
    }
  }

  .chart-card-content {
    padding: 8px;
    height: calc(100% - 50px);
    position: relative;

    .chart-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .chart-container {
      height: 100%;
      min-height: 200px;
      display: flex;
      flex-direction: column;

      // 为图表设置适合卡片的样式
      :deep(.universal-chart-container) {
        --chart-min-height: 100%;
        --chart-min-height-sm: 100%;
        height: 100%;
        flex: 1;
        min-height: 0; // 允许收缩
        margin: 4px;
        padding: 4px; // 增加内边距，让图表距离边框更远
        box-shadow: none; // 移除多余阴影
        border-radius: 0; // 卡片内部不需要圆角
        background: transparent; // 使用卡片背景

        .echarts-container {
          height: 100% !important;
          min-height: 100% !important;
          flex: 1;
        }

        .ant-spin-nested-loading {
          height: 100%;
          min-height: 100%;

          .ant-spin-container {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
        }

        // 隐藏标题，使用卡片标题
        .chart-title {
          display: none;
        }
      }
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #bfbfbf;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    // 拖拽放置区域
    .drop-zone {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      border: 2px dashed #1890ff;
      border-radius: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
        pointer-events: all;
      }

      .drop-zone-content {
        text-align: center;
        color: #1890ff;

        .drop-zone-indicator {
          width: 40px;
          height: 40px;
          margin: 0 auto 10px;
          border: 2px dashed #1890ff;
          border-radius: 50%;
          position: relative;

          &::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            background: #1890ff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }
        }

        .drop-zone-text {
          font-size: 16px;
          font-weight: 500;
        }
      }
    }
  }

  // 调整大小手柄
  .resize-handle {
    position: absolute;
    background: #1890ff;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 10;

    &.right {
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      cursor: col-resize;
    }

    &.bottom {
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      cursor: row-resize;
    }

    &.corner {
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      cursor: nwse-resize;
      background: #1890ff;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M14,18H12V16H14V18M10,22H8V20H10V22M10,18H8V16H10V18M6,22H4V20H6V22M6,18H4V16H6V18M2,22H0V20H2V22M2,18H0V16H2V18Z'/%3E%3C/svg%3E") no-repeat center;
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M14,18H12V16H14V18M10,22H8V20H10V22M10,18H8V16H10V18M6,22H4V20H6V22M6,18H4V16H6V18M2,22H0V20H2V22M2,18H0V16H2V18Z'/%3E%3C/svg%3E") no-repeat center;
    }

    // 只有当鼠标悬停在手柄上时才显示
    &:hover {
      opacity: 1;
    }
  }

  // 拖拽时的样式
  &.dragging {
    opacity: 0.8;
    z-index: 999;
  }
}
</style>