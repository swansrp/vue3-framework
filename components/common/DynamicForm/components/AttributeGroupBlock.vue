<script setup lang="ts">
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, UpOutlined, CopyOutlined } from '@ant-design/icons-vue'
import { ref, computed } from 'vue'

import { getEnterpriseDictByCode } from '@/framework/apis/dict/bizDictController'
import DynamicFormItem from '@/framework/components/common/DragGrid/DynamicFormItem.vue'
import GridDraggableLayout, { type GridItem } from '@/framework/components/common/DragGrid/GridDraggableLayout.vue'

interface AttributeGroup {
  id: string
  sectionId: string
  title: string
  description?: string
  multi: string  // '0': 单组, '1': 多组子表
  sort: number
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
  group: AttributeGroup
  attributes: Attribute[]
  readonly?: boolean
  isDefaultGroup?: boolean  // 是否为默认分组
  depth?: number  // 嵌套深度，用于缩进显示
  childGroups?: AttributeGroup[]  // 子分组列表
  allAttributes?: Record<string, Attribute[]>  // 所有分组的属性映射
  layoutMode?: boolean  // 布局模式：可拖拽但不可编辑
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  isDefaultGroup: false,
  depth: 0,
  childGroups: () => [],
  allAttributes: () => ({}),
  layoutMode: false
})

const emit = defineEmits<{
  (e: 'editGroup', group: AttributeGroup): void
  (e: 'deleteGroup', group: AttributeGroup): void
  (e: 'addAttribute', groupId: string): void
  (e: 'addChildGroup', parentGroupId: string): void  // 添加子分组
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

// 字典缓存
const dictCache = ref<Record<string, { value: string; label: string }[]>>({})

// 字典翻译函数（管理端模式）
const dictTranslateFn = async (dictName: string, value: string): Promise<string> => {
  try {
    // 如果缓存中没有该字典，先加载
    if (!dictCache.value[dictName]) {
      const res = await getEnterpriseDictByCode(
        { dictCode: dictName, bizId: '' },
        false, false, false
      )
      if (res?.status?.code === 0 && res.payload) {
        dictCache.value[dictName] = (res.payload as any[]).map(item => ({
          value: item.value,
          label: item.label
        }))
      }
    }
    
    // 从缓存中查找翻译
    const dictItems = dictCache.value[dictName] || []
    const found = dictItems.find(item => item.value === value)
    return found?.label || value
  } catch (error) {
    console.error('字典翻译失败:', error)
    return value
  }
}

// 处理属性变更
const handleAttributeChange = (attr: Attribute) => {
  const widthPercent = attr.width ? Math.round(attr.width) : 10
  const posXPercent = attr.positionX !== undefined ? Math.round(attr.positionX) : undefined
  
  emit('updateAttributeSize', attr, {
    width: widthPercent,
    height: attr.height || 1,
    positionX: posXPercent,
    positionY: attr.positionY
  })
}

// 是否显示分组标题（默认分组不显示标题）
const showGroupHeader = computed(() => !props.isDefaultGroup)
</script>

<template>
  <div
    class="attribute-group-block"
    :class="{ 'is-default-group': isDefaultGroup, 'is-collapsed': collapsed }"
  >
    <!-- 分组标题栏（默认分组不显示） -->
    <div
      v-if="showGroupHeader"
      class="group-header"
    >
      <div
        class="header-content"
        @click="toggleCollapse"
      >
        <component
          :is="collapsed ? DownOutlined : UpOutlined"
          class="collapse-icon"
        />
        <h5>{{ group.title }}</h5>
        <span
          v-if="group.multi === '1'"
          class="multi-badge"
        >
          支持多行
        </span>
      </div>
      <div
        v-if="!readonly"
        class="actions"
      >
        <a-button
          type="link"
          size="small"
          @click="emit('editGroup', group)"
        >
          <EditOutlined /> 编辑
        </a-button>
        <a-button
          type="link"
          size="small"
          danger
          @click="emit('deleteGroup', group)"
        >
          <DeleteOutlined /> 删除
        </a-button>
        <a-button
          type="link"
          size="small"
          @click="emit('addAttribute', group.id)"
        >
          <PlusOutlined /> 添加字段
        </a-button>
        <a-button
          type="link"
          size="small"
          @click="emit('addChildGroup', group.id)"
        >
          <PlusOutlined /> 添加子分组
        </a-button>
      </div>
    </div>

    <!-- 分组内容 -->
    <div
      v-show="isDefaultGroup || !collapsed"
      class="group-content"
    >
      <!-- 默认分组的添加字段按钮 -->
      <div
        v-if="isDefaultGroup && !readonly"
        class="default-group-actions"
      >
        <a-button
          type="dashed"
          size="small"
          @click="emit('addAttribute', group.id)"
        >
          <PlusOutlined /> 添加字段到默认分组
        </a-button>
      </div>

      <!-- 字段网格布局 -->
      <GridDraggableLayout
        v-if="attributes.length > 0"
        :items="attributes"
        :grid-size="60"
        :gap="12"
        :show-grid="layoutMode || !readonly"
        :readonly="!layoutMode && readonly"
        :min-height="300"
        @item-change="handleAttributeChange"
      >
        <template #item="{ item: attr }">
          <DynamicFormItem
            :attribute="attr"
            :readonly="true"
            :dict-translate-fn="dictTranslateFn"
          >
            <template #action>
              <!-- 布局模式不显示操作按钮 -->
              <div
                v-if="!readonly && !layoutMode"
                class="field-actions"
              >
                <a-button
                  v-if="attr.fieldType !== '-1'"
                  type="link"
                  size="small"
                  title="复制"
                  @click.stop="emit('copyAttribute', attr)"
                >
                  <CopyOutlined />
                </a-button>
                <a-button
                  v-if="attr.fieldType !== '-1'"
                  type="link"
                  size="small"
                  title="编辑"
                  @click.stop="emit('editAttribute', attr)"
                >
                  <EditOutlined />
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  danger
                  title="删除"
                  @click.stop="emit('deleteAttribute', attr)"
                >
                  <DeleteOutlined />
                </a-button>
              </div>
            </template>
          </DynamicFormItem>
        </template>

        <template #empty>
          <a-empty
            description="暂无字段，请添加"
            style="margin: 20px 0;"
          />
        </template>
      </GridDraggableLayout>

      <!-- 空状态（仅在没有字段且没有子分组时显示） -->
      <a-empty
        v-if="attributes.length === 0 && childGroups.length === 0"
        description="暂无字段，请添加"
        style="margin: 20px 0;"
      />
      
      <!-- 递归渲染子分组 -->
      <div
        v-if="childGroups.length > 0"
        class="child-groups"
      >
        <AttributeGroupBlock
          v-for="childGroup in childGroups"
          :key="childGroup.id"
          :group="childGroup"
          :attributes="allAttributes[childGroup.id] || []"
          :readonly="readonly"
          :depth="depth + 1"
          :child-groups="(allAttributes[childGroup.id + '_children'] || []) as unknown as AttributeGroup[]"
          :all-attributes="allAttributes"
          @edit-group="emit('editGroup', $event)"
          @delete-group="emit('deleteGroup', $event)"
          @add-attribute="emit('addAttribute', $event)"
          @add-child-group="emit('addChildGroup', $event)"
          @edit-attribute="emit('editAttribute', $event)"
          @delete-attribute="emit('deleteAttribute', $event)"
          @copy-attribute="emit('copyAttribute', $event)"
          @update-attribute-size="(attr: Attribute, size) => emit('updateAttributeSize', attr, size)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.attribute-group-block {
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;

  &.is-default-group {
    border: 1px dashed #d9d9d9;
    background: #fafafa;
  }

  &.is-collapsed {
    .group-header {
      border-bottom: none;
    }
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
    border-bottom: 2px solid #1890ff;
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
      background: linear-gradient(135deg, #e6f4ff 0%, #d6e8ff 100%);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      flex: 1;
      min-width: 0;

      .collapse-icon {
        color: #1890ff;
        font-size: 12px;
        transition: transform 0.2s ease;
      }

      h5 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #1890ff;
      }

      .multi-badge {
        padding: 2px 8px;
        font-size: 11px;
        color: #52c41a;
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 4px;
      }
    }

    .actions {
      display: flex;
      gap: 4px;
    }
  }

  .group-content {
    padding: 16px;
    animation: fadeIn 0.3s ease;

    .default-group-actions {
      margin-bottom: 12px;
    }
  }

  .field-actions {
    display: flex;
    gap: 2px;
  }
  
  .child-groups {
    margin-top: 16px;
    padding-left: 20px;
    border-left: 2px solid #e8e8e8;
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
