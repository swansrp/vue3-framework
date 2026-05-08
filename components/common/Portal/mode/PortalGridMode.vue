<template>
  <div class="portal-grid-mode">
    <!-- 搜索区域 -->
    <div class="grid-search-header">
      <div style="display: flex; align-items: center">
        <lock-outlined
          v-if="searchStrict"
          style="margin-right: 5px; cursor: pointer;"
          @click="searchStrict = !searchStrict"
        />
        <unlock-outlined
          v-else
          style="margin-right: 5px; cursor: pointer;"
          @click="searchStrict = !searchStrict"
        />
        <a-input-search
          v-model:value="searchName"
          :placeholder="(searchStrict ? '' : '模糊') + '搜索 ' + (titleColumn.title || '')"
          enter-button
          @search="onGridDataSearch"
        />
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <a-button
          v-if="config.orderMode && !config.readOnly"
          type="text"
          :disabled="!dataSource || dataSource.length === 0"
          @click="toggleDragMode"
        >
          <template #icon>
            <drag-outlined v-if="!isDragMode" />
            <check-outlined v-else />
          </template>
          {{ isDragMode ? '完成排序' : '拖拽排序' }}
        </a-button>
        <slot name="header-action"></slot>
      </div>
    </div>

    <!-- 网格内容区域 -->
    <div 
      class="grid-content"
      :style="{ gridTemplateColumns }"
    >
      <div
        v-for="(record, index) in dataSource"
        :key="record.value"
        class="grid-item"
        :class="{ 
          'grid-item-selected': selectedItems.includes(record.value),
          'grid-item-draggable': isDragMode,
          'grid-item-dragging': draggedIndex === index,
          'grid-item-disabled': prop.rowAllowSelect ? !prop.rowAllowSelect(record) : false
        }"
        :draggable="isDragMode"
        @click="handleItemClick(record)"
        @contextmenu.prevent="handleContextMenu($event, record)"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver($event)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <!-- 拖拽指示器 -->
        <div
          v-if="isDragMode"
          class="grid-item-drag-handle"
        >
          <holder-outlined />
        </div>
        
        <!-- 选择框 -->
        <div
          v-if="rowSelection && !isDragMode"
          class="grid-item-checkbox"
        >
          <a-checkbox
            :checked="selectedItems.includes(record.value)"
            @click.stop
            @change="(e) => handleCheckboxChange(e, record)"
          />
        </div>

        <!-- 默认显示区域 -->
        <div class="grid-item-content">
          <slot
            name="display"
            :record="record"
          >
            <div class="grid-item-name">
              {{ record.label }}
            </div>
          </slot>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!dataSource || dataSource.length === 0"
        class="grid-empty"
      >
        <a-empty description="暂无数据" />
      </div>
    </div>

    <!-- 分页区域 -->
    <div class="grid-footer">
      <div>
        <slot name="footer-action"></slot>
      </div>
      <div style="display: flex;">
        <a-pagination
          v-model:current="config.currentPage"
          v-model:page-size="config.pageSize"
          :size="config.size as any"
          :total="config.total"
          hide-on-single-page
          show-less-items
          @change="paginationChange"
        >
          <template #itemRender="{ type, originalElement }">
            <a v-if="type === 'prev'">&lt;</a>
            <a v-else-if="type === 'next'">&gt;</a>
            <component
              :is="originalElement"
              v-else
            />
          </template>
        </a-pagination>
        <div>
          <slot name="end-action"></slot>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="context-menu-overlay"
        @click="contextMenuVisible = false"
        @contextmenu.prevent="contextMenuVisible = false"
      >
        <a-menu
          :style="{ 
            position: 'fixed', 
            left: contextMenuPosition.x + 'px', 
            top: contextMenuPosition.y + 'px',
            zIndex: 9999
          }"
          @click="({ key: menuKey }) => handleMenuContext(contextMenuRecord?.value, String(menuKey))"
        >
          <a-menu-item key="1">
            <eye-outlined />
            查看详情
          </a-menu-item>
          <template v-if="!config.readOnly">
            <a-menu-item key="2">
              <plus-outlined />
              新增记录
            </a-menu-item>
            <a-menu-item key="3">
              <edit-outlined />
              编辑记录
            </a-menu-item>
            <a-menu-item key="4">
              <copy-outlined />
              复制记录
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item
              key="5"
              danger
            >
              <delete-outlined />
              删除记录
            </a-menu-item>
          </template>
        </a-menu>
      </div>
    </teleport>
  </div>
</template>

<script lang="ts" setup>
import { 
  CheckOutlined, 
  CopyOutlined,
  DeleteOutlined,
  DragOutlined, 
  EditOutlined,
  EyeOutlined,
  HolderOutlined, 
  LockOutlined,
  PlusOutlined,
  UnlockOutlined 
} from '@ant-design/icons-vue'

import { ColumnType, TableConfigType, UpdateOrderType } from '@/framework/components/common/Portal/type'

const prop = defineProps<{
  config: TableConfigType,
  titleColumn: ColumnType,
  dataSource: Array<any>,
  paginationChange: (page: number, pageSize: number) => void,
  rowSelection: any,
  cardWidth?: number,
  rowAllowSelect?: (record: any) => boolean
}>()

const { dataSource, config, rowSelection, cardWidth } = toRefs(prop)

// 计算grid列配置
const gridTemplateColumns = computed(() => {
  const width = cardWidth?.value || 350
  return `repeat(auto-fill, minmax(${width}px, 1fr))`
})

const emit = defineEmits<{
  /**
   * 根据名称查找数据
   * @param e
   * @param searchName 搜索
   * @param searchStrict 精确/模糊查找
   */
  (e: 'search', searchName: string, searchStrict: boolean): void
  (e: 'rowDragEnd', data: Array<UpdateOrderType>): void
  (e: 'handleMenuContextView', recordId: any): void
  (e: 'handleMenuContextAdd', recordId: any): void
  (e: 'handleMenuContextModify', recordId: any): void
  (e: 'handleMenuContextCopy', recordId: any): void
  (e: 'handleMenuContextDelete', recordId: any): void
}>()

// 搜索相关
const searchName = ref('')
const searchStrict = ref(false)

// 选择相关
const selectedItems = ref<Array<any>>([])

// 右键菜单相关
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuRecord = ref<any>(null)

// 拖拽相关
const isDragMode = ref(false)
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const onGridDataSearch = () => {
  emit('search', searchName.value, searchStrict.value)
}

const handleItemClick = (record: any) => {
  if (isDragMode.value) return // 拖拽模式下不处理点击
  if (prop.rowAllowSelect && !prop.rowAllowSelect(record)) return // 禁用item不能点击
  
  if (rowSelection.value) {
    if (rowSelection.value.type === 'radio') {
      // 单选模式
      const newSelection = selectedItems.value.includes(record.value) ? [] : [record.value]
      selectedItems.value = newSelection
      rowSelection.value.onChange(newSelection)
    } else {
      // 多选模式
      const index = selectedItems.value.indexOf(record.value)
      if (index > -1) {
        selectedItems.value.splice(index, 1)
      } else {
        selectedItems.value.push(record.value)
      }
      rowSelection.value.onChange([...selectedItems.value])
    }
  }
}

const handleCheckboxChange = (e: any, record: any) => {
  if (e.target.checked) {
    if (rowSelection.value.type === 'radio') {
      selectedItems.value = [record.value]
    } else {
      selectedItems.value.push(record.value)
    }
  } else {
    const index = selectedItems.value.indexOf(record.value)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    }
  }
  // 通知父组件选择状态变化
  rowSelection.value.onChange([...selectedItems.value])
}

const handleContextMenu = (event: MouseEvent, record: any) => {
  if (isDragMode.value) return // 拖拽模式下不显示右键菜单
  
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuRecord.value = record
  contextMenuVisible.value = true
}

const handleMenuContext = (recordId: any, menuKey: string) => {
  contextMenuVisible.value = false
  switch (menuKey) {
    case '1':
      emit('handleMenuContextView', recordId)
      break
    case '2':
      emit('handleMenuContextAdd', recordId)
      break
    case '3':
      emit('handleMenuContextModify', recordId)
      break
    case '4':
      emit('handleMenuContextCopy', recordId)
      break
    case '5':
      emit('handleMenuContextDelete', recordId)
      break
    default:
      break
  }
}

// 拖拽功能
const toggleDragMode = () => {
  isDragMode.value = !isDragMode.value
  if (!isDragMode.value) {
    draggedIndex.value = null
    dragOverIndex.value = null
  }
}

const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', String(index))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault()
  
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }

  // 生成更新顺序的数据
  const updateOrderData: Array<UpdateOrderType> = []
  const newDataSource = [...dataSource.value]
  
  // 移动元素
  const [movedItem] = newDataSource.splice(draggedIndex.value, 1)
  newDataSource.splice(targetIndex, 0, movedItem)
  
  // 生成更新数据
  newDataSource.forEach((item, index) => {
    updateOrderData.push({
      id: item.value,
      showOrder: (index + 1) + config.value.pageSize * (config.value.currentPage - 1)
    })
  })
  
  emit('rowDragEnd', updateOrderData)
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 监听行选择变化
watch(() => rowSelection.value?.selectedRowKeys, (newKeys) => {
  if (newKeys) {
    selectedItems.value = [...newKeys]
  }
}, { immediate: true })
</script>

<style lang="less" scoped>
.portal-grid-mode {
  height: 100%;
  display: flex;
  flex-direction: column;

  .grid-search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-hover);
  }

  .grid-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: grid;
    gap: 20px;
    align-content: start;
    /* 自适应内容高度 */
    grid-auto-rows: max-content;

    .grid-item {
      position: relative;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: var(--shadow-sm);
      user-select: none;
      /* 自动撑开内容 */
      min-height: 180px;
      display: flex;
      flex-direction: column;
      /* 黄金比例 1.618 */
      aspect-ratio: auto;
      overflow: hidden;

      &:hover {
        border-color: var(--accent);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
      }

      &.grid-item-selected {
        border-color: var(--accent);
        background: var(--accent-soft);
        box-shadow: var(--shadow-glow);
      }

      &.grid-item-draggable {
        cursor: grab;
        
        &:hover {
          transform: scale(1.02);
          box-shadow: var(--shadow-md);
        }
        
        &:active {
          cursor: grabbing;
        }
      }

      &.grid-item-dragging {
        opacity: 0.6;
        transform: rotate(5deg) scale(1.05);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
      }

      &.grid-item-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f5f5f5;

        &:hover {
          transform: none;
          box-shadow: none;
          border-color: #e8e8e8;
        }
      }

      .grid-item-drag-handle {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 2;
        color: var(--text-secondary);
        font-size: 16px;
        cursor: grab;
        padding: 4px;
        border-radius: 4px;
        background: var(--bg-elevated);
        transition: all 0.2s ease;
        
        &:hover {
          background: var(--accent-soft);
          color: var(--accent);
        }
      }

      .grid-item-more {
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 3;
        opacity: 0;
        transition: opacity 0.2s ease;
        
        :deep(.ant-btn) {
          padding: 4px;
          height: auto;
          min-width: auto;
          border-radius: 4px;
          background: var(--bg-elevated);
          box-shadow: var(--shadow-sm);
          
          &:hover {
            background: var(--accent-soft);
            color: var(--accent);
          }
          
          .anticon {
            font-size: 16px;
          }
        }
      }
      
      &:hover .grid-item-more {
        opacity: 1;
      }

      .grid-item-checkbox {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 1;
      }

      .grid-item-content {
        width: 100%;
        flex: 1;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        /* 确保内容能够撑开卡片 */
        min-height: 0;
        
        .grid-item-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          text-align: center;
          word-break: break-word;
          line-height: 1.4;
        }
      }
    }

    .grid-empty {
      grid-column: 1 / -1;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
  }

  .grid-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-hover);
  }
}

// 拖拽时的全局样式
.grid-item-dragging {
  pointer-events: none;
}

// 右键菜单遮罩层
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
  
  // 紧凑的菜单样式
  :deep(.ant-menu) {
    padding: 4px 0;
    min-width: 160px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }
  
  :deep(.ant-menu-item) {
    height: 30px;
    line-height: 30px;
    padding: 0 16px;
    margin: 0;
    font-size: 13px;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    
    .anticon {
      font-size: 14px;
      margin-right: 8px;
      flex-shrink: 0;
    }
  }
  
  :deep(.ant-menu-item-divider) {
    margin: 4px 0;
  }
}

// 响应式设计 - 智能配置每行个数
@media (min-width: 2800px) and (min-height: 1700px) {
  .portal-grid-mode .grid-content {
    gap: 32px;
    padding: 32px;
    
    .grid-item {
      min-height: 240px;
      padding: 32px;
      border-radius: 16px;
      
      .grid-item-content .grid-item-name {
        font-size: 18px;
      }
    }
  }
}

/* 大屏幕 (1400px+) - 4-5列 */
@media (min-width: 1400px) and (max-width: 2799px) {
  .portal-grid-mode .grid-content {
    gap: 24px;
    padding: 24px;
  }
}

/* 中等屏幕 (1024px-1399px) - 3-4列 */
@media (min-width: 1024px) and (max-width: 1399px) {
  .portal-grid-mode .grid-content {
    gap: 20px;
    padding: 20px;
  }
}

/* 平板横屏 (768px-1023px) - 2-3列 */
@media (min-width: 768px) and (max-width: 1023px) {
  .portal-grid-mode .grid-content {
    gap: 16px;
    padding: 16px;
    
    .grid-item {
      min-height: 160px;
      padding: 16px;
    }
  }
}

/* 平板竖屏 (480px-767px) - 2列 */
@media (min-width: 480px) and (max-width: 767px) {
  .portal-grid-mode .grid-content {
    gap: 12px;
    padding: 12px;
    
    .grid-item {
      min-height: 140px;
      padding: 14px;
      
      .grid-item-content .grid-item-name {
        font-size: 13px;
      }
    }
  }
}

/* 手机 (479px以下) - 1-2列 */
@media (max-width: 479px) {
  .portal-grid-mode .grid-content {
    gap: 8px;
    padding: 8px;
    
    .grid-item {
      min-height: 120px;
      padding: 12px;
      
      .grid-item-content .grid-item-name {
        font-size: 12px;
      }
    }
  }
}

/* 超小屏幕 (320px以下) - 强制1列 */
@media (max-width: 320px) {
  .portal-grid-mode .grid-content {
    gap: 6px;
    padding: 6px;
  }
}
</style>