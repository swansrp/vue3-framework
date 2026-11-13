<template>
  <div
    v-if="items.length > 0"
    class="bidr-agent-tray"
  >
    <div
      v-for="item in items"
      :key="item.uid"
      class="bidr-agent-chip"
      :class="`is-${item.status}`"
    >
      <FileTextOutlined class="bidr-agent-chip__icon" />
      <div class="bidr-agent-chip__main">
        <div class="bidr-agent-chip__line">
          <span
            class="bidr-agent-chip__name"
            :title="item.name"
          >{{ item.name }}</span>
          <span class="bidr-agent-chip__size">{{ formatFileSize(item.size) }}</span>
        </div>
        <div
          v-if="item.status === 'uploading'"
          class="bidr-agent-chip__progress"
        >
          <div
            class="bidr-agent-chip__progress-bar"
            :style="{ width: `${item.progress}%` }"
          ></div>
        </div>
        <div
          v-else-if="item.status === 'error'"
          class="bidr-agent-chip__error"
          :title="item.error"
        >
          {{ item.error || '上传失败' }}
        </div>
      </div>
      <span
        v-if="item.status === 'done'"
        class="bidr-agent-chip__state"
      >已上传</span>
      <span
        v-else-if="item.status === 'uploading'"
        class="bidr-agent-chip__state"
      >{{ item.progress }}%</span>
      <button
        type="button"
        class="bidr-agent-chip__remove"
        :disabled="item.status === 'uploading'"
        :title="item.status === 'uploading' ? '上传中不可移除' : '从待发列表移除（不会删除会话内已传文件）'"
        @click.stop="emit('remove', item.uid)"
      >
        <DeleteOutlined />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DeleteOutlined, FileTextOutlined } from '@ant-design/icons-vue'

import { formatFileSize, type AttachmentItem } from '../types'

interface Props {
  /** 附件队列（含上传中/已完成/失败；父组件持有数据源） */
  items: AttachmentItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'remove', uid: string): void
}>()
</script>