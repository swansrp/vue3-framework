<template>
  <div
    :class="{ 'chart-card-loading': loading, dragging: isDragging }"
    class="chart-card"
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

      <!-- 蓝色虚线框 - 拖拽放置区域 -->
      <div
        :class="{ visible: showDropZone }"
        class="drop-zone"
        @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop"
      >
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
import ChartDisplayArea from '@/framework/components/common/Portal/dashboard/indicator/dashboard/ChartDisplayArea.vue'
import type { DashboardItem } from '../types'
import { message } from 'ant-design-vue'
import { BarChartOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, ReloadOutlined } from '@ant-design/icons-vue'

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
const lastXGrid = ref(1)
const lastYGrid = ref(1)

// 拖拽放置区域状态
const showDropZone = ref(false)

// 图表配置
const chartConfig = computed(() => ({
  url: props.indicator.config?.url || '',
  columns: props.indicator.config?.columns || []
}))

// 图表数据
const chartData = ref<any>(null)
const hasData = computed(() => !!chartData.value && chartData.value.length > 0)

// 监听配置变化
watch(
    () => props.indicator,
    () => {
      loadChartData()
    },
    { deep: true }
)

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
onMounted(() => {
  loadChartData()
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
    padding: 16px;
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