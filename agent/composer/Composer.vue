<template>
  <div
    class="bidr-agent-composer"
    :class="{ 'is-dragover': dragActive }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <AttachmentTray
      :items="items"
      @remove="emit('remove', $event)"
    />

    <div class="bidr-agent-composer__row">
      <a-textarea
        v-model:value="text"
        class="bidr-agent-composer__input"
        :placeholder="placeholder"
        :auto-size="{ minRows: 1, maxRows: 4 }"
        :disabled="disabled"
        @press-enter="onPressEnter"
      />

      <div class="bidr-agent-composer__actions">
        <!-- 能力位驱动：files.upload 缺席时附件按钮与拖拽落区均不渲染（拖拽仅兜底阻止浏览器打开文件） -->
        <a-button
          v-if="canUpload"
          class="bidr-agent-composer__attach"
          size="small"
          :disabled="attachDisabled"
          :title="attachTitle"
          @click="openFilePicker"
        >
          <template #icon>
            <PaperClipOutlined />
          </template>
        </a-button>
        <a-button
          class="bidr-agent-composer__send"
          size="small"
          type="primary"
          :disabled="!canSend"
          :loading="sending"
          title="发送"
          @click="onSend"
        >
          <template #icon>
            <SendOutlined />
          </template>
        </a-button>
        <a-button
          v-if="pausable"
          class="bidr-agent-composer__pause"
          size="small"
          :loading="pausing"
          :disabled="stopping"
          title="暂停会话（暂停后可补充指导并恢复）"
          @click="emit('pause')"
        >
          <template #icon>
            <PauseOutlined />
          </template>
        </a-button>
        <a-button
          v-if="stoppable"
          class="bidr-agent-composer__stop"
          size="small"
          danger
          :loading="stopping"
          :disabled="pausing"
          title="停止会话"
          @click="emit('stop')"
        >
          <template #icon>
            <StopOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <!-- 拖拽提示：仅能力位在场时显示（dragDepth 计数防子元素 dragleave 闪动） -->
    <div
      v-if="dragActive"
      class="bidr-agent-composer__drop-hint"
    >
      松开鼠标上传附件
    </div>

    <input
      ref="fileInputRef"
      class="bidr-agent-composer__file-input"
      type="file"
      multiple
      @change="onFileChange"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  PaperClipOutlined, PauseOutlined, SendOutlined, StopOutlined
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

import AttachmentTray from './AttachmentTray.vue'
import { AGENT_CAPABILITY, type AttachmentItem } from '../types'

interface Props {
  /** 会话能力位（/agents 条目 capabilities；驱动附件入口显隐） */
  capabilities: string[]
  /** 会话状态（RUNNING/PAUSED/终态） */
  status: string
  /** 是否存在待作答的 ask_user 问题（决定发送语义＝作答） */
  waitingQuestion: boolean
  /** 终态/未开始时整体禁用输入 */
  disabled: boolean
  /** 附件队列（chips 数据源） */
  items: AttachmentItem[]
  /** 发送中（父组件作答/恢复请求在途） */
  sending?: boolean
  /** 停止中 */
  stopping?: boolean
  /** 暂停中 */
  pausing?: boolean
  /** 附件上传中（禁用附件按钮与拖拽落区，避免并发批次） */
  uploading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sending: false,
  stopping: false,
  pausing: false,
  uploading: false
})

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'stop'): void
  (e: 'pause'): void
  (e: 'files', files: File[]): void
  (e: 'remove', uid: string): void
}>()

const canUpload = computed(() => props.capabilities.includes(AGENT_CAPABILITY.FILES_UPLOAD))
const attachDisabled = computed(() => props.disabled || props.uploading)
const attachTitle = computed(() => {
  if (props.disabled) return '会话已结束'
  if (props.uploading) return '附件上传中，请稍候'
  return '上传附件（也可拖拽文件到面板）'
})

const text = ref('')

/** 可发送语义：作答问题（任意非终态）或暂停后补指导语 */
const canSendText = computed(() => props.waitingQuestion || props.status === 'PAUSED')
/** PAUSED 且无待作答问题：允许空指导语恢复（后端按默认指导语处理，与占位文案「可空」一致） */
const allowEmptySend = computed(() => !props.waitingQuestion && props.status === 'PAUSED')
const canSend = computed(() => {
  if (props.disabled || !canSendText.value) return false
  return text.value.trim().length > 0 || allowEmptySend.value
})
const stoppable = computed(() => !props.disabled && (props.status === 'RUNNING' || props.status === 'PAUSED'))
/** 暂停入口：仅 RUNNING 有意义（PAUSED 分支已是恢复语义） */
const pausable = computed(() => !props.disabled && props.status === 'RUNNING')

const placeholder = computed(() => {
  if (props.disabled) return '会话已结束'
  if (props.waitingQuestion) return '回答 AI 的问题，或直接输入你的口径（Enter 发送）'
  if (props.status === 'PAUSED') return '补充指导语（可空）：恢复后注入下一轮上下文（Enter 发送）'
  if (props.status === 'RUNNING') return '任务执行中… 可暂停后补充指导；可直接拖入附件'
  return '输入内容（Enter 发送）'
})

const onSend = () => {
  const value = text.value.trim()
  if (!canSend.value) return
  // 空文本仅在 PAUSED 恢复语义下放行（父层 resume(undefined) 走后端默认指导语）
  if (!value && !allowEmptySend.value) return
  emit('send', value)
  text.value = ''
}

const onPressEnter = (e: KeyboardEvent) => {
  // 中文输入法回车用于确认候选词，不应发送（ant-design-vue TextArea 不判 isComposing）
  if (e.isComposing || e.keyCode === 229) return
  if (e.shiftKey) return
  e.preventDefault()
  onSend()
}

// ==================== 附件选择与拖拽落区 ====================

const fileInputRef = ref<HTMLInputElement | null>(null)

const openFilePicker = () => {
  if (!dragActiveAllowed()) return
  fileInputRef.value?.click()
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length > 0 && dragActiveAllowed()) emit('files', files)
  // 清空 value：同名文件再次选择也能触发 change
  input.value = ''
}

const dragDepth = ref(0)
const dragActive = computed(() => dragActiveAllowed() && dragDepth.value > 0)

/** 始终 preventDefault：能力位缺席时也不让浏览器打开被拖入的文件 */
const onDragEnter = (e: DragEvent) => {
  e.preventDefault()
  if (!dragActiveAllowed()) return
  dragDepth.value += 1
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!dragActiveAllowed()) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

/** dragleave 计数：子元素间移动会先 leave 再 enter，计数归零才算真正离开 */
const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  if (!dragActiveAllowed()) return
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  dragDepth.value = 0
  if (!dragActiveAllowed()) return
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) emit('files', files)
}

const dragActiveAllowed = () => canUpload.value && !props.disabled && !props.uploading
</script>