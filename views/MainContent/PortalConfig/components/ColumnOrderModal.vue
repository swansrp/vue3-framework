<template>
  <a-modal
    v-model:open="visible"
    title="字段排序管理"
    width="1200px"
    :footer="null"
    @cancel="handleCancel"
  >
    <!-- 筛选条件 -->
    <div style="margin-bottom: 16px;">
      <a-radio-group
        v-model:value="filterType"
        button-style="solid"
        size="small"
      >
        <a-radio-button value="all">
          全部字段
        </a-radio-button>
        <a-radio-button value="enable">
          有效字段
        </a-radio-button>
        <a-radio-button value="show">
          表格显示
        </a-radio-button>
        <a-radio-button value="detailShow">
          详情显示
        </a-radio-button>
        <a-radio-button value="addShow">
          新增显示
        </a-radio-button>
        <a-radio-button value="editShow">
          编辑显示
        </a-radio-button>
      </a-radio-group>
    </div>

    <!-- 字段列表 - 横向布局 -->
    <div class="field-sort-container">
      <transition-group
        name="drag-list"
        tag="div"
        class="field-list"
      >
        <a-dropdown
          v-for="(element, index) in localColumns"
          :key="element.id"
          :trigger="['contextmenu']"
        >
          <div
            class="field-item"
            :class="{
              'field-highlight': isHighlighted(element),
              'field-dimmed': !isHighlighted(element) && filterType !== 'all',
              'dragging': draggedIndex === index,
              'drag-over': dragOverIndex === index && draggedIndex !== null
            }"
            :draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver($event, index)"
            @dragleave="handleDragLeave"
            @dragend="handleDragEnd"
            @drop="handleDrop($event, index)"
          >
            <span class="drag-handle">
              <HolderOutlined />
            </span>
            <div class="field-content">
              <a-tooltip
                :title="element.displayName"
                placement="top"
              >
                <div class="field-name">
                  {{ element.displayName }}
                </div>
              </a-tooltip>
              <div class="field-property">
                {{ element.property }}
              </div>
              <div class="field-order">
                {{ index + 1 }}
              </div>
            </div>
          </div>
          <template #overlay>
            <a-menu @click="({ key: menuKey }) => handleQuickConfig(element, menuKey)">
              <a-menu-item key="displayNone">
                不显示
              </a-menu-item>
              <a-menu-item key="displaySearchSort">
                显示/筛选/排序
              </a-menu-item>
              <a-menu-item key="displaySearch">
                显示/筛选
              </a-menu-item>
              <a-menu-item key="displayNoAction">
                只显示
              </a-menu-item>
              <a-menu-item key="displayTableOnly">
                表格显示
              </a-menu-item>
              <a-menu-item key="displayDetailOnly">
                详情显示
              </a-menu-item>
              <a-menu-item key="displayTableAndDetail">
                不参与编辑
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </transition-group>
    </div>

    <!-- 底部操作按钮 -->
    <div class="modal-footer">
      <div class="footer-tips">
        <InfoCircleOutlined />
        拖动字段卡片可调整顺序，筛选条件仅影响高亮显示
      </div>
      <div class="footer-actions">
        <a-button @click="handleCancel">
          取消
        </a-button>
        <a-button
          type="primary"
          @click="handleConfirm"
        >
          确定
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { HolderOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { ref, watch } from 'vue'

interface ColumnItem {
  id: string
  displayName: string
  property: string
  enable: string
  show: string
  detailShow: string
  addShow: string
  editShow: string
  displayOrder: number
  filterAble?: string
  sortAble?: string
  [key: string]: any
}

const props = defineProps<{
  modelValue: boolean
  columns: ColumnItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [columns: ColumnItem[]]
  'quickConfig': [column: ColumnItem, type: string]
}>()

const visible = ref(false)
const filterType = ref<string>('all')
const localColumns = ref<ColumnItem[]>([])
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const isMoving = ref(false)
let moveTimeout: number | null = null

// 监听弹窗显示状态
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 弹窗打开时，重新加载数据
    localColumns.value = JSON.parse(JSON.stringify(props.columns))
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 判断字段是否应该高亮
const isHighlighted = (column: ColumnItem): boolean => {
  if (filterType.value === 'all') {
    return true
  }
  
  if (filterType.value === 'enable') {
    return column.enable === '1'
  }
  
  return column[filterType.value] === '1'
}

// 拖动开始
const handleDragStart = (e: DragEvent, index: number) => {
  e.stopPropagation()
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖动经过
const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  
  if (
    isMoving.value ||
    draggedIndex.value === null ||
    index === draggedIndex.value
  ) {
    return
  }
  
  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
  }
  
  moveTimeout = window.setTimeout(() => {
    if (draggedIndex.value === null || index === draggedIndex.value || isMoving.value) {
      return
    }
    
    isMoving.value = true
    dragOverIndex.value = index
    
    const dragIndex = draggedIndex.value
    
    try {
      const newColumns = [...localColumns.value]
      const [draggedItem] = newColumns.splice(dragIndex, 1)
      newColumns.splice(index, 0, draggedItem)
      localColumns.value = newColumns
      
      draggedIndex.value = index
      updateDisplayOrder()
    } finally {
      setTimeout(() => {
        isMoving.value = false
      }, 100)
    }
  }, 50)
}

// 拖动离开
const handleDragLeave = () => {
  dragOverIndex.value = null
}

// 放置
const handleDrop = async (e: DragEvent, dropIndex: number) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
    moveTimeout = null
  }
  
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    isMoving.value = false
    return
  }
  
  // 最终确认顺序
  updateDisplayOrder()
  
  // 清除拖拽状态
  draggedIndex.value = null
  dragOverIndex.value = null
  isMoving.value = false
}

// 拖动结束
const handleDragEnd = (e: DragEvent) => {
  e.stopPropagation()
  
  if (moveTimeout !== null) {
    clearTimeout(moveTimeout)
    moveTimeout = null
  }
  
  // 清除所有拖拽状态
  draggedIndex.value = null
  dragOverIndex.value = null
  isMoving.value = false
}

// 更新displayOrder
const updateDisplayOrder = () => {
  localColumns.value.forEach((col, index) => {
    col.displayOrder = index + 1
  })
}

// 确定
const handleConfirm = () => {
  emit('confirm', localColumns.value)
  visible.value = false
}

// 取消
const handleCancel = () => {
  visible.value = false
}

// 快速配置
const handleQuickConfig = (column: ColumnItem, type: string) => {
  if (type === 'displayNone') {
    column.show = '0'
    column.detailShow = '0'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '0'
    column.sortAble = '0'
  } else if (type === 'displaySearchSort') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '1'
    column.sortAble = '1'
  } else if (type === 'displaySearch') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
    column.filterAble = '1'
    column.sortAble = '0'
  } else if (type === 'displayTableOnly') {
    column.show = '1'
    column.detailShow = '0'
    column.addShow = '0'
    column.editShow = '0'
  } else if (type === 'displayDetailOnly') {
    column.show = '0'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
  } else if (type === 'displayTableAndDetail') {
    column.show = '1'
    column.detailShow = '1'
    column.addShow = '0'
    column.editShow = '0'
  }
  
  // 触发quickConfig事件，通知父组件保存
  emit('quickConfig', column, type)
}
</script>

<style scoped lang="less">
.field-sort-container {
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.field-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 2px solid #e8e8e8;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: grab;
  width: 180px;
  box-sizing: border-box;
  position: relative;

  &:hover {
    background: #f5f5f5;
    border-color: #d9d9d9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);

    .drag-handle {
      opacity: 1;
      color: #1890ff;
    }
  }

  &.dragging {
    opacity: 0.6;
    background: #fafafa;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: grabbing;
    z-index: 1000;
    transform: scale(1.02);
  }

  &.drag-over {
    border-color: #1890ff;
    background: #e6f7ff;
  }

  &.field-highlight {
    // 高亮状态 - 正常显示
  }

  &.field-dimmed {
    opacity: 0.4;
    background: #f5f5f5;
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #bfbfbf;
    opacity: 0.5;
    transition: all 0.3s ease;
    flex-shrink: 0;

    &:hover {
      transform: scale(1.1);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .field-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-name {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  .field-property {
    font-size: 11px;
    color: #999;
    font-family: 'Consolas', 'Courier New', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-order {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    color: #666;
  }
}

.modal-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-tips {
  color: #8c8c8c;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

// 拖拽动画
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
