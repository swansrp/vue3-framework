/**
 * agent 会话类型（后端 com.bidr.llm.agent.session 对应结构）
 *
 * 🔴 P1 数据层统一（2026-11-19）：会话域类型正源已迁至 components/common/agent
 * （引擎模块 types.ts），本文件只保留旧符号名 re-export 兼容＋AgentChatPanel
 * 通用聊天契约（AgentEventType/ChatMsgBase 等本域件）。
 * 引用方向恒为 agentChat → common/agent（反向禁止）。
 */
import type { AssistantView } from './processTree'

// ==================== 会话域类型（正源：../agent/types，旧名转发） ====================

/** 会话过程事件（seq 会话内单调递增，增量轮询依据；字段与引擎 AgentEventFrame 全同） */
export type { AgentEventFrame as AgentEventX } from '../agent/types'

/** 会话状态（后端 AgentSessionState；正源 AgentSessionSnapshot——旧 StateT 独有字段
 *  operator/skillCode/heartbeat/traceId 与 stages/plan/confirmations 已补齐为可选） */
export type { AgentSessionSnapshot as AgentSessionStateT } from '../agent/types'

/** 执行阶段（后端 AgentStage） */
export type { AgentStageT } from '../agent/types'

/** 计划待办条目（后端 AgentPlanItem：submit_plan 提交、start_plan_item 执行中、done_plan_item 挑勾；
 *  会话终态时 running 由后端收口置位：FINISHED→done 补挑勾 / 其余→stopped） */
export type { AgentPlanItemT } from '../agent/types'

/** 用户决策问题条目（后端 AgentQuestion；askedAt 归一为可选口径——引擎正源定义） */
export type { AgentQuestionT } from '../agent/types'

/** 待确认口径条目（后端 AgentConfirmation：ask_user 超时/跳过后 LLM 自决的口径，finish 前逐条登记，
 *  会话终态后由用户在确认页裁决——确认（认可自决口径）或改口径（新口径说明交由业务重算）） */
export type { AgentConfirmationT } from '../agent/types'

/** 终态判定（FINISHED/FAILED/STOPPED 三态不再轮询；引擎正源实现） */
export { isTerminalStatus } from '../agent/types'

/** 候选项展示视图（引擎正源定义）：选项可能是纯文本，或 LLM 序列化的 JSON 对象串（{"key","label","desc"}） */
export type { ChatOptionView } from '../agent/types'

/** 候选项解析（引擎正源实现）：JSON 对象串取 key/label/desc 分层渲染；纯文本或解析失败回落原文直排 */
export { parseChatOption } from '../agent/types'

// ==================== 本域件（AgentChatPanel 消费，正源留此） ====================

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

/** 思考过程步骤（工具循环过程日志 / 阶段进度，实时上屏） */
export interface ChatStep {
  text: string
  time: number
}
