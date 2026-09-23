/**
 * agent 会话类型（后端 com.bidr.llm.agent.session 对应结构）
 */
import type { AssistantView } from './processTree'

/** 会话过程事件（seq 会话内单调递增，增量轮询依据） */
export interface AgentEventX {
  seq: number
  type: string
  payload: any
  time: number
}

/** 事件类型常量（与后端 AgentEvent 一致） */
export const AgentEventType = {
  RUN_START: 'run_start',
  ROUND_START: 'round_start',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  LLM_OUTPUT: 'llm_output',
  LOG: 'log',
  STAGE: 'stage',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  GUIDANCE: 'guidance',
  QUESTION: 'question',
  ANSWERED: 'answered',
  CONFIRMATION: 'confirmation',
  FINISH: 'finish',
  ERROR: 'error',
  STOPPED: 'stopped'
} as const

/** 思考类事件（折叠进「思考过程」组） */
export const THINK_EVENT_TYPES = new Set<string>([
  AgentEventType.ROUND_START,
  AgentEventType.TOOL_CALL,
  AgentEventType.TOOL_RESULT,
  AgentEventType.LLM_OUTPUT,
  AgentEventType.LOG
])

/** 阶段事件（阶段条消费，不进消息流） */
export const STAGE_EVENT_TYPES = new Set<string>([AgentEventType.STAGE])

/** 会话状态（后端 AgentSessionState） */
export interface AgentSessionStateT {
  sessionId: string
  agentKey: string
  skillCode?: string
  displayName?: string
  operator?: string
  status: 'RUNNING' | 'PAUSED' | 'FINISHED' | 'FAILED' | 'STOPPED'
  startedAt: number
  endedAt?: number | null
  heartbeat: number
  summary?: string | null
  error?: string | null
  traceId?: string | null
  /** LLM 流式实时内容（替换式：思考/应答状态行+累积全文，与问数链 live 同口径；终态清空） */
  live?: string | null
  stages?: AgentStageT[]
  plan?: AgentPlanItemT[]
  /** 用户决策问题清单（ask_user 提问；waiting 条目渲染可交互卡片） */
  questions?: AgentQuestionT[]
  /** 待确认口径清单（report_unconfirmed 登记；终态确认页逐条裁决：一键确认/改口径重算） */
  confirmations?: AgentConfirmationT[]
}

/** 执行阶段（后端 AgentStage） */
export interface AgentStageT {
  key: string
  title: string
  status: 'pending' | 'running' | 'ok' | 'error' | 'skipped' | 'stopped'
  startedAt?: number | null
  endedAt?: number | null
  detail?: string | null
  estimatedSecs?: number | null
}

/** 计划待办条目（后端 AgentPlanItem：LLM 开局 submit_plan 提交、start_plan_item 标记执行中、done_plan_item 挑勾；
 *  会话终态时 running 由后端收口置位：FINISHED→done 补挑勾 / 其余→stopped） */
export interface AgentPlanItemT {
  id: number
  text: string
  status: 'pending' | 'running' | 'done' | 'stopped'
  note?: string | null
}

/** 用户决策问题条目（后端 AgentQuestion：LLM 经 ask_user 提问、用户选择/输入/跳过作答） */
export interface AgentQuestionT {
  id: number
  question: string
  options?: string[] | null
  status: 'waiting' | 'answered' | 'skipped' | 'expired'
  answer?: string | null
  askedAt: number
  answeredAt?: number | null
}

/** 待确认口径条目（后端 AgentConfirmation：ask_user 超时/跳过后 LLM 自决的口径，finish 前逐条登记，
 *  会话终态后由用户在确认页裁决——确认（认可自决口径）或改口径（新口径说明交由业务重算） */
export interface AgentConfirmationT {
  id: number
  /** 疑点描述 */
  question: string
  /** LLM 采纳的口径（自决结论） */
  adopted: string
  /** 证据链（采样数据/工具返回等依据） */
  evidence?: string | null
  /** 影响的产出（资产项名，多个逗号分隔） */
  impact?: string | null
  status: 'pending' | 'confirmed' | 'revised'
  reportedAt: number
  resolvedAt?: number | null
  /** 收口说明（改口径时为用户输入的新口径） */
  resolveNote?: string | null
}

export const isTerminalStatus = (status?: string | null) =>
  status === 'FINISHED' || status === 'FAILED' || status === 'STOPPED'

// ==================== 通用聊天契约（AgentChatPanel 消费，自 smartQueryAsk 上提） ====================

/** 聊天消息基类：AgentChatPanel 透明穿透，业务壳自由扩展字段（引擎产物/过程态） */
export interface ChatMsgBase {
  id: string | number
  role: 'user' | 'assistant'
  time: number
  /** 状态：loading=进行中；终态由业务壳自定义（done/error/stopped/ok/invalid…），
   *  面板仅区分 loading 与非 loading（非 loading 即终态，展示折叠回看与评价） */
  status: string
  /** 历史对话定位（实时消息由轮询回填，历史恢复自带；齐备时内置评价可用） */
  conversationId?: string
  messageId?: string
  /** 消息内嵌评价（like/dislike，历史恢复携带） */
  rating?: string
  /** 过程树（结构化视图 AssistantView；设置后面板用它渲染执行过程，内置 steps/liveText 过程块不再触发；
   *  不设置则行为与旧版完全一致——向后兼容的增量约定字段） */
  process?: AssistantView
}

/** 计划待办条目（问数票据链 / 自主会话 plan 同构：submit_plan 提交、start_plan_item 执行中、done_plan_item 挑勾；stopped=终态收口打断） */
export interface ChatPlanItem {
  id: number | string
  text: string
  status: 'pending' | 'running' | 'done' | 'stopped'
  note?: string
}

/** 歧义确认待答问题（后端 askUser 阻塞提问，作答后编排继续；空串=交由 AI 决定） */
export interface ChatClarifyQuestion {
  id: string
  question: string
  options: string[]
}

/** 歧义确认「交由 AI 决定」哨兵（历史恢复重放时区分空作答与未作答） */
export const CLARIFY_ANSWER_SKIPPED = '（交由 AI 决定）'

/** 候选项展示视图：选项可能是纯文本，或 LLM 序列化的 JSON 对象串（{"key","label","desc"}），统一解析分层渲染 */
export interface ChatOptionView {
  /** 选项编号（A/B 等，可空） */
  key: string
  /** 主文本（label；缺失回落 desc/原文） */
  label: string
  /** 补充说明（次行小字，可空） */
  desc: string
  /** 原始文本（选中与作答提交的身份，保证回传 LLM 无损） */
  raw: string
}

/** 候选项解析：JSON 对象串取 key/label/desc 分层渲染；纯文本或解析失败回落原文直排 */
export const parseChatOption = (opt: string): ChatOptionView => {
  const raw = opt || ''
  const t = raw.trim()
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t)
      if (o && typeof o === 'object') {
        const key = typeof o.key === 'string' ? o.key.trim() : ''
        const label = typeof o.label === 'string' ? o.label.trim() : ''
        const desc = typeof o.desc === 'string' ? o.desc.trim() : ''
        if (label || desc) {
          return { key, label: label || desc, desc: label ? desc : '', raw }
        }
      }
    } catch {
      // 非合法 JSON，回落原文
    }
  }
  return { key: '', label: raw, desc: '', raw }
}

/** 思考过程步骤（工具循环过程日志 / 阶段进度，实时上屏） */
export interface ChatStep {
  text: string
  time: number
}
