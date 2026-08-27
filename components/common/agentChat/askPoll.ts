/**
 * 维护问数「提交+轮询」客户端（SSE 替代主通道，自 smartQueryAsk/useAskPoll.ts 迁入）
 *
 * SSE 易被中间层（反代/杀软/浏览器插件）缓冲掐断，前端收不到 step 只能长转圈；
 * 改为 /ask/submit 即刻返回票据 + /ask/poll 每 2s 增量拉取过程步骤（同资产生成
 * progress / AgentChat 会话轮询模式，本环境验证送达可靠）。step 内容与 SSE 版
 * 一致（阶段进度 + 工具循环过程日志，即 LLM 思考过程），实时上屏不傻等。
 * 客户页与测试页共用本客户端，应答渲染口径经 applyAskPayload 收敛。
 */
import type { ChatClarifyQuestion, ChatPlanItem } from './types'

import { maintainAskAnswer, maintainAskCancel, maintainAskPoll, maintainAskSubmit } from '@/framework/apis/smartAgent'


/** 歧义确认待答问题（类型契约上提 types.ts，保留旧名别名兼容存量调用方） */
export type AskClarifyQuestion = ChatClarifyQuestion

/** 计划待办条目（类型契约上提 types.ts，保留旧名别名兼容存量调用方） */
export type AskPlanItem = ChatPlanItem

export interface AskPollReq {
  agentCode: string
  question: string
  chartMode?: string
}

/** 轮询终态元信息（历史对话定位标识，内置评价经通用 rate 端点使用） */
export interface AskPollMeta {
  conversationId?: string
  messageId?: string
}

export interface AskPollHandlers {
  /** 过程步骤：阶段进度 / 工具循环过程日志（逐条实时上屏，用户不傻等） */
  onStep?: (step: string) => void
  /** LLM 流式应答 live 进度（替换式展示，如「LLM 流式应答中·已收 N 字」） */
  onLive?: (text: string) => void
  /** 歧义确认待答问题：渲染选项卡交互，resolve 作答文本（空串=交由 AI 决定）；
   *  未提供处理器时自动答空（防编排死等） */
  onQuestion?: (q: AskClarifyQuestion) => Promise<string>
  /** 计划待办清单（全量快照，随完成挑勾；未提交不下发） */
  onPlan?: (plan: AskPlanItem[]) => void
  /** done 终态：与同步版同构的应答 JSON（已解析）；meta 携历史对话定位标识 */
  onDone?: (payload: Record<string, any>, meta: AskPollMeta) => void
  /** error 终态 / 提交失败 / 轮询失败；meta 携历史对话定位标识（可能为空） */
  onError?: (text: string, meta: AskPollMeta) => void
}

/** 轮询间隔（ms）：与 AgentChat 会话事件 / flow trace 同口径 */
const POLL_INTERVAL = 2000

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => {
    clearTimeout(timer)
    reject(new DOMException('Aborted', 'AbortError'))
  }, { once: true })
})

/**
 * 发起一次维护问数：提交票据 → 每 2s 增量轮询过程步骤 → done/error 终态收口。
 * signal abort 时通知后端停止（取消标记，下个进度点抛出），并抛 AbortError 由调用方忽略。
 * onDone / onError 必触发其一（除非 abort 抛出）。
 */
export async function runAskPoll(
  req: AskPollReq,
  handlers: AskPollHandlers,
  signal?: AbortSignal
): Promise<void> {
  let ticketId: string | undefined
  const meta: AskPollMeta = {}
  try {
    const sub: any = await maintainAskSubmit(req)
    ticketId = sub?.payload?.ticketId
    if (!ticketId) {
      handlers.onError?.(sub?.errMsg || '问数提交失败：未返回票据', meta)
      return
    }
    let offset = 0
    // 已作答问题 id 集：轮询重发同一 question 时不重复弹卡（作答唤醒后端有延迟）
    const answeredQuestionIds = new Set<string>()
    for (;;) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const res: any = await maintainAskPoll({ ticketId, offset })
      const p = res?.payload || {}
      const steps: string[] = p.steps || []
      steps.forEach((s) => handlers.onStep?.(s))
      if (typeof p.live === 'string' && p.live) handlers.onLive?.(p.live)
      if (Array.isArray(p.plan) && p.plan.length) handlers.onPlan?.(p.plan as AskPlanItem[])
      offset = typeof p.nextOffset === 'number' ? p.nextOffset : offset + steps.length
      // 历史对话定位标识随轮询回填（终态消息点赞/点踩经通用 rate 端点定位）
      if (p.conversationId) meta.conversationId = p.conversationId
      if (p.messageId) meta.messageId = p.messageId
      // 歧义确认：后端编排阻塞等待作答，拿到未答问题先交互再继续轮询；
      // 无处理器时自动答空（交由 AI 决定）防编排死等；作答失败同样答空兜底不阻塞
      if (p.question?.id && !answeredQuestionIds.has(p.question.id)) {
        answeredQuestionIds.add(p.question.id)
        let answer = ''
        if (handlers.onQuestion) {
          try {
            answer = await handlers.onQuestion(p.question as AskClarifyQuestion)
          } catch {
            answer = ''
          }
        }
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        await maintainAskAnswer({ ticketId, answer }).catch(() => {})
        continue
      }
      if (p.status === 'done') {
        handlers.onDone?.(p.result || {}, meta)
        return
      }
      if (p.status === 'error') {
        handlers.onError?.(p.errorMessage || '维护问数失败', meta)
        return
      }
      await sleep(POLL_INTERVAL, signal)
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      if (ticketId) maintainAskCancel({ ticketId }).catch(() => {})
      throw e
    }
    handlers.onError?.(e?.message || e?.errMsg || '维护问数请求失败', meta)
  }
}

// ===== 应答渲染口径（done result 与同步版 maintainAsk 的 res.payload 同构） =====

/** 应答展示态：客户页 / 测试页消息气泡共用字段（applyAskPayload 填充） */
export interface AskOutcome {
  status: 'ok' | 'invalid' | 'error'
  errorText?: string
  errors?: any[]
  warnings?: any[]
  sql?: string
  params?: any[]
  notes?: string[]
  semanticQueryText?: string
  usedProposals?: boolean
  proposedCount?: number
  batchNo?: string
  askColumns?: any[]
  askRows?: any[]
  statistics?: any[]
  rawPayload?: Record<string, any>
}

/** 同步版/轮询版应答 payload → 展示态（校验失败收口 invalid，运行期错误收口 error） */
export function applyAskPayload(outcome: AskOutcome, p: Record<string, any>): void {
  outcome.rawPayload = p
  outcome.sql = p.sql
  outcome.params = p.params || []
  outcome.notes = p.notes || []
  outcome.warnings = p.warnings || []
  if (p.semanticQuery) {
    try {
      outcome.semanticQueryText = JSON.stringify(JSON.parse(p.semanticQuery), null, 2)
    } catch {
      outcome.semanticQueryText = p.semanticQuery
    }
  }
  if (!p.valid) {
    outcome.status = 'invalid'
    outcome.errors = p.errors || []
    outcome.errorText = p.errorMessage || undefined
    return
  }
  outcome.status = 'ok'
  outcome.usedProposals = p.usedProposals
  outcome.proposedCount = p.proposedCount
  outcome.batchNo = p.batchNo
  outcome.statistics = p.statistics || []
  outcome.askColumns = (p.columns || []).map((c: any) => ({
    title: c.display || c.alias,
    dataIndex: c.alias
  }))
  outcome.askRows = (p.rows || []).map((r: any, i: number) => ({ ...r, __rowKey: i }))
  if (p.errorMessage) {
    outcome.errorText = p.errorMessage
    outcome.status = 'error'
  }
}
