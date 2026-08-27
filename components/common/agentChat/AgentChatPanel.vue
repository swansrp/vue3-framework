<!--
 * AgentChatPanel —— 引擎无关的通用聊天父组件（agentChat 目录收口的核心交付物）
 *
 * 消息透明穿透：messages 元素须满足 ChatMsgBase（业务壳自由扩展引擎产物/过程态字段），
 * 面板按契约字段自动渲染「LLM 过程」块，业务产物经 #message-body 插槽注入：
 *   - msg.plan       → AskPlanChecklist 计划待办清单（执行中跳动、终态回看）
 *   - status=loading → AskThinking 思考卡（steps/live/耗时/停止）+ AskClarifyCard 歧义卡；
 *                      仅在消息带 steps 或 liveText 时渲染——SSE 流式正文类引擎（如 chatbi）
 *                      不设这两字段，loading 态由业务壳在 #message-body 自行展示
 *   - 终态且有 steps → details 折叠思考过程回看
 * 内置能力（各业务壳不再各自实现）：
 *   - 气泡壳 + 统一 formatMsgTime 时间戳（消灭 chatbi/测试页/Agent 页三处重复实现）
 *   - 智能滚动：贴底 <48px 才跟随，用户上滚阅读不打断；发送新消息强制滚底
 *   - 输入区：Enter 发送 / Shift+Enter 换行；`loading` prop 驱动发送-停止按钮态
 *   - 历史对话抽屉：通用 /api/agent/conversations 端点（列表/恢复/删除）+ 新对话按钮；
 *     `historyScope` 控制发起人作用域：mine（默认，只看本人）/ all（管理视图跨发起人聚合，
 *     列表项带发起人标识；删除/评价仅本人记录可操作）
 *   - 消息评价：assistant 终态消息（conversationId+messageId 齐备）点赞/点踩 → 通用 rate 端点
 *   - 复制全体：摘要格式化经 `digestMessage` prop 注入（未提供则不显示按钮）
 * 引擎接入：业务壳监听 send/stop/clarify-answer 驱动自家编排（轮询/SSE/自主会话），
 * 历史恢复经 restore-conversation 拿到对话详情（ext.payload 重放口径由业务壳定）。
-->
<template>
  <div class="chat-panel">
    <div class="chat-header">
      <RobotOutlined class="header-icon" />
      <span class="header-title">{{ title }}</span>
      <slot name="header-extra"></slot>
      <span class="header-spacer"></span>
      <a-button
        v-if="digestMessage && messages.length"
        size="small"
        @click="copyAll"
      >
        <template #icon>
          <CopyOutlined />
        </template>
        复制全体
      </a-button>
      <a-button
        size="small"
        @click="openHistory"
      >
        <template #icon>
          <HistoryOutlined />
        </template>
        历史
      </a-button>
      <a-button
        size="small"
        @click="onNewConversation"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        新对话
      </a-button>
    </div>

    <slot name="alert"></slot>

    <div
      ref="msgAreaRef"
      class="msg-area"
      @scroll="onMsgScroll"
    >
      <div
        v-if="!messages.length"
        class="msg-empty"
      >
        <slot name="empty">
          <a-empty description="输入问题开始对话，模型过程将实时展示" />
        </slot>
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="msg"
        :class="msg.role"
      >
        <div class="bubble">
          <!-- 用户气泡：缺省渲染 content，业务壳可整体替换 -->
          <template v-if="msg.role === 'user'">
            <slot
              name="user-bubble"
              :msg="msg"
            >
              <div class="question">
                {{ (msg as any).content }}
              </div>
            </slot>
          </template>
          <!-- 助手气泡：内置 LLM 过程块 + 业务产物插槽 -->
          <template v-else>
            <AskPlanChecklist
              v-if="(msg as any).plan && (msg as any).plan.length"
              :items="(msg as any).plan"
            />
            <template v-if="msg.status === 'loading' && ((msg as any).steps || (msg as any).liveText)">
              <AskThinking
                :steps="(msg as any).steps || []"
                :elapsed-ms="elapsedOf(msg)"
                :live="(msg as any).liveText"
                @stop="emit('stop')"
              />
              <AskClarifyCard
                v-if="(msg as any).clarify"
                :question="(msg as any).clarify"
                :answered="(msg as any).clarifyAnswered"
                @answer="(a: string) => emit('clarify-answer', msg, a)"
              />
            </template>
            <!-- 终态：思考过程收起可回看（步骤计数 + 耗时） -->
            <details
              v-else-if="((msg as any).steps || []).length"
              class="think-done"
            >
              <summary>思考过程（{{ (msg as any).steps.length }} 步{{ elapsedDoneText(msg) }}）</summary>
              <AskSteps :steps="(msg as any).steps" />
            </details>
            <slot
              name="message-body"
              :msg="msg"
            ></slot>
          </template>
          <!-- 气泡尾部：时间戳 + 评价（终态且有对话定位标识才可评，重复点同值=取消） -->
          <div
            v-if="msg.time && msg.status !== 'loading'"
            class="msg-meta"
          >
            <span class="msg-time">{{ formatMsgTime(msg.time) }}</span>
            <template v-if="canRate(msg)">
              <span
                class="rate-btn"
                :class="{ 'is-active': msg.rating === 'like', 'is-busy': ratingBusy }"
                title="有帮助"
                @click="rateMsg(msg, 'like')"
              >
                <LikeOutlined />
              </span>
              <span
                class="rate-btn dislike"
                :class="{ 'is-active': msg.rating === 'dislike', 'is-busy': ratingBusy }"
                title="没帮助"
                @click="rateMsg(msg, 'dislike')"
              >
                <DislikeOutlined />
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <slot name="input-prefix"></slot>
      <a-textarea
        v-model:value="inputText"
        class="nl-input"
        :placeholder="inputPlaceholder"
        :auto-size="{ minRows: 2, maxRows: 5 }"
        @keydown.enter="onEnter"
      />
      <div class="input-actions">
        <a-button
          v-if="loading"
          danger
          @click="emit('stop')"
        >
          停止
        </a-button>
        <a-button
          type="primary"
          :disabled="!inputText.trim() || loading || !sendable"
          @click="doSend"
        >
          发送
        </a-button>
      </div>
    </div>

    <!-- 历史对话抽屉：通用端点按访问人聚合（跨 agent；agentCode prop 可过滤；historyScope=all 跨发起人），点击恢复经业务壳重放 -->
    <a-drawer
      v-model:open="historyOpen"
      title="历史对话"
      placement="right"
      :width="340"
    >
      <a-spin :spinning="historyLoading">
        <div
          v-if="!historyLoading && !conversations.length"
          class="history-empty"
        >
          暂无历史对话
        </div>
        <div
          v-for="c in conversations"
          :key="c.conversationId"
          class="history-item"
        >
          <div
            class="history-main"
            @click="restoreConversation(c)"
          >
            <div class="history-title">
              {{ c.title || '未命名对话' }}
            </div>
            <div class="history-meta">
              <span
                v-if="historyScope === 'all'"
                class="history-operator"
              >{{ c.operator || 'anonymous' }}</span>
              {{ formatMsgTime(c.updateTime) }} · {{ c.messageCount || 0 }} 条消息
              <a-tag
                v-if="agentNames[c.agentCode]"
                size="small"
                class="history-agent"
              >
                {{ agentNames[c.agentCode] }}
              </a-tag>
            </div>
          </div>
          <a-popconfirm
            v-if="canDelete(c)"
            title="删除该历史对话？"
            @confirm="removeConversation(c)"
          >
            <a-button
              size="small"
              type="text"
              danger
            >
              <template #icon>
                <DeleteOutlined />
              </template>
            </a-button>
          </a-popconfirm>
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import {
  CopyOutlined,
  DeleteOutlined,
  DislikeOutlined,
  HistoryOutlined,
  LikeOutlined,
  PlusOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { nextTick, onUnmounted, ref, watch } from 'vue'


import AskClarifyCard from './AskClarifyCard.vue'
import AskPlanChecklist from './AskPlanChecklist.vue'
import AskSteps from './AskSteps.vue'
import AskThinking from './AskThinking.vue'
import type { ChatMsgBase } from './types'

import { deleteConversation, getAgentRegistry, getConversation, listConversations, rateConversationMessage } from '@/framework/apis/agent'
import pinia from '@/framework/store'
import { useUserStore } from '@/framework/store/user'

const props = withDefaults(defineProps<{
  title?: string
  /** 消息列表（业务壳持有数据源；元素须满足 ChatMsgBase，扩展字段面板透明穿透） */
  messages: ChatMsgBase[]
  /** 引擎进行中：驱动发送-停止按钮态与思考卡耗时秒表 */
  loading: boolean
  inputPlaceholder?: string
  /** 发送可用（如必选条件未就绪置否；缺省恒可发） */
  sendable?: boolean
  /** 历史抽屉过滤 agent（空=跨 agent 聚合，实现「历史在一起显示」） */
  agentCode?: string
  /** 历史发起人作用域：mine（默认，只看本人，用户场景）/ all（跨发起人聚合，管理类页面） */
  historyScope?: 'mine' | 'all'
  /** 复制全体摘要格式化（按消息返回展示文本；未提供则不显示复制按钮） */
  digestMessage?: (msg: ChatMsgBase) => string
}>(), {
  title: '智能对话',
  inputPlaceholder: '输入问题，Enter 发送（Shift+Enter 换行）',
  sendable: true,
  historyScope: 'mine'
})

const emit = defineEmits<{
  /** 发送（面板已清空输入框；业务壳负责 push user+assistant 消息并驱动引擎） */
  (e: 'send', text: string): void
  /** 停止（思考卡停止按钮与输入区停止按钮同源） */
  (e: 'stop'): void
  /** 歧义确认作答（非空=用户口径；空串=交由 AI 决定；业务壳回填编排并收卡片） */
  (e: 'clarify-answer', msg: ChatMsgBase, answer: string): void
  /** 新对话（业务壳清空消息/复位引擎态） */
  (e: 'new-conversation'): void
  /** 历史恢复（对话详情全量透传，ext.payload 重放口径由业务壳定） */
  (e: 'restore-conversation', conversation: any): void
  /** 内置评价完成后通知（rating 空=取消） */
  (e: 'rated', msg: ChatMsgBase, rating: string): void
}>()

// ==================== 输入与发送 ====================

const inputText = ref('')

const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return // Shift+Enter 换行
  e.preventDefault()
  doSend()
}

const doSend = () => {
  const text = inputText.value.trim()
  if (!text || props.loading || !props.sendable) return
  inputText.value = ''
  restoredOperator.value = ''
  emit('send', text)
  scrollBottom(true)
}

// 新对话：复位恢复归属（后续消息为本人发起，评价按钮恢复可用）
const onNewConversation = () => {
  restoredOperator.value = ''
  emit('new-conversation')
}

// ==================== 智能滚动（贴底 <48px 跟随，发送强制滚底） ====================

const msgAreaRef = ref<HTMLElement | null>(null)
const nearBottom = ref(true)

const onMsgScroll = () => {
  const el = msgAreaRef.value
  if (!el) return
  nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

const scrollBottom = (force = false) => {
  nextTick(() => {
    const el = msgAreaRef.value
    if (el && (force || nearBottom.value)) el.scrollTop = el.scrollHeight
  })
}

// 消息增长跟随滚动（过程步骤/产物上屏时保持贴底可见）
watch(
  () => props.messages.length,
  () => scrollBottom()
)

defineExpose({ scrollBottom })

// ==================== 耗时秒表（进行中消息每秒刷新） ====================

const nowTick = ref(Date.now())
let elapsedTimer: ReturnType<typeof setInterval> | undefined

watch(() => props.loading, (v) => {
  if (v) {
    nowTick.value = Date.now()
    elapsedTimer = setInterval(() => {
      nowTick.value = Date.now()
    }, 1000)
  } else if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = undefined
  }
})

onUnmounted(() => {
  if (elapsedTimer) clearInterval(elapsedTimer)
})

// 进行中=秒表推算；终态=业务壳结算的 elapsedMs（未结算不展示耗时）
const elapsedOf = (msg: ChatMsgBase) => Math.max(0, nowTick.value - msg.time)

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`
}

const elapsedDoneText = (msg: ChatMsgBase) => {
  const ms = (msg as any).elapsedMs
  return typeof ms === 'number' && ms > 0 ? ` · ${fmtElapsed(ms)}` : ''
}

// ==================== 时间戳（统一实现，消灭三处重复） ====================

// 气泡时间：当天只显 HH:mm，跨天补 月-日（历史恢复的对话可能跨天）
const formatMsgTime = (t?: number) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date().toDateString() ? hm : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}

// ==================== 内置评价（通用 rate 端点；同值重点=取消） ====================

const ratingBusy = ref(false)

// 当前登录人（operator 后端口径=账号显示名 name，回落 customerNumber）
const userStore = useUserStore(pinia)
const isMine = (operator?: string) =>
  !!operator && (operator === userStore.name || operator === userStore.customerNumber)

// 恢复对话的发起人归属（管理视图可能恢复他人对话）：评价仅限本人对话，
// 与后端越权拦截同口径（前端前置避免报错困扰；新发/新对话时复位为空=本人）
const restoredOperator = ref('')

const canRate = (msg: ChatMsgBase) =>
  msg.role === 'assistant' && msg.status !== 'loading' && msg.status !== 'error'
  && !!msg.conversationId && !!msg.messageId
  && (!restoredOperator.value || isMine(restoredOperator.value))

const rateMsg = async (msg: ChatMsgBase, rating: string) => {
  if (ratingBusy.value || !msg.conversationId || !msg.messageId) return
  const next = msg.rating === rating ? '' : rating
  ratingBusy.value = true
  try {
    await rateConversationMessage(msg.conversationId, msg.messageId, next)
    msg.rating = next || undefined
    emit('rated', msg, next)
  } catch {
    message.error('评价失败，请重试')
  } finally {
    ratingBusy.value = false
  }
}

// ==================== 复制全体（摘要格式经 digestMessage 注入） ====================

const copyAll = async () => {
  if (!props.digestMessage) return
  const text = props.messages.map(m => props.digestMessage!(m)).filter(t => !!t).join('\n\n')
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制全部对话摘要')
  } catch {
    message.error('复制失败，浏览器未授权剪贴板')
  }
}

// ==================== 历史对话抽屉（通用端点） ====================

const historyOpen = ref(false)
const historyLoading = ref(false)
const conversations = ref<any[]>([])
// agentCode → 显示名（跨 agent 聚合列表的归属标识；经统一注册中心清单解析）
const agentNames = ref<Record<string, string>>({})

const loadAgentNames = () => {
  if (Object.keys(agentNames.value).length) return
  getAgentRegistry().then((res: any) => {
    const map: Record<string, string> = {}
    ;(res?.payload || []).forEach((a: any) => {
      if (a?.agentCode) map[a.agentCode] = a.displayName || a.agentCode
    })
    agentNames.value = map
  }).catch(() => {})
}

const loadHistory = () => {
  historyLoading.value = true
  listConversations(props.agentCode, props.historyScope === 'all' ? 'all' : undefined).then((res: any) => {
    conversations.value = res?.payload || []
  }).catch(() => {
    conversations.value = []
  }).finally(() => {
    historyLoading.value = false
  })
}

const openHistory = () => {
  historyOpen.value = true
  loadAgentNames()
  loadHistory()
}

// 过滤 agent/作用域切换后抽屉开着则即时刷新（测试页切换 agent 后历史随切）
watch([() => props.agentCode, () => props.historyScope], () => {
  if (historyOpen.value) loadHistory()
})

// 删除仅本人记录（mine 视图天然全是本人；all 视图隐藏他人记录的删除按钮，后端越权拦截双保险）
const canDelete = (c: any) => props.historyScope !== 'all' || isMine(c.operator)

// 恢复：详情全量透传业务壳（ext.payload 重放口径各引擎自定）；恢复后关闭抽屉并刷新列表
const restoreConversation = (c: any) => {
  getConversation(c.conversationId).then((res: any) => {
    const detail = res?.payload
    if (!detail) {
      message.warning('对话不存在或已过期')
      loadHistory()
      return
    }
    emit('restore-conversation', detail)
    restoredOperator.value = detail.operator || ''
    historyOpen.value = false
    scrollBottom(true)
  })
}

const removeConversation = (c: any) => {
  deleteConversation(c.conversationId).then(() => {
    loadHistory()
  }).catch(() => {
    message.error('删除失败，请重试')
  })
}
</script>

<style scoped lang="less">
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);

  .header-icon {
    font-size: 22px;
    color: var(--accent);
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-spacer {
    flex: 1;
  }
}

.msg-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 4px;
}

.msg-empty {
  margin-top: 100px;
}

.msg {
  display: flex;
  margin-bottom: 14px;

  &.user {
    justify-content: flex-end;

    .bubble {
      background: #e6f4ff;
      border-color: #91caff;
      max-width: 60%;
    }
  }

  &.assistant {
    justify-content: flex-start;

    .bubble {
      width: 72%;
      max-width: 900px;
    }
  }
}

.bubble {
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-subtle, #e8e8e8);
  border-radius: 8px;
  padding: 10px 14px;
  min-width: 120px;
}

.question {
  font-weight: 600;
  white-space: pre-wrap;
  word-break: break-all;
}

details {
  summary {
    cursor: pointer;
    color: #1677ff;
    font-size: 13px;
    user-select: none;
  }
}

.think-done {
  margin-bottom: 8px;

  summary {
    color: var(--text-secondary, #666);
  }
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;

  .msg-time {
    font-size: 11px;
    color: var(--text-tertiary, #999);
  }

  .rate-btn {
    cursor: pointer;
    color: var(--text-tertiary, #999);
    font-size: 13px;
    transition: color 0.15s;

    &:hover {
      color: #1677ff;
    }

    &.dislike:hover {
      color: #ff4d4f;
    }

    &.is-active {
      color: #1677ff;
    }

    &.dislike.is-active {
      color: #ff4d4f;
    }

    &.is-busy {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}

.input-bar {
  flex-shrink: 0;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-subtle, #e8e8e8);
  border-radius: 8px;

  .nl-input {
    font-size: 14px;
  }
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.history-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--text-tertiary, #999);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-subtle, #f0f0f0);

  .history-main {
    flex: 1;
    min-width: 0;
    cursor: pointer;

    &:hover .history-title {
      color: #1677ff;
    }
  }

  .history-title {
    font-size: 13px;
    color: var(--text-primary, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .history-meta {
    margin-top: 2px;
    font-size: 12px;
    color: var(--text-tertiary, #999);

    .history-operator {
      color: var(--accent, #1677ff);
      margin-right: 4px;
    }

    .history-agent {
      margin-left: 4px;
    }
  }
}
</style>
