/**
 * agent 过程事件 → 过程流视图（平铺步骤行/思考归档/整轮耗时端点）的归约正源
 *
 * 与 agentEventsToView（→ AssistantView，供 AgentProcessTree 渲染）平级的第二条归约路：
 * 本文件产出"平铺步骤流"形态（log 行弱化不占编号、等待轮询折叠成一行、轮末思考归档单列），
 * 由 AgentProcessFlow／AgentProcessArchives 渲染。归约只认 core/llm 会话协议（AgentEventX），
 * 不依赖任何业务表/业务工具——业务工具的人话名与摘要经 labels/summarize 注入。
 */
import { isNoiseLogLine, isThinkArchiveLine } from './processLines'
import type { AgentEventX } from './types'

/** 过程步骤行（log 行 isLog=true，不占 ord 编号） */
export interface ProcessStep {
  tool: string
  /** 工具步序号（从 1 递增）；log 行恒 0 */
  ord: number
  running: boolean
  /** 发起（tool_call）／首条 log 的毫秒时刻；耗时由渲染层按 (t1 ?? now) - t0 现算 */
  t0: number | null
  /** 最新回包时刻；执行中＝null */
  t1: number | null
  /** 被折叠进本行的轮询次数（等待类工具同族连续轮询并成一行） */
  polls: number
  /** 折叠判据签名（等待类＝入参串，log 行＝行文本） */
  sig?: string
  summary: string
  detail: string
  isLog?: boolean
}

/** 归约产物 */
export interface ProcessFlow {
  steps: ProcessStep[]
  /** 轮末思考归档行（【LLM 思考归档】log 事件，词汇判据＝processLines 单源） */
  archives: string[]
  /** 整轮耗时端点：[首事件时刻, 末事件时刻]；末端 null＝执行中（渲染层用当下时刻） */
  span: [number, number | null]
}

export interface ProcessFlowOptions {
  /** 业务工具的人话名表（键＝注册名；同名覆盖框架基础表） */
  labels?: Record<string, string>
  /** 业务工具摘要钩子：返回 null/undefined＝交给框架默认（框架工具语义摘要或标签） */
  summarize?: (tool: string, output: string, args?: string) => string | null
  /** 追加"等待类工具"（同族连续轮询折叠成一行；框架基础集＝waitExternalTask） */
  waitTools?: string[]
}

/** 归一化工具名（snake_case 与 camelCase 两族一张表命中） */
export const stepKey = (tool: string) => tool.replace(/_/g, '').toLowerCase()

/**
 * 框架注册工具的基础人话名（语义进框架、业务工具名由消费方注入）。
 * 🔴 框架新增注册工具时同步这里，否则步骤行落「执行一步操作」兜底。
 */
export const FRAMEWORK_STEP_LABELS: Record<string, string> = {
  askUser: '向用户追问',
  waitExternalTask: '智能体作业中',
  submitExternalTask: '委托智能体作业',
  queryExternalTask: '查询作业进度',
  readExternalTaskResult: '读取作业产物',
  cancelExternalTask: '取消作业',
  recallToolResult: '回捞此前工具结果原文',
  submitPlan: '提交任务计划',
  startPlanItem: '开始执行计划条目',
  donePlanItem: '完成计划条目',
  suggest_next_steps: '给出下一步候选'
}

const FRAMEWORK_LABEL_KEYS: Record<string, string> = {}
for (const [name, label] of Object.entries(FRAMEWORK_STEP_LABELS)) {
  FRAMEWORK_LABEL_KEYS[name.replace(/_/g, '').toLowerCase()] = label
}

/** 等待类工具：一次"等"会被模型轮询很多次，每次都是一条 tool_call/tool_result；
 *  逐条上屏会出现「作业中」压着「已完成」两行——同族连续轮询折叠成一条 */
const BASE_WAIT_TOOLS = new Set(['waitexternaltask'])

const argField = (args: string | undefined, key: string): string | null => {
  if (!args) return null
  try {
    const v = JSON.parse(args)[key]
    return typeof v === 'string' && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

/** 单步详情：裸技术串（工具名/入参/原始输出）只在这里出现，点了「展开」才看得到 */
const stepDetail = (tool: string, args: string | undefined, output: string) => {
  const a = (args || '').trim()
  const o = output.length > 3000 ? `${output.slice(0, 3000)}\n…（截断）` : output
  return [`工具：${tool}`, a ? `入参：${a}` : '', o].filter(Boolean).join('\n\n')
}

/** 框架工具的语义摘要（业务工具走 opts.summarize） */
const frameworkSummary = (tool: string, output: string, args?: string): string | null => {
  const k = stepKey(tool)
  if (k === 'askuser') {
    const q = argField(args, 'question')
    return q ? `向用户追问：${clip(q, 40)}` : null
  }
  if (k === 'waitexternaltask') {
    // 只分两态：没等到终局＝还在作业，等到 FINISHED＝作业完成（多轮轮询已折叠成一条，不会再上下打架）
    return (output || '').includes('FINISHED') ? '智能体作业完成' : null
  }
  return null
}

/**
 * 追加一步；同一任务的连续等待轮询并入上一步，耗时按"首次发起→最新回包"整段算（不逐次相加，免得漏掉轮次间隔）
 */
const pushStep = (steps: ProcessStep[], wait: Set<string>, s: ProcessStep) => {
  const prev = steps[steps.length - 1]
  if (prev && wait.has(stepKey(prev.tool)) && wait.has(stepKey(s.tool)) && prev.sig === s.sig) {
    prev.running = s.running
    prev.t1 = s.t1
    prev.polls += 1
    prev.summary = s.summary
    prev.detail = `${prev.detail}\n—— 第 ${prev.polls} 次 ——\n${s.detail || ''}`
    return
  }
  steps.push(s)
}

const summarizeTool = (
  tool: string, output: string, args: string | undefined,
  opts: ProcessFlowOptions | undefined, labelKeys: Record<string, string>
) => {
  const custom = opts?.summarize?.(tool, output, args)
  if (custom) return custom
  const fw = frameworkSummary(tool, output, args)
  if (fw) return fw
  return labelKeys[stepKey(tool)] || '执行一步操作'
}

/**
 * 事件流 → 过程流（纯函数；归档与降噪判据＝processLines 单源，与 core/llm 发射端同词汇）
 */
export function reduceProcessEvents(events: AgentEventX[], opts?: ProcessFlowOptions): ProcessFlow {
  const labelKeys: Record<string, string> = { ...FRAMEWORK_LABEL_KEYS }
  for (const [name, label] of Object.entries(opts?.labels || {})) {
    labelKeys[name.replace(/_/g, '').toLowerCase()] = label
  }
  const wait = new Set([...BASE_WAIT_TOOLS, ...(opts?.waitTools || []).map(t => stepKey(t))])
  const steps: ProcessStep[] = []
  const archives: string[] = []
  const pending: { name: string; args: string; time: number }[] = []
  let ord = 0
  for (const ev of events || []) {
    const p = ev?.payload || {}
    if (ev?.type === 'tool_call') {
      const nm = p.tool_name || 'tool'
      pending.push({ name: nm, args: typeof p.arguments === 'string' ? p.arguments : JSON.stringify(p.arguments ?? {}), time: ev.time })
    } else if (ev?.type === 'tool_result') {
      const call = pending.shift()
      const output = typeof p.output === 'string' ? p.output : JSON.stringify(p.output ?? {})
      const name = p.tool_name || call?.name || 'tool'
      pushStep(steps, wait, {
        tool: name,
        ord: ++ord,
        running: false,
        t0: call?.time || null,
        t1: ev.time,
        polls: 1,
        sig: call?.args,
        summary: summarizeTool(name, output, call?.args, opts, labelKeys),
        detail: stepDetail(name, call?.args, output)
      })
    } else if (ev?.type === 'log') {
      const line = typeof ev.payload === 'string' ? ev.payload : String(ev.payload ?? '')
      if (!line.trim()) continue
      // 轮末思考全文归档：不进步骤树（与工具步同框会淹没），终态后「思考过程」折叠区承载
      if (isThinkArchiveLine(line)) {
        archives.push(line)
        continue
      }
      // 工具收发/计量流水与专属步骤行重复（降噪判据＝processLines 单源）
      if (isNoiseLogLine(line)) continue
      pushStep(steps, wait, {
        tool: '__log',
        ord: 0,
        running: false,
        t0: ev.time,
        t1: ev.time,
        polls: 1,
        sig: line,
        summary: line.length > 120 ? line.slice(0, 120) + '…' : line,
        detail: line,
        isLog: true
      })
    }
  }
  // 尚无结果的调用＝执行中步骤
  for (const call of pending) {
    pushStep(steps, wait, {
      tool: call.name,
      ord: ++ord,
      running: true,
      t0: call.time || null,
      t1: null,
      polls: 1,
      sig: call.args,
      summary: summarizeTool(call.name, '', call.args, opts, labelKeys),
      detail: stepDetail(call.name, call.args, '')
    })
  }
  const first = (events && events[0]?.time) || 0
  const last = (events && events[events.length - 1]?.time) || 0
  const span: [number, number | null] = first ? [first, last > first ? last : null] : [0, null]
  return { steps, archives, span }
}

/** 毫秒 → 人话时长：不足 1 秒给 <1s，一分钟内给秒，再往上分秒（2m49s） */
export const fmtDur = (ms: number) => {
  if (ms < 1000) return '<1s'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}
