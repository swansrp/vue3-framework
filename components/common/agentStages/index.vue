/**
 * Agent 阶段状态组件（AsyncProcess 泛化）
 *
 * 职责：阶段清单的步骤条渲染——状态映射 pending→等待 / running→执行中（转圈）/
 * ok→完成 / error→失败 / skipped→跳过 / stopped→已停止；每段实耗（结束-开始）与
 * 预计剩余（实时修正：进行中段 = max(0, 预估 - 已实耗)，未开始段 = 预估 × 已完成段
 * 实耗/预估系数）；可选内嵌停止按钮；可选过程日志区
 * （logs：异步任务逐条上报，新日志自动滚底）。
 *
 * 数据源两种（由调用方适配为统一 stages 结构）：
 * - 自主会话：/api/agent/session/{id}/status 的 stages（2s 轮询刷新跳动）
 * - flow 任务：/api/agent/flow/trace/{traceId} 节点状态映射（节点 title/status/耗时）
 *
 * 用法：<AgentStages :stages="stages" :loading="loading" show-stop @stop="onStop" />
 */
<template>
  <div class="agent-stages">
    <div
      v-for="(s, i) in stages"
      :key="s.key || i"
      class="stage-item"
      :class="`is-${s.status || 'pending'}`"
    >
      <div class="stage-icon">
        <LoadingOutlined
          v-if="s.status === 'running'"
          spin
        />
        <CheckOutlined v-else-if="s.status === 'ok'" />
        <CloseOutlined v-else-if="s.status === 'error'" />
        <MinusOutlined v-else-if="s.status === 'skipped' || s.status === 'stopped'" />
        <span
          v-else
          class="stage-dot"
        >{{ i + 1 }}</span>
      </div>
      <div class="stage-main">
        <div class="stage-title">
          <span>{{ s.title }}</span>
          <span
            v-if="stageElapsedText(s)"
            class="stage-elapsed"
          >{{ stageElapsedText(s) }}</span>
        </div>
        <div
          v-if="s.detail"
          class="stage-detail"
          :class="{ 'is-error': s.status === 'error' }"
        >
          {{ s.detail }}
        </div>
      </div>
    </div>

    <div
      v-if="remainText"
      class="stage-remain"
    >
      <FieldTimeOutlined />
      <span>预计剩余约 {{ remainText }}</span>
    </div>

    <!-- 可选过程日志：异步任务（如 LLM 工具探查）逐条上报；头部一键复制全部过程，新日志到达自动滚底 -->
    <div
      v-if="logs && logs.length > 0"
      class="stage-logs-wrap"
    >
      <div class="stage-logs-head">
        <span class="stage-logs-title">过程日志（{{ logs.length }} 条）</span>
        <a-button
          size="small"
          type="link"
          class="stage-copy-btn"
          @click="copyAll"
        >
          <template #icon>
            <CopyOutlined />
          </template>
          一键复制过程
        </a-button>
      </div>
      <div
        ref="logBoxRef"
        class="stage-logs"
      >
        <div
          v-for="(line, idx) in logs"
          :key="idx"
        >
          {{ line }}
        </div>
      </div>
    </div>

    <div
      v-if="showStop && hasActive"
      class="stage-actions"
    >
      <a-button
        size="small"
        danger
        :loading="stopping"
        @click="$emit('stop')"
      >
        <template #icon>
          <StopOutlined />
        </template>
        停止任务
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CheckOutlined, CloseOutlined, CopyOutlined, FieldTimeOutlined, LoadingOutlined, MinusOutlined, StopOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import type { AgentStageItem } from './types'

interface Props {
  stages: AgentStageItem[]
  /** 过程日志（可选）：异步任务逐条上报，新日志自动滚底 */
  logs?: string[]
  /** 内嵌停止按钮（仅执行中显示） */
  showStop?: boolean
  /** 停止按钮 loading（父组件控制） */
  stopping?: boolean
  /** 预计剩余开关（无进度/预估数据自动不显示） */
  showRemain?: boolean
  /** 计划待办清单（可选，预计剩余的细粒度进度基线；缺省回落阶段条口径） */
  plan?: { status?: string }[]
  /** 会话开始时间（进度法预计剩余的已耗基线；缺省取各段最早 startedAt） */
  startedAt?: number
}

const props = withDefaults(defineProps<Props>(), {
  showStop: false,
  stopping: false,
  showRemain: true
})

defineEmits<{ (e: 'stop'): void }>()

// 实时时钟：存在执行中段时每秒走针（实耗与预计剩余随时间递减），终态自动停表；
// 2s 轮询推入的 startedAt/endedAt 是后端口径，走针只补足两次轮询间的过渡精度

/** 执行中段（running）存在时才显示停止按钮；计划待办执行中同算活跃 */
const hasActive = computed(() =>
  props.stages.some(s => s.status === 'running') || (props.plan || []).some(p => p.status === 'running'))

const nowTick = ref(Date.now())
let remainTimer: ReturnType<typeof setInterval> | undefined

watch(
  hasActive,
  active => {
    if (active) {
      nowTick.value = Date.now()
      if (!remainTimer) remainTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
    } else if (remainTimer) {
      clearInterval(remainTimer)
      remainTimer = undefined
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (remainTimer) clearInterval(remainTimer)
})

/** 日志区：新日志到达或整体替换自动滚到底部（长耗时任务的过程可见性）；
 *  监听数组引用而非长度——后端日志到上限后长度不变，仅靠长度会停止滚动 */
const logBoxRef = ref<HTMLElement>()
const scrollLogsToBottom = () => {
  nextTick(() => {
    if (logBoxRef.value) logBoxRef.value.scrollTop = logBoxRef.value.scrollHeight
  })
}
watch(() => props.logs, scrollLogsToBottom, { immediate: true })

/** 单段实耗文本：已完成段取 endedAt-startedAt；执行中段取 实时时钟-startedAt（随走针每秒递增） */
const stageElapsedText = (s: AgentStageItem): string => {
  if (!s.startedAt) return ''
  const end = s.endedAt || nowTick.value
  const sec = Math.max(0, Math.round((end - s.startedAt) / 1000))
  if (sec < 1) return ''
  return sec >= 60 ? `${Math.floor(sec / 60)}分${sec % 60}秒` : `${sec}秒`
}

/** 阶段状态 → 中文（一键复制文本用） */
const STATUS_TEXT: Record<string, string> = {
  pending: '等待', running: '进行中', ok: '已完成', error: '失败', skipped: '已跳过', stopped: '已停止'
}

/** 一键复制全部过程：阶段清单（状态/实耗/详情）+ 预计剩余 + 日志全文（排查/存档） */
const copyAll = () => {
  const lines: string[] = props.stages.map((s, i) => {
    const parts = [`${i + 1}. ${s.title}【${STATUS_TEXT[s.status || 'pending'] || s.status}】`]
    const elapsed = stageElapsedText(s)
    if (elapsed) parts.push(`（耗时 ${elapsed}）`)
    if (s.detail) parts.push(`：${s.detail}`)
    return parts.join('')
  })
  if (remainText.value) lines.push(`预计剩余：约 ${remainText.value}`)
  lines.push('', `过程日志（${(props.logs || []).length} 条）：`)
  lines.push(...(props.logs || []))
  const text = lines.join('\n')
  const done = () => message.success('全部过程已复制到剪贴板')
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
  } else {
    fallbackCopy(text, done)
  }
}

/** 剪贴板不可用时的降级复制（同 AssetEditor 口径） */
const fallbackCopy = (text: string, done: () => void) => {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  done()
}

/** 已完成段实测平均「预估/实耗」修正系数（无实测回落 1；实耗 0 防除零） */
const correctFactor = computed(() => {
  const done = props.stages.filter(s => s.status === 'ok' && s.estimatedSecs && s.startedAt && s.endedAt)
  if (done.length === 0) return 1
  let estSum = 0
  let realSum = 0
  for (const s of done) {
    estSum += s.estimatedSecs!
    realSum += Math.max(1, (s.endedAt! - s.startedAt!) / 1000)
  }
  return estSum > 0 ? realSum / estSum : 1
})

/** 预计剩余（实时）：进度法优先——已耗时按完成度外推（计划待办优先、缺省阶段条，running 计半），
 *  随阶段/挑勾推进动态修正；尚无完成基线（开局）回落预估法：进行中段 = max(0, 预估 - 已实耗）、未开始段 = 预估 × 修正系数 */
const remainText = computed(() => {
  if (!props.showRemain || !hasActive.value) return ''
  const units = props.plan && props.plan.length > 0
    ? props.plan.map(p => (p.status || 'pending'))
    : props.stages.map(s => (s.status || 'pending'))
  const total = units.length
  const done = units.filter(st => st === 'done' || st === 'ok' || st === 'skipped').length
  const running = units.filter(st => st === 'running').length
  const doneEff = done + running * 0.5
  const start = props.startedAt
    || props.stages.reduce((m, s) => (s.startedAt && (!m || s.startedAt < m) ? s.startedAt : m), 0)
  const elapsed = start ? Math.max(0, (nowTick.value - start) / 1000) : 0
  let secs = 0
  if (total > 0 && doneEff > 0 && elapsed > 3) {
    secs = elapsed * (total - doneEff) / doneEff
  } else {
    for (const s of props.stages) {
      if (!s.estimatedSecs) continue
      if (s.status === 'running') {
        // 已实耗从实时时钟推算（后端 2s 轮询口径的 startedAt 为基准），超预估截 0 不显负数
        const el = s.startedAt ? (nowTick.value - s.startedAt) / 1000 : 0
        secs += Math.max(0, s.estimatedSecs - el)
      } else if (s.status === 'pending') {
        secs += s.estimatedSecs * correctFactor.value
      }
    }
  }
  secs = Math.round(secs)
  if (secs < 1) return ''
  return secs >= 60 ? `${Math.ceil(secs / 60)} 分钟` : `${secs} 秒`
})
</script>

<style scoped lang="less">
.agent-stages {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-item {
  display: flex;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.2s;

  &.is-running {
    background: var(--bg-elevated);
    animation: stage-breathe 1.8s ease-in-out infinite;
  }

  &.is-error .stage-title {
    color: var(--error, #ff4d4f);
  }

  &.is-skipped,
  &.is-stopped {
    opacity: 0.55;
  }
}

.stage-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border-radius: 50%;

  .is-running & {
    color: var(--accent);
  }

  .is-ok & {
    color: var(--success, #52c41a);
  }

  .is-error & {
    color: var(--error, #ff4d4f);
  }

  .is-skipped &,
  .is-stopped & {
    color: var(--text-secondary);
  }

  .stage-dot {
    width: 22px;
    height: 22px;
    line-height: 20px;
    text-align: center;
    font-size: 12px;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    background: var(--bg-elevated);
  }
}

.stage-main {
  flex: 1;
  min-width: 0;
}

.stage-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 22px;
}

.stage-elapsed {
  color: var(--text-secondary);
  font-size: 12px;
}

.stage-detail {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  word-break: break-all;

  &.is-error {
    color: var(--error, #ff4d4f);
  }
}

.stage-remain {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.stage-logs-wrap {
  margin-top: 8px;
}

.stage-logs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;

  .stage-logs-title {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .stage-copy-btn {
    padding: 0 4px;
    height: 22px;
    font-size: 12px;
  }
}

.stage-logs {
  max-height: 220px;
  margin-top: 4px;
  overflow-y: auto;
  padding: 8px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 20px;
  color: var(--text-secondary);
}

.stage-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

@keyframes stage-breathe {
  0%,
  100% {
    background: var(--bg-elevated);
  }

  50% {
    background: var(--accent-soft, rgba(22, 119, 255, 0.08));
  }
}
</style>
