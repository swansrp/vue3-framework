<template>
  <div
    ref="paneRef"
    class="bidr-agent-pane"
    :class="{ 'is-dragover': paneDragActive }"
    @dragenter.prevent="onPaneDragEnter"
    @dragover.prevent="onPaneDragOver"
    @dragleave.prevent="onPaneDragLeave"
    @drop.prevent="onPaneDrop"
    @dragend="resetPaneDrag"
  >
    <!-- 头部：标题 + 会话状态 + 能力位徽标（能力位缺席时不渲染徽标，也不影响任何交互） -->
    <div class="bidr-agent-pane__header">
      <div class="bidr-agent-pane__title">
        <RobotOutlined class="bidr-agent-pane__title-icon" />
        <span class="bidr-agent-pane__title-text">{{ title || status?.displayName || '智能代理' }}</span>
        <span
          class="bidr-agent-pane__status"
          :class="`is-${statusClass}`"
        >{{ statusText }}</span>
      </div>
      <div class="bidr-agent-pane__meta">
        <span
          v-for="cap in capabilityBadges"
          :key="cap"
          class="bidr-agent-pane__cap"
        >{{ cap }}</span>
        <a-button
          v-if="showRestart && isTerminal"
          size="small"
          type="text"
          @click="emit('restart')"
        >
          重新发起
        </a-button>
      </div>
    </div>

    <!-- 轮询连续失败提示：status/events 任一持续失败达阈值后出现，可手动立即刷新 -->
    <div
      v-if="pollError && !isTerminal"
      class="bidr-agent-pane__poll-error"
    >
      <span>状态获取失败，正在重试</span>
      <a-button
        size="small"
        type="link"
        :loading="refreshing"
        @click="onRefreshStatus"
      >
        立即刷新
      </a-button>
    </div>

    <!-- 消息区：事件流归约后的文本/工具卡/文件卡/状态条/日志 -->
    <div
      ref="bodyRef"
      class="bidr-agent-pane__body"
      @scroll="onBodyScroll"
    >
      <div
        v-if="!status && items.length === 0"
        class="bidr-agent-pane__empty"
      >
        会话启动中…
      </div>

      <template
        v-for="item in items"
        :key="item.id"
      >
        <div
          v-if="item.kind === 'text'"
          class="bidr-agent-msg"
        >
          <div class="bidr-agent-msg__text">
            {{ item.text }}
          </div>
        </div>

        <details
          v-else-if="item.kind === 'tool'"
          class="bidr-agent-tool"
          :open="item.status === 'running'"
        >
          <summary class="bidr-agent-tool__head">
            <LoadingOutlined
              v-if="item.status === 'running'"
              spin
              class="bidr-agent-tool__spin"
            />
            <CheckCircleFilled
              v-else
              class="bidr-agent-tool__done"
            />
            <span class="bidr-agent-tool__name">{{ item.name }}</span>
            <span class="bidr-agent-tool__state">{{ item.status === 'running' ? '调用中' : '已完成' }}</span>
          </summary>
          <div
            v-if="item.args"
            class="bidr-agent-tool__section"
          >
            <div class="bidr-agent-tool__label">
              入参
            </div>
            <pre class="bidr-agent-tool__pre">{{ item.args }}</pre>
          </div>
          <div
            v-if="item.output"
            class="bidr-agent-tool__section"
          >
            <div class="bidr-agent-tool__label">
              返回
            </div>
            <pre class="bidr-agent-tool__pre">{{ item.output }}</pre>
          </div>
        </details>

        <div
          v-else-if="item.kind === 'file'"
          class="bidr-agent-file"
        >
          <FileTextOutlined class="bidr-agent-file__icon" />
          <div class="bidr-agent-file__main">
            <div
              class="bidr-agent-file__name"
              :title="item.file.name"
            >
              {{ item.file.name || item.file.fileId }}
            </div>
            <div class="bidr-agent-file__meta">
              {{ formatFileSize(item.file.size) }}<template v-if="item.file.mime"> · {{ item.file.mime }}</template>
            </div>
          </div>
          <span
            v-if="isFileRead(item.file)"
            class="bidr-agent-file__read"
          >
            <CheckCircleFilled /> 已读取
          </span>
          <span
            v-else
            class="bidr-agent-file__state"
          >已上传</span>
        </div>

        <div
          v-else-if="item.kind === 'status'"
          class="bidr-agent-strip"
          :class="`is-${item.tone}`"
        >
          {{ item.text }}
        </div>

        <div
          v-else
          class="bidr-agent-log"
        >
          {{ item.text }}
        </div>
      </template>

      <!-- LLM 流式实时内容（替换式最新一帧；终态清空） -->
      <div
        v-if="liveText"
        class="bidr-agent-live"
      >
        <div class="bidr-agent-live__head">
          <LoadingOutlined spin />
          <span>思考中…</span>
        </div>
        <pre class="bidr-agent-live__text">{{ liveText }}</pre>
      </div>

      <!-- 终态结论卡 -->
      <div
        v-if="conclusion"
        class="bidr-agent-conclusion"
        :class="`is-${conclusion.kind}`"
      >
        <div class="bidr-agent-conclusion__title">
          <CheckCircleFilled v-if="conclusion.kind === 'finish'" />
          <CloseCircleFilled v-else-if="conclusion.kind === 'error'" />
          <StopOutlined v-else />
          <span>{{ conclusion.title }}</span>
        </div>
        <div
          v-if="conclusion.text"
          class="bidr-agent-conclusion__text"
        >
          {{ conclusion.text }}
        </div>
      </div>
    </div>

    <!-- AI 决策问题（ask_user waiting）：点选项即作答，自由输入走底部 Composer -->
    <div
      v-if="waitingQuestion"
      class="bidr-agent-question"
    >
      <div class="bidr-agent-question__head">
        <span class="bidr-agent-question__title">AI 需要你的决策</span>
        <span class="bidr-agent-question__id">#{{ waitingQuestion.id }}</span>
      </div>
      <div class="bidr-agent-question__text">
        {{ waitingQuestion.question }}
      </div>
      <div
        v-if="questionOptions.length > 0"
        class="bidr-agent-question__options"
      >
        <button
          v-for="(opt, oi) in questionOptions"
          :key="oi"
          type="button"
          class="bidr-agent-question__option"
          :disabled="answering"
          @click="onAnswerOption(opt.raw)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="bidr-agent-question__actions">
        <a-button
          size="small"
          :loading="answering"
          @click="onSkipQuestion"
        >
          交由 AI 决定
        </a-button>
      </div>
    </div>

    <!-- 底部输入区：附件（能力位驱动）+ 发送/暂停/停止 -->
    <Composer
      :capabilities="capabilityList"
      :status="sessionStatus"
      :waiting-question="!!waitingQuestion"
      :disabled="isTerminal || !sessionId"
      :items="attachments"
      :sending="sending"
      :stopping="stopping"
      :pausing="pausing"
      :uploading="isUploading"
      @send="onSend"
      @stop="onStop"
      @pause="onPause"
      @files="onFiles"
      @remove="removeAttachment"
    />

    <!-- 面板级文件拖拽落区提示（Composer 内另有自己的高亮，根级只覆盖其余区域） -->
    <div
      v-if="paneDragActive"
      class="bidr-agent-pane__drop-hint"
    >
      松开鼠标上传附件
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled, CloseCircleFilled, FileTextOutlined, LoadingOutlined, RobotOutlined, StopOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Composer from './composer/Composer.vue'
import { formatFileSize, AGENT_CAPABILITY, type AgentFileRef, type AgentToolItem } from './types'
import { useAgentConversation } from './useAgentConversation'

interface Props {
  /** 会话标识（父组件 sessionStart 后传入；变化即重置轮询与视图） */
  sessionId: string | null
  /** 面板标题（缺省取会话 displayName） */
  title?: string
  /** 能力位（/agents 条目 capabilities；决定附件入口与文件卡「已读取」提示） */
  capabilities?: string[]
  /** 终态时是否显示「重新发起」 */
  showRestart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  capabilities: () => [],
  showRestart: true
})

const emit = defineEmits<{
  (e: 'finished', kind: 'finish' | 'error' | 'stopped'): void
  (e: 'restart'): void
}>()

/**
 * 能力位显式解构（computed）：模板不直接裸引用 props 数组/父级 store 字段，
 * 避免 Vue 3 setup 模板裸引用在运行时才炸（项目钉子教训）。
 */
const capabilityList = computed<string[]>(() => props.capabilities || [])
const canUpload = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD))
const canReadFiles = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_READ))
const capabilityBadges = computed<string[]>(() => {
  const badges: string[] = []
  if (capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD)) badges.push('附件上传')
  if (canReadFiles.value) badges.push('文件可读')
  return badges
})

const sessionIdRef = computed(() => props.sessionId)
const {
  status,
  items,
  attachments,
  sessionStatus,
  isTerminal,
  liveText,
  waitingQuestion,
  pollError,
  isUploading,
  upload,
  refreshFiles,
  removeAttachment,
  answer,
  pause,
  resume,
  stop,
  refresh
} = useAgentConversation(sessionIdRef)

const statusClass = computed(() => (waitingQuestion.value ? 'waiting' : sessionStatus.value.toLowerCase()))

const statusText = computed(() => {
  if (waitingQuestion.value) return '待回答'
  switch (sessionStatus.value) {
    case 'RUNNING': return '执行中'
    case 'PAUSED': return '已暂停'
    case 'FINISHED': return '已完成'
    case 'FAILED': return '失败'
    case 'STOPPED': return '已停止'
    default: return sessionStatus.value
  }
})

// ==================== 文件卡「已读取」判定 ====================

/**
 * 文件已读取的判据：能力位 files.read 在场，且工具调用中出现附件读取类调用
 * （会话受限工具 read_attachment，兼容历史 read_file/readFile 命名），
 * 其入参文本里带该文件的 fileId 或文件名（模型按引用读文件的常见形态）。
 * 只做展示增强，判定不到不影响文件卡本身（仍显示「已上传」）。
 */
const readProbeText = computed(() => items.value
  .filter((item): item is AgentToolItem => item.kind === 'tool')
  .filter(item => /read[-_.]?(file|attachment)/i.test(item.name))
  .map(item => item.args)
  .join('\n'))

const isFileRead = (file: AgentFileRef): boolean => {
  if (!canReadFiles.value || !readProbeText.value) return false
  return readProbeText.value.includes(file.fileId) || (!!file.name && readProbeText.value.includes(file.name))
}

// ==================== 终态结论 ====================

const terminalKind = computed<'finish' | 'error' | 'stopped'>(() => {
  if (sessionStatus.value === 'FINISHED') return 'finish'
  if (sessionStatus.value === 'FAILED') return 'error'
  return 'stopped'
})

const conclusion = computed(() => {
  if (!isTerminal.value) return null
  if (terminalKind.value === 'finish') {
    return { kind: 'finish' as const, title: '任务完成', text: status.value?.summary || '' }
  }
  if (terminalKind.value === 'error') {
    return { kind: 'error' as const, title: '任务失败', text: status.value?.error || '' }
  }
  return { kind: 'stopped' as const, title: '已停止', text: status.value?.error || '已完成部分保留，可重新发起继续' }
})

// 终态回调只发一次（同一 sessionId）；切换会话复位
const finishedFor = ref<string | null>(null)
watch(() => props.sessionId, () => {
  finishedFor.value = null
})
watch([() => props.sessionId, isTerminal], () => {
  if (!props.sessionId || !isTerminal.value) return
  if (finishedFor.value === props.sessionId) return
  finishedFor.value = props.sessionId
  emit('finished', terminalKind.value)
}, { immediate: true })

// ==================== 决策问题作答 ====================

/** 候选项展示：JSON 对象串取 label/desc，提交仍用 raw（保证回传无损） */
const questionOptions = computed(() => (waitingQuestion.value?.options || []).map(raw => {
  const text = raw || ''
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj === 'object') {
        const label = typeof obj.label === 'string' ? obj.label : ''
        const desc = typeof obj.desc === 'string' ? obj.desc : ''
        if (label || desc) return { label: label || desc, raw }
      }
    } catch {
      // 非合法 JSON：回落原文
    }
  }
  return { label: text, raw }
}))

const answering = ref(false)

const onAnswerOption = async (option: string) => {
  const q = waitingQuestion.value
  if (!q || answering.value) return
  answering.value = true
  try {
    await answer(q.id, option)
  } catch (e: any) {
    message.error(e?.message || '作答失败')
  } finally {
    answering.value = false
  }
}

const onSkipQuestion = async () => {
  const q = waitingQuestion.value
  if (!q || answering.value) return
  answering.value = true
  try {
    await answer(q.id, undefined, true)
  } catch (e: any) {
    message.error(e?.message || '操作失败')
  } finally {
    answering.value = false
  }
}

// ==================== 发送 / 停止 / 上传 ====================

const sending = ref(false)
const stopping = ref(false)
const pausing = ref(false)

/**
 * 发送语义按会话状态路由（自主会话没有"追加用户消息"端点）：
 * - 有 waiting 问题 → 作答（sessionAnswer）；
 * - PAUSED → 补指导语并恢复（sessionResume）；
 * - RUNNING/终态 → 不发（Composer 已置灰，这里兜底提示）。
 */
const onSend = async (text: string) => {
  if (!props.sessionId) return
  sending.value = true
  try {
    if (waitingQuestion.value) {
      await answer(waitingQuestion.value.id, text)
    } else if (sessionStatus.value === 'PAUSED') {
      await resume(text || undefined)
    } else {
      message.info('任务执行中，如需补充指导请先暂停')
    }
  } catch (e: any) {
    message.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

const onStop = async () => {
  // 与暂停互斥：按钮已互相禁用，这里兜底并发入口
  if (stopping.value || pausing.value) return
  stopping.value = true
  try {
    await stop()
    message.info('停止请求已发出，等待任务收口…')
  } catch (e: any) {
    message.error(e?.message || '停止失败')
  } finally {
    stopping.value = false
  }
}

const onPause = async () => {
  // 与停止互斥：按钮已互相禁用，这里兜底并发入口
  if (pausing.value || stopping.value) return
  pausing.value = true
  try {
    await pause('用户暂停，等待补充指导')
    message.info('暂停请求已发出，等待任务在下一检查点暂停…')
  } catch (e: any) {
    message.error(e?.message || '暂停失败')
  } finally {
    pausing.value = false
  }
}

/** 顺序上传（避免并发抢同一会话的附件计数/事件序），单个失败只提示不清空其余 */
const onFiles = async (files: File[]) => {
  const batchSessionId = props.sessionId
  if (!batchSessionId) return
  // 上传中拒绝新批：附件按钮/拖拽落区已禁用，这里是文件选择器并发等边界兜底
  if (isUploading.value) {
    message.info('附件上传中，请稍候再试')
    return
  }
  for (const file of files) {
    if (props.sessionId !== batchSessionId) {
      message.warning('会话已切换，剩余文件未上传')
      break
    }
    try {
      await upload(file)
    } catch (e: any) {
      message.error(`${file.name}：${e?.message || '上传失败'}`)
    }
  }
}

// ==================== 面板级拖拽落区（F1：正文/头部/决策卡拖入不导航） ====================

const paneRef = ref<HTMLDivElement | null>(null)
const paneDragDepth = ref(0)

/** 是否文件拖拽（非文件拖拽只兜底 preventDefault，不做任何上传动作） */
const hasFileDrag = (e: DragEvent): boolean => {
  const types = e.dataTransfer?.types
  return !!types && Array.from(types).includes('Files')
}

/** 拖拽是否落在 Composer 内（Composer 自带 drop 处理，根级不得重复入队） */
const isComposerTarget = (e: DragEvent): boolean => {
  const target = e.target as Element | null
  return !!target && typeof target.closest === 'function' && !!target.closest('.bidr-agent-composer')
}

/** 根级是否接收文件：能力位在场、非终态、无上传在途 */
const paneDropAllowed = () => canUpload.value && !isTerminal.value && !isUploading.value

const resetPaneDrag = () => {
  paneDragDepth.value = 0
}

const onPaneDragEnter = (e: DragEvent) => {
  // 进入 Composer 时收起面板级提示（Composer 自带拖拽高亮与 drop 处理）
  if (isComposerTarget(e)) {
    resetPaneDrag()
    return
  }
  if (!paneDropAllowed() || !hasFileDrag(e)) return
  paneDragDepth.value += 1
}

const onPaneDragOver = (e: DragEvent) => {
  if (!paneDropAllowed() || isComposerTarget(e) || !hasFileDrag(e)) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

/** 离开面板才归零（relatedTarget 仍在面板内＝子元素间移动，不闪断高亮） */
const onPaneDragLeave = (e: DragEvent) => {
  const related = e.relatedTarget as Node | null
  if (related && paneRef.value?.contains(related)) return
  resetPaneDrag()
}

const onPaneDrop = (e: DragEvent) => {
  resetPaneDrag()
  if (isComposerTarget(e) || !hasFileDrag(e)) return
  if (!canUpload.value || isTerminal.value) return
  if (isUploading.value) {
    message.info('附件上传中，请稍候再拖入')
    return
  }
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) void onFiles(files)
}

/** 拖出窗口/拖动结束的全局兜底：避免 dragleave 丢失导致高亮残留 */
const onWindowDragEnd = () => resetPaneDrag()
const onWindowDragLeave = (e: DragEvent) => {
  if (!e.relatedTarget) resetPaneDrag()
}

const paneDragActive = computed(() => paneDropAllowed() && paneDragDepth.value > 0)

onMounted(() => {
  window.addEventListener('dragend', onWindowDragEnd)
  window.addEventListener('drop', onWindowDragEnd)
  window.addEventListener('dragleave', onWindowDragLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragend', onWindowDragEnd)
  window.removeEventListener('drop', onWindowDragEnd)
  window.removeEventListener('dragleave', onWindowDragLeave)
})

// ==================== 轮询失败手动刷新 ====================

const refreshing = ref(false)

const onRefreshStatus = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

// 会话就绪且能力位在场时回显服务端已传清单（刷新/重连恢复 chips）
watch([() => props.sessionId, capabilityList], ([id, caps]) => {
  if (id && caps.includes(AGENT_CAPABILITY.FILES_UPLOAD)) void refreshFiles()
}, { immediate: true })

// ==================== 滚动跟随（贴近底部才自动滚，用户上翻阅读不打断） ====================

const bodyRef = ref<HTMLDivElement | null>(null)
const nearBottom = ref(true)

const onBodyScroll = () => {
  const el = bodyRef.value
  if (!el) return
  nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

const scrollBottom = async () => {
  await nextTick()
  const el = bodyRef.value
  if (el && nearBottom.value) el.scrollTop = el.scrollHeight
}

watch(() => items.value.length, () => void scrollBottom())
watch(liveText, () => void scrollBottom())
watch(conclusion, v => {
  if (v) void scrollBottom()
})
</script>