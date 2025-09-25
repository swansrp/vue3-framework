<template>
  <div class="chart-grid-container">
    <div v-if="indicators.length === 0" class="empty-state">
      <div class="empty-content">
        <BarChartOutlined class="empty-icon" />
        <p>暂无图表，请添加指标</p>
      </div>
    </div>

    <div
      v-else class="chart-grid" ref="gridContainerRef" :style="{
        gridAutoRows: gridUnitHeight + 'px',
        gridTemplateColumns: `repeat(${props.gridColumns}, 1fr)`,
      }">
      <div
        v-for="indicator in localIndicators" :key="indicator.id" class="chart-item" :class="{
          'chart-item-placeholder': isDragging && draggingIndicator?.id === indicator.id,
        }" :style="{
          gridColumn: `${indicator.xPosition} / span ${Math.min(
            indicator.xGrid || 1,
            gridColumns
          )}`,
          gridRow: `${indicator.yPosition} / span ${indicator.yGrid || 1}`,
        }" :data-xgrid="indicator.xGrid" :data-ygrid="indicator.yGrid" :data-xposition="indicator.xPosition"
        :data-yposition="indicator.yPosition" @mousedown="startDrag($event, indicator)">
        <ChartCard
          :indicator="indicator" :loading="loading" :grid-unit-width="gridUnitWidth"
          :grid-unit-height="gridUnitHeight" :grid-columns="props.gridColumns"
          :can-edit="getIndicatorEditPermission(indicator)" :can-delete="getIndicatorDeletePermission(indicator)"
          :can-resize="getIndicatorResizePermission(indicator)" @edit="$emit('edit-indicator', indicator)"
          @delete="$emit('delete-indicator', [indicator.indicatorId || indicator.id])" @resize="handleResize"
          @resize-preview="onResizePreview" />
      </div>

      <!-- 拖拽占位符 -->
      <div
        v-if="isDragging && dragPosition" class="drag-placeholder"
        :class="{ 'drag-placeholder-overlap': isDragOverlapping }" :style="{
          gridColumn: `${dragPosition.col} / span ${Math.min(
            draggingIndicator?.xGrid || 1,
            gridColumns
          )}`,
          gridRow: `${dragPosition.row} / span ${draggingIndicator?.yGrid || 1}`,
        }"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { BarChartOutlined } from '@ant-design/icons-vue'
import ChartCard from './ChartCard.vue'
import type { DashboardItem } from '../types'

interface Props {
  indicators: DashboardItem[];
  loading: boolean;
  gridColumns?: number;
  canEditCommonIndicators?: boolean; // 是否可以编辑通用指标
  canEditPersonalIndicators?: boolean; // 是否可以编辑个人指标
  canDeleteCommonIndicators?: boolean; // 是否可以删除通用指标
  canDeletePersonalIndicators?: boolean; // 是否可以删除个人指标
  canResizeCommonIndicators?: boolean; // 是否可以调整通用指标大小
  canResizePersonalIndicators?: boolean; // 是否可以调整个人指标大小
}

interface Emits {
  (e: 'add-indicator', indicatorId: string[]): void;

  (e: 'edit-indicator', indicator: DashboardItem): void;

  (e: 'delete-indicator', indicatorId: string[]): void;

  (e: 'resize-indicator', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'reorder-indicators', newOrder: DashboardItem[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  indicators: () => [],
  loading: false,
  gridColumns: 7,
  canEditCommonIndicators: true,
  canEditPersonalIndicators: true,
  canDeleteCommonIndicators: true,
  canDeletePersonalIndicators: true,
  canResizeCommonIndicators: true,
  canResizePersonalIndicators: true
})

const emit = defineEmits<Emits>()

// 判断指标是否可以编辑
const getIndicatorEditPermission = (indicator: DashboardItem): boolean => {
  // commonStatistic 为 '1' 表示通用指标，否则为个人指标
  const isCommonIndicator = indicator.commonStatistic === '1'

  if (isCommonIndicator) {
    return props.canEditCommonIndicators ?? true
  } else {
    return props.canEditPersonalIndicators ?? true
  }
}

// 判断指标是否可以删除
const getIndicatorDeletePermission = (indicator: DashboardItem): boolean => {
  // commonStatistic 为 '1' 表示通用指标，否则为个人指标
  const isCommonIndicator = indicator.commonStatistic === '1'

  if (isCommonIndicator) {
    return props.canDeleteCommonIndicators ?? true
  } else {
    return props.canDeletePersonalIndicators ?? true
  }
}

// 判断指标是否可以调整大小
const getIndicatorResizePermission = (indicator: DashboardItem): boolean => {
  // commonStatistic 为 '1' 表示通用指标，否则为个人指标
  const isCommonIndicator = indicator.commonStatistic === '1'

  if (isCommonIndicator) {
    return props.canResizeCommonIndicators ?? true
  } else {
    return props.canResizePersonalIndicators ?? true
  }
}

// 本地预览用数据
const localIndicators = ref<DashboardItem[]>([])
watch(
  () => props.indicators,
  (val) => {
    localIndicators.value = val.map((v) => ({ ...v }))
  },
  { immediate: true, deep: true }
)

// 拖拽状态
const isDragging = ref(false)
const draggingIndicator = ref<DashboardItem | null>(null)
const dragPosition = ref<{ col: number; row: number } | null>(null)
const isDragOverlapping = ref(false) // 新增：检测是否重叠
const gridContainerRef = ref<HTMLDivElement | null>(null)
const gridUnitWidth = ref(0)
const gridUnitHeight = ref(120)
let resizeObserver: ResizeObserver | null = null

// 检查拖拽位置是否与其他卡片重叠
const checkDragOverlap = (
  position: { col: number; row: number },
  indicator: DashboardItem
) => {
  if (!indicator.xGrid || !indicator.yGrid) return false

  const dragLeft = position.col
  const dragRight = position.col + indicator.xGrid - 1
  const dragTop = position.row
  const dragBottom = position.row + indicator.yGrid - 1

  // 检查是否与任何其他卡片重叠
  for (const item of props.indicators) {
    // 跳过正在拖拽的卡片本身
    if (item.id === indicator.id) continue

    if (!item.xPosition || !item.yPosition || !item.xGrid || !item.yGrid) continue

    const itemLeft = item.xPosition
    const itemRight = item.xPosition + item.xGrid - 1
    const itemTop = item.yPosition
    const itemBottom = item.yPosition + item.yGrid - 1

    // 检查是否重叠
    if (
      dragLeft <= itemRight &&
      dragRight >= itemLeft &&
      dragTop <= itemBottom &&
      dragBottom >= itemTop
    ) {
      return true
    }
  }

  return false
}

// 开始拖拽
const startDrag = (e: MouseEvent, indicator: DashboardItem) => {
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
    const colWidth = containerRect.width / props.gridColumns
    const rowHeight = gridUnitHeight.value || 120

    const col = Math.floor(x / colWidth) + 1
    const row = Math.floor(y / rowHeight) + 1

    // 确保位置在有效范围内
    const validCol = Math.max(1, Math.min(col, props.gridColumns))
    const validRow = Math.max(1, row)

    // 更新拖拽位置
    const newPosition = { col: validCol, row: validRow }
    dragPosition.value = newPosition

    // 检查是否重叠
    if (draggingIndicator.value) {
      isDragOverlapping.value = checkDragOverlap(newPosition, draggingIndicator.value)
    }
  }

  const handleMouseUp = () => {
    if (isDragging.value && dragPosition.value && draggingIndicator.value) {
      // 只有在没有重叠时才处理拖拽结束逻辑
      if (!isDragOverlapping.value) {
        reorderIndicators(draggingIndicator.value.id, dragPosition.value)
      }
    }

    isDragging.value = false
    draggingIndicator.value = null
    dragPosition.value = null
    isDragOverlapping.value = false // 重置重叠状态

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 检查两个组件是否重叠
const isOverlapping = (
  item1: { xPosition: number; yPosition: number; xGrid: number; yGrid: number },
  item2: { xPosition: number; yPosition: number; xGrid: number; yGrid: number }
): boolean => {
  const left1 = item1.xPosition
  const right1 = item1.xPosition + item1.xGrid - 1
  const top1 = item1.yPosition
  const bottom1 = item1.yPosition + item1.yGrid - 1

  const left2 = item2.xPosition
  const right2 = item2.xPosition + item2.xGrid - 1
  const top2 = item2.yPosition
  const bottom2 = item2.yPosition + item2.yGrid - 1

  return !(right1 < left2 || right2 < left1 || bottom1 < top2 || bottom2 < top1)
}

// 查找下一个可用位置
const findNextAvailablePosition = (
  items: DashboardItem[],
  targetItem: { xPosition: number; yPosition: number; xGrid: number; yGrid: number },
  excludeId?: string
): { col: number; row: number } => {
  const gridColumns = props.gridColumns

  // 从目标组件的当前位置开始向下向右搜索
  let startRow = targetItem.yPosition

  while (true) {
    for (let row = startRow; row < startRow + 50; row++) { // 限制搜索范围防止无限循环
      for (let col = 1; col <= gridColumns - targetItem.xGrid + 1; col++) {
        const testPosition = {
          xPosition: col,
          yPosition: row,
          xGrid: targetItem.xGrid,
          yGrid: targetItem.yGrid
        }

        // 检查这个位置是否与任何现有组件重叠
        let hasConflict = false
        for (const item of items) {
          if (excludeId && item.id === excludeId) continue
          if (isOverlapping(testPosition, {
            xPosition: item.xPosition || 1,
            yPosition: item.yPosition || 1,
            xGrid: item.xGrid || 1,
            yGrid: item.yGrid || 1
          })) {
            hasConflict = true
            break
          }
        }

        if (!hasConflict) {
          return { col, row }
        }
      }
    }
    startRow += 1
    if (startRow > 100) { // 安全检查
      break
    }
  }

  // 如果找不到合适位置，返回一个安全的默认位置
  return { col: 1, row: startRow }
}

// 重新计算所有组件布局，避免重叠
const recalculateLayout = (
  indicators: DashboardItem[],
  changedItemId: string,
  newSize: { xGrid: number; yGrid: number }
): DashboardItem[] => {
  const result = [...indicators]
  const changedIndex = result.findIndex(item => item.id === changedItemId)

  if (changedIndex === -1) return result

  // 更新被修改组件的尺寸
  result[changedIndex] = {
    ...result[changedIndex],
    xGrid: newSize.xGrid,
    yGrid: newSize.yGrid
  }

  const changedItem = result[changedIndex]
  const affectedItems: DashboardItem[] = []

  // 找出所有与修改后的组件重叠的组件
  for (let i = 0; i < result.length; i++) {
    if (i === changedIndex) continue

    const item = result[i]
    if (isOverlapping(
      {
        xPosition: changedItem.xPosition || 1,
        yPosition: changedItem.yPosition || 1,
        xGrid: changedItem.xGrid || 1,
        yGrid: changedItem.yGrid || 1
      },
      {
        xPosition: item.xPosition || 1,
        yPosition: item.yPosition || 1,
        xGrid: item.xGrid || 1,
        yGrid: item.yGrid || 1
      }
    )) {
      affectedItems.push(item)
    }
  }

  // 为受影响的组件重新分配位置
  for (const affectedItem of affectedItems) {
    const newPosition = findNextAvailablePosition(
      result,
      {
        xPosition: affectedItem.xPosition || 1,
        yPosition: affectedItem.yPosition || 1,
        xGrid: affectedItem.xGrid || 1,
        yGrid: affectedItem.yGrid || 1
      },
      affectedItem.id
    )

    const affectedIndex = result.findIndex(item => item.id === affectedItem.id)
    if (affectedIndex !== -1) {
      result[affectedIndex] = {
        ...result[affectedIndex],
        xPosition: newPosition.col,
        yPosition: newPosition.row
      }
    }
  }

  return result
}

// 重新排序指标
const reorderIndicators = (
  indicatorId: string,
  position: { col: number; row: number }
) => {
  // 创建当前指标的副本
  const newOrder = [...props.indicators]
  const movedIndex = newOrder.findIndex((c) => c.id === indicatorId)

  if (movedIndex > -1) {
    // 更新被移动元素的位置信息
    newOrder[movedIndex].xPosition = position.col
    newOrder[movedIndex].yPosition = position.row

    // 发出重新排序事件，但不改变数组顺序
    emit('reorder-indicators', newOrder)
  }
}

// 处理调整大小
const handleResize = (indicatorId: string, xGrid: number, yGrid: number) => {
  // 重新计算布局，避免重叠
  const newLayout = recalculateLayout(
    props.indicators,
    indicatorId,
    { xGrid, yGrid }
  )

  // 发出重新排序事件以应用新的布局
  emit('reorder-indicators', newLayout)

  // 同时发出调整大小事件（用于保存到服务器）
  emit('resize-indicator', indicatorId, xGrid, yGrid)
}

// 仅用于预览的尺寸更新
const onResizePreview = (indicatorId: string, xGrid: number, yGrid: number) => {
  const idx = localIndicators.value.findIndex((i) => i.id === indicatorId)
  if (idx !== -1) {
    localIndicators.value[idx] = { ...localIndicators.value[idx], xGrid, yGrid }
  }
}

// 生命周期
onMounted(() => {
  const calcUnits = () => {
    if (!gridContainerRef.value) return
    const rect = gridContainerRef.value.getBoundingClientRect()
    gridUnitWidth.value = rect.width / props.gridColumns
    // 使行高等于列宽，从而形成正方形网格单元
    gridUnitHeight.value = gridUnitWidth.value
  }
  // 首次渲染后计算
  nextTick(calcUnits)
  // 监听窗口尺寸
  window.addEventListener('resize', calcUnits)
  // 监听容器尺寸变更（首次加载数据或侧边栏收起/展开）
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => calcUnits())
    if (gridContainerRef.value) resizeObserver.observe(gridContainerRef.value)
  }
  // 指标数据变化后，等待 DOM 更新再计算
  watch(
    () => props.indicators,
    async () => {
      await nextTick()
      calcUnits()
    }
  )
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('resize', () => {
  })
  if (resizeObserver && gridContainerRef.value) {
    resizeObserver.unobserve(gridContainerRef.value)
    resizeObserver.disconnect()
    resizeObserver = null
  }
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
    gap: 16px;

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

      // 重叠时的样式
      &.drag-placeholder-overlap {
        background: #fff1f0;
        border: 2px dashed #ff4d4f;
      }
    }
  }
}
</style>
