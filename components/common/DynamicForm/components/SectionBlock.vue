<script setup lang="ts">
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { ref, computed } from 'vue'

import AttributeGroupBlock from './AttributeGroupBlock.vue'

import { type GridItem } from '@/framework/components/common/DragGrid/GridDraggableLayout.vue'

interface Section {
  id: string
  title: string
  description?: string
  sort: number
}

interface AttributeGroup {
  id: string
  sectionId: string
  pid?: number | null  // 父分组ID
  title: string
  description?: string
  multi: string  // '0': 单组, '1': 多组子表
  sort: number
  children?: AttributeGroup[]  // 子分组列表（树形结构）
}

interface Attribute extends GridItem {
  id: string
  sectionId: string
  groupId?: string
  name: string
  label: string
  fieldType: string
  isRequired: string
  unit?: string
  defaultValue?: string
  description?: string
  width?: number
  height?: number
  positionX?: number
  positionY?: number
  minValue?: string
  maxValue?: string
  dict?: string
  validationRule?: string
}

interface Props {
  section: Section
  groups?: AttributeGroup[]  // 树形结构，已按照pid排列
  attributes: Record<string, Attribute[]> | Attribute[]  // 按groupId分类的属性映射 或 纯数组（layoutMode）
  readonly?: boolean
  layoutMode?: boolean  // 布局模式：只读，仅允许拖拽调整位置
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  groups: () => [],
  layoutMode: false
})

const emit = defineEmits<{
  (e: 'editSection', section: Section): void
  (e: 'deleteSection', section: Section): void
  (e: 'addGroup', sectionId: string, parentGroupId?: string): void
  (e: 'editGroup', group: AttributeGroup): void
  (e: 'deleteGroup', group: AttributeGroup): void
  (e: 'addAttribute', sectionId: string, groupId?: string): void
  (e: 'editAttribute', attribute: Attribute): void
  (e: 'deleteAttribute', attribute: Attribute): void
  (e: 'copyAttribute', attribute: Attribute): void
  (e: 'updateAttributeSize', attribute: Attribute, size: { width: number; height: number; positionX?: number; positionY?: number }): void
}>()

// 折叠状态
const collapsed = ref(false)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 排序后的分组列表（仅顶级分组）
const sortedGroups = computed(() => {
  return [...(props.groups || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
})

// 获取某个分组的字段
const getGroupAttributes = (groupId: string) => {
  // 如果是 layoutMode，attributes 是数组
  if (props.layoutMode && Array.isArray(props.attributes)) {
    return props.attributes
  }
  // 否则按 groupId 分类
  return (props.attributes as Record<string, Attribute[]>)[groupId] || []
}

// 分组事件处理
const handleEditGroup = (group: AttributeGroup) => {
  emit('editGroup', group)
}

const handleDeleteGroup = (group: AttributeGroup) => {
  emit('deleteGroup', group)
}

const handleAddAttributeToGroup = (groupId: string) => {
  emit('addAttribute', props.section.id, groupId)
}

const handleAddChildGroup = (parentGroupId: string) => {
  emit('addGroup', props.section.id, parentGroupId)
}
</script>

<template>
  <div
    class="form-section-block"
    :class="{ 'is-collapsed': collapsed }"
  >
    <div
      class="section-title-bar"
      @click="toggleCollapse"
    >
      <div class="title-content">
        <component
          :is="collapsed ? DownOutlined : UpOutlined"
          class="collapse-icon"
        />
        <h4>{{ section.title }}</h4>
      </div>
      <div
        v-if="!readonly"
        class="action-buttons"
        @click.stop
      >
        <a-button
          type="link"
          size="small"
          @click="emit('editSection', section)"
        >
          <EditOutlined /> 编辑区块
        </a-button>
        <a-button
          type="link"
          size="small"
          danger
          @click="emit('deleteSection', section)"
        >
          <DeleteOutlined /> 删除
        </a-button>
        <a-button
          type="link"
          size="small"
          @click="emit('addGroup', section.id)"
        >
          <PlusOutlined /> 添加顶级分组
        </a-button>
      </div>
    </div>

    <!-- Section 内容：分组列表 -->
    <div
      v-show="!collapsed"
      class="section-content"
    >
      <!-- 布局模式：直接渲染字段 -->
      <template v-if="layoutMode">
        <AttributeGroupBlock
          :group="{ id: 'default', sectionId: section.id, title: section.title, multi: '0', sort: 0 }"
          :attributes="Array.isArray(attributes) ? attributes : []"
          :readonly="true"
          :layout-mode="true"
          :is-default-group="true"
          :depth="0"
          :child-groups="[]"
          :all-attributes="{}"
          @update-attribute-size="(attr, size) => emit('updateAttributeSize', attr, size)"
        />
      </template>
      
      <!-- 正常模式：遍历所有分组 -->
      <template v-else>
        <AttributeGroupBlock
          v-for="group in sortedGroups"
          :key="group.id"
          :group="group"
          :attributes="getGroupAttributes(group.id)"
          :readonly="readonly"
          :is-default-group="group.sort === 0"
          :depth="0"
          :child-groups="group.children || []"
          :all-attributes="attributes as Record<string, Attribute[]>"
          @edit-group="handleEditGroup"
          @delete-group="handleDeleteGroup"
          @add-attribute="handleAddAttributeToGroup"
          @add-child-group="handleAddChildGroup"
          @edit-attribute="(attr) => emit('editAttribute', attr)"
          @delete-attribute="(attr) => emit('deleteAttribute', attr)"
          @copy-attribute="(attr) => emit('copyAttribute', attr)"
          @update-attribute-size="(attr, size) => emit('updateAttributeSize', attr, size)"
        />

        <!-- 空状态 -->
        <a-empty
          v-if="sortedGroups.length === 0"
          description="暂无分组，请添加"
          style="margin: 40px 0;"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.form-section-block {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &.is-collapsed {
    padding-bottom: 16px;

    .section-title-bar {
      margin-bottom: 0;
      padding-bottom: 12px;
    }
  }

  .section-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1890ff;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(24, 144, 255, 0.04);
      margin: -4px -8px 16px;
      padding: 4px 8px 12px;
      border-radius: 4px;
    }

    .title-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .collapse-icon {
        color: #1890ff;
        font-size: 12px;
        transition: transform 0.2s ease;
      }

      h4 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #1890ff;
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }
  }

  .section-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
