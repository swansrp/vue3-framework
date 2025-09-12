<template>
  <div class="chart-grid-container">
    <div v-if="indicators.length === 0" class="empty-state">
      <div class="empty-content">
        <BarChartOutlined class="empty-icon" />
        <p>暂无图表，请添加指标</p>
        <a-button type="primary" @click="$emit('add-indicator')">
          <PlusOutlined />
          添加指标
        </a-button>
      </div>
    </div>

    <div v-else class="chart-grid" ref="gridContainerRef">
      <div
        v-for="indicator in indicators"
        :key="indicator.id"
        class="chart-item"
        :class="{ 'chart-item-placeholder': isDragging && draggingIndicator?.id === indicator.id }"
        :style="{
          gridColumn: `span ${Math.min(indicator.xGrid || 1, gridColumns)}`,
          gridRow: `span ${indicator.yGrid || 1}`
        }"
        @mousedown="startDrag($event, indicator)"
      >
        <ChartCard
          :indicator="indicator"
          :loading="loading"
          @edit="$emit('edit-indicator', indicator)"
          @delete="$emit('delete-indicator', indicator.id)"
          @resize="handleResize"
          @drag-start="onCardDragStart"
          @drag-end="onCardDragEnd"
        />
      </div>

      <!-- 拖拽占位符 -->
      <div
        v-if="isDragging && dragPosition"
        class="drag-placeholder"
        :style="{
          gridColumn: `${dragPosition.col} / span ${Math.min(draggingIndicator?.xGrid || 1, gridColumns)}`,
          gridRow: `${dragPosition.row} / span ${draggingIndicator?.yGrid || 1}`
        }"
      ></div>
    </div>

    <!-- 添加指标按钮 -->
    <div class="add-indicator-button">
      <a-button type="primary" size="large" shape="circle" @click="$emit('add-indicator')">
        <PlusOutlined />
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons-vue'
import ChartCard from './ChartCard.vue'
import type { IndicatorTreeNode } from '../types'

interface Props {
  indicators: IndicatorTreeNode[]
  loading: boolean
}

interface Emits {
  (e: 'add-indicator'): void

  (e: 'edit-indicator', indicator: IndicatorTreeNode): void

  (e: 'delete-indicator', indicatorId: string): void

  (e: 'resize-indicator', indicatorId: string, xGrid: number, yGrid: number): void

  (e: 'reorder-indicators', newOrder: IndicatorTreeNode[]): void
}

const props = withDefaults(defineProps<Props>(), {
  indicators: () => [],
  loading: false
})

const emit = defineEmits<Emits>()

// 拖拽状态
const isDragging = ref(false)
const draggingIndicator = ref<IndicatorTreeNode | null>(null)
const dragPosition = ref<{ col: number; row: number } | null>(null)
const gridContainerRef = ref<HTMLDivElement | null>(null)

// 卡片拖拽状态
const isCardResizing = ref(false)

// 网格配置
const gridColumns = 5 // 每行最多5个格子

// 计算网格行数以适应所有卡片
const gridRows = computed(() => {
  // 根据卡片位置和大小计算需要的行数
  let maxRow = 1
  props.indicators.forEach(indicator => {
    const row = indicator.yGrid || 1
    if (row > maxRow) {
      maxRow = row
    }
  })
  return Math.max(maxRow, 5) // 至少5行
})

// 开始拖拽
const startDrag = (e: MouseEvent, indicator: IndicatorTreeNode) => {
  // 只有在点击卡片标题栏时才允许拖拽
  const target = e.target as HTMLElement
  if (!target.closest('.chart-card-header')) return

  isDragging.value = true
  draggingIndicator.value = indicator

  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value || !gridContainerRef.value) return

    const containerRect = gridContainerRef.value.getBoundingClientRect()
    const x = moveEvent.clientX - containerRect.left
    const y = moveEvent.clientY - containerRect.top

    // 计算网格位置
    const colWidth = containerRect.width / gridColumns
    const rowHeight = colWidth // 正方形网格，高度等于宽度

    const col = Math.floor(x / colWidth) + 1
    const row = Math.floor(y / rowHeight) + 1

    // 确保位置在有效范围内
    const validCol = Math.max(1, Math.min(col, gridColumns - (indicator.xGrid || 1) + 1))
    const validRow = Math.max(1, row)

    dragPosition.value = { col: validCol, row: validRow }
  }

  const handleMouseUp = () => {
    if (isDragging.value && dragPosition.value && draggingIndicator.value) {
      // 处理拖拽结束逻辑
      reorderIndicators(draggingIndicator.value.id, dragPosition.value)
    }

    isDragging.value = false
    draggingIndicator.value = null
    dragPosition.value = null

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 重新排序指标
const reorderIndicators = (indicatorId: string, position: { col: number; row: number }) => {
  // 简化的重新排序逻辑
  // 实际应用中需要根据position计算新的顺序
  const newOrder = [...props.indicators]
  const movedIndex = newOrder.findIndex(c => c.id === indicatorId)

  if (movedIndex > -1) {
    const [movedItem] = newOrder.splice(movedIndex, 1)
    // 简单地将图表移到数组末尾
    newOrder.push(movedItem)
    emit('reorder-indicators', newOrder)
  }
}

// 处理调整大小
const handleResize = (indicatorId: string, xGrid: number, yGrid: number) => {
  emit('resize-indicator', indicatorId, xGrid, yGrid)
}

// 卡片开始拖拽事件
const onCardDragStart = (event: MouseEvent, indicator: IndicatorTreeNode) => {
  // 卡片开始拖拽时的处理逻辑
  console.log('卡片开始拖拽:', indicator.id)
}

// 卡片结束拖拽事件
const onCardDragEnd = (event: MouseEvent) => {
  // 卡片结束拖拽时的处理逻辑
  console.log('卡片结束拖拽')
}

// 生命周期
onMounted(() => {
  // 可以在这里添加键盘事件监听等
})

onUnmounted(() => {
  // 清理事件监听
})
</script>

<style lang="less" scoped>
.chart-grid-container {
  position: relative;
  height: 100%;
  padding: 16px;
  background: #f5f5f5;

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .empty-content {
      text-align: center;
      color: #8c8c8c;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      p {
        margin: 0 0 24px 0;
        font-size: 16px;
      }
    }
  }

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr); // 5等分
    grid-auto-rows: 1fr; // 自动行高
    gap: 16px;
    height: calc(100% - 64px); // 减去添加按钮区域的高度
    aspect-ratio: 5 / 5; // 保持5:5的正方形比例

    .chart-item {
      position: relative;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e8e8e8;
      overflow: hidden;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-color: #d9d9d9;
      }

      // 卡片内容
      :deep(.chart-card) {
        width: 100%;
        height: 100%;
      }
    }

    .chart-item-placeholder {
      opacity: 0.5;
      transform: scale(0.95);
    }

    // 拖拽占位符
    .drag-placeholder {
      background: #e6f7ff;
      border: 2px dashed #1890ff;
      border-radius: 8px;
      opacity: 0.7;
    }
  }

  .add-indicator-button {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 10;
  }
}
</style>
