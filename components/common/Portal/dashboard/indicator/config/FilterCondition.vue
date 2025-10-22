<template>
  <div class="filter-section">
    <div
      class="section-header"
      @click="toggleCollapse"
    >
      <h4>全局筛选条件</h4>
      <a-button
        type="text"
        size="small"
        class="collapse-btn"
      >
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </a-button>
    </div>

    <div
      v-if="!collapsed"
      class="section-content"
    >
      <!-- 第一个筛选条件拖拽框 -->
      <div
        class="drop-zone filter-drop"
        :class="{
          'has-content': filterDimensions[0],
          'drag-over': dragOverFilters[0]
        }"
        @dragover.prevent="(e) => onDragOverFilter(e, 0)"
        @dragleave="(e) => onDragLeaveFilter(e, 0)"
        @drop="(e) => onDropFilterDimension(e, 0)"
      >
        <div
          v-if="filterDimensions.length > 1"
          class="filter-delete-btn"
        >
          <a-button
            type="text"
            size="small"
            @click="removeFilterDimension(0)"
          >
            <DeleteOutlined />
          </a-button>
        </div>
        <div
          v-if="!filterDimensions[0]"
          class="drop-placeholder"
        >
          拖拽指标到此处设置筛选条件
        </div>
        <div
          v-else
          class="filter-content"
        >
          <div class="filter-header">
            <span>{{ filterDimensions[0]?.title }}</span>
          </div>
          <div class="filter-actions">
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="selectAllFilterItems(0)"
            >
              全选
            </a-button>
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="reverseFilterItems(0)"
            >
              反选
            </a-button>
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="clearAllFilterItems(0)"
            >
              全部取消
            </a-button>
            <a-button
              type="text"
              size="small"
              class="clear-btn"
              @click="clearFilterDimension(0)"
            >
              清空
            </a-button>
          </div>
          <a-checkbox-group
            v-model:value="localSelectedFilterItems[0]"
            class="filter-items"
          >
            <a-checkbox
              v-for="item in filterDimensions[0]?.items"
              :key="item.key"
              :value="item.key"
              class="filter-checkbox"
            >
              {{ item.title }}
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </div>

      <!-- 其他筛选条件拖拽框 -->
      <div
        v-for="(filterDimension, index) in filterDimensions.slice(1)"
        :key="index + 1"
        class="drop-zone filter-drop additional-filter"
        :class="{
          'has-content': filterDimension,
          'drag-over': dragOverFilters[index + 1]
        }"
        @dragover.prevent="(e) => onDragOverFilter(e, index + 1)"
        @dragleave="(e) => onDragLeaveFilter(e, index + 1)"
        @drop="(e) => onDropFilterDimension(e, index + 1)"
      >
        <div class="filter-delete-btn">
          <a-button
            type="text"
            size="small"
            @click="removeFilterDimension(index + 1)"
          >
            <DeleteOutlined />
          </a-button>
        </div>
        <div
          v-if="!filterDimension"
          class="drop-placeholder"
        >
          拖拽指标到此处设置筛选条件
        </div>
        <div
          v-else
          class="filter-content"
        >
          <div class="filter-header">
            <span>{{ filterDimension?.title }}</span>
          </div>
          <div class="filter-actions">
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="selectAllFilterItems(index + 1)"
            >
              全选
            </a-button>
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="reverseFilterItems(index + 1)"
            >
              反选
            </a-button>
            <a-button
              type="text"
              size="small"
              class="action-btn"
              @click="clearAllFilterItems(index + 1)"
            >
              全部取消
            </a-button>
            <a-button
              type="text"
              size="small"
              class="clear-btn"
              @click="clearFilterDimension(index + 1)"
            >
              清空
            </a-button>
          </div>
          <a-checkbox-group
            v-model:value="localSelectedFilterItems[index + 1]"
            class="filter-items"
          >
            <a-checkbox
              v-for="item in filterDimension?.items"
              :key="item.key"
              :value="item.key"
              class="filter-checkbox"
            >
              {{ item.title }}
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </div>

      <!-- 新增筛选条件按钮 -->
      <div 
        v-if="filterDimensions[0]"
        class="add-filter-btn"
        :class="{ 'drag-over': dragOverAddButton }"
      >
        <a-button
          type="dashed"
          size="small"
          @click="addFilterDimension"
          @dragover.prevent="onDragOverAddButton"
          @dragleave="onDragLeaveAddButton"
          @drop="onDropAddButton"
        >
          <PlusOutlined />
          新增筛选条件
        </a-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DownOutlined, RightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { inject, ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DragData {
  key: string
  title: string
  isLeaf: boolean
  items?: IndicatorItem[]
}

// Props
const props = defineProps<{
  filterDimensions: (IndicatorGroup | null)[]
  selectedFilterItems: string[][]
}>()

// Emits
const emit = defineEmits<{
  'update:filterDimensions': [dimensions: (IndicatorGroup | null)[]]
  'update:selectedFilterItems': [items: string[][]]
}>()

// 折叠状态
const collapsed = ref(false)

// 拖拽状态管理
const dragOverFilters = ref<boolean[]>([])
const dragOverAddButton = ref(false)

// 注入全局拖拽数据
const dragData = inject<{ value: DragData | null }>('dragData')

// 本地状态
const localSelectedFilterItems = ref<string[][]>([])

// 计算属性：已选择的指标key集合（用于重复检查）
const selectedFilterKeys = computed(() => {
  const keys = new Set<string>()
  props.filterDimensions.forEach(dimension => {
    if (dimension) {
      keys.add(dimension.key)
    }
  })
  return keys
})

// 监听props变化更新本地状态
watch(
  () => props.selectedFilterItems,
  (newValue) => {
    // 避免循环更新：只有当值真正不同时才更新
    if (JSON.stringify(newValue) !== JSON.stringify(localSelectedFilterItems.value)) {
      localSelectedFilterItems.value = [...newValue]
    }
  },
  { immediate: true }
)

// 监听本地状态变化更新props
watch(
  localSelectedFilterItems,
  (newValue) => {
    // 避免循环更新：只有当值真正不同时才emit
    if (JSON.stringify(newValue) !== JSON.stringify(props.selectedFilterItems)) {
      emit('update:selectedFilterItems', [...newValue])
    }
  },
  { deep: true }
)

// 初始化拖拽状态
watch(
  () => props.filterDimensions.length,
  (length) => {
    // 确保dragOverFilters数组长度与filterDimensions一致
    while (dragOverFilters.value.length < length) {
      dragOverFilters.value.push(false)
    }
    while (dragOverFilters.value.length > length) {
      dragOverFilters.value.pop()
    }
  },
  { immediate: true }
)

// 拖拽事件处理
const onDragOverFilter = (e: DragEvent, index: number) => {
  e.preventDefault()
  
  // 确保dragOverFilters数组长度足够
  while (dragOverFilters.value.length <= index) {
    dragOverFilters.value.push(false)
  }
  
  dragOverFilters.value[index] = true
  
  // 检查是否允许放置（避免重复）
  if (dragData?.value) {
    const isDuplicate = selectedFilterKeys.value.has(dragData.value.key)
    if (isDuplicate && (!props.filterDimensions[index] || props.filterDimensions[index]?.key !== dragData.value.key)) {
      document.body.style.cursor = 'not-allowed'
    } else {
      document.body.style.cursor = 'copy'
    }
  }
}

const onDragLeaveFilter = (e: DragEvent, index: number) => {
  // 确保dragOverFilters数组长度足够
  while (dragOverFilters.value.length <= index) {
    dragOverFilters.value.push(false)
  }
  
  dragOverFilters.value[index] = false
  document.body.style.cursor = 'default'
}

const onDropFilterDimension = (e: DragEvent, index: number) => {
  e.preventDefault()
  
  // 确保dragOverFilters数组长度足够
  while (dragOverFilters.value.length <= index) {
    dragOverFilters.value.push(false)
  }
  
  dragOverFilters.value[index] = false
  document.body.style.cursor = 'default'

  if (!dragData?.value) {
    return
  }

  // 检查是否重复（除了当前拖拽框本身）
  const isDuplicate = selectedFilterKeys.value.has(dragData.value.key) && 
    (!props.filterDimensions[index] || props.filterDimensions[index]?.key !== dragData.value.key)
  
  if (isDuplicate) {
    message.warning(`指标"${dragData.value.title}"已在其他筛选条件中选择，请选择其他指标`)
    return
  }

  // 创建新的筛选维度数组
  const newFilterDimensions = [...props.filterDimensions]
  newFilterDimensions[index] = {
    key: dragData.value.key,
    title: dragData.value.title,
    items: dragData.value.items || []
  }

  // 创建新的选中项数组
  const newSelectedFilterItems = [...props.selectedFilterItems]
  // 确保数组长度足够
  while (newSelectedFilterItems.length <= index) {
    newSelectedFilterItems.push([])
  }
  newSelectedFilterItems[index] = []

  emit('update:filterDimensions', newFilterDimensions)
  emit('update:selectedFilterItems', newSelectedFilterItems)
}

const onDragOverAddButton = (e: DragEvent) => {
  e.preventDefault()
  dragOverAddButton.value = true
  
  // 检查是否允许放置（必须是叶子节点）
  if (dragData?.value) {
    if (!dragData.value.isLeaf) {
      document.body.style.cursor = 'not-allowed'
    } else {
      document.body.style.cursor = 'copy'
    }
  }
}

const onDragLeaveAddButton = () => {
  dragOverAddButton.value = false
  document.body.style.cursor = 'default'
}

const onDropAddButton = (e: DragEvent) => {
  e.preventDefault()
  dragOverAddButton.value = false
  document.body.style.cursor = 'default'

  if (!dragData?.value) {
    return
  }

  // 检查是否为叶子节点
  if (!dragData.value.isLeaf) {
    message.warning('只能拖拽指标项到筛选条件')
    return
  }

  // 检查是否重复
  const isDuplicate = selectedFilterKeys.value.has(dragData.value.key)
  if (isDuplicate) {
    message.warning(`指标"${dragData.value.title}"已在其他筛选条件中选择，请选择其他指标`)
    return
  }

  // 新增筛选条件并添加指标
  const newFilterDimensions = [...props.filterDimensions, {
    key: dragData.value.key,
    title: dragData.value.title,
    items: dragData.value.items || []
  }]
  
  const newSelectedFilterItems = [...props.selectedFilterItems, []]

  emit('update:filterDimensions', newFilterDimensions)
  emit('update:selectedFilterItems', newSelectedFilterItems)
}

// 筛选条件操作方法
const selectAllFilterItems = (index: number) => {
  if (props.filterDimensions[index]?.items) {
    // 确保localSelectedFilterItems数组长度足够
    while (localSelectedFilterItems.value.length <= index) {
      localSelectedFilterItems.value.push([])
    }
    
    localSelectedFilterItems.value[index] = props.filterDimensions[index]!.items!.map(item => item.key)
  }
}

const reverseFilterItems = (index: number) => {
  if (props.filterDimensions[index]?.items) {
    // 确保localSelectedFilterItems数组长度足够
    while (localSelectedFilterItems.value.length <= index) {
      localSelectedFilterItems.value.push([])
    }
    
    const allKeys = props.filterDimensions[index]!.items!.map(item => item.key)
    const currentKeys = localSelectedFilterItems.value[index] || []
    localSelectedFilterItems.value[index] = allKeys.filter(key => !currentKeys.includes(key))
  }
}

const clearAllFilterItems = (index: number) => {
  // 确保localSelectedFilterItems数组长度足够
  while (localSelectedFilterItems.value.length <= index) {
    localSelectedFilterItems.value.push([])
  }
  
  localSelectedFilterItems.value[index] = []
}

const clearFilterDimension = (index: number) => {
  const newFilterDimensions = [...props.filterDimensions]
  newFilterDimensions[index] = null

  const newSelectedFilterItems = [...props.selectedFilterItems]
  // 确保数组长度足够
  while (newSelectedFilterItems.length <= index) {
    newSelectedFilterItems.push([])
  }
  newSelectedFilterItems[index] = []

  emit('update:filterDimensions', newFilterDimensions)
  emit('update:selectedFilterItems', newSelectedFilterItems)
}

// 新增筛选条件
const addFilterDimension = () => {
  const newFilterDimensions = [...props.filterDimensions, null]
  const newSelectedFilterItems = [...props.selectedFilterItems, []]
  
  emit('update:filterDimensions', newFilterDimensions)
  emit('update:selectedFilterItems', newSelectedFilterItems)
}

// 删除筛选条件
const removeFilterDimension = (index: number) => {
  const newFilterDimensions = [...props.filterDimensions]
  newFilterDimensions.splice(index, 1)
  
  const newSelectedFilterItems = [...props.selectedFilterItems]
  newSelectedFilterItems.splice(index, 1)
  
  emit('update:filterDimensions', newFilterDimensions)
  emit('update:selectedFilterItems', newSelectedFilterItems)
}

// 折叠切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped lang="less">
.filter-section {
  margin-bottom: 24px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0; // 防止内容撑开
  flex-shrink: 0; // 防止被压缩

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s;
    width: 100%;
    box-sizing: border-box;

    &:hover {
      background-color: #f0f2f5;
    }

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collapse-btn {
      color: #8c8c8c;
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      flex-shrink: 0;

      &:hover {
        color: #1890ff;
        background-color: #e6f7ff;
      }
    }
  }

  .filter-drop {
    min-height: 50px;
    border: 2px dashed #d9d9d9;
    border-radius: 6px;
    padding: 8px 12px;
    transition: all 0.3s ease;
    background: #fafafa;
    position: relative;
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
    width: 100%;
    box-sizing: border-box;

    &.drag-over {
      border-color: #1890ff;
      background: #f6ffed;
    }

    &.has-content {
      border-color: #52c41a;
      background: white;
    }

    .filter-delete-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 2;
      
      :deep(.ant-btn) {
        color: #ff4d4f;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 50%;
        
        &:hover {
          background-color: #fff2f0;
          border-color: #ffccc7;
        }
      }
    }

    .drop-placeholder {
      text-align: center;
      color: #8c8c8c;
      font-size: 12px;
      width: 100%;
    }

    .filter-content {
      width: 100%;
      padding-right: 30px; // 为删除按钮留出空间
      box-sizing: border-box;

      .filter-header {
        margin-bottom: 8px;
        font-weight: 600;
        color: #262626;
        width: 100%;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .filter-actions {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
        flex-wrap: wrap; // 允许换行
        width: 100%;
        box-sizing: border-box;

        .action-btn {
          color: #1890ff;
          font-size: 11px;
          padding: 2px 6px;
          height: 24px;
          min-width: 0; // 防止按钮过宽

          &:hover {
            background: #f0f8ff;
          }
        }

        .clear-btn {
          color: #000000;
          font-size: 11px;
          padding: 2px 6px;
          height: 24px;
          min-width: 0; // 防止按钮过宽
        }
      }

      .filter-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 200px;
        overflow-y: auto;
        width: 100%;
        box-sizing: border-box;

        .filter-checkbox {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  .add-filter-btn {
    margin-top: 8px;
    text-align: center;
    width: 100%;
    
    :deep(.ant-btn) {
      color: #1890ff;
      border-color: #1890ff;
      width: 100%;
      
      &:hover {
        color: #40a9ff;
        border-color: #40a9ff;
      }
    }
  }
  
  // 拖拽悬停时的样式
  .add-filter-btn.drag-over {
    :deep(.ant-btn) {
      color: #fff;
      background-color: #1890ff;
      border-color: #1890ff;
    }
  }
}
</style>