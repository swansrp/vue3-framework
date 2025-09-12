<template>
  <div 
    class="chart-card" 
    :class="{ 'chart-card-loading': loading, 'dragging': isDragging }"
    @mousedown="startDrag"
  >
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
      <div v-else-if="hasData" class="chart-container">
        <!-- 使用现有的ChartDisplayArea组件来显示图表 -->
        <ChartDisplayArea
          ref="chartDisplayAreaRef"
          :config="chartConfig"
          :received-data="chartData"
          @chart-generated="onChartGenerated"
        />
      </div>
      <div v-else class="chart-empty">
        <BarChartOutlined class="empty-icon" />
        <p>暂无数据</p>
      </div>
    </div>

    <!-- 调整大小的拖拽手柄 -->
    <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
    <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
    <div class="resize-handle corner" @mousedown="startResize('corner', $event)"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import ChartDisplayArea from '@/framework/components/common/Portal/dashboard/indicator/dashboard/ChartDisplayArea.vue'
import type { IndicatorTreeNode } from '../types'

interface Props {
  indicator: IndicatorTreeNode
  loading: boolean
}

interface Emits {
  (e: 'edit'): void

  (e: 'delete'): void

  (e: 'resize', indicatorId: string, xGrid: number, yGrid: number): void

  (e: 'drag-start', event: MouseEvent, indicator: IndicatorTreeNode): void

  (e: 'drag-end', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  indicator: () => ({}) as IndicatorTreeNode,
  loading: false
})

const emit = defineEmits<Emits>()

// 组件引用
const chartDisplayAreaRef = ref()

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

// 图表配置
const chartConfig = computed(() => ({
  url: props.indicator.config?.url || '',
  columns: props.indicator.config?.columns || []
}))

// 图表数据
const chartData = ref<any>(null)
const hasData = computed(() => !!chartData.value && chartData.value.length > 0)

// 监听配置变化
watch(() => props.indicator, () => {
  loadChartData()
}, { deep: true })

// 加载图表数据
const loadChartData = async () => {
  // 模拟加载数据
  // 实际应用中应该调用后端API获取数据
  try {
    // 这里应该根据indicator中的参数调用相应的API获取数据
    // 暂时使用模拟数据
    chartData.value = [
      // 模拟数据
    ]
  } catch (error) {
    console.error('加载图表数据失败:', error)
    message.error('加载图表数据失败')
  }
}

// 图表生成完成事件
const onChartGenerated = (data: any) => {
  console.log('图表生成完成:', data)
}

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

  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY

  emit('drag-start', event, props.indicator)

  // 添加全局事件监听器
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
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

  // 计算新的网格大小 (假设每个网格单位大约为100px)
  const gridUnit = 100
  let newXGrid = startWidth.value
  let newYGrid = startHeight.value

  if (resizeDirection.value === 'right' || resizeDirection.value === 'corner') {
    newXGrid = Math.max(1, Math.min(5, startWidth.value + Math.round(deltaX / gridUnit)))
  }

  if (resizeDirection.value === 'bottom' || resizeDirection.value === 'corner') {
    newYGrid = Math.max(1, Math.min(3, startHeight.value + Math.round(deltaY / gridUnit)))
  }

  // 实时更新网格大小
  emit('resize', props.indicator.id, newXGrid, newYGrid)
  
  event.preventDefault()
}

// 停止调整大小
const stopResize = (event: MouseEvent) => {
  isResizing.value = false
  resizeDirection.value = 'right'

  // 移除全局事件监听器
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  
  message.success('调整大小成功')
}

// 组件挂载时加载数据
onMounted(() => {
  loadChartData()
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
  cursor: move; // 添加拖拽手型光标

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
    padding: 16px;
    height: calc(100% - 50px);

    .chart-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .chart-container {
      height: 100%;
      min-height: 200px;
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
  }

  // 调整大小手柄
  .resize-handle {
    position: absolute;
    background: #1890ff;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 10;

    &:hover {
      opacity: 1;
    }

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
  }

  &:hover .resize-handle {
    opacity: 0.7;
  }

  // 拖拽时的样式
  &.dragging {
    opacity: 0.8;
    transform: rotate(5deg);
    z-index: 999;
  }
}
</style>