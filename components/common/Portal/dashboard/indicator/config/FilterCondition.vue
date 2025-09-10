<template>
  <div class="filter-section">
    <div class="section-header" @click="toggleCollapse">
      <h4>全局筛选条件</h4>
      <a-button type="text" size="small" class="collapse-btn">
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </a-button>
    </div>

    <div v-show="!collapsed" class="section-content">
      <div
        class="drop-zone filter-drop"
        :class="{
          'has-content': filterDimension, 
          'drag-over': dragOverFilter
        }"
        @dragover.prevent="onDragOverFilter"
        @dragleave="onDragLeaveFilter"
        @drop="onDropFilterDimension"
      >
        <div v-if="!filterDimension" class="drop-placeholder">
          拖拽指标到此处设置筛选条件
        </div>
        <div v-else class="filter-content">
          <div class="filter-header">
            <span>{{ filterDimension?.title }}</span>
            <div class="filter-actions">
              <a-button
                type="text"
                size="small"
                @click="selectAllFilterItems"
                class="action-btn"
              >
                全选
              </a-button>
              <a-button
                type="text"
                size="small"
                @click="reverseFilterItems"
                class="action-btn"
              >
                反选
              </a-button>
              <a-button
                type="text"
                size="small"
                @click="clearAllFilterItems"
                class="action-btn"
              >
                全部取消
              </a-button>
              <a-button
                type="text"
                size="small"
                @click="clearFilterDimension"
                class="clear-btn"
              >
                清空
              </a-button>
            </div>
          </div>
          <a-checkbox-group v-model:value="localSelectedFilterItems" class="filter-items">
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
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject, ref, watch} from 'vue'
import {DownOutlined, RightOutlined} from '@ant-design/icons-vue'

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
  filterDimension: IndicatorGroup | null
  selectedFilterItems: string[]
}>()

// Emits
const emit = defineEmits<{
  'update:filterDimension': [dimension: IndicatorGroup | null]
  'update:selectedFilterItems': [items: string[]]
}>()

// 折叠状态
const collapsed = ref(false)

// 拖拽状态管理
const dragOverFilter = ref(false)

// 注入全局拖拽数据
const dragData = inject<{ value: DragData | null }>('dragData')

// 本地状态
const localSelectedFilterItems = ref<string[]>([])

// 监听props变化更新本地状态
watch(
    () => props.selectedFilterItems,
    (newValue) => {
      localSelectedFilterItems.value = newValue
    },
    { immediate: true }
)

// 监听本地状态变化更新props
watch(
    localSelectedFilterItems,
    (newValue) => {
      emit('update:selectedFilterItems', newValue)
    }
)

// 拖拽事件处理
const onDragOverFilter = (e: DragEvent) => {
  e.preventDefault()
  dragOverFilter.value = true
  // 筛选维度不需要检查重复，始终允许放置
  document.body.style.cursor = 'copy'
  console.log('悬停在筛选维度上')
}

const onDragLeaveFilter = () => {
  dragOverFilter.value = false
  document.body.style.cursor = 'default'
  console.log('离开筛选维度')
}

const onDropFilterDimension = (e: DragEvent) => {
  console.log('放入筛选维度:', e, dragData?.value)
  e.preventDefault()
  dragOverFilter.value = false
  document.body.style.cursor = 'default'

  if (!dragData?.value) {
    console.log('错误: 没有拖拽数据')
    return
  }

  // 筛选维度不检查重复，始终允许放置
  console.log('设置筛选维度:', dragData.value)
  const newFilterDimension: IndicatorGroup = {
    key: dragData.value.key,
    title: dragData.value.title,
    items: dragData.value.items || []
  }

  emit('update:filterDimension', newFilterDimension)
  emit('update:selectedFilterItems', [])
  console.log('筛选维度设置成功:', newFilterDimension)
}

// 筛选条件操作方法
const selectAllFilterItems = () => {
  if (props.filterDimension?.items) {
    localSelectedFilterItems.value = props.filterDimension.items.map(item => item.key)
  }
}

const reverseFilterItems = () => {
  if (props.filterDimension?.items) {
    const allKeys = props.filterDimension.items.map(item => item.key)
    const currentKeys = localSelectedFilterItems.value
    localSelectedFilterItems.value = allKeys.filter(key => !currentKeys.includes(key))
  }
}

const clearAllFilterItems = () => {
  localSelectedFilterItems.value = []
}

const clearFilterDimension = () => {
  emit('update:filterDimension', null)
  emit('update:selectedFilterItems', [])
}

// 折叠切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style scoped lang="less">
.filter-section {
  margin-bottom: 24px;

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

    &:hover {
      background-color: #f0f2f5;
    }

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #262626;
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
    align-items: center;

    &.drag-over {
      border-color: #1890ff;
      background: #f6ffed;
    }

    &.has-content {
      border-color: #52c41a;
      background: white;
    }

    .drop-placeholder {
      text-align: center;
      color: #8c8c8c;
      font-size: 12px;
      width: 100%;
    }

    .filter-content {
      width: 100%;

      .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-weight: 600;
        color: #262626;

        .filter-actions {
          display: flex;
          gap: 4px;

          .action-btn {
            color: #1890ff;
            font-size: 11px;
            padding: 2px 6px;
            height: 24px;

            &:hover {
              background: #f0f8ff;
            }
          }

          .clear-btn {
            color: #000000;
            font-size: 11px;
            padding: 2px 6px;
            height: 24px;
          }
        }
      }

      .filter-items {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .filter-checkbox {
          font-size: 12px;
        }
      }
    }
  }
}
</style>