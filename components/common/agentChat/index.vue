/**
 * AgentChat 对话基础框架父组件（llm 基础框架，业务零绑定）
 *
 * 职责：自主 agent 会话的运行面板——
 * - 阶段条：status.stages 渲染 AgentStages（自主规划边执行边跳动）；
 * - 计划清单：status.plan 渲染待办勾选（LLM 开局 submit_plan 提交、start_plan_item 标记执行中、done_plan_item 逐条挑勾）；
 * - 问题卡片：status.questions 的 waiting 条目渲染可交互决策卡（ask_user 提问，
 *   候选项单选/自由输入/交由 AI 决定），作答经 sessionAnswer 写控制键唤醒后端阻塞；
 * - 消息流：思考类事件（round_start/tool_call/tool_result/llm_output/log）按轮分组
 *   折叠为「思考过程」（执行中最新组展开、结论出现全部折叠），状态条
 *   （paused/resumed/guidance）与终态结论平铺；
 * - 消息体渲染器注册制：renderers prop（事件 type→业务组件映射，如问数表格/
 *   提案卡片），#renderer 作用域插槽优先兜底——父组件不注册则按通用摘要行渲染；
 * - 底部输入区状态机：RUNNING→[暂停][停止]；PAUSED→[补指导语][继续][停止]；
 *   终态→结论摘要 + 点赞/点踩（dislike 收集反馈）+ [重新发起]；
 * - 轮询：useAgentSession 2s events(sinceSeq) 增量 + status；轮询即后端存活信号，
 *   页面隐藏不暂停（否则会被断开即停策略误判），组件卸载才停止轮询。
 *
 * 用法：<AgentChat :session-id="id" :renderers="{ tool_result: MyTable }" @restart="onRestart" />
 * 智能问数等业务以子组件形态外挂（传 renderers / #renderer），父组件不含业务。
 * 高度由外层容器给定（height: 100%）。
 */
<template>
  <div class="agent-chat">
    <!-- 头部：标题 + 会话状态 -->
    <div class="chat-header">
      <div class="header-title">
        <RobotOutlined class="title-icon" />
        <span>{{ title || status?.displayName || '智能代理' }}</span>
        <a-tag
          class="header-status"
          :bordered="false"
          :class="waitingQuestion ? 'st-waiting' : `st-${(status?.status || 'RUNNING').toLowerCase()}`"
        >
          {{ statusText }}
        </a-tag>
      </div>
      <div class="header-right">
        <a-button
          class="header-copy"
          size="small"
          type="text"
          title="复制全体对话文字（debug 用，全文不截断）"
          @click="onCopyAll"
        >
          <template #icon>
            <CopyOutlined />
          </template>
          复制全体
        </a-button>
        <span
          v-if="status?.operator"
          class="header-meta"
        >{{ status.operator }} · {{ formatTime(status.startedAt) }}</span>
      </div>
    </div>

    <!-- 阶段条（自主规划边执行边跳动；未声明阶段的 agent 不渲染） -->
    <div
      v-if="stageItems.length > 0"
      class="chat-stages"
    >
      <AgentStages
        :stages="stageItems"
        :plan="planItems"
        :started-at="status?.startedAt"
      />
    </div>

    <!-- 计划待办清单（LLM 开局提交、随完成逐条挑勾；未提交不渲染） -->
    <div
      v-if="planItems.length > 0"
      class="chat-plan"
    >
      <div class="plan-header">
        <CheckSquareOutlined class="plan-icon" />
        <span class="plan-title">计划待办</span>
        <span class="plan-count">{{ planDoneCount }}/{{ planItems.length }}</span>
      </div>
      <div class="plan-list">
        <div
          v-for="item in planItems"
          :key="item.id"
          class="plan-item"
          :class="{ 'is-done': item.status === 'done', 'is-running': item.status === 'running', 'is-stopped': item.status === 'stopped' }"
        >
          <CheckCircleFilled
            v-if="item.status === 'done'"
            class="plan-check"
          />
          <LoadingOutlined
            v-else-if="item.status === 'running'"
            spin
            class="plan-check"
          />
          <MinusOutlined
            v-else-if="item.status === 'stopped'"
            class="plan-check"
          />
          <ClockCircleOutlined
            v-else
            class="plan-check"
          />
          <span class="plan-text">{{ item.text }}</span>
          <span
            v-if="item.note"
            class="plan-note"
          >（{{ item.note }}）</span>
        </div>
      </div>
    </div>

    <!-- AI 决策问题卡片（ask_user 提问等待用户选择；存在 waiting 条目时渲染） -->
    <div
      v-if="waitingQuestion"
      class="chat-question"
    >
      <div class="question-header">
        <QuestionCircleFilled class="question-icon" />
        <span class="question-title">AI 需要你的决策</span>
        <span class="question-id">#{{ waitingQuestion.id }}</span>
      </div>
      <div class="question-text">
        {{ waitingQuestion.question }}
      </div>
      <div
        v-if="questionOptionViews.length > 0"
        class="question-options"
      >
        <div
          v-for="(view, oi) in questionOptionViews"
          :key="oi"
          class="question-option"
          :class="{ 'is-selected': selectedOption === view.raw }"
          @click="selectedOption = selectedOption === view.raw ? '' : view.raw"
        >
          <div class="question-option-main">
            <span
              v-if="view.key"
              class="question-option-key"
            >{{ view.key }}</span>
            <span class="question-option-label">{{ view.label }}</span>
          </div>
          <div
            v-if="view.desc"
            class="question-option-desc"
          >
            {{ view.desc }}
          </div>
        </div>
      </div>
      <a-textarea
        v-model:value="customAnswer"
        class="question-input"
        placeholder="或直接输入你的口径/选择（优先于选中的候选项）"
        :auto-size="{ minRows: 1, maxRows: 3 }"
      />
      <div class="question-actions">
        <a-button
          size="small"
          type="primary"
          :loading="answering"
          :disabled="!selectedOption && !customAnswer.trim()"
          @click="onAnswerQuestion"
        >
          <template #icon>
            <CheckCircleFilled />
          </template>
          提交回答
        </a-button>
        <a-button
          size="small"
          :loading="answering"
          @click="onSkipQuestion"
        >
          交由 AI 决定
        </a-button>
      </div>
    </div>

    <!-- 事件流 -->
    <div
      ref="bodyRef"
      class="chat-body"
      @scroll="onBodyScroll"
    >
      <div
        v-if="events.length === 0 && !status"
        class="empty-hint"
      >
        <RobotOutlined class="empty-icon" />
        <p class="empty-text">
          会话启动中…
        </p>
      </div>

      <!-- 统一过程树（opt-in）：开启后由 AgentProcessTree 接管过程呈现，
           与 relay/其他引擎共用同一 AssistantView 视图模型；默认关闭=下方旧分组逐字节不变 -->
      <AgentProcessTree
        v-if="processTree && processView"
        :view="processView"
      />

      <template v-if="!processTree">
      <template
        v-for="(group, gi) in thinkGroups"
        :key="`g-${group.id}`"
      >
        <div class="think-group">
          <div
            class="think-header"
            @click="toggleThink(group, gi)"
          >
            <RightOutlined
              class="think-arrow"
              :class="{ 'is-open': !isThinkCollapsed(group, gi) }"
            />
            <BulbOutlined class="think-icon" />
            <span class="think-title">
              {{ group.round != null ? `第 ${group.round} 轮思考` : '思考过程' }}
            </span>
            <span class="think-count">{{ group.events.length }} 条</span>
          </div>
          <div
            v-show="!isThinkCollapsed(group, gi)"
            class="think-body"
          >
            <div
              v-for="ev in group.events"
              :key="ev.seq"
              class="think-line"
              :class="`ev-${ev.type}`"
            >
              <!-- 消息体渲染器：slot 优先，renderers 注册次之，通用摘要兜底 -->
              <slot
                name="renderer"
                :event="ev"
                :payload="ev.payload"
              >
                <component
                  :is="renderers[ev.type]"
                  v-if="renderers && renderers[ev.type]"
                  :event="ev"
                  :payload="ev.payload"
                />
                <template v-else>
                  <span class="line-tag">{{ lineTag(ev.type) }}</span>
                  <span class="line-text">{{ lineText(ev) }}</span>
                  <!-- 长行展开（思考归档等全文不截断，默认预览 300 字） -->
                  <a
                    v-if="fullText(ev).length > 300"
                    class="line-expand"
                    @click="toggleExpand(ev.seq)"
                  >{{ expandedSeqs.has(ev.seq) ? '收起' : '展开' }}</a>
                </template>
              </slot>
            </div>

            <!-- LLM 流式实时内容作为当前轮思考组末行（替换式 live，与问数链同口径）：
                 默认展开看全文详情（内滚跟随），可收起仅留状态行（字数实时跳动）；终态后端清空自然隐藏，
                 轮末全文另由【LLM 思考归档】事件留痕可展开 -->
            <div
              v-if="gi === thinkGroups.length - 1 && liveText"
              class="think-line ev-live"
            >
              <span class="line-tag">流式</span>
              <span class="line-text live-summary">{{ liveSummary }}</span>
              <a
                v-if="liveDetail"
                class="line-expand"
                @click="toggleLiveExpand"
              >{{ liveExpanded ? '收起' : '展开' }}</a>
            </div>
            <div
              v-if="gi === thinkGroups.length - 1 && liveExpanded && liveDetail"
              class="live-detail"
            >
              {{ liveDetail }}
            </div>
          </div>
        </div>

        <!-- 状态条（组后平铺：暂停/恢复/指导语） -->
        <div
          v-for="ev in statusEventsBetween(group.endSeq, group.nextSeq)"
          :key="`s-${ev.seq}`"
          class="status-strip"
          :class="`strip-${ev.type}`"
        >
          {{ statusText2(ev) }}
        </div>
      </template>
      </template>

      <!-- 尾随状态条（最后一组之后） -->
      <div
        v-for="ev in statusEventsBetween(lastThinkEndSeq, Infinity)"
        :key="`s-${ev.seq}`"
        class="status-strip"
        :class="`strip-${ev.type}`"
      >
        {{ statusText2(ev) }}
      </div>

      <!-- LLM 流式实时内容兜底（尚无思考组时，如首轮 round_start 前）：有组后挂组尾渲染，同口径默认折叠 -->
      <div
        v-if="liveText && thinkGroups.length === 0"
        class="chat-live"
      >
        <div class="think-line ev-live">
          <span class="line-tag">流式</span>
          <span class="line-text live-summary">{{ liveSummary }}</span>
          <a
            v-if="liveDetail"
            class="line-expand"
            @click="toggleLiveExpand"
          >{{ liveExpanded ? '收起' : '展开' }}</a>
        </div>
        <div
          v-if="liveExpanded && liveDetail"
          class="live-detail"
        >
          {{ liveDetail }}
        </div>
      </div>

      <!-- 终态结论卡 -->
      <div
        v-if="conclusion"
        class="conclusion"
        :class="`is-${conclusion.kind}`"
      >
        <div class="conclusion-title">
          <CheckCircleFilled v-if="conclusion.kind === 'finish'" />
          <CloseCircleFilled v-else-if="conclusion.kind === 'error'" />
          <StopFilled v-else />
          <span>{{ conclusion.title }}</span>
        </div>
        <div
          v-if="conclusion.text"
          class="conclusion-text"
        >
          {{ conclusion.text }}
        </div>
      </div>

      <!-- 待确认口径清单（LLM 自决口径经 report_unconfirmed 登记，登记即可见；终态后逐条裁决：
           一键确认（认可自决口径）/改口径重算（会话侧标状态，业务壳监听 confirmation-revised 触发重算） -->
      <div
        v-if="confirmations.length > 0"
        class="confirmations"
      >
        <div class="confirmations-header">
          <ExclamationCircleFilled class="confirmations-icon" />
          <span class="confirmations-title">待确认口径</span>
          <span class="confirmations-count">{{ confirmPendingCount }}/{{ confirmations.length }} 待裁决</span>
        </div>
        <div
          v-for="c in confirmations"
          :key="c.id"
          class="confirmation-card"
          :class="`is-${c.status}`"
        >
          <div class="confirmation-top">
            <span class="confirmation-id">#{{ c.id }}</span>
            <span class="confirmation-question">{{ c.question }}</span>
            <a-tag
              v-if="c.status === 'confirmed'"
              class="confirmation-tag"
              color="success"
              :bordered="false"
            >
              已确认
            </a-tag>
            <a-tag
              v-else-if="c.status === 'revised'"
              class="confirmation-tag"
              color="processing"
              :bordered="false"
            >
              已改口径
            </a-tag>
          </div>
          <div class="confirmation-row">
            <span class="confirmation-label">采纳口径</span>
            <span class="confirmation-value">{{ c.adopted }}</span>
          </div>
          <div
            v-if="c.evidence"
            class="confirmation-row"
          >
            <span class="confirmation-label">证据链</span>
            <span class="confirmation-value">{{ c.evidence }}</span>
          </div>
          <div
            v-if="c.impact"
            class="confirmation-row"
          >
            <span class="confirmation-label">影响产出</span>
            <span class="confirmation-value">{{ c.impact }}</span>
          </div>
          <div
            v-if="c.status === 'revised' && c.resolveNote"
            class="confirmation-note"
          >
            新口径：{{ c.resolveNote }}
          </div>
          <div
            v-else-if="c.status === 'pending'"
            class="confirmation-actions"
          >
            <template v-if="isTerminal">
              <a-button
                size="small"
                type="primary"
                :loading="resolvingId === c.id"
                @click="onConfirmConfirmation(c)"
              >
                <template #icon>
                  <CheckCircleFilled />
                </template>
                一键确认
              </a-button>
              <a-button
                size="small"
                :disabled="resolvingId !== null"
                @click="openRevise(c)"
              >
                改口径重算
              </a-button>
            </template>
            <span
              v-else
              class="confirmation-pending-hint"
            >执行中登记，会话结束后裁决</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：状态机输入区 -->
    <div class="chat-footer">
      <template v-if="sessionStatus === 'RUNNING'">
        <a-textarea
          class="footer-input"
          placeholder="任务执行中… 如需补充指导，请先暂停"
          :auto-size="{ minRows: 1, maxRows: 3 }"
          disabled
        />
        <a-button
          size="small"
          :loading="pausing"
          @click="onPause"
        >
          <template #icon>
            <PauseCircleOutlined />
          </template>
          暂停
        </a-button>
        <a-button
          size="small"
          danger
          :loading="stopping"
          @click="onStop"
        >
          <template #icon>
            <StopOutlined />
          </template>
          停止
        </a-button>
      </template>

      <template v-else-if="sessionStatus === 'PAUSED'">
        <a-textarea
          v-model:value="guidanceInput"
          class="footer-input"
          placeholder="补充指导语（可空）：恢复后注入下一轮上下文，如「重点核对金额类指标」"
          :auto-size="{ minRows: 1, maxRows: 3 }"
          @press-enter="onEnterResume"
        />
        <a-button
          size="small"
          type="primary"
          :loading="resuming"
          @click="onResume"
        >
          <template #icon>
            <PlayCircleOutlined />
          </template>
          继续
        </a-button>
        <a-button
          size="small"
          danger
          :loading="stopping"
          @click="onStop"
        >
          <template #icon>
            <StopOutlined />
          </template>
          停止
        </a-button>
      </template>

      <template v-else-if="isTerminal">
        <div class="footer-rate">
          <span class="rate-label">本次会话：</span>
          <span
            class="rate-btn"
            :class="{ 'is-active': rating === 'like' }"
            title="有帮助"
            @click="onRate('like')"
          >
            <LikeOutlined />
          </span>
          <span
            class="rate-btn dislike"
            :class="{ 'is-active': rating === 'dislike' }"
            title="没帮助"
            @click="onRate('dislike')"
          >
            <DislikeOutlined />
          </span>
          <a-button
            size="small"
            type="primary"
            @click="$emit('restart')"
          >
            <template #icon>
              <RedoOutlined />
            </template>
            重新发起
          </a-button>
        </div>
      </template>
    </div>

    <!-- 改口径弹层：输入新口径；提交后会话侧标 revised，业务壳监听 confirmation-revised 触发重算 -->
    <a-modal
      v-model:open="reviseOpen"
      title="改口径重算"
      ok-text="提交新口径"
      cancel-text="取消"
      :confirm-loading="reviseSubmitting"
      :ok-button-props="{ disabled: !reviseNote.trim() }"
      @ok="submitRevise"
    >
      <div
        v-if="reviseTarget"
        class="revise-context"
      >
        <div class="revise-line">
          <span class="revise-label">疑点</span>
          <span>{{ reviseTarget.question }}</span>
        </div>
        <div class="revise-line">
          <span class="revise-label">原口径</span>
          <span>{{ reviseTarget.adopted }}</span>
        </div>
      </div>
      <a-textarea
        v-model:value="reviseNote"
        :rows="4"
        placeholder="请输入改按的口径（将作为重生成指导语注入，重算受影响产出）"
      />
    </a-modal>

    <!-- 点踩反馈收集弹层 -->
    <a-modal
      v-model:open="feedbackOpen"
      title="感谢反馈，请告诉我们哪里没帮助"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitFeedback"
    >
      <a-textarea
        v-model:value="feedbackText"
        :rows="4"
        placeholder="例如：生成的指标口径不对 / 缺少 XX 维度 / 速度太慢…"
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import {
  BulbOutlined, CheckCircleFilled, CheckSquareOutlined, ClockCircleOutlined, CloseCircleFilled,
  CopyOutlined, DislikeOutlined, ExclamationCircleFilled, LikeOutlined, LoadingOutlined, MinusOutlined,
  PauseCircleOutlined, PlayCircleOutlined, QuestionCircleFilled, RedoOutlined, RightOutlined,
  RobotOutlined, StopFilled, StopOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, reactive, ref, watch, type Component } from 'vue'

import {
  isTerminalStatus, parseChatOption, type AgentConfirmationT, type AgentEventX, type AgentPlanItemT
} from './types'
import { useAgentSession } from './useAgentSession'

import {
  sessionAnswer, sessionPause, sessionRate, sessionResolveConfirmation, sessionResume, sessionStop
} from '@/framework/apis/agent'
import AgentStages from '@/framework/components/common/agentStages/index.vue'
import type { AgentStageItem } from '@/framework/components/common/agentStages/types'
import AgentProcessTree from './AgentProcessTree.vue'
import { agentEventsToView } from './agentEventsToView'

interface Props {
  /** 会话标识（父组件 sessionStart 后传入；变化自动重置轮询） */
  sessionId: string | null
  title?: string
  /** 消息体渲染器注册表：事件 type→业务组件（props: event/payload）；不注册走通用摘要行 */
  renderers?: Record<string, Component>
  /** 统一过程树（缺省 false=沿用按轮分组渲染；开启后过程块由 AgentProcessTree 接管） */
  processTree?: boolean
}

const props = defineProps<Props>()

/** 终态重新发起（父组件重新 sessionStart 并换 sessionId）；终态到达（业务刷新草稿等）；
 *  待确认口径改口径（会话侧已标 revised，业务壳另行写回：如带新口径重生成受影响资产） */
const emit = defineEmits<{
  (e: 'restart'): void
  (e: 'finished', kind: 'finish' | 'error' | 'stopped'): void
  (e: 'confirmation-revised', item: AgentConfirmationT, note: string): void
}>()

const bodyRef = ref<HTMLDivElement | null>(null)
const { status, events } = useAgentSession(computed(() => props.sessionId))

const sessionStatus = computed(() => status.value?.status || 'RUNNING')
const isTerminal = computed(() => isTerminalStatus(sessionStatus.value))

/** 统一视图模型（仅在开启过程树时归约，避免默认路径多算） */
const processView = computed(() =>
  props.processTree ? agentEventsToView(events.value, status.value) : null
)

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

// ===== 阶段条（自主规划边执行边跳动） =====

const stageItems = computed<AgentStageItem[]>(() =>
  (status.value?.stages || []).map(s => ({ ...s }))
)

// ===== 计划待办清单（LLM 开局提交、随完成挑勾；终态 running 条目收口置位） =====

// 终态归一（兼容后端收口下沉前的旧快照）：running 条目按会话终态置位（FINISHED→done 补挑勾 / 其余→stopped），
// pending 保持原样；新会话后端落快照前已收口，此处归一仅兜底旧数据，清单不再永久转圈
const planItems = computed<AgentPlanItemT[]>(() => {
  const items = status.value?.plan || []
  if (!isTerminal.value) return items
  const toDone = sessionStatus.value === 'FINISHED'
  return items.map(i => i.status === 'running'
    ? { ...i, status: (toDone ? 'done' : 'stopped') as AgentPlanItemT['status'], note: i.note || (toDone ? '收口自动挑勾' : i.note) }
    : i)
})
const planDoneCount = computed(() => planItems.value.filter(i => i.status === 'done').length)

// ===== AI 决策问题卡片（ask_user 提问：waiting 条目可交互，作答后随轮询刷新隐去） =====

const waitingQuestion = computed(() =>
  (status.value?.questions || []).find(q => q.status === 'waiting') || null
)

// 候选项分层渲染视图（JSON 对象串解析 key/label/desc；选中/作答仍以 raw 为身份）
const questionOptionViews = computed(() => (waitingQuestion.value?.options || []).map(parseChatOption))

const answering = ref(false)
const selectedOption = ref('')
const customAnswer = ref('')

// 新问题到达时重置本地选择（轮询刷新后 waiting 条目切换）
watch(() => waitingQuestion.value?.id, () => {
  selectedOption.value = ''
  customAnswer.value = ''
})

const onAnswerQuestion = async () => {
  const q = waitingQuestion.value
  if (!props.sessionId || !q) return
  const answer = customAnswer.value.trim() || selectedOption.value
  if (!answer) return
  answering.value = true
  try {
    await sessionAnswer(props.sessionId, q.id, answer)
  } finally {
    answering.value = false
  }
}

const onSkipQuestion = async () => {
  const q = waitingQuestion.value
  if (!props.sessionId || !q) return
  answering.value = true
  try {
    await sessionAnswer(props.sessionId, q.id, undefined, true)
  } finally {
    answering.value = false
  }
}

// ===== 思考分组（round_start 开组；执行中最新组展开，结论出现全部折叠） =====

interface ThinkGroupView {
  id: number
  round: number | null
  events: AgentEventX[]
  endSeq: number
  nextSeq: number
}

const THINK_TYPES = new Set(['round_start', 'tool_call', 'tool_result', 'llm_output', 'log'])
const STATUS_TYPES = new Set(['paused', 'resumed', 'guidance', 'question', 'answered'])

const thinkGroups = computed<ThinkGroupView[]>(() => {
  const groups: ThinkGroupView[] = []
  let current: ThinkGroupView | null = null
  for (const ev of events.value) {
    if (!THINK_TYPES.has(ev.type)) continue
    if (ev.type === 'round_start' || current === null) {
      current = { id: ev.seq, round: typeof ev.payload === 'number' ? ev.payload : null, events: [], endSeq: ev.seq, nextSeq: Infinity }
      groups.push(current)
    }
    current.events.push(ev)
    current.endSeq = ev.seq
  }
  for (let i = 0; i < groups.length; i++) {
    groups[i].nextSeq = i + 1 < groups.length ? groups[i + 1].id : Infinity
  }
  return groups
})

// 折叠状态独立于轮询重算：用户点开/收起优先，默认规则——
// 执行中仅最新组展开（历史自动收起），结论出现全部折叠
const userCollapsed = reactive<Record<number, boolean>>({})

const isThinkCollapsed = (group: ThinkGroupView, index: number): boolean => {
  if (userCollapsed[group.id] !== undefined) {
    return userCollapsed[group.id]
  }
  return isTerminal.value || index < thinkGroups.value.length - 1
}

const toggleThink = (group: ThinkGroupView, index: number) => {
  userCollapsed[group.id] = !isThinkCollapsed(group, index)
}

const lastThinkEndSeq = computed(() =>
  thinkGroups.value.length > 0
    ? thinkGroups.value[thinkGroups.value.length - 1].endSeq
    : 0
)

// ===== LLM 流式实时内容（替换式：会话 status.live，每秒覆盖的最新一帧；终态后端清空自然隐藏） =====
const liveText = computed(() => status.value?.live || '')

// 流式行默认展开全文详情（内滚跟随），可收起仅留状态行（字数实时跳动）
const liveExpanded = ref(true)
// 详情元素定位：不用模板 ref——v-for（思考组循环）内的字符串 ref 行为不可靠（诊断日志实测读到
// 非 DOM 对象：scrollHeight 等全 undefined，贴底永久失效），改从滚动容器内直接查询，
// 任一时刻至多一个 .live-detail（组内与兜底两处 v-if 互斥），取最后一个防过渡期双存
const liveDetailEl = (): HTMLDivElement | null => {
  const els = bodyRef.value?.querySelectorAll('.live-detail')
  return els && els.length ? (els[els.length - 1] as HTMLDivElement) : null
}

/** 状态行（live 首行，如「思考中·已思 N 字」） */
const liveSummary = computed(() => {
  const t = liveText.value
  if (!t) return ''
  const i = t.indexOf('\n')
  return i < 0 ? t : t.slice(0, i)
})

/** 详情全文（状态行之后部分；无则不可展开） */
const liveDetail = computed(() => {
  const t = liveText.value
  const i = t.indexOf('\n')
  return i < 0 ? '' : t.slice(i + 1)
})

/** 展开/收起流式详情：展开即贴底（新内容通常已在尾部）；后续帧按位置自判跟随 */
const toggleLiveExpand = async () => {
  liveExpanded.value = !liveExpanded.value
  if (liveExpanded.value) {
    await nextTick()
    const d = liveDetailEl()
    if (d) d.scrollTop = d.scrollHeight
  }
}

// 会话切换：流式行重置为默认展开（新会话不复用旧会话的展开状态）
watch(() => props.sessionId, () => {
  liveExpanded.value = true
})

/** 组间平铺的状态条（seq 在 (fromSeq, toSeq] 区间的 paused/resumed/guidance） */
const statusEventsBetween = (fromSeq: number, toSeq: number): AgentEventX[] =>
  events.value.filter(ev =>
    STATUS_TYPES.has(ev.type) && ev.seq > fromSeq && ev.seq <= toSeq)

const statusText2 = (ev: AgentEventX): string => {
  const text = typeof ev.payload === 'string' ? ev.payload : JSON.stringify(ev.payload)
  if (ev.type === 'paused') return `⏸ 已暂停：${text}`
  if (ev.type === 'resumed') return `▶ ${text || '已恢复'}`
  if (ev.type === 'question') {
    const q = ev.payload as { question?: string } | null
    return `❓ AI 提问：${q && typeof ev.payload === 'object' ? (q.question || text) : text}`
  }
  if (ev.type === 'answered') return `🙋 用户作答：${text}`
  return `💬 用户补充：${text}`
}

// ===== 终态结论卡 =====

const conclusion = computed(() => {
  if (!isTerminal.value) return null
  if (sessionStatus.value === 'FINISHED') {
    return { kind: 'finish' as const, title: '任务完成', text: status.value?.summary || '' }
  }
  if (sessionStatus.value === 'FAILED') {
    return { kind: 'error' as const, title: '任务失败', text: status.value?.error || '' }
  }
  return { kind: 'stopped' as const, title: '已停止', text: status.value?.error || '已完成部分保留，可重新发起继续' }
})

// ===== 待确认口径清单（report_unconfirmed 登记；登记即可见，终态后逐条裁决：一键确认/改口径重算） =====

const confirmations = computed(() => status.value?.confirmations || [])
const confirmPendingCount = computed(() => confirmations.value.filter(c => c.status === 'pending').length)

// 一键确认（认可自决口径）：会话侧标 confirmed，状态随轮询刷新；重复收口幂等覆盖可反悔改判
const resolvingId = ref<number | null>(null)

const onConfirmConfirmation = async (c: AgentConfirmationT) => {
  if (!props.sessionId || resolvingId.value !== null) return
  resolvingId.value = c.id
  try {
    await sessionResolveConfirmation(props.sessionId, c.id)
    message.success(`待确认口径 #${c.id} 已确认`)
  } finally {
    resolvingId.value = null
  }
}

// 改口径：弹层输入新口径；提交后会话侧标 revised，另 emit 交业务壳触发重算（业务写回非面板职责）
const reviseOpen = ref(false)
const reviseTarget = ref<AgentConfirmationT | null>(null)
const reviseNote = ref('')
const reviseSubmitting = ref(false)

const openRevise = (c: AgentConfirmationT) => {
  reviseTarget.value = c
  reviseNote.value = ''
  reviseOpen.value = true
}

const submitRevise = async () => {
  const c = reviseTarget.value
  const note = reviseNote.value.trim()
  if (!props.sessionId || !c || !note) return
  reviseSubmitting.value = true
  try {
    await sessionResolveConfirmation(props.sessionId, c.id, true, note)
    reviseOpen.value = false
    message.success('改口径已记录，正在触发受影响产出重算')
    emit('confirmation-revised', c, note)
  } finally {
    reviseSubmitting.value = false
  }
}

// ===== 通用摘要行（未注册渲染器的事件兜底渲染） =====
// 长行（如思考归档全文）默认预览 300 字，点展开看全文（独立于轮询重算）
const expandedSeqs = reactive(new Set<number>())

const toggleExpand = (seq: number) => {
  if (expandedSeqs.has(seq)) expandedSeqs.delete(seq)
  else expandedSeqs.add(seq)
}

const lineTag = (type: string): string => {
  switch (type) {
    case 'round_start': return '轮次'
    case 'tool_call': return '调用'
    case 'tool_result': return '返回'
    case 'llm_output': return '输出'
    default: return '日志'
  }
}

const lineText = (ev: AgentEventX): string => {
  const full = fullText(ev)
  if (!full) return ''
  if (expandedSeqs.has(ev.seq) || full.length <= 300) return full
  return full.slice(0, 300) + '…'
}

// ===== 控制动作 =====

const pausing = ref(false)
const resuming = ref(false)
const stopping = ref(false)
const guidanceInput = ref('')

const onPause = async () => {
  if (!props.sessionId) return
  pausing.value = true
  try {
    await sessionPause(props.sessionId, '用户暂停（可补充指导后继续）')
  } finally {
    pausing.value = false
  }
}

const onResume = async () => {
  if (!props.sessionId) return
  resuming.value = true
  try {
    const guidance = guidanceInput.value.trim()
    await sessionResume(props.sessionId, guidance || undefined)
    guidanceInput.value = ''
  } finally {
    resuming.value = false
  }
}

const onEnterResume = (e: KeyboardEvent) => {
  if (e.shiftKey) return
  e.preventDefault()
  onResume()
}

const onStop = async () => {
  if (!props.sessionId || stopping.value) return
  stopping.value = true
  try {
    await sessionStop(props.sessionId)
    message.info('停止请求已发出，等待任务收口…')
  } finally {
    stopping.value = false
  }
}

// ===== 会话评价（终态显示；dislike 收集反馈） =====

const rating = ref<string | null>(null)
const feedbackOpen = ref(false)
const feedbackText = ref('')

const onRate = async (value: 'like' | 'dislike') => {
  if (!props.sessionId) return
  if (value === 'dislike' && rating.value !== 'dislike') {
    // 首次点踩先收集反馈再提交
    feedbackOpen.value = true
    return
  }
  const next = rating.value === value ? '' : value
  await sessionRate(props.sessionId, next)
  rating.value = next || null
}

const submitFeedback = async () => {
  if (!props.sessionId) return
  await sessionRate(props.sessionId, 'dislike', feedbackText.value.trim() || undefined)
  rating.value = 'dislike'
  feedbackOpen.value = false
  feedbackText.value = ''
}

// ===== 复制全体对话文字（debug：全文不截断，含阶段/计划/思考/状态条/结论） =====

const fullText = (ev: AgentEventX): string => {
  const p = ev.payload
  if (p == null) return ''
  if (typeof p === 'string') return p
  if (typeof p === 'object') return JSON.stringify(p, null, 2)
  return String(p)
}

const onCopyAll = () => {
  const lines: string[] = []
  lines.push(`【会话】${props.title || status.value?.displayName || '智能代理'} | sessionId=${props.sessionId || ''} | 状态=${sessionStatus.value} | ${status.value?.operator || ''} ${formatTime(status.value?.startedAt)}`)
  for (const s of stageItems.value) {
    lines.push(`【阶段】${s.title}（${s.status || 'pending'}）${s.detail ? ' ' + s.detail : ''}`)
  }
  for (const item of planItems.value) {
    lines.push(`【待办】${item.status === 'done' ? '[x]' : item.status === 'running' ? '[>]' : '[ ]'} ${item.text}${item.note ? '（' + item.note + '）' : ''}`)
  }
  for (const c of confirmations.value) {
    lines.push(`【待确认口径】#${c.id}（${c.status}）${c.question} → 采纳：${c.adopted}${c.evidence ? ' | 证据：' + c.evidence : ''}${c.resolveNote ? ' | 收口：' + c.resolveNote : ''}`)
  }
  for (const ev of events.value) {
    if (THINK_TYPES.has(ev.type)) lines.push(`【${lineTag(ev.type)}】${fullText(ev)}`)
    else if (STATUS_TYPES.has(ev.type)) lines.push(statusText2(ev))
  }
  // 流式实时帧在替换式通道（不进事件流防膨胀），须单独带走——否则执行中点复制会丢失屏幕上可见的思考全文；
  // 终态后端清空后此处自然为空，历史留痕以事件流中的轮末归档行为准
  if (liveText.value) lines.push(`【流式】${liveText.value}`)
  if (conclusion.value) lines.push(`【结论】${conclusion.value.title}${conclusion.value.text ? '：' + conclusion.value.text : ''}`)
  navigator.clipboard.writeText(lines.join('\n')).then(
    () => message.success('全体对话文字已复制'),
    () => message.error('复制失败，请手动选择复制')
  )
}

// ===== 滚动跟随 =====

const formatTime = (t?: number) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 滚动诊断日志（排查内滚贴底失效临时开关）：控制台执行 __AGENT_CHAT_SCROLL_DEBUG__ = false 可关；
// 只记异常/关键决策点，正常跟随帧不打扰（每秒一帧，全量打会刷屏）
const scrollDebug = () => (window as any).__AGENT_CHAT_SCROLL_DEBUG__ !== false
const geom = (el: HTMLElement | null) => el
  ? { st: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight }
  : null

const scrollBottom = async (force = false) => {
  await nextTick()
  const el = bodyRef.value
  if (!el) return
  const before = geom(el)
  if (force || nearBottom.value) {
    el.scrollTop = el.scrollHeight
    if (scrollDebug() && !nearBottom.value) {
      console.warn('[AgentChat scroll] 外层强制滚底（终态/结论）', { before, after: geom(el) })
    }
  } else if (scrollDebug() && el.scrollHeight > el.clientHeight) {
    // 关键异常候选：有滚动条但 nearBottom=false 导致外层不跟随——打出几何供定位阈值/回写问题
    console.warn('[AgentChat scroll] 外层未滚底：nearBottom=false', before)
  }
}

// 滚动跟随：新事件到达仅当用户贴近底部时才自动滚底；
// 用户手动上滚阅读历史不打断（滚回底部附近恢复跟随）
const nearBottom = ref(true)

const onBodyScroll = () => {
  const el = bodyRef.value
  if (!el) return
  const v = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  if (v !== nearBottom.value && scrollDebug()) {
    console.warn(`[AgentChat scroll] 外层 nearBottom → ${v}`, geom(el))
  }
  nearBottom.value = v
}

watch(() => events.value.length, () => scrollBottom(false))
// 流式更新跟随逻辑已改为写前位置自判（见 watch(liveText)），内层无需 scroll 监听
// 流式 live 替换更新时跟随滚底（单一滚动容器：贴近底部才跟随，用户上滚阅读不打断）；
// 展开详情时详情区内滚贴底——跟随判定每帧用「写入前」的实时位置自判（用户上滚即停、滚回底部即恢复），
// 不依赖独立状态位：旧方案靠 scroll 事件回写 liveFollow，外层同步滚底/元素重建/亚像素距离等场景
// 回写时序错乱会把标志误置为 false，内滚随之永久停摆（用户实测：外层有滚动条时内滚失控）
watch(liveText, async () => {
  if (!liveText.value) return
  const prev = liveDetailEl()
  // 写前位置自判：内层当前贴底即跟随（用户上滚阅读即停，滚回底部附近自动恢复）
  const prevDist = prev ? prev.scrollHeight - prev.scrollTop - prev.clientHeight : -1
  const prevFollowing = !prev || prevDist < 48
  await nextTick()
  const d = liveDetailEl()
  if (liveExpanded.value && d) {
    // 元素重建（新轮次/搬组）时旧位置无意义，新内容直接贴底
    const rebuilt = d !== prev
    if (rebuilt || prevFollowing) {
      d.scrollTop = d.scrollHeight
      // 诊断：写后验证——若贴底后仍离底（亚像素/布局未定/元素异常）则暴露几何现场；
      // 若判定跟随却因条件未进入贴底分支，同样打出（正常帧不记）
      const after = d.scrollHeight - d.scrollTop - d.clientHeight
      if (scrollDebug() && (after > 2 || rebuilt)) {
        console.warn('[AgentChat scroll] 内层贴底', {
          rebuilt, prevFollowing, prevDist, before: geom(prev), after: geom(d), liveLen: liveText.value.length,
        })
      }
    } else if (scrollDebug()) {
      // 内滚停摆候选：展开中但判停（用户在读历史则正常；若用户没滚却出现即为病灶）
      console.warn('[AgentChat scroll] 内层未贴底：写前离底', { prevDist, before: geom(prev), liveLen: liveText.value.length })
    }
  }
  // 外层独立按 nearBottom 门槛跟随（与内层位置无关）
  await scrollBottom(false)
})
watch(conclusion, v => {
  if (v) {
    scrollBottom(true)
    emit('finished', v.kind)
  }
})
</script>

<style scoped lang="less">
.agent-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

// ===== 头部 =====

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;

    .title-icon {
      color: var(--accent);
      font-size: 18px;
    }

    .header-status {
      font-weight: 400;

      &.st-running { color: var(--accent); }
      &.st-waiting { color: var(--warning, #faad14); }
      &.st-paused { color: var(--warning, #faad14); }
      &.st-finished { color: var(--success, #52c41a); }
      &.st-failed { color: var(--error, #ff4d4f); }
      &.st-stopped { color: var(--text-secondary); }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-copy {
    color: var(--text-secondary);
  }

  .header-meta {
    color: var(--text-secondary);
    font-size: 12px;
  }
}

// ===== 阶段条 =====

.chat-stages {
  flex-shrink: 0;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}

// ===== 计划待办清单 =====

.chat-plan {
  flex-shrink: 0;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);

  .plan-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-secondary);

    .plan-icon { color: var(--accent-mid); }
    .plan-title { color: var(--text-primary); font-weight: 600; }
    .plan-count { margin-left: auto; }
  }

  .plan-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
    line-height: 20px;

    .plan-check { color: var(--text-secondary); }
    .plan-text { color: var(--text-primary); }
    .plan-note { color: var(--text-secondary); }

    &.is-done {
      .plan-check { color: var(--success, #52c41a); }
      .plan-text { color: var(--text-secondary); text-decoration: line-through; }
    }

    &.is-running {
      .plan-check { color: var(--accent); }
      .plan-text { color: var(--accent); }
    }

    &.is-stopped {
      opacity: 0.55;

      .plan-check { color: var(--text-secondary); }
      .plan-text { color: var(--text-secondary); }
    }
  }
}

// ===== AI 决策问题卡片 =====

.chat-question {
  flex-shrink: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);

  .question-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 12px;

    .question-icon { color: var(--warning, #faad14); }
    .question-title { color: var(--text-primary); font-weight: 600; }
    .question-id { color: var(--text-secondary); }
  }

  .question-text {
    margin-bottom: 8px;
    color: var(--text-primary);
    font-size: 13px;
    line-height: 20px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .question-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }

  .question-option {
    padding: 6px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 18px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;

    &:hover { border-color: var(--accent-mid); }

    &.is-selected {
      border-color: var(--accent);
      background: var(--bg-base);
      color: var(--accent);
    }

    .question-option-main {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .question-option-key {
      flex-shrink: 0;
      padding: 0 5px;
      border: 1px solid currentColor;
      border-radius: 4px;
      font-size: 11px;
      line-height: 16px;
    }

    .question-option-label { word-break: break-all; }

    .question-option-desc {
      margin-top: 2px;
      font-size: 11px;
      line-height: 16px;
      color: var(--text-secondary);
    }
  }

  .question-input {
    margin-bottom: 8px;
  }

  .question-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// ===== 事件流 =====

.chat-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  // 子块保持自然高度：flex 子项默认 shrink=1，内容超高时会被压缩适配容器导致不溢出、
  // 滚动条消失（思考组被自身 overflow:hidden 静默裁掉后半内容）；禁止收缩后溢出交本容器滚动
  > * {
    flex-shrink: 0;
  }
}

.empty-hint {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);

  .empty-icon {
    font-size: 42px;
    color: var(--accent-mid);
  }
}

// 思考组
.think-group {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-elevated);
  overflow: hidden;

  .think-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
    color: var(--text-secondary);
    font-size: 12px;

    .think-arrow {
      font-size: 10px;
      transition: transform 0.2s;

      &.is-open { transform: rotate(90deg); }
    }

    .think-icon { color: var(--accent-mid); }
    .think-title { color: var(--text-primary); }
    .think-count { margin-left: auto; }
  }

  // 无内层滚动（单一滚动容器：外层 chat-body 统一跟随，避免双滚动容器互相截断显示不全）
  .think-body {
    border-top: 1px dashed var(--border-subtle);
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.think-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  line-height: 20px;
  word-break: break-all;

  .line-tag {
    flex-shrink: 0;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 11px;
  }

  .line-text {
    color: var(--text-secondary);
    white-space: pre-wrap;
  }

  .line-expand {
    flex-shrink: 0;
    color: var(--accent);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }

  &.ev-llm_output .line-text {
    color: var(--text-primary);
  }

  // 流式实时行（替换式 live 作为思考组末行）：主题色标识区分于留痕事件
  &.ev-live {
    .line-tag {
      color: var(--accent);
      border-color: var(--accent-mid);
    }

    .live-summary { color: var(--accent); }
  }
}

// 流式详情（展开可见）：字体浅色+背景稍灰+内滚，不顶外层滚动条
.live-detail {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-tertiary, #8c8c8c);
  font-size: 12px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 260px;
  overflow-y: auto;
}

// 状态条
.status-strip {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px dashed var(--border-subtle);

  &.strip-paused { color: var(--warning, #faad14); }
  &.strip-guidance { color: var(--accent); }
}

// LLM 流式实时内容兜底块（尚无思考组时）：默认折叠仅状态行，展开详情同 .live-detail
.chat-live {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}

// 终态结论卡
.conclusion {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);

  .conclusion-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .conclusion-text {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 20px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &.is-finish .conclusion-title { color: var(--success, #52c41a); }
  &.is-error .conclusion-title { color: var(--error, #ff4d4f); }
  &.is-stopped .conclusion-title { color: var(--text-secondary); }
}

// 待确认口径清单（结论卡后：LLM 自决口径登记，用户逐条裁决）
.confirmations {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(250, 173, 20, 0.5);
  background: var(--bg-elevated);

  .confirmations-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;

    .confirmations-icon { color: var(--warning, #faad14); }
    .confirmations-title { color: var(--text-primary); }
    .confirmations-count { margin-left: auto; color: var(--text-secondary); font-size: 12px; font-weight: 400; }
  }

  .confirmation-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 6px;

    &.is-pending { border-color: rgba(250, 173, 20, 0.4); }
    &.is-confirmed, &.is-revised { opacity: 0.82; }

    .confirmation-top {
      display: flex;
      align-items: baseline;
      gap: 6px;

      .confirmation-id {
        flex-shrink: 0;
        color: var(--text-secondary);
        font-size: 12px;
      }

      .confirmation-question {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
        line-height: 20px;
        word-break: break-all;
      }

      .confirmation-tag {
        flex-shrink: 0;
        margin-left: auto;
      }
    }

    .confirmation-row {
      display: flex;
      gap: 6px;
      font-size: 12px;
      line-height: 20px;

      .confirmation-label {
        flex-shrink: 0;
        color: var(--text-secondary);
      }

      .confirmation-value {
        color: var(--text-primary);
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .confirmation-note {
      font-size: 12px;
      line-height: 20px;
      color: var(--accent);
      word-break: break-all;
    }

    .confirmation-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .confirmation-pending-hint {
      color: var(--text-secondary);
      font-size: 12px;
    }
  }
}

// 改口径弹层上下文（疑点/原口径对照）
.revise-context {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 12px;
  line-height: 20px;

  .revise-label {
    margin-right: 6px;
    color: var(--text-secondary);
  }
}

// ===== 底部状态机 =====

.chat-footer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-elevated);

  .footer-input {
    flex: 1;
  }
}

.footer-rate {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;

  .rate-label {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .rate-btn {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 16px;

    &.is-active { color: var(--accent); }
    &.dislike.is-active { color: var(--error, #ff4d4f); }
  }

  :deep(.ant-btn) {
    margin-left: auto;
  }
}
</style>
