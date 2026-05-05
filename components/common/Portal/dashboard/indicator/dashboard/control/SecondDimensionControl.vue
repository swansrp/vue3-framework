<template>
  <div class="tab-content">
    <a-checkbox-group v-model:value="localVisibleDimensions">
      <transition-group
        name="drag-list"
        tag="div"
        class="checkbox-list"
      >
        <div
          v-for="(dimension, index) in localAllDimensions"
          :key="dimension"
          class="checkbox-item-wrapper"
          :class="{
            'drag-over': dragOverIndex === index && draggedItemIndex !== null,
            'dragging': draggedItemIndex === index
          }"
          @dragover="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
        >
          <span
            class="drag-handle"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragend="handleDragEnd($event)"
          >
            <HolderOutlined />
          </span>
          <a-checkbox :value="dimension">
            <a-tooltip
              :title="dimension"
              placement="top"
            >
              <span class="checkbox-text">{{ dimension }}</span>
            </a-tooltip>
          </a-checkbox>
        </div>
      </transition-group>
    </a-checkbox-group>
    <div class="tab-actions">
      <a-button
        size="small"
        type="link"
        @click="toggleAll"
      >
        全部选中
      </a-button>
      <a-button
        size="small"
        type="link"
        :disabled="isInvertDisabled"
        @click="invertSelection"
      >
        反选
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HolderOutlined } from '@ant-design/icons-vue'
import { computed, ref, nextTick } from 'vue'

// Props
const props = defineProps<{
  visibleDimensions: string[]
  allDimensions: string[]
  receivedData?: any
}>()

// Emits
const emit = defineEmits<{
  'update:visibleDimensions': [value: string[]]
  'update:allDimensions': [value: string[]]
  'orderChanged': []
}>()

// 拖拽状态
const draggedItemIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const originalOrder = ref<string[]>([])
const isMoving = ref(false)
const isDragging = ref(false) // 标记是否正在拖拽
let moveTimeout: number | null = null

// 本地拖拽临时数组
const tempAllDimensions = ref<string[]>([])

// 使用计算属性实现双向绑定
const localVisibleDimensions = computed({
  get: () => props.visibleDimensions,
  set: (val) => emit('update:visibleDimensions', val)
})

// 显示的维度数组（拖拽时使用临时数组）
const localAllDimensions = computed({
  get: () => isDragging.value ? tempAllDimensions.value : props.allDimensions,
  set: (val) => {
    if (isDragging.value) {
      tempAllDimensions.value = val
    } else {
      emit('update:allDimensions', val)
    }
  }
})

// 计算属性
const isInvertDisabled = computed(() => {
  return (
    localVisibleDimensions.value.length === 0 ||
    localVisibleDimensions.value.length === localAllDimensions.value.length
  )
})

// 拖拽开始
const handleDragStart = (event: DragEvent, index: number) => {
  event.stopPropagation() // 阻止事件冒泡
  isDragging.value = true
  draggedItemIndex.value = index
  tempAllDimensions.value = [...props.allDimensions]
  originalOrder.value = [...props.allDimensions]
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖拽放下
const handleDrop = async (event: DragEvent, _dropIndex: number) => {
  event.preventDefault()
  event.stopPropagation() // 阻止事件冒泡

  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
    moveTimeout = null
  }

  // 提交临时数组到父组件
  const newOrder = [...tempAllDimensions.value]

  // 清除拖拽状态
  isDragging.value = false
  draggedItemIndex.value = null
  originalOrder.value = []
  dragOverIndex.value = null
  isMoving.value = false

  // 更新父组件
  emit('update:allDimensions', newOrder)

  await nextTick()
  emit('orderChanged')
}

// 拖拽悬停
const handleDragOver = (event: DragEvent, index?: number) => {
  event.preventDefault()
  event.stopPropagation() // 阻止事件冒泡

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  if (
    isMoving.value ||
    index === undefined ||
    draggedItemIndex.value === null ||
    index === draggedItemIndex.value
  ) {
    return
  }

  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
  }

  moveTimeout = window.setTimeout(() => {
    if (draggedItemIndex.value === null || index === draggedItemIndex.value || isMoving.value) {
      return
    }

    isMoving.value = true
    dragOverIndex.value = index

    const dragIndex = draggedItemIndex.value

    try {
      const newOrder = [...localAllDimensions.value]
      const [draggedItem] = newOrder.splice(dragIndex, 1)
      newOrder.splice(index, 0, draggedItem)
      localAllDimensions.value = newOrder

      draggedItemIndex.value = index
    } finally {
      setTimeout(() => {
        isMoving.value = false
      }, 100)
    }
  }, 50)
}

// 拖拽离开
const handleDragLeave = () => {
  dragOverIndex.value = null
}

// 拖拽结束（取消拖拽）
const handleDragEnd = (event: DragEvent) => {
  event.stopPropagation() // 阻止事件冒泡

  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
    moveTimeout = null
  }

  // 恢复原始顺序（如果拖拽未完成）
  if (originalOrder.value.length > 0 && isDragging.value) {
    tempAllDimensions.value = [...originalOrder.value]
  }

  // 清除所有拖拽状态
  isDragging.value = false
  draggedItemIndex.value = null
  dragOverIndex.value = null
  originalOrder.value = []
  isMoving.value = false
}

// 全选
const toggleAll = () => {
  if (localVisibleDimensions.value.length === localAllDimensions.value.length) {
    return
  }
  localVisibleDimensions.value = [...localAllDimensions.value]
}

// 反选
const invertSelection = () => {
  const invertedSelection = localAllDimensions.value.filter(
    (dimension) => !localVisibleDimensions.value.includes(dimension)
  )
  localVisibleDimensions.value = invertedSelection
}
</script>

<style lang="less" scoped>
.tab-content {
  :deep(.ant-checkbox-group) {
    .checkbox-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
    }

    .checkbox-item-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border: 2px dashed transparent;
      width: 160px; // 固定宽度
      box-sizing: border-box;

      &:hover {
        background: var(--bg-hover);

        .drag-handle {
          opacity: 1;
        }
      }

      &.dragging {
        opacity: 0.6;
        background: var(--bg-hover);
        box-shadow: var(--shadow-md);
        cursor: grabbing;
        z-index: 1000;
      }

      &.drag-over {
        background: transparent;
        border-color: transparent;
      }

      .drag-handle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        color: var(--text-tertiary);
        font-size: 14px;
        opacity: 0.5;
        transition: all 0.3s ease;
        padding: 2px;

        &:hover {
          color: var(--accent);
          opacity: 1;
          transform: scale(1.1);
        }

        &:active {
          cursor: grabbing;
        }
      }

      .ant-checkbox-wrapper {
        margin: 0;
        flex: 1;
        overflow: hidden;
      }

      .checkbox-text {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.tab-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.drag-list-move {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.drag-list-enter-active,
.drag-list-leave-active {
  transition: all 0.3s ease;
}

.drag-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.drag-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
