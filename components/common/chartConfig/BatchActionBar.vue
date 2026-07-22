<template>
  <transition name="slide-up">
    <div
      v-if="visible"
      class="batch-action-bar"
    >
      <div class="bar-left">
        <span class="batch-mode-tag">批量模式</span>
        <span class="selected-count">左侧树已勾选 {{ selectedCount }} 个指标</span>
      </div>
      <div class="bar-actions">
        <a-button
          type="primary"
          :loading="copying"
          :disabled="selectedCount === 0"
          @click="$emit('batch-copy')"
        >
          <CopyOutlined />
          复制选中
        </a-button>
        <a-button
          :disabled="selectedCount === 0"
          @click="$emit('batch-edit')"
        >
          <EditOutlined />
          批量编辑
        </a-button>
        <a-button
          danger
          :loading="deleting"
          :disabled="selectedCount === 0"
          @click="$emit('batch-delete')"
        >
          <DeleteOutlined />
          批量删除
        </a-button>
      </div>
      <div class="bar-right">
        <a-button
          size="small"
          @click="$emit('exit-batch')"
        >
          退出批量模式
        </a-button>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'

interface Props {
  visible: boolean
  selectedCount: number
  copying?: boolean
  deleting?: boolean
}

interface Emits {
  (e: 'batch-copy'): void
  (e: 'batch-edit'): void
  (e: 'batch-delete'): void
  (e: 'exit-batch'): void
}

withDefaults(defineProps<Props>(), {
  visible: false,
  selectedCount: 0,
  copying: false,
  deleting: false
})

defineEmits<Emits>()
</script>

<style lang="less" scoped>
.batch-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;

  .bar-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .batch-mode-tag {
      padding: 2px 8px;
      background: #e6f7ff;
      border: 1px solid #91d5ff;
      border-radius: 4px;
      font-size: 12px;
      color: #1890ff;
      font-weight: 500;
    }

    .selected-count {
      font-size: 14px;
      color: #595959;
      white-space: nowrap;
    }
  }

  .bar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 12px;
    border-left: 1px solid #f0f0f0;
  }

  .bar-right {
    padding-left: 12px;
    border-left: 1px solid #f0f0f0;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
