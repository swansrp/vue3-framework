<!--
 * Agent 模式问答页（全宽）——framework 层页面（所有项目共享，后端依赖 insight 模块即可用）
 *
 * 入口：DB 菜单「Agent 问答」（AgentAsk，component 直达本文件，与智能问数菜单对等）
 * 外壳走通用聊天父组件 AgentChatPanel（气泡/滚动/输入区/历史抽屉/评价/复制全体内置），
 * 本页只保留业务编排：Agent 选择 + runAskPoll 提交轮询 + 应答表格渲染（#message-body）。
 * step 事件把模型思考过程（阶段进度 + 工具循环日志）经面板内置思考卡逐条实时上屏；
 * done 终态携带应答 JSON 渲染数据表格；歧义确认经面板 @clarify-answer 回填作答。
 * 历史恢复：对话详情 ext.payload 与 askPoll 终态同构，经 applyAskPayload 重放。
-->
<template>
  <div class="agent-page">
    <AgentChatPanel
      ref="panelRef"
      title="智能问数 · Agent 模式"
      :messages="messages"
      :loading="sending"
      :sendable="!!agentCode"
      :digest-message="digestMessage"
      input-placeholder="输入业务问题，Enter 发送（Shift+Enter 换行）；模型探索过程将实时展示"
      @send="send"
      @stop="stop"
      @clarify-answer="onClarifyAnswer"
      @new-conversation="onNewConversation"
      @restore-conversation="onRestoreConversation"
    >
      <template #header-extra>
        <a-select
          v-model:value="agentCode"
          class="header-agent"
          placeholder="选择 Agent"
          :options="agentOptions"
        />
      </template>

      <template #empty>
        <a-empty description="选择 Agent 后输入业务问题，模型探索过程将实时展示" />
      </template>

      <!-- 业务产物：应答表格 / 校验失败 / 错误与停止提示（过程块由面板内置渲染） -->
      <template #message-body="{ msg }">
        <template v-if="(msg as AgentMsg).status === 'ok'">
          <a-alert
            v-if="(msg as AgentMsg).usedProposals"
            type="warning"
            show-icon
            class="proposal-tip"
            :message="`已基于 ${(msg as AgentMsg).proposedCount} 项临时资产建议作答，建议已记录待管理员审核（批次 ${(msg as AgentMsg).batchNo}）`"
          />
          <div
            v-if="(msg as AgentMsg).notes && (msg as AgentMsg).notes!.length"
            class="notes"
          >
            <div
              v-for="(n, i) in (msg as AgentMsg).notes"
              :key="i"
              class="note-item"
            >
              {{ n }}
            </div>
          </div>
          <a-table
            v-if="(msg as AgentMsg).askRows"
            :columns="(msg as AgentMsg).askColumns"
            :data-source="(msg as AgentMsg).askRows"
            :pagination="false"
            size="small"
            row-key="__rowKey"
            :scroll="{ y: 360 }"
          />
          <div
            v-if="(msg as AgentMsg).warnings && (msg as AgentMsg).warnings!.length"
            class="warn-bar"
          >
            <a-tag
              v-for="(w, i) in (msg as AgentMsg).warnings"
              :key="i"
              color="orange"
            >
              {{ w.message || w }}
            </a-tag>
          </div>
          <details class="debug">
            <summary>SQL 与解析详情</summary>
            <pre
              v-if="(msg as AgentMsg).sql"
              class="code"
            >{{ (msg as AgentMsg).sql }}</pre>
            <pre
              v-if="(msg as AgentMsg).semanticQueryText"
              class="code"
            >{{ (msg as AgentMsg).semanticQueryText }}</pre>
          </details>
        </template>
        <template v-else-if="(msg as AgentMsg).status === 'invalid'">
          <a-alert
            type="error"
            :message="(msg as AgentMsg).errorText || ('校验未通过（' + ((msg as AgentMsg).errors || []).length + ' 项）')"
            show-icon
          />
          <ul class="errors">
            <li
              v-for="(e, i) in (msg as AgentMsg).errors"
              :key="i"
            >
              {{ e.message || e }}
            </li>
          </ul>
        </template>
        <a-alert
          v-else-if="(msg as AgentMsg).status === 'stopped'"
          type="info"
          :message="(msg as AgentMsg).content || '本次问数已停止'"
          show-icon
        />
        <a-alert
          v-else-if="(msg as AgentMsg).status === 'error'"
          type="error"
          :message="(msg as AgentMsg).errorText || '请求失败'"
          show-icon
        />
      </template>
    </AgentChatPanel>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { queryAgents } from '@/framework/apis/smartAgent'
import AgentChatPanel from '@/framework/components/common/agentChat/AgentChatPanel.vue'
import { applyAskPayload, runAskPoll } from '@/framework/components/common/agentChat/askPoll'
import type { AskOutcome } from '@/framework/components/common/agentChat/askPoll'
import type { ChatClarifyQuestion, ChatMsgBase, ChatPlanItem, ChatStep } from '@/framework/components/common/agentChat/types'

const route = useRoute()

const pickQuery = (key: string) => {
  const q = route.query[key]
  if (typeof q === 'string' && q.trim()) return q.trim()
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) return q[0].trim()
  return ''
}

// ---------------- Agent 选择（query.agentCode 预置；缺省选列表首个） ----------------
const agentCode = ref(pickQuery('agentCode'))
const agentOptions = ref<Array<{ label: string; value: string }>>([])

const loadAgents = () => {
  queryAgents([], [], 50, 1).then((res: any) => {
    agentOptions.value = (res.payload?.records || []).map((a: any) => ({
      label: `${a.agentName || a.agentCode}（${a.agentCode}）`,
      value: a.agentCode
    }))
    if (!agentCode.value && agentOptions.value.length) {
      agentCode.value = agentOptions.value[0].value
    }
  })
}

// ---------------- 消息流（ChatMsgBase 之上扩展问数引擎产物/过程态） ----------------
// status 比 AskOutcome 多 loading / stopped 态，故 Omit 后重声明
interface AgentMsg extends ChatMsgBase, Omit<Partial<AskOutcome>, 'status'> {
  content?: string
  steps: ChatStep[]
  /** LLM 流式应答 live 进度（替换式展示，思考卡片末行实时刷新） */
  liveText?: string
  /** 歧义确认待答问题（后端 askUser 阻塞等待，选项卡作答后编排继续） */
  clarify?: ChatClarifyQuestion
  /** onQuestion 的 promise resolve（卡片作答时回填，供 runAskPoll 提交作答） */
  clarifyResolve?: (answer: string) => void
  /** 计划待办清单（submit_plan 提交、随完成挑勾；终态后保留回看） */
  plan?: ChatPlanItem[]
  startTime: number
  elapsedMs: number
}

const messages = ref<AgentMsg[]>([])
const panelRef = ref<InstanceType<typeof AgentChatPanel> | null>(null)
const sending = ref(false)
let msgSeq = 0
let abortRef: AbortController | null = null

const scrollBottom = () => panelRef.value?.scrollBottom()

onUnmounted(() => {
  abortRef?.abort()
})

// ---------------- 发送：提交+轮询（面板内置思考卡/歧义卡消费过程字段） ----------------
const send = (question: string) => {
  if (!agentCode.value || sending.value) return
  const now = Date.now()
  messages.value.push({
    id: ++msgSeq, role: 'user', time: now, status: 'ok', content: question,
    steps: [], startTime: now, elapsedMs: 0
  })
  const reply: AgentMsg = {
    id: ++msgSeq, role: 'assistant', time: now, status: 'loading',
    steps: [], liveText: '', startTime: now, elapsedMs: 0
  }
  messages.value.push(reply)
  scrollBottom()

  sending.value = true
  abortRef = new AbortController()
  runAskPoll(
    { agentCode: agentCode.value, question },
    {
      // 思考过程逐条实时上屏（阶段进度 + 工具循环日志）
      onStep: (text) => {
        reply.steps.push({ text, time: Date.now() })
        scrollBottom()
      },
      onLive: (text) => {
        reply.liveText = text
      },
      // 歧义确认：后端编排阻塞等待作答，弹选项卡并把 resolve 挂到消息上，用户作答后回填继续
      onQuestion: (q) => new Promise<string>((resolve) => {
        reply.clarify = q
        reply.clarifyResolve = resolve
        reply.steps.push({ text: `歧义确认：${q.question}`, time: Date.now() })
        scrollBottom()
      }),
      onPlan: (plan) => {
        reply.plan = plan
        scrollBottom()
      },
      // 终态：应答渲染 + 历史对话定位标识回填（面板内置评价经通用 rate 端点定位）
      onDone: (p, meta) => {
        applyAskPayload(reply as AskOutcome, p)
        reply.conversationId = meta.conversationId
        reply.messageId = meta.messageId
      },
      onError: (text, meta) => {
        reply.status = 'error'
        reply.errorText = text
        reply.conversationId = meta.conversationId
        reply.messageId = meta.messageId
      }
    },
    abortRef.signal
  )
    .catch((e: any) => {
      if (reply.status !== 'loading') return
      reply.status = 'error'
      reply.errorText = e?.name === 'AbortError' ? '已停止本次问答' : (e?.message || '问数请求失败')
    })
    .finally(() => {
      sending.value = false
      abortRef = null
      if (reply.status === 'loading') {
        reply.status = 'error'
        reply.errorText = '轮询已结束但未收到应答，请重试'
      }
      reply.elapsedMs = Date.now() - reply.startTime
      scrollBottom()
    })
}

const stop = () => {
  abortRef?.abort()
  message.info('已发送停止请求，后端将在下个进度点中断')
}

// 歧义确认卡片作答：移除卡片并回填 promise（runAskPoll 拿到后提交后端唤醒编排）；
// 消息已结束（如停止/超时）时仅收卡片不回填，后端由取消/超时哨兵自行收口
const onClarifyAnswer = (msg: ChatMsgBase, answer: string) => {
  const m = msg as AgentMsg
  m.clarify = undefined
  if (m.status === 'loading' && m.clarifyResolve) {
    m.clarifyResolve(answer)
    m.clarifyResolve = undefined
  }
  scrollBottom()
}

const onNewConversation = () => {
  if (sending.value) return
  messages.value = []
}

// ---------------- 历史恢复（对话详情 ext.payload 与 askPoll 终态同构，重放渲染） ----------------
const onRestoreConversation = (conv: any) => {
  if (sending.value) return
  const restored: AgentMsg[] = []
  let seq = msgSeq
  ;(conv?.messages || []).forEach((m: any) => {
    const base = {
      id: ++seq,
      time: m.time || Date.now(),
      conversationId: conv.conversationId,
      messageId: m.messageId,
      rating: m.rating || undefined
    }
    if (m.role === 'user') {
      restored.push({ ...base, role: 'user', status: 'ok', content: m.content, steps: [], startTime: base.time, elapsedMs: 0 })
      return
    }
    const payload = m.ext?.payload || {}
    const msg: AgentMsg = {
      ...base, role: 'assistant', status: 'loading', content: m.content,
      steps: (payload.steps || []).map((s: string) => ({ text: s, time: base.time })),
      plan: payload.plan || undefined,
      startTime: base.time, elapsedMs: 0
    }
    if (payload.status === 'stopped') {
      msg.status = 'stopped'
    } else if (payload.status === 'error') {
      msg.status = 'error'
      msg.errorText = payload.errorMessage || m.content || '维护问数失败'
    } else {
      applyAskPayload(msg as AskOutcome, payload.result || {})
    }
    restored.push(msg)
  })
  msgSeq = seq
  messages.value = restored
}

// ---------------- 复制全体（摘要格式） ----------------
const digestMessage = (m: ChatMsgBase): string => {
  const msg = m as AgentMsg
  if (msg.role === 'user') return `提问：${msg.content || ''}`
  if (msg.status === 'ok') {
    const rows = msg.askRows?.length ?? 0
    return msg.sql ? `回答：返回 ${rows} 行数据\nSQL：${msg.sql}` : `回答：返回 ${rows} 行数据`
  }
  if (msg.status === 'stopped') return `回答：${msg.content || '本次问数已停止'}`
  return `回答：${msg.errorText || msg.content || '请求失败'}`
}

onMounted(loadAgents)
</script>

<style scoped lang="less">
.agent-page {
  height: 100vh;

  .header-agent {
    width: 260px;
  }
}

details {
  summary {
    cursor: pointer;
    color: #1677ff;
    font-size: 13px;
    user-select: none;
  }
}

.debug {
  margin-top: 8px;
}

.code {
  margin: 6px 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.notes {
  margin-bottom: 8px;
  padding: 6px 10px;
  background: var(--bg-base, #f5f6f8);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, #666);

  .note-item {
    line-height: 1.7;
  }
}

.proposal-tip {
  margin-bottom: 8px;
}

.warn-bar {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.errors {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #cf1322;
  font-size: 13px;
}
</style>
