<template>
  <div class="chart-grid-container">
    <div
      v-if="indicators.length === 0"
      class="empty-state"
    >
      <div class="empty-content">
        <BarChartOutlined class="empty-icon" />
        <p>暂无图表，请添加指标</p>
      </div>
    </div>

    <div
      v-else
      ref="gridContainerRef"
      class="chart-grid"
      :style="{
        gridAutoRows: gridUnitHeight + 'px',
        gridTemplateColumns: `repeat(${props.gridColumns}, 1fr)`,
      }"
    >
      <div
        v-for="indicator in displayIndicators"
        :key="`${indicator.id}-${chartRefreshKey}`"
        class="chart-item"
        :class="{
          'chart-item-placeholder': isDragging && draggingIndicator?.id === indicator.id,
        }"
        :style="{
          gridColumn: `${indicator.xPosition} / span ${Math.min(
            indicator.xGrid || 1,
            gridColumns
          )}`,
          gridRow: `${indicator.yPosition} / span ${indicator.yGrid || 1}`,
        }"
        :data-chart-id="indicator.id"
        :data-xgrid="indicator.xGrid"
        :data-ygrid="indicator.yGrid"
        :data-xposition="indicator.xPosition"
        :data-yposition="indicator.yPosition"
        @mousedown="startDrag($event, indicator)"
      >
        <ChartCard
          :ref="el => setChartCardRef(el, indicator.id)"
          :indicator="indicator"
          :loading="loading"
          :grid-unit-width="gridUnitWidth"
          :grid-unit-height="gridUnitHeight"
          :grid-columns="props.gridColumns"
          :can-edit="getIndicatorEditPermission(indicator)"
          :can-delete="getIndicatorDeletePermission(indicator)"
          :can-resize="getIndicatorResizePermission(indicator)"
          :can-drag="props.canDrag"
          :portal-config="props.portalConfig"
          @edit="$emit('edit-indicator', indicator)"
          @delete="$emit('delete-indicator', [indicator.indicatorId || indicator.id])"
          @resize="handleResize"
          @resize-preview="onResizePreview"
          @move-card="handleMoveCard"
        />
      </div>

      <!-- 拖拽占位符 -->
      <div
        v-if="isDragging && dragPosition"
        class="drag-placeholder"
        :class="{ 'drag-placeholder-overlap': isDragOverlapping }"
        :style="{
          gridColumn: `${dragPosition.col} / span ${Math.min(
            draggingIndicator?.xGrid || 1,
            gridColumns
          )}`,
          gridRow: `${dragPosition.row} / span ${draggingIndicator?.yGrid || 1}`,
        }"
      ></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { BarChartOutlined } from '@ant-design/icons-vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import ChartCard from './ChartCard.vue'
import type { DashboardItem } from './types'

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
  canDrag?: boolean; // 是否可以拖动卡片
  portalConfig?: any; // 外部传入的 Portal 配置，避免重复请求
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
  canResizePersonalIndicators: true,
  canDrag: true,
  portalConfig: undefined
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

// 拖拽状态(必须在下方 immediate watch 之前声明,否则回调里引用 isDragging 会拿到 undefined)
const isDragging = ref(false)
const draggingIndicator = ref<DashboardItem | null>(null)
const dragPosition = ref<{ col: number; row: number } | null>(null)
const isDragOverlapping = ref(false) // 兼容模板引用,新逻辑下不再用于阻断
const gridContainerRef = ref<HTMLDivElement | null>(null)
const gridUnitWidth = ref(0)
const gridUnitHeight = ref(120)
let resizeObserver: ResizeObserver | null = null

// 插入式拖拽:实时重排的预览数据(已带新坐标),松开鼠标时一次性提交
const previewIndicators = ref<DashboardItem[]>([])
let dragRafId: number | null = null

// 本地预览用数据
const localIndicators = ref<DashboardItem[]>([])
watch(
  () => props.indicators,
  (val) => {
    localIndicators.value = val.map((v) => ({ ...v }))
  },
  { immediate: true, deep: true }
)

// 拖拽中渲染预览数据,非拖拽渲染本地数据
const displayIndicators = computed(() =>
  isDragging.value && previewIndicators.value.length > 0
    ? previewIndicators.value
    : localIndicators.value
)

// ===== 网格重排工具函数 =====

// 读取卡片矩形(1-based, 闭区间)
const getItemRect = (item: DashboardItem) => ({
  col: item.xPosition || 1,
  row: item.yPosition || 1,
  w: Math.min(item.xGrid || 1, props.gridColumns),
  h: item.yGrid || 1
})

// 阅读顺序排序:先按行(上→下),同行按列(左→右)
const sortByReadingOrder = (a: DashboardItem, b: DashboardItem) => {
  const ay = a.yPosition || 1
  const by = b.yPosition || 1
  if (ay !== by) return ay - by
  return (a.xPosition || 1) - (b.xPosition || 1)
}

// 紧凑打包:按给定顺序从左上角 first-fit 分配坐标,返回带新坐标的新数组
const compactLayout = (items: DashboardItem[]): DashboardItem[] => {
  const gridColumns = props.gridColumns
  const occupied = new Set<string>()
  const result: DashboardItem[] = []

  const canPlace = (x: number, y: number, w: number, h: number) => {
    if (x < 1 || y < 1 || x + w - 1 > gridColumns) return false
    for (let cx = x; cx < x + w; cx++) {
      for (let cy = y; cy < y + h; cy++) {
        if (occupied.has(`${cx},${cy}`)) return false
      }
    }
    return true
  }

  // 搜索上界:当前最大行 + 所有用的高度之和(足够宽松),并设最小值
  const baseMaxY = items.reduce(
    (m, it) => Math.max(m, (it.yPosition || 1) + (it.yGrid || 1)),
    1
  )
  const sumH = items.reduce((m, it) => m + (it.yGrid || 1), 0)
  const maxY = Math.max(50, baseMaxY + sumH)

  for (const item of items) {
    const w = Math.min(item.xGrid || 1, gridColumns)
    const h = item.yGrid || 1
    let placed = false
    for (let y = 1; y <= maxY && !placed; y++) {
      for (let x = 1; x <= gridColumns - w + 1; x++) {
        if (canPlace(x, y, w, h)) {
          result.push({ ...item, xPosition: x, yPosition: y, xGrid: w, yGrid: h })
          for (let cx = x; cx < x + w; cx++) {
            for (let cy = y; cy < y + h; cy++) occupied.add(`${cx},${cy}`)
          }
          placed = true
          break
        }
      }
    }
    if (!placed) {
      const fy = result.reduce(
        (m, it) => Math.max(m, (it.yPosition || 1) + (it.yGrid || 1)),
        1
      )
      result.push({ ...item, xPosition: 1, yPosition: fy, xGrid: w, yGrid: h })
    }
  }
  return result
}

// 中心线插入重排(纯函数,无状态):基于鼠标位置与其他卡片(原始位置)的中心线比较,确定插入点
// 同一鼠标位置永远产出同一结果,从根本上杜绝“命中→插入→位移→不再命中→追加”的反馈环振荡
const reorderByInsert = (
  snapshot: DashboardItem[],
  dragItem: DashboardItem,
  hitCol: number,
  hitRow: number
): DashboardItem[] => {
  // 基于冻结快照取其他卡片(位置稳定),按阅读顺序排序
  const others = snapshot.filter(it => it.id !== dragItem.id).sort(sortByReadingOrder)

  // 遍历其他卡片,找到第一个中心线在鼠标下方的卡片 → 插到它前面
  // 若所有卡片中心线都在鼠标上方 → 追加到末尾
  let insertAt = others.length
  for (let i = 0; i < others.length; i++) {
    const r = getItemRect(others[i])
    const centerY = r.row + (r.h - 1) / 2
    if (hitRow <= centerY) {
      insertAt = i
      break
    }
  }

  others.splice(insertAt, 0, dragItem)
  return compactLayout(others)
}

// 置顶/置底重排
const reorderByMove = (
  items: DashboardItem[],
  dragItem: DashboardItem,
  position: 'top' | 'bottom'
): DashboardItem[] => {
  const others = items.filter(it => it.id !== dragItem.id).sort(sortByReadingOrder)
  const ordered = position === 'top' ? [dragItem, ...others] : [...others, dragItem]
  return compactLayout(ordered)
}

// 保持原始数组顺序输出(仅坐标变化),与父组件按索引比较的逻辑兼容,且渲染更稳定
const preserveOrder = (rearranged: DashboardItem[]): DashboardItem[] => {
  return props.indicators
    .map(orig => rearranged.find(it => it.id === orig.id))
    .filter((x): x is DashboardItem => !!x)
}

// 比较两组卡片的坐标/尺寸是否完全一致(用于去重,避免无变化时仍赋新数组触发重渲染)
const layoutsEqual = (a: DashboardItem[], b: DashboardItem[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (x.id !== y.id) return false
    if ((x.xPosition || 1) !== (y.xPosition || 1)) return false
    if ((x.yPosition || 1) !== (y.yPosition || 1)) return false
    if ((x.xGrid || 1) !== (y.xGrid || 1)) return false
    if ((x.yGrid || 1) !== (y.yGrid || 1)) return false
  }
  return true
}

// 视口自动滚动(拖到顶/底边缘时滚动页面,解决"拖不到底")
const autoScrollIfNeeded = (clientY: number) => {
  const margin = 60
  const vh = window.innerHeight
  let dy = 0
  if (clientY < margin) dy = -Math.max(6, (margin - clientY) * 0.4)
  else if (clientY > vh - margin) dy = Math.max(6, (clientY - (vh - margin)) * 0.4)
  if (dy !== 0) window.scrollBy({ top: dy })
}

// 开始拖拽(插入式排序:其他卡片自动腾位)
// 拖拽开始时冻结一份快照,整个拖拽过程中命中检测都基于这份稳定快照,避免反馈环振荡
let dragSnapshot: DashboardItem[] = []
const startDrag = (e: MouseEvent, indicator: DashboardItem) => {
  if (!props.canDrag) return

  // 只有在点击卡片标题栏时才允许拖拽
  const target = e.target as HTMLElement
  if (!target.closest('.chart-card-header')) return

  e.preventDefault()
  isDragging.value = true
  draggingIndicator.value = indicator
  // 冻结快照:整个拖拽过程中以此作为命中检测的稳定参照
  dragSnapshot = props.indicators.map(v => ({ ...v }))
  // 预览初始化为当前布局副本
  previewIndicators.value = props.indicators.map(v => ({ ...v }))

  const computeGridPos = (clientX: number, clientY: number) => {
    if (!gridContainerRef.value) return null
    const rect = gridContainerRef.value.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const colWidth = rect.width / props.gridColumns
    const rowHeight = gridUnitHeight.value || 120
    const col = Math.max(1, Math.min(Math.floor(x / colWidth) + 1, props.gridColumns))
    const row = Math.max(1, Math.floor(y / rowHeight) + 1)
    return { col, row }
  }

  // 用 requestAnimationFrame 节流,避免每次 mousemove 都重排
  let pending: { col: number; row: number } | null = null
  const flush = () => {
    dragRafId = null
    if (!pending || !draggingIndicator.value) return
    const { col, row } = pending
    // 中心线插入算法基于冻结快照计算新布局(纯函数,无状态)
    const rearranged = preserveOrder(reorderByInsert(
      dragSnapshot,
      draggingIndicator.value,
      col,
      row
    ))
    const changed = !layoutsEqual(previewIndicators.value, rearranged)
    // 仅在坐标真正变化时才更新,避免无意义重渲染
    if (changed) {
      previewIndicators.value = rearranged
    }
    // 蓝色虚线框跟随拖动卡片的新位置(去重赋值)
    const me = rearranged.find(it => it.id === draggingIndicator.value!.id)
    if (me) {
      const np = { col: me.xPosition || 1, row: me.yPosition || 1 }
      if (!dragPosition.value || dragPosition.value.col !== np.col || dragPosition.value.row !== np.row) {
        dragPosition.value = np
      }
    }
  }

  const schedule = (pos: { col: number; row: number }) => {
    pending = pos
    if (dragRafId === null) dragRafId = requestAnimationFrame(flush)
  }

  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return
    autoScrollIfNeeded(moveEvent.clientY)
    const pos = computeGridPos(moveEvent.clientX, moveEvent.clientY)
    if (pos) schedule(pos)
  }

  const handleMouseUp = () => {
    if (dragRafId !== null) {
      cancelAnimationFrame(dragRafId)
      dragRafId = null
    }
    flush() // 确保最后一次重排生效

    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    if (isDragging.value && previewIndicators.value.length > 0) {
      emit('reorder-indicators', previewIndicators.value)
    }
    isDragging.value = false
    draggingIndicator.value = null
    dragPosition.value = null
    isDragOverlapping.value = false
    previewIndicators.value = []
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 处理"移到最前/移到最后"
const handleMoveCard = (id: string, position: 'top' | 'bottom') => {
  if (!props.canDrag) return
  const target = props.indicators.find(it => it.id === id)
  if (!target) return
  const rearranged = reorderByMove(props.indicators, target, position)
  emit('reorder-indicators', preserveOrder(rearranged))
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

const calcUnits = () => {
  if (!gridContainerRef.value) return
  const rect = gridContainerRef.value.getBoundingClientRect()

  // 在弹窗中，需要确保容器有实际的尺寸
  if (rect.width === 0 || rect.height === 0) {
    // 如果容器尺寸为0，延迟重新计算
    setTimeout(() => calcUnits(), 100)
    return
  }

  gridUnitWidth.value = rect.width / props.gridColumns
  // 使行高等于列宽，从而形成正方形网格单元
  gridUnitHeight.value = gridUnitWidth.value
}

// 强制重新计算布局
const forceRecalculateLayout = () => {
  setTimeout(() => calcUnits(), 50)
}

// 生命周期
onMounted(() => {

  // 首次渲染后计算，增加延迟确保容器完全渲染
  nextTick(() => {
    setTimeout(() => calcUnits(), 50)
  })

  // 监听窗口尺寸
  window.addEventListener('resize', calcUnits)
  // 监听容器尺寸变更（首次加载数据或侧边栏收起/展开）
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      // 添加防抖，避免频繁计算
      setTimeout(() => calcUnits(), 10)
    })
    if (gridContainerRef.value) resizeObserver.observe(gridContainerRef.value)
  }
  // 指标数据变化后，等待 DOM 更新再计算
  watch(
    () => props.indicators,
    async () => {
      await nextTick()
      setTimeout(() => calcUnits(), 50)
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

// 存储所有 ChartCard 的引用
const chartCardRefs = new Map<string, any>()

// 设置 ChartCard 引用
const setChartCardRef = (el: any, id: string) => {
  if (el) {
    chartCardRefs.set(id, el)
  } else {
    chartCardRefs.delete(id)
  }
}

// 刷新所有图表（用于配置更新后强制重新渲染）
const chartRefreshKey = ref(0)
const refreshAllCharts = async () => {
  // 通过修改key值强制重新渲染所有ChartCard组件
  chartRefreshKey.value++
  await nextTick()

  // 强制每个卡片重新加载数据
  const refreshPromises = Array.from(chartCardRefs.values()).map(cardRef => {
    if (cardRef && typeof cardRef.forceRefresh === 'function') {
      return cardRef.forceRefresh()
    }
    return Promise.resolve()
  })

  await Promise.all(refreshPromises)
}

// 暴露方法给父组件
defineExpose({
  forceRecalculateLayout,
  refreshAllCharts
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
      // 只过渡视觉属性,不要 all(all 会拖慢 placeholder 的 opacity/transform 变化,让拖拽显得迟钝)
      transition: box-shadow 0.2s ease, border-color 0.2s ease;

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

    // 被拖动的卡片:立即响应,不要任何过渡(否则会“飘”到新位置,与鼠标错位显得迟钝)
    .chart-item-placeholder {
      opacity: 0.4;
      transform: scale(0.96);
      transition: none;
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