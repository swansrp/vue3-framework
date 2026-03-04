<script setup lang="ts">
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, watch } from 'vue'

import type { FormConfigInfo, MatrixInfo, ColumnInfo } from '../types'

import DynamicFormItem from '@/framework/components/common/DragGrid/DynamicFormItem.vue'
import GridDraggableLayout, { type GridItem } from '@/framework/components/common/DragGrid/GridDraggableLayout.vue'
import { sysFormConfigUpdate } from '@/framework/views/MainContent/dynamic/apis/sysFormConfigPortalController'

interface Props {
  matrix: MatrixInfo
  formConfigs: FormConfigInfo[]
  columnList: ColumnInfo[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update'): void
  (e: 'add'): void
  (e: 'edit', item: FormConfigInfo): void
  (e: 'delete', item: FormConfigInfo): void
}>()

// 将 FormConfigInfo 转换为 GridItem
interface FormGridItem extends GridItem, FormConfigInfo {}

const gridItems = ref<FormGridItem[]>([])

// 监听 formConfigs 变化
watch(() => props.formConfigs, (configs) => {
  gridItems.value = configs.map(config => ({
    ...config,
    id: config.id || '',
    width: config.width || 2,
    height: config.height || 1,
    positionX: config.positionX || 0,
    positionY: config.positionY || 0
  }))
}, { immediate: true, deep: true })

// 处理字段位置或尺寸变化
const handleItemChange = async (item: FormGridItem) => {
  try {
    // 保存到数据库
    await sysFormConfigUpdate({}, {
      ...item,
      width: item.width,
      height: item.height,
      positionX: item.positionX,
      positionY: item.positionY
    } as any, false, false)
  } catch (error) {
    console.error('更新布局失败:', error)
    message.error('更新布局失败')
    emit('update')
  }
}

// 处理字段点击
const handleItemClick = (item: FormGridItem) => {
  console.log('点击字段:', item)
}

// 处理编辑字段
const handleEditItem = (item: FormGridItem) => {
  emit('edit', item)
}

// 处理删除字段
const handleDeleteItem = (item: FormGridItem) => {
  emit('delete', item)
}

// 添加字段
const handleAddField = () => {
  emit('add')
}
</script>

<template>
  <div class="form-layout-designer">
    <div class="designer-header">
      <div class="header-actions">
        <a-button
          type="primary"
          @click="handleAddField"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          添加表单字段
        </a-button>
      </div>
      
      <a-alert
        message="提示"
        description="拖动字段可调整位置，拖动边缘可调整大小。所有改动会自动保存。"
        type="info"
        show-icon
        closable
        style="margin-top: 16px;"
      />
    </div>

    <div class="designer-content">
      <GridDraggableLayout
        v-model:items="gridItems"
        :grid-size="60"
        :gap="12"
        :show-grid="true"
        :readonly="false"
        :min-height="500"
        @item-change="handleItemChange"
        @item-click="handleItemClick"
      >
        <!-- 自定义字段内容 -->
        <template #item="{ item }">
          <DynamicFormItem
            :attribute="item"
            :readonly="false"
          >
            <!-- 操作按钮 -->
            <template #action>
              <div class="field-actions">
                <a-button
                  type="link"
                  size="small"
                  title="编辑"
                  @click.stop="handleEditItem(item)"
                >
                  <EditOutlined />
                </a-button>
                <a-popconfirm
                  title="确定删除该字段吗？"
                  @confirm="handleDeleteItem(item)"
                >
                  <a-button
                    type="link"
                    size="small"
                    danger
                    title="删除"
                    @click.stop
                  >
                    <DeleteOutlined />
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
          </DynamicFormItem>
        </template>

        <!-- 空状态 -->
        <template #empty>
          <a-empty
            style="margin: 40px 0;"
          >
            <template #description>
              暂无字段配置，请先在字段配置标签页中添加字段
            </template>
            <a-button
              type="primary"
              @click="handleAddField"
            >
              添加字段
            </a-button>
          </a-empty>
        </template>
      </GridDraggableLayout>
    </div>
  </div>
</template>

<style scoped lang="less">
.form-layout-designer {
  height: 100%;
  display: flex;
  flex-direction: column;

  .designer-header {
    flex-shrink: 0;

    .header-actions {
      margin-bottom: 0;
    }
  }

  .designer-content {
    flex: 1;
    overflow: auto;
    background: #fafafa;
    padding: 16px;
    border-radius: 4px;
  }

  .field-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  :deep(.grid-item:hover) .field-actions {
    opacity: 1;
  }
}
</style>
