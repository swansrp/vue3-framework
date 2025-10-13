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
    <div class="grid-content">
      <div
        v-for="(record, index) in dataSource"
        :key="record.value"
        class="grid-item"
        :class="{ 
          'grid-item-selected': selectedItems.includes(record.value),
          'grid-item-draggable': isDragMode,
          'grid-item-dragging': draggedIndex === index
        }"
        :draggable="isDragMode"
        @click="handleItemClick(record)"
        @contextmenu.prevent="handleContextMenu($event, record)"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver($event)"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <!-- 更多功能菜单 -->
        <div
          v-if="!isDragMode && $slots['item-actions']"
          class="grid-item-more"
        >
          <a-dropdown :trigger="['click']">
            <a-button
              type="text"
              size="small"
              @click.stop
            >
              <template #icon>
                <ellipsis-outlined />
              </template>
            </a-button>
            <template #overlay>
              <slot
                name="item-actions"
                :record="record"
                :index="index"
              >
              </slot>
            </template>
          </a-dropdown>
        </div>
        
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
            <a-menu-item key="5" danger>
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
  EllipsisOutlined,
  EyeOutlined,
  HolderOutlined, 
  LockOutlined,
  PlusOutlined,
  UnlockOutlined 
} from '@ant-design/icons-vue'

import { ColumnType, TableConfigType, UpdateOrderType } from '@/framework/components/common/Portal/type'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'

const prop = defineProps<{
  config: TableConfigType,
  titleColumn: ColumnType,
  dataSource: Array<any>,
  paginationChange: (page: number, pageSize: number) => void,
  rowSelection: any
}>()

const { dataSource, config, rowSelection } = toRefs(prop)

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
  
  if (rowSelection.value) {
    if (rowSelection.value.type === 'radio') {
      // 单选模式
      selectedItems.value = [record.value]
    } else {
      // 多选模式
      const index = selectedItems.value.indexOf(record.value)
      if (index > -1) {
        selectedItems.value.splice(index, 1)
      } else {
        selectedItems.value.push(record.value)
      }
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
    border-bottom: 1px solid #e6e8eb;
    background: #fafafa;
  }

  .grid-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    align-content: start;

    .grid-item {
      position: relative;
      background: #ffffff;
      border: 1px solid #e6e8eb;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      user-select: none;

      &:hover {
        border-color: #1677ff;
        box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
        transform: translateY(-2px);
      }

      &.grid-item-selected {
        border-color: #1677ff;
        background: #f0f8ff;
        box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
      }

      &.grid-item-draggable {
        cursor: grab;
        
        &:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2);
        }
        
        &:active {
          cursor: grabbing;
        }
      }

      &.grid-item-dragging {
        opacity: 0.6;
        transform: rotate(5deg) scale(1.05);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 1000;
      }

      .grid-item-drag-handle {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 2;
        color: #666;
        font-size: 16px;
        cursor: grab;
        padding: 4px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.8);
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(22, 119, 255, 0.1);
          color: #1677ff;
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
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          
          &:hover {
            background: rgba(22, 119, 255, 0.1);
            color: #1677ff;
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
        height: 100%;
        margin-top: 8px;

        .grid-item-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
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
    border-top: 1px solid #e6e8eb;
    background: #fafafa;
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

// 响应式设计
@media (max-width: 768px) {
  .portal-grid-mode .grid-content {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .portal-grid-mode .grid-content {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}
</style>