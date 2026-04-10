<script setup lang="ts">
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'

interface Module {
  id: string
  title: string
  description?: string
  multi: string
  sort: number
}

interface Props {
  modules: Module[]
  currentIndex: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const { modules, currentIndex, readonly } = toRefs(props)
const emit = defineEmits<{
  (e: 'change', index: number): void
  (e: 'edit', module: Module): void
  (e: 'delete', module: Module): void
  (e: 'add'): void
}>()

const handleStepChange = (index: number) => {
  emit('change', index)
}

const handleEdit = (module: Module, event: Event) => {
  event.stopPropagation()
  emit('edit', module)
}

const handleDelete = (module: Module, event: Event) => {
  event.stopPropagation()
  emit('delete', module)
}
</script>

<template>
  <a-steps
    :current="currentIndex"
    class="module-steps"
    @change="handleStepChange"
  >
    <a-step
      v-for="(module) in modules"
      :key="module.id"
      :title="module.title"
    >
      <template #description>
        <div
          v-if="!readonly"
          class="step-actions"
        >
          <span
            class="action-btn"
            @click="handleEdit(module, $event)"
          >
            <EditOutlined />
          </span>
          <span
            class="action-btn action-btn-danger"
            @click="handleDelete(module, $event)"
          >
            <DeleteOutlined />
          </span>
        </div>
      </template>
    </a-step>
    <!-- 添加模块步骤 -->
    <a-step
      v-if="!readonly"
      key="add-module"
      class="add-step"
      @click="emit('add')"
    >
      <template #icon>
        <span class="add-icon">
          <PlusOutlined />
        </span>
      </template>
      <template #title>
        <span class="add-title">添加模块</span>
      </template>
    </a-step>
  </a-steps>
</template>

<style scoped lang="less">
.module-steps {
  margin-bottom: 32px;

  .step-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 4px;
  }

  // 操作按钮样式
  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-size: 12px;
    color: #8c8c8c;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: #1890ff;
      background: #e6f4ff;
    }

    &.action-btn-danger {
      &:hover {
        color: #ff4d4f;
        background: #fff1f0;
      }
    }
  }

  // 添加模块步骤样式
  .add-step {
    :deep(.ant-steps-item-icon) {
      width: 32px;
      height: 32px;
      border: 2px dashed #1890ff;
      border-radius: 50%;
      background: #f0f7ff;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #e6f4ff;
        border-color: #40a9ff;
      }
    }

    .add-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: #1890ff;
      font-size: 16px;
    }

    .add-title {
      color: #1890ff;
      font-size: 13px;
    }

    &:hover {
      .add-title {
        color: #40a9ff;
      }
    }
  }
}
</style>
