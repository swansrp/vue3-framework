<script setup lang="ts">
/**
 * DictItemsList - 字典项列表组件
 * 
 * 可复用的字典项列表展示组件，支持拖动排序或上移/下移排序
 */
import { DragOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'

import type { BizDictVO } from '@/framework/apis/dict/bizDictController'

interface Props {
  // 字典项列表
  items: BizDictVO[]
  // 企业ID字段名
  entityIdField?: string
  // 是否为管理端模式
  isManageMode?: boolean
  // 排序模式：drag（拖动） | buttons（上移/下移按钮）
  sortMode?: 'drag' | 'buttons'
  // 标题文本
  title?: string
  // 字典名称映射（用于显示上级字典名称）
  dictNameMap?: Record<string, string>
  // 上级字典项值→标签映射（用于显示 parentValue 的标签）
  parentValueLabelMap?: Record<string, string>
}

interface Emits {
  (e: 'edit', item: BizDictVO): void
  (e: 'delete', item: BizDictVO): void
  (e: 'sort-change', items: BizDictVO[]): void
}

const props = withDefaults(defineProps<Props>(), {
  entityIdField: 'bizId',
  isManageMode: false,
  sortMode: 'drag',
  title: '所有字典项',
  dictNameMap: () => ({}),
  parentValueLabelMap: () => ({})
})

const emit = defineEmits<Emits>()

const draggedIndex = ref<number | null>(null)

// 检查是否为系统字典项
const isSystemDict = (item: BizDictVO) => {
  return !item[props.entityIdField as keyof BizDictVO]
}

// 拖动开始
const handleDragStart = (index: number) => {
  if (props.sortMode !== 'drag') return
  
  // 管理端模式下，系统字典项也可以拖动
  const item = props.items[index]
  if (!props.isManageMode && isSystemDict(item)) {
    return
  }
  
  draggedIndex.value = index
}

// 拖动放置
const handleDrop = (targetIndex: number) => {
  if (props.sortMode !== 'drag') return
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }
  
  // 管理端模式下，系统字典项也可以拖动和交换位置
  const draggedItem = props.items[draggedIndex.value]
  const targetItem = props.items[targetIndex]
  
  if (!props.isManageMode && (isSystemDict(draggedItem) || isSystemDict(targetItem))) {
    draggedIndex.value = null
    return
  }
  
  const items = [...props.items]
  const [movedItem] = items.splice(draggedIndex.value, 1)
  items.splice(targetIndex, 0, movedItem)
  
  draggedIndex.value = null
  emit('sort-change', items)
}

// 上移
const moveUp = (index: number) => {
  if (index <= 0) return
  
  const items = [...props.items]
  const currentItem = items[index]
  const targetItem = items[index - 1]
  
  // 管理端模式下，系统字典项也可以移动
  if (!props.isManageMode && (isSystemDict(currentItem) || isSystemDict(targetItem))) {
    return
  }
  
  const temp = items[index]
  items[index] = items[index - 1]
  items[index - 1] = temp
  emit('sort-change', items)
}

// 下移
const moveDown = (index: number) => {
  if (index >= props.items.length - 1) return
  
  const items = [...props.items]
  const currentItem = items[index]
  const targetItem = items[index + 1]
  
  // 管理端模式下，系统字典项也可以移动
  if (!props.isManageMode && (isSystemDict(currentItem) || isSystemDict(targetItem))) {
    return
  }
  
  const temp = items[index]
  items[index] = items[index + 1]
  items[index + 1] = temp
  emit('sort-change', items)
}

// 编辑
const handleEdit = (item: BizDictVO) => {
  emit('edit', item)
}

// 删除
const handleDelete = (item: BizDictVO) => {
  emit('delete', item)
}

// 获取字典名称
const getDictName = (dictCode: string): string => {
  return props.dictNameMap[dictCode] || dictCode
}

// 获取上级字典项的标签
const getParentValueLabel = (parentDictCode: string, parentValue: string): string => {
  const key = `${parentDictCode}_${parentValue}`
  return props.parentValueLabelMap[key] || parentValue
}
</script>

<template>
  <div class="dict-items-list">
    <div class="section-title">
      {{ title }}{{ sortMode === 'drag' ? '（拖动自动保存）' : '（上移/下移自动保存）' }}
    </div>
    <div
      v-for="(item, index) in items"
      :key="item.id || index"
      :class="[
        'dict-item',
        { 'system-item': item[entityIdField] == null },
        { 'no-drag': !isManageMode && item[entityIdField] == null }
      ]"
      :draggable="sortMode === 'drag' && (isManageMode || item[entityIdField] != null)"
      @dragstart="handleDragStart(index)"
      @dragover.prevent
      @drop="handleDrop(index)"
    >
      <DragOutlined 
        v-if="sortMode === 'drag'"
        class="drag-icon" 
      />
      <div class="item-info">
        <span class="item-label">{{ item.label }}</span>
        <span
          v-if="item.parentDictCode && item.parentValue"
          class="item-parent"
        >
          ← {{ getDictName(item.parentDictCode) }} / {{ getParentValueLabel(item.parentDictCode, item.parentValue) }}
        </span>
        <span
          v-else-if="item.parentValue"
          class="item-parent"
        >
          ← {{ item.parentValue }}
        </span>
        <span
          v-if="item[entityIdField] == null"
          class="item-tag system"
        >系统</span>
      </div>
      <div class="item-actions">
        <!-- 上移/下移按钮模式 -->
        <template v-if="sortMode === 'buttons'">
          <a-button
            size="small"
            :disabled="index === 0 || (!isManageMode && (isSystemDict(item) || (index > 0 && isSystemDict(items[index - 1]))))"
            :title="index === 0 ? '已是第一项' : (!isManageMode && isSystemDict(item)) ? '系统字典项不能移动' : (!isManageMode && index > 0 && isSystemDict(items[index - 1])) ? '不能与系统字典项交换' : '点击上移'"
            @click="moveUp(index)"
          >
            上移
          </a-button>
          <a-button
            size="small"
            :disabled="index === items.length - 1 || (!isManageMode && (isSystemDict(item) || (index < items.length - 1 && isSystemDict(items[index + 1]))))"
            :title="index === items.length - 1 ? '已是最后一项' : (!isManageMode && isSystemDict(item)) ? '系统字典项不能移动' : (!isManageMode && index < items.length - 1 && isSystemDict(items[index + 1])) ? '不能与系统字典项交换' : '点击下移'"
            @click="moveDown(index)"
          >
            下移
          </a-button>
        </template>
        
        <!-- 编辑按钮 -->
        <a-button
          size="small"
          :disabled="isManageMode ? false : (sortMode === 'buttons' && (!item[entityIdField] || item[entityIdField] == null))"
          @click="handleEdit(item)"
        >
          编辑
        </a-button>
        
        <!-- 删除按钮 -->
        <a-button
          size="small"
          danger
          :disabled="isManageMode ? false : (item[entityIdField] == null)"
          @click="handleDelete(item)"
        >
          <template #icon>
            <DeleteOutlined />
          </template>
          删除
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.dict-items-list {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  }
  
  .dict-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    margin-bottom: 10px;
    transition: all 0.3s;
    background: linear-gradient(to right, #ffffff 0%, #f8f9ff 100%);
    
    &[draggable="true"] {
      cursor: move;
    }
    
    &:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      transform: translateY(-1px);
    }
    
    &.system-item {
      background: linear-gradient(to right, #fafafa 0%, #f0f0f0 100%);
      
      &.no-drag {
        cursor: not-allowed;
      }
    }
    
    .drag-icon {
      font-size: 18px;
      color: #667eea;
      margin-right: 12px;
      cursor: move;
      transition: color 0.3s;
      
      &:hover {
        color: #764ba2;
      }
    }
    
    &.no-drag .drag-icon {
      color: #d9d9d9;
      cursor: not-allowed;
      
      &:hover {
        color: #d9d9d9;
      }
    }
    
    .item-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      
      .item-label {
        font-size: 15px;
        font-weight: 600;
        color: #333;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .item-parent {
        font-size: 12px;
        color: #8c8c8c;
        background: #f5f5f5;
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      .item-value {
        font-size: 11px;
        color: #bfbfbf;
        font-weight: 300;
      }
      
      .item-tag {
        padding: 2px 6px;
        font-size: 11px;
        border-radius: 3px;
        font-weight: 300;
        display: inline-flex;
        align-items: center;
        opacity: 0.7;
        
        &.system {
          background: #fff7e6;
          color: #fa8c16;
          border: 1px solid #ffe7ba;
        }
        
        &.enterprise {
          background: #f0f5ff;
          color: #597ef7;
          border: 1px solid #d6e4ff;
        }
      }
    }
    
    .item-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
