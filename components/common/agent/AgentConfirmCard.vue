<!--
 * AgentConfirmCard —— 待确认口径列表卡（气泡形态，规格 §05 决策卡同族）
 *
 * LLM 自决口径经 report_unconfirmed 登记（登记即可见）；终态后逐条裁决：
 * 「确认」＝认可自决口径（revised=false）；「改口径」＝行内展开输入新口径（Enter 提交，
 * revised=true + note），会话侧仅标状态，业务壳监听 confirmation-revised 触发重算
 * （业务写回非面板职责）。交互与文案对齐旧平铺壳 agentChat 口径段：
 * 裁决仅在终态可操作，运行中登记条目只提示「会话结束后裁决」不阻拦。
 *
 * 消费方：AgentPane（status.confirmations 过滤 pending 后传入；裁决成功 emit('resolved')
 * 由父级从 pending 集合剔除，轮询快照同步收口兜底）。
 * 样式：styles.css 的 .bidr-agent-confirm-* 前缀族（只增不改）。
-->
<template>
  <div class="bidr-agent-confirm">
    <div class="bidr-agent-confirm__head">
      <ExclamationCircleFilled class="bidr-agent-confirm__icon" />
      <span class="bidr-agent-confirm__title">待确认口径</span>
      <span class="bidr-agent-confirm__count">{{ items.length }} 待裁决</span>
    </div>
    <div
      v-for="c in items"
      :key="c.id"
      class="bidr-agent-confirm__card"
      :class="`is-${c.status}`"
    >
      <div class="bidr-agent-confirm__top">
        <span class="bidr-agent-confirm__id">#{{ c.id }}</span>
        <span class="bidr-agent-confirm__question">{{ c.question }}</span>
        <a-tag
          v-if="c.status === 'confirmed'"
          class="bidr-agent-confirm__tag"
          color="success"
          :bordered="false"
        >
          已确认
        </a-tag>
        <a-tag
          v-else-if="c.status === 'revised'"
          class="bidr-agent-confirm__tag"
          color="processing"
          :bordered="false"
        >
          已改口径
        </a-tag>
      </div>
      <div class="bidr-agent-confirm__row">
        <span class="bidr-agent-confirm__label">采纳口径</span>
        <span class="bidr-agent-confirm__value">{{ c.adopted }}</span>
      </div>
      <div
        v-if="c.evidence"
        class="bidr-agent-confirm__row"
      >
        <span class="bidr-agent-confirm__label">证据链</span>
        <span class="bidr-agent-confirm__value">{{ c.evidence }}</span>
      </div>
      <div
        v-if="c.impact"
        class="bidr-agent-confirm__row"
      >
        <span class="bidr-agent-confirm__label">影响产出</span>
        <span class="bidr-agent-confirm__value">{{ c.impact }}</span>
      </div>
      <div
        v-if="c.status === 'revised' && c.resolveNote"
        class="bidr-agent-confirm__note"
      >
        新口径：{{ c.resolveNote }}
      </div>
      <div
        v-else-if="c.status === 'pending'"
        class="bidr-agent-confirm__actions"
      >
        <template v-if="terminal">
          <a-button
            size="small"
            type="primary"
            :loading="resolvingId === c.id"
            @click="onConfirm(c)"
          >
            <template #icon>
              <CheckCircleFilled />
            </template>
            确认
          </a-button>
          <a-button
            size="small"
            :disabled="resolvingId !== null"
            @click="openRevise(c)"
          >
            改口径
          </a-button>
        </template>
        <span
          v-else
          class="bidr-agent-confirm__hint"
        >执行中登记，会话结束后裁决</span>
      </div>
      <!-- 行内改口径输入（Enter 提交；圆角容器无边框输入，同决策卡 write 位口径） -->
      <div
        v-if="revisingId === c.id"
        class="bidr-agent-confirm__write"
      >
        <a-textarea
          v-model:value="reviseNote"
          class="bidr-agent-confirm__write-input"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :bordered="false"
          placeholder="请输入改按的口径（将作为重生成指导语注入，重算受影响产出）"
          @press-enter="onEnterRevise"
        />
        <div class="bidr-agent-confirm__write-bar">
          <span class="bidr-agent-confirm__write-hint">Enter 提交 · Shift+Enter 换行</span>
          <a-button
            size="small"
            type="text"
            :disabled="resolvingId !== null"
            @click="cancelRevise"
          >
            取消
          </a-button>
          <a-button
            size="small"
            type="primary"
            :disabled="!reviseNote.trim()"
            :loading="resolvingId === c.id"
            @click="submitRevise()"
          >
            提交新口径
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref } from 'vue'

import { sessionResolveConfirmation } from '@/framework/apis/agent'

import type { AgentConfirmationT } from './types'

import './styles.css'

interface Props {
  /** 会话标识（裁决端点定位） */
  sessionId: string
  /** 待裁决清单（消费方过滤 pending 后传入；也兼容带已裁决条目——带状态标记只读展示） */
  items: AgentConfirmationT[]
  /** 会话是否终态（裁决钮仅终态可操作；运行中登记只提示） */
  terminal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  terminal: false
})

const emit = defineEmits<{
  /** 单条裁决成功（确认/改口径皆发）：父级把该 id 从 pending 集合剔除（轮询快照同步兜底） */
  (e: 'resolved', id: number): void
  /** 改口径提交成功：签名与 agentChat 一致，业务壳监听后触发受影响产出重算 */
  (e: 'confirmation-revised', item: AgentConfirmationT, note: string): void
}>()

/** 提交互斥标记（提交中 busy 态防重复；全卡单飞——与 agentChat resolvingId 口径一致） */
const resolvingId = ref<number | null>(null)

/** 一键确认（认可自决口径）：revised=false；重复收口幂等覆盖可反悔改判 */
const onConfirm = async (c: AgentConfirmationT) => {
  if (!props.sessionId || resolvingId.value !== null) return
  resolvingId.value = c.id
  try {
    await sessionResolveConfirmation(props.sessionId, c.id)
    message.success(`待确认口径 #${c.id} 已确认`)
    emit('resolved', c.id)
  } finally {
    resolvingId.value = null
  }
}

/** 行内改口径：展开输入框（一次只展开一条，换条即收） */
const revisingId = ref<number | null>(null)
const reviseNote = ref('')

const openRevise = (c: AgentConfirmationT) => {
  revisingId.value = c.id
  reviseNote.value = ''
}

const cancelRevise = () => {
  revisingId.value = null
  reviseNote.value = ''
}

const onEnterRevise = (e: KeyboardEvent) => {
  // 中文输入法回车用于确认候选词，不应提交（同决策卡 write 位口径）
  if (e.isComposing || e.keyCode === 229) return
  if (e.shiftKey) return
  e.preventDefault()
  submitRevise()
}

/** 改口径提交：revised=true + note（note 必填）；成功后标 revised 并上抛业务壳触发重算 */
const submitRevise = async () => {
  const c = props.items.find(i => i.id === revisingId.value)
  const note = reviseNote.value.trim()
  if (!props.sessionId || !c || !note || resolvingId.value !== null) return
  resolvingId.value = c.id
  try {
    await sessionResolveConfirmation(props.sessionId, c.id, true, note)
    message.success('改口径已记录，正在触发受影响产出重算')
    revisingId.value = null
    reviseNote.value = ''
    emit('resolved', c.id)
    emit('confirmation-revised', c, note)
  } finally {
    resolvingId.value = null
  }
}
</script>
