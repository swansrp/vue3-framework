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
      <CloseCircleFilled
        v-if="item.status === 'error'"
        class="bidr-agent-chip__icon is-error"
      />
      <CheckCircleFilled
        v-else-if="item.status === 'parsed' && !item.parseNote"
        class="bidr-agent-chip__icon is-ok"
      />
      <LoadingOutlined
        v-else-if="item.status === 'parsing'"
        class="bidr-agent-chip__icon is-parsing"
        spin
      />
      <FileTextOutlined
        v-else
        class="bidr-agent-chip__icon"
      />
      <div class="bidr-agent-chip__main">
        <div class="bidr-agent-chip__line">
          <span
            class="bidr-agent-chip__name"
            :title="item.name"
          >{{ item.name }}</span>
          <span class="bidr-agent-chip__size">{{ formatFileSize(item.size) }}</span>
        </div>
        <!-- 进度条：上传＝实量进度；解析＝流动条纹（解析进度由服务端任务推进，前端取不到百分比） -->
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
          v-else-if="item.status === 'parsing'"
          class="bidr-agent-chip__progress is-indeterminate"
        >
          <div class="bidr-agent-chip__progress-bar"></div>
        </div>
        <div
          v-else-if="item.status === 'error'"
          class="bidr-agent-chip__error"
          :title="item.error"
        >
          {{ item.error || '上传失败' }}
        </div>
        <div
          v-else-if="item.parseNote"
          class="bidr-agent-chip__note"
          :title="item.parseNote"
        >
          {{ item.parseNote }}
        </div>
      </div>
      <span
        v-if="item.status === 'staged'"
        class="bidr-agent-chip__state"
      >待发送</span>
      <span
        v-else-if="item.status === 'done'"
        class="bidr-agent-chip__state"
      >已上传</span>
      <span
        v-else-if="item.status === 'uploading'"
        class="bidr-agent-chip__state"
      >{{ item.progress }}%</span>
      <span
        v-else-if="item.status === 'parsing'"
        class="bidr-agent-chip__state"
      >解析中</span>
      <span
        v-else-if="item.status === 'parsed'"
        class="bidr-agent-chip__state"
      >{{ item.parseChars ? `已解析 · ${item.parseChars} 字` : '已解析' }}</span>
      <!-- 失败项：可重试（原始文件仍在队列里）——重传成功即恢复待发 -->
      <button
        v-if="item.status === 'error' && item.file"
        type="button"
        class="bidr-agent-chip__retry"
        title="重新上传并解析这个文件"
        @click.stop="emit('retry', item.uid)"
      >
        重试
      </button>
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
import {
  CheckCircleFilled, CloseCircleFilled, DeleteOutlined, FileTextOutlined, LoadingOutlined
} from '@ant-design/icons-vue'

import { formatFileSize, type AttachmentItem } from '../types'

interface Props {
  /** 附件队列（含待发/上传中/解析中/已完成/失败；父组件持有数据源） */
  items: AttachmentItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'remove', uid: string): void
  (e: 'retry', uid: string): void
}>()
</script>