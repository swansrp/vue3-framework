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
      @retry="emit('retry', $event)"
    />

    <a-textarea
      v-model:value="text"
      class="bidr-agent-composer__input"
      :placeholder="placeholder"
      :auto-size="{ minRows: inputMinRows, maxRows: 8 }"
      :bordered="false"
      :disabled="disabled"
      @press-enter="onPressEnter"
      @paste="onPaste"
    />

    <!-- 底部按钮排（图3口径）：左侧附件组（探活点＋附件/槽位按钮），右侧暂停/停止/小绿方块发送。
         探活点（2026-11-18 用户口径）：探活价值在发起前，放在左下角按钮堆里；运行中
         （AgentPane 内）不显示——已经跑起来了看到没意义 -->
    <div class="bidr-agent-composer__bar">
      <CapabilityHealthDot
        v-if="showHealth"
        :capabilities="capabilities"
        :health="health"
      />
      <!-- 能力位驱动：files.upload 缺席时附件按钮与拖拽落区均不渲染（拖拽仅兜底阻止浏览器打开文件）；
           hideAttach＝业务页自带素材按钮（bar-left 槽），隐藏默认回形针 -->
      <a-button
        v-if="canUpload && !hideAttach"
        class="bidr-agent-composer__attach"
        size="small"
        type="text"
        shape="circle"
        :disabled="attachDisabled"
        :title="attachTitle"
        @click="openFilePicker"
      >
        <template #icon>
          <PaperClipOutlined />
        </template>
      </a-button>
      <slot name="bar-left"></slot>
      <span class="bidr-agent-composer__spacer"></span>
      <slot name="bar-right"></slot>
      <!-- 当前模型名（右下角按钮区左侧，2026-11-18 用户要求）：让用户知道这次跑的是哪个模型 -->
      <span
        v-if="model"
        class="bidr-agent-composer__model"
        :title="`当前模型：${model}`"
      >{{ model }}</span>
      <a-button
        v-if="pausable"
        class="bidr-agent-composer__pause"
        size="small"
        type="text"
        shape="circle"
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
        type="text"
        shape="circle"
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
      <!-- 发送钮只在有发送语义时渲染（U71 图：暂停/停止/发送三者不同排）：
           RUNNING 无提问＝只有暂停+停止；PAUSED＝停止+发送；提问态＝停止+发送；地面态＝发送 -->
      <a-button
        v-if="canSendText"
        class="bidr-agent-composer__send"
        size="small"
        type="primary"
        :disabled="!canSend"
        :loading="sending"
        title="发送（Enter）"
        @click="onSend"
      >
        <template #icon>
          <ArrowUpOutlined />
        </template>
      </a-button>
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
  ArrowUpOutlined, PaperClipOutlined, PauseOutlined, StopOutlined
} from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'

import AttachmentTray from './AttachmentTray.vue'
import CapabilityHealthDot from './CapabilityHealthDot.vue'
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
  /** 占位文案覆盖（业务页地面态有自己的提示语） */
  placeholder?: string
  /** 发送语义接管（U69 业务页复用）：会话态语义（作答/恢复）不适用时的「普通发送」模式 */
  sendable?: boolean
  /** 运行中插话（排队/插话功能）：RUNNING 态也出发送钮，文本经 interject 排队下一轮注入 */
  interjectable?: boolean
  /** 终态续写：FINISHED/STOPPED/FAILED 保持输入与附件可用——就地续跑（2026-11-19「没有结束的概念」），宿主修订链只作续跑失败兜底 */
  terminalContinue?: boolean
  /** 外部发送闸（sendable 模式）：如素材未解析通过时置灰 */
  sendDisabled?: boolean
  /** 输入框最小行数（缺省 2；业务页地面态 3） */
  minRows?: number
  /** 隐藏默认附件按钮（业务页 bar-left 槽自带素材入口时用；拖拽/粘贴仍按能力位放行） */
  hideAttach?: boolean
  /** 受控文本（v-model:text，可选）：业务页需要预填/清空输入框时用；缺省＝组件内部自持 */
  text?: string
  /** 文件收集钩子（可选）：业务页可注入文件夹递归收集（webkitGetAsEntry）；缺省取 dt.files 平面文件 */
  collectFiles?: (dt: DataTransfer | null) => File[] | Promise<File[]>
  /** 显示能力探活点（发起前可用性）：地面态传 true，运行中不传（看到没意义） */
  showHealth?: boolean
  /** 能力位运行级健康快照（/agents 条目 health；探活点数据源初值，SSE 后实时翻转） */
  health?: Record<string, string> | null
  /** 当前模型名（右下角按钮区左侧小字；空/缺省不渲染） */
  model?: string
}

const props = withDefaults(defineProps<Props>(), {
  sending: false,
  stopping: false,
  pausing: false,
  uploading: false,
  placeholder: '',
  sendable: false,
  interjectable: false,
  terminalContinue: false,
  sendDisabled: false,
  minRows: 2,
  hideAttach: false,
  text: undefined,
  collectFiles: undefined,
  showHealth: false,
  health: null,
  model: ''
})

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'stop'): void
  (e: 'pause'): void
  (e: 'files', files: File[]): void
  (e: 'remove', uid: string): void
  (e: 'retry', uid: string): void
  (e: 'update:text', value: string): void
}>()

const canUpload = computed(() => props.capabilities.includes(AGENT_CAPABILITY.FILES_UPLOAD))
const attachDisabled = computed(() => props.disabled || props.uploading)
const attachTitle = computed(() => {
  if (props.disabled) return '会话已结束'
  if (props.uploading) return '附件上传中，请稍候'
  return '上传附件（也可拖拽文件到面板）'
})

/** 输入文本：受控（props.text 在场＝业务页 v-model:text，预填/清空双向同步）｜非受控（内部自持）。
 *  getter 读内部值不读 props——键入到回车可能同帧发生，props 尚未回流，读 props 会拿到旧值 */
const innerText = ref('')
const text = computed({
  get: () => innerText.value,
  set: (value: string) => {
    innerText.value = value
    if (props.text !== undefined && value !== props.text) emit('update:text', value)
  }
})
watch(() => props.text, (value) => {
  if (value !== undefined && value !== innerText.value) innerText.value = value
}, { immediate: true })

/** 输入框最小行数（props 透传给 auto-size） */
const inputMinRows = computed(() => (props.minRows > 0 ? props.minRows : 2))

/** 终态集合（Composer 不知道终态枚举，本地判定只服务 terminalContinue 口径） */
const TERMINAL_STATUSES = ['FINISHED', 'STOPPED', 'FAILED']
/** 终态续写生效中：就地续跑；附件也可带（登记在会话事件流，由续跑 run 消费） */
const terminalContinueActive = computed(() =>
  props.terminalContinue && TERMINAL_STATUSES.includes(props.status))

/** 可发送语义：sendable 接管（业务页普通发送：有字或有附件、外部闸放行）｜作答问题｜暂停后补指导语
 *  ｜终态续写（就地续跑） */
const canSendText = computed(() =>
  props.sendable || props.waitingQuestion || props.status === 'PAUSED'
  || (props.status === 'RUNNING' && props.interjectable)
  || terminalContinueActive.value)
/** PAUSED 且无待作答问题：允许空指导语恢复（后端按默认指导语处理，与占位文案「可空」一致） */
const allowEmptySend = computed(() => !props.waitingQuestion && props.status === 'PAUSED')
const canSend = computed(() => {
  if (props.disabled || !canSendText.value) return false
  if (props.sendable) {
    if (props.sendDisabled) return false
    return text.value.trim().length > 0 || props.items.length > 0
  }
  return text.value.trim().length > 0 || allowEmptySend.value
    || (terminalContinueActive.value && props.items.length > 0)
})
const stoppable = computed(() => !props.disabled && (props.status === 'RUNNING' || props.status === 'PAUSED'))
/** 暂停入口：仅 RUNNING 且无待答问题时渲染（提问态模型在等用户，暂停无意义；也避免三按钮同排） */
const pausable = computed(() => !props.disabled && props.status === 'RUNNING' && !props.waitingQuestion)

const placeholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (props.disabled) return '会话已结束'
  if (props.waitingQuestion) return '回答 AI 的问题，或直接输入你的口径（Enter 发送，Shift+Enter 换行）'
  if (props.status === 'PAUSED') return '补充指导语（可空）：恢复后注入下一轮上下文（Enter 发送，Shift+Enter 换行）'
  if (props.status === 'RUNNING') {
    return props.interjectable
      ? '任务执行中… 可直接插话（Enter 发送，下一轮生效）；也可拖入附件'
      : '任务执行中… 可暂停后补充指导；可直接拖入附件'
  }
  if (terminalContinueActive.value) {
    return '输入修改要求或补充附件，Enter 就地继续（历史记录保留）'
  }
  return '输入内容（Enter 发送，Shift+Enter 换行）'
})

const onSend = () => {
  const value = text.value.trim()
  if (!canSend.value) return
  // 空文本仅在 PAUSED 恢复语义（后端默认指导语）、sendable＋有附件（有素材可空字发起）、
  // 或终态续写＋有附件（空字＝直接续跑消费已登记附件）下放行
  if (!value && !allowEmptySend.value && !(props.sendable && props.items.length > 0)
    && !(terminalContinueActive.value && props.items.length > 0)) return
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

/** 粘贴上传（Ctrl+V）：截图/文件走剪贴板入队（可注入收集钩子），文本粘贴保持原样 */
const onPaste = async (e: ClipboardEvent) => {
  if (!dragActiveAllowed()) return
  const files = await collectFromDataTransfer(e.clipboardData)
  if (files.length === 0) return
  e.preventDefault()
  emit('files', files)
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

const onDrop = async (e: DragEvent) => {
  e.preventDefault()
  dragDepth.value = 0
  if (!dragActiveAllowed()) return
  const files = await collectFromDataTransfer(e.dataTransfer)
  if (files.length > 0) emit('files', files)
}

const dragActiveAllowed = () => canUpload.value && !props.disabled && !props.uploading

/** 文件收集：业务页注入的钩子（文件夹递归）优先，缺省取 dt.files 平面文件 */
const collectFromDataTransfer = async (dt: DataTransfer | null): Promise<File[]> => {
  if (props.collectFiles) return props.collectFiles(dt)
  return Array.from(dt?.files || [])
}
</script>