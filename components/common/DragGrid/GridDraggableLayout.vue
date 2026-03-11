<script setup lang="ts" generic="T extends GridItem">
import { ref } from 'vue'

/**
 * 网格项必须字段接口
 */
export interface GridItem {
  id: string | number    // 唯一标识
  width?: number         // 宽度百分比 (0-100)
  height?: number        // 网格高度（格数）
  positionX?: number     // X坐标百分比 (0-100)
  positionY?: number     // Y坐标（行）
  [key: string]: any     // 允许其他扩展字段
}

interface Props<T extends GridItem> {
  items: T[]                    // 数据列表
  gridSize?: number             // 每格像素大小，默认60
  gap?: number                  // 格子间距，默认12
  showGrid?: boolean            // 是否显示网格背景，默认true
  readonly?: boolean            // 只读模式，禁用拖拽，默认false
  minHeight?: number            // 最小高度，默认600
  defaultItemWidth?: number     // 默认项宽度百分比，默认10
  defaultItemHeight?: number    // 默认项高度（格数），默认1
}

const props = withDefaults(defineProps<Props<T>>(), {
  gridSize: 60,
  gap: 12,
  showGrid: true,
  readonly: false,
  minHeight: 600,
  defaultItemWidth: 10,
  defaultItemHeight: 1
})

const emit = defineEmits<{
  (e: 'update:items', items: T[]): void
  (e: 'itemClick', item: T): void
  (e: 'itemChange', item: T): void
}>()

// 拖拽移动状态
const draggingItem = ref<T | null>(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartPosX = ref(0)
const dragStartPosY = ref(0)

// 拖拽调整大小状态
const resizingItem = ref<T | null>(null)
const resizeDirection = ref<'e' | 's' | 'se' | null>(null)
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

// 实时预览状态
const previewPosX = ref(0)
const previewPosY = ref(0)
const previewWidth = ref(0)
const previewHeight = ref(0)

// 计算网格背景大小
const gridBgSize = props.gridSize + props.gap

// 开始拖动整个项
const startDrag = (item: T, e: MouseEvent) => {
  if (props.readonly) return
  
  // 如果点击的是调整大小手柄，不触发拖动
  const target = e.target as HTMLElement
  if (target.closest('.resize-handle')) {
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  
  draggingItem.value = item
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragStartPosX.value = item.positionX || 0
  dragStartPosY.value = item.positionY || 0
  
  previewPosX.value = dragStartPosX.value
  previewPosY.value = dragStartPosY.value
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 处理拖动
const handleDrag = (e: MouseEvent) => {
  if (!draggingItem.value) return
  
  const container = (e.target as HTMLElement).closest('.grid-draggable-layout') as HTMLElement
  if (!container) return
  
  const containerWidth = container.clientWidth
  const deltaX = e.clientX - dragStartX.value
  
  const deltaY = e.clientY - dragStartY.value
  
  // X轴使用百分比计算，并四舍五入为整数
  const percentDeltaX = Math.round((deltaX / containerWidth) * 100)
  const gridDeltaY = Math.round(deltaY / props.gridSize)
  
  previewPosX.value = Math.max(0, Math.min(100, dragStartPosX.value + percentDeltaX))
  previewPosY.value = Math.max(0, dragStartPosY.value + gridDeltaY)
}

// 停止拖动
const stopDrag = () => {
  if (!draggingItem.value) return
  
  const newPosX = previewPosX.value
  const newPosY = previewPosY.value
  
  if (newPosX !== dragStartPosX.value || newPosY !== dragStartPosY.value) {
    updateItem(draggingItem.value, {
      positionX: newPosX,
      positionY: newPosY
    })
  }
  
  draggingItem.value = null
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 开始调整大小
const startResize = (item: T, direction: 'e' | 's' | 'se', e: MouseEvent) => {
  if (props.readonly) return
  
  e.preventDefault()
  e.stopPropagation()
  
  resizingItem.value = item
  resizeDirection.value = direction
  resizeStartX.value = e.clientX
  resizeStartY.value = e.clientY
  resizeStartWidth.value = item.width || props.defaultItemWidth
  resizeStartHeight.value = item.height || props.defaultItemHeight
  
  previewWidth.value = resizeStartWidth.value
  previewHeight.value = resizeStartHeight.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

// 处理调整大小
const handleResize = (e: MouseEvent) => {
  if (!resizingItem.value || !resizeDirection.value) return
  
  const container = (e.target as HTMLElement).closest('.grid-draggable-layout') as HTMLElement
  if (!container) return
  
  const containerWidth = container.clientWidth
  const deltaX = e.clientX - resizeStartX.value
  const deltaY = e.clientY - resizeStartY.value
  
  let newWidth = resizeStartWidth.value
  let newHeight = resizeStartHeight.value
  
  if (resizeDirection.value === 'e' || resizeDirection.value === 'se') {
    // 宽度使用百分比计算，并四舍五入为整数
    const percentDeltaX = Math.round((deltaX / containerWidth) * 100)
    newWidth = Math.max(5, Math.min(100, resizeStartWidth.value + percentDeltaX))
  }
  
  if (resizeDirection.value === 's' || resizeDirection.value === 'se') {
    const gridDeltaY = Math.round(deltaY / props.gridSize)
    newHeight = Math.max(1, resizeStartHeight.value + gridDeltaY)
  }
  
  previewWidth.value = newWidth
  previewHeight.value = newHeight
}

// 停止调整大小
const stopResize = () => {
  if (!resizingItem.value) return
  
  const newWidth = previewWidth.value
  const newHeight = previewHeight.value
  
  if (newWidth !== resizeStartWidth.value || newHeight !== resizeStartHeight.value) {
    updateItem(resizingItem.value, {
      width: newWidth,
      height: newHeight
    })
  }
  
  resizingItem.value = null
  resizeDirection.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 更新项数据
const updateItem = (item: T, updates: Partial<GridItem>) => {
  const index = props.items.findIndex(i => i.id === item.id)
  if (index === -1) return
  
  const newItems = [...props.items]
  newItems[index] = { ...newItems[index], ...updates }
  
  emit('update:items', newItems)
  emit('itemChange', newItems[index])
}

// 处理项点击
const handleItemClick = (item: T) => {
  emit('itemClick', item)
}

// 计算容器实际需要的高度（自适应内容）
const calculateContainerHeight = () => {
  if (props.items.length === 0) return props.minHeight
  
  // 找到最大的 Y 位置 + 高度
  let maxBottom = 0
  props.items.forEach(item => {
    const posY = item.positionY || 0
    const height = item.height || props.defaultItemHeight
    const bottom = (posY + height) * gridBgSize
    if (bottom > maxBottom) {
      maxBottom = bottom
    }
  })
  
  // 至少保持 minHeight，否则使用计算出的高度 + 一些底部padding
  return Math.max(props.minHeight, maxBottom + 50)
}

// 计算项的样式
const getItemStyle = (item: T) => {
  const isDragging = draggingItem.value?.id === item.id
  const isResizing = resizingItem.value?.id === item.id
  
  const posX = isDragging ? previewPosX.value : (item.positionX || 0)
  const posY = isDragging ? previewPosY.value : (item.positionY || 0)
  const width = isResizing ? previewWidth.value : (item.width || props.defaultItemWidth)
  const height = isResizing ? previewHeight.value : (item.height || props.defaultItemHeight)
  
  // 直接使用百分比，确保为整数
  return {
    left: `${Math.round(posX)}%`,
    top: `${posY * gridBgSize}px`,
    width: `${Math.round(width)}%`,
    height: `${height * props.gridSize + Math.max(0, height - 1) * props.gap + 5}px`
  }
}
</script>

<template>
  <div 
    class="grid-draggable-layout"
    :class="{ 'show-grid': showGrid, 'readonly': readonly }"
    :style="{
      backgroundSize: showGrid ? `${gridBgSize}px ${gridBgSize}px` : 'none',
      height: `${calculateContainerHeight()}px`,
      gap: `${gap}px`
    }"
  >
    <div
      v-for="item in items"
      :key="item.id"
      class="grid-item"
      :class="{
        'is-dragging': draggingItem?.id === item.id,
        'is-resizing': resizingItem?.id === item.id
      }"
      :style="getItemStyle(item)"
      @mousedown="startDrag(item, $event)"
      @click="handleItemClick(item)"
    >
      <!-- 插槽：自定义项内容 -->
      <slot
        name="item"
        :item="item"
        :is-dragging="draggingItem?.id === item.id"
        :is-resizing="resizingItem?.id === item.id"
      >
        <div class="default-item-content">
          {{ item.id }}
        </div>
      </slot>

      <!-- 调整大小手柄（仅非只读模式） -->
      <template v-if="!readonly">
        <div
          class="resize-handle resize-handle-e"
          @mousedown="startResize(item, 'e', $event)"
        ></div>
        <div
          class="resize-handle resize-handle-s"
          @mousedown="startResize(item, 's', $event)"
        ></div>
        <div
          class="resize-handle resize-handle-se"
          @mousedown="startResize(item, 'se', $event)"
        ></div>
      </template>

      <!-- 插槽:自定义尺寸标识 -->
      <slot
        name="badge"
        :item="item"
        :position-x="draggingItem?.id === item.id ? previewPosX : (item.positionX || 0)"
        :position-y="draggingItem?.id === item.id ? previewPosY : (item.positionY || 0)"
        :width="resizingItem?.id === item.id ? previewWidth : (item.width || defaultItemWidth)"
        :height="resizingItem?.id === item.id ? previewHeight : (item.height || defaultItemHeight)"
      >
        <div class="grid-size-badge">
          ({{ draggingItem?.id === item.id ? previewPosX : (item.positionX || 0) }}, 
          {{ draggingItem?.id === item.id ? previewPosY : (item.positionY || 0) }}) | 
          {{ resizingItem?.id === item.id ? previewWidth : (item.width || defaultItemWidth) }} × 
          {{ resizingItem?.id === item.id ? previewHeight : (item.height || defaultItemHeight) }}
        </div>
      </slot>
    </div>

    <!-- 空状态插槽 -->
    <slot
      v-if="!items.length"
      name="empty"
    >
      <!-- 默认空状态，可以被父组件覆盖 -->
    </slot>
  </div>
</template>

<style scoped lang="less">
.grid-draggable-layout {
  position: relative;
  background-color: #fff;
  padding: 12px;
  border-radius: 4px;
  width: 100%;

  &.show-grid {
    background-image:
      linear-gradient(to right, #e0e0e0 1px, transparent 1px),
      linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
    background-position: 0 0;
  }

  &.readonly {
    // 只读模式下隐藏网格背景，使用纯白背景
    background-image: none !important;
    background-color: #fff;
    padding: 16px;

    .grid-item {
      cursor: default;

      // 只读模式下的表单项卡片样式 - 简洁分割线设计
      :deep(.form-item-card) {
        background: transparent;
        border: none;
        border-radius: 0;
        box-shadow: none;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:hover {
          background: #fafafa;
        }
        
        .field-row {
          align-items: center;
          
          .field-label-inline {
            color: #595959;
            font-weight: 500;
            font-size: 13px;
          }
        }
      }
      
      // 只读模式下的分割线样式
      :deep(.form-divider-card) {
        background: transparent;
      }
      
      // 只读模式下的区域标题样式 - 添加上边框分隔
      :deep(.form-section-title-card) {
        background: transparent;
        padding: 0 12px;
        margin-top: 2px;
        border-top: 5px solid #FAFAFA;
        
        .section-title-indicator {
          width: 3px;
          height: 14px;
        }
        
        .section-title-text {
          font-size: 13px;
          font-weight: 600;
          color: #262626;
        }
      }
      
      // 第一个区域标题不需要上边框
      :deep(.form-section-title-card:first-of-type) {
        margin-top: 0;
      }

      .grid-size-badge {
        display: none;
      }
    }
  }

  .grid-item {
    position: absolute;
    cursor: move;
    transition: box-shadow 0.2s;

    &.is-dragging {
      z-index: 100;
      border-color: #52c41a;
      box-shadow: 0 4px 16px rgba(82, 196, 26, 0.4);

      .grid-size-badge {
        opacity: 1;
        background: #52c41a;
      }
    }

    &.is-resizing {
      z-index: 100;
      border-color: #1890ff;
      box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);

      .grid-size-badge {
        opacity: 1;
        background: #ff4d4f;
      }
    }

    &:hover:not(.readonly) {
      .resize-handle {
        opacity: 0.6;
      }

      .grid-size-badge {
        opacity: 1;
      }
    }

    .default-item-content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 2px solid #d9d9d9;
      border-radius: 4px;
      padding: 8px;
    }

    // 表单卡片样式（从 SectionBlock 迁移）
    :deep(.form-item-card) {
      position: relative;
      height: 100%;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      // 水平布局：标签和控件在同一行
      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;

        // 文本域布局：垂直对齐
        &.is-textarea {
          align-items: flex-start;
          height: 100%;

          .field-label-inline {
            padding-top: 8px;
          }

          .field-control-inline {
            flex: 1;
            height: 100%;
            display: flex;

            .mock-textarea {
              flex: 1;
              height: 100%;
            }
          }

          .field-actions {
            align-self: flex-start;
            padding-top: 4px;
          }
        }

        .field-label-inline {
          flex-shrink: 0;
          min-width: 70px;
          max-width: 120px;
          font-size: 13px;
          line-height: 1.4;
          text-align: right;
          padding-right: 8px;

          .field-unit {
            color: #8c8c8c;
            font-size: 12px;
            font-weight: 400;
          }
        }

        .field-control-inline {
          flex: 1;
          min-width: 0;
        }

        .field-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s;
          flex-shrink: 0;
        }
      }

      &:hover .field-actions {
        opacity: 1;
      }

      .field-description {
        font-size: 12px;
        color: #8c8c8c;
        line-height: 1.3;
        padding-left: 78px;
        margin-top: 2px;
      }
    }

    // 分割线卡片样式：无边框、透明背景，添加渐变效果
    :deep(.form-divider-card) {
      background: linear-gradient(to right, rgba(24, 144, 255, 0.05), rgba(24, 144, 255, 0.02));
      border: none;
      border-radius: 4px;
      padding: 0 12px;
    }

    // 区域标题卡片样式：无边框、透明背景
    :deep(.form-section-title-card) {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0 12px;
    }

    // 调整大小手柄
    .resize-handle {
      position: absolute;
      background: #1890ff;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;

      &:hover {
        opacity: 1 !important;
      }
    }

    .resize-handle-e {
      top: 0;
      right: -4px;
      width: 8px;
      height: 100%;
      cursor: ew-resize;
    }

    .resize-handle-s {
      bottom: -4px;
      left: 0;
      width: 100%;
      height: 8px;
      cursor: ns-resize;
    }

    .resize-handle-se {
      bottom: -6px;
      right: -6px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: nwse-resize;

      &:hover {
        transform: scale(1.2);
      }
    }

    // 尺寸标识
    .grid-size-badge {
      position: absolute;
      top: 4px;
      left: 4px;
      background: #1890ff;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      z-index: 11;
    }
  }

  .empty-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #8c8c8c;
    font-size: 14px;
  }
}
</style>
