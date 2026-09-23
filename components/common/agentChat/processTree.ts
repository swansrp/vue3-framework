/**
 * Agent 过程树视图模型 —— 与来源无关的统一显示契约（自 epc_ai views/AiChat/processTree.ts 平移）
 *
 * 分层口径：
 * - 本文件只持有「视图模型 + 纯函数」：任何引擎（relay §5.7 帧 / core/llm 轮询事件 / 其他）
 *   的适配器（reducer）都在消费侧，把各自线格式归约成 UiMessage，再经 buildAssistantView
 *   得到唯一渲染出口 AssistantView。
 * - 线协议归约（§5.7 帧 applyFrame / 历史 blocks 装配 blocksToStream / 轮次 turnToMessage）
 *   留在消费侧（如 views/AiChat/processTree.ts），import 本文件的类型与支撑函数。
 * - sub 嵌套语义（SPAWN_TOOL 容器步）是视图模型约定：无子数据的引擎自然降级为扁平工具列表。
 */

/** 气泡终局状态（running = 已受理未终局） */
export type UiMessageStatus = 'running' | 'done' | 'error' | 'cancelled'

/** 运行状态六态（含 spawn 结果语义 timeout/rejected） */
export type RunStatus = 'running' | 'completed' | 'failed' | 'timeout' | 'rejected' | 'cancelled'

export interface UiErrorInfo {
  code: number | null
  message: string
}

export interface ToolStep {
  /** tool_call_id（旧数据可缺省；缺省时配对回退位置法） */
  id: string
  name: string
  args?: any
  result?: string
  completed: boolean
  /** spawn 结果语义（结构化错误 JSON 解析；仅 spawn_subagent） */
  outcome?: RunStatus
  /** 子运行容器（历史：场记块直接挂；直播：渲染期由 subStreams 附着） */
  sub?: SubRun
}

export interface SubRun {
  agentCode: string
  status: RunStatus
  text: string
  tools: ToolStep[]
}

/** 直播期子运行流（键 = parent_path 链，如 "call-1/call-2"） */
export interface SubStream {
  text: string
  tools: ToolStep[]
}

export interface UiMessage {
  /** 气泡唯一 id：user = "u:<turnId>"，assistant = turnId */
  id: string
  /** 轮次 message_id：关联用户/助手气泡、取消与冲正 */
  turnId: string
  role: 'user' | 'assistant'
  text: string
  thinking: string
  tools: ToolStep[]
  /** 直播期子运行流（按 parent_path 链）；历史装配走 step.sub */
  subStreams?: Record<string, SubStream>
  status: UiMessageStatus
  error: UiErrorInfo | null
  /** 附件引用（仅 user 气泡渲染 chips） */
  attachments: any[]
  createdAt?: string
  completedAt?: string
}

/** spawn 容器步的工具名约定（适配器产出嵌套树时须对齐） */
export const SPAWN_TOOL = 'spawn_subagent'

export const RUN_FAILED_MESSAGE = '运行失败'

export function newAssistantMessage(turnId: string, createdAt?: string): UiMessage {
  return {
    id: turnId,
    turnId,
    role: 'assistant',
    text: '',
    thinking: '',
    tools: [],
    status: 'running',
    error: null,
    attachments: [],
    createdAt
  }
}

export function newUserMessage(turnId: string, text: string, attachments: any[] = [], createdAt?: string): UiMessage {
  return {
    id: `u:${turnId}`,
    turnId,
    role: 'user',
    text,
    thinking: '',
    tools: [],
    status: 'done',
    error: null,
    attachments: [...attachments],
    createdAt
  }
}

/** reply.status（run 状态）→ 气泡终局状态；未终局（pending/running/未知）→ null */
export function replyStatusToTerminal(replyStatus: string): UiMessageStatus | null {
  if (replyStatus === 'completed') return 'done'
  if (replyStatus === 'failed') return 'error'
  if (replyStatus === 'cancelled') return 'cancelled'
  return null
}

/** 子运行 RunStatus → 气泡终局状态（嵌套组构造递归视图用；未终局 → running） */
export function runStatusToTerminal(status: RunStatus): UiMessageStatus {
  if (status === 'completed') return 'done'
  if (status === 'failed' || status === 'timeout' || status === 'rejected') return 'error'
  if (status === 'cancelled') return 'cancelled'
  return 'running'
}

// ———————————————————————— 归约支撑（直播/历史适配器共用） ————————————————————————

export function streamKey(path: string[]): string {
  return path.join('/')
}

/** 子流更新：按 parent_path 链定位（不存在则沿途建空流） */
export function updateStream(msg: UiMessage, path: string[], fn: (s: SubStream) => SubStream): UiMessage {
  const key = streamKey(path)
  const streams = msg.subStreams ?? {}
  const current = streams[key] ?? { text: '', tools: [] }
  return { ...msg, subStreams: { ...streams, [key]: fn(current) } }
}

/** 工具步定位（直播/历史两路共用）：同 id 未完成 → 同 id 任意 → 最后未完成（旧服务端兼容） */
export function matchStepIndex(tools: ToolStep[], id: string): number {
  if (id) {
    const pending = tools.findIndex(t => t.id === id && !t.completed)
    if (pending >= 0) return pending
    const reuse = tools.findIndex(t => t.id === id)
    if (reuse >= 0) return reuse
  }
  for (let i = tools.length - 1; i >= 0; i--) {
    if (!tools[i].completed) return i
  }
  return -1
}

export function completeStep(tools: ToolStep[], id: string, output: string): ToolStep[] {
  const idx = matchStepIndex(tools, id)
  if (idx < 0) return tools
  return tools.map((t, i) => (i === idx ? finishStep(t, output) : t))
}

export function finishStep(t: ToolStep, output: string): ToolStep {
  const done: ToolStep = { ...t, completed: true, result: output }
  if (t.name === SPAWN_TOOL) done.outcome = spawnOutcome(output)
  return done
}

/** spawn 结果语义：结构化错误 JSON（outcome + agent_code）→ 状态；其余按成功文本 */
export function spawnOutcome(output: string): RunStatus {
  try {
    const parsed = JSON.parse(output) as { outcome?: any; agent_code?: any }
    const outcome = typeof parsed.outcome === 'string' ? parsed.outcome : ''
    const known = ['timeout', 'rejected', 'failed', 'cancelled']
    if (typeof parsed.agent_code === 'string' && known.includes(outcome)) {
      return outcome as RunStatus
    }
  } catch {
    // 非 JSON：视为成功文本
  }
  return 'completed'
}

/** spawn 结构化错误文本（失败/超时/拒绝时的原因；非错误 JSON → null） */
export function spawnErrorText(result?: string): string | null {
  if (!result) return null
  try {
    const parsed = JSON.parse(result) as { error?: any }
    return typeof parsed.error === 'string' ? parsed.error : null
  } catch {
    return null
  }
}

// ———————————————————————— 渲染出口（各来源汇一） ————————————————————————

export interface RenderTool {
  step: ToolStep
  status: RunStatus
  sub?: { agentCode: string; text: string; tools: RenderTool[] }
}

export interface AssistantView {
  thinking: string
  text: string
  error?: string
  terminal: UiMessageStatus
  tools: RenderTool[]
  /** 本轮起点（毫秒）：运行中组头据此逐秒计数；缺省由渲染层以挂载时刻兜底 */
  startedAt?: number
}

/** 消息 → 渲染视图：直播子流附着到 spawn 步（历史容器已挂 step.sub，直接复用） */
export function buildAssistantView(msg: UiMessage): AssistantView {
  const terminal = msg.status
  return {
    thinking: msg.thinking,
    text: msg.text,
    error: msg.error?.message,
    terminal,
    tools: renderTools(msg.tools, msg.subStreams ?? {}, '', terminal),
    startedAt: msg.createdAt ? new Date(msg.createdAt).getTime() : undefined
  }
}

function renderTools(
  tools: ToolStep[],
  streams: Record<string, SubStream>,
  prefix: string,
  terminal: UiMessageStatus
): RenderTool[] {
  return tools.map(step => {
    if (step.name !== SPAWN_TOOL) {
      return { step, status: stepStatus(step, terminal) }
    }
    if (step.sub) {
      // 历史路径：容器块权威（status/text/tools 均来自场记）
      const { sub, ...bare } = step // 剥载体：出口 step 与直播路径同形
      return {
        step: bare,
        status: sub.status,
        sub: {
          agentCode: sub.agentCode,
          text: sub.text,
          tools: renderTools(sub.tools, {}, '', terminal)
        }
      }
    }
    // 直播路径：子流按 parent_path 链（含更深层）附着
    const key = prefix ? `${prefix}/${step.id}` : step.id
    const stream = step.id ? streams[key] : undefined
    return {
      step,
      status: stepStatus(step, terminal),
      sub: {
        agentCode: spawnAgentCode(step),
        text: stream?.text ?? '',
        tools: stream ? renderTools(stream.tools, streams, key, terminal) : []
      }
    }
  })
}

/** 步状态：完成 → 结果语义；未完成 → 随消息终局（取消/失败/兜底完成） */
export function stepStatus(step: ToolStep, terminal: UiMessageStatus): RunStatus {
  if (step.completed) return step.outcome ?? 'completed'
  if (terminal === 'cancelled') return 'cancelled'
  if (terminal === 'error') return 'failed'
  if (terminal === 'done') return 'completed'
  return 'running'
}

/** spawn 调用的目标编码（取自调用参数；容器状态头展示用） */
export function spawnAgentCode(step: ToolStep): string {
  if (step.args && typeof step.args === 'object' && 'agent_code' in step.args) {
    return String((step.args as Record<string, any>).agent_code ?? '')
  }
  return ''
}

/** spawn 调用的展示标签（可选参数 label） */
export function spawnLabel(step: ToolStep): string {
  if (step.args && typeof step.args === 'object' && 'label' in step.args) {
    return String((step.args as Record<string, any>).label ?? '')
  }
  return ''
}

// ———————————————————————— 过程组统计 ————————————————————————

/** 失败语义步状态（计入「N 失败」徽标；已取消不计失败） */
const FAILED_STATUSES: RunStatus[] = ['failed', 'timeout', 'rejected']

export interface ProcessGroupStats {
  /** 有思考或工具步 → 渲染「执行过程」组 */
  hasGroup: boolean
  /** 组标题步数 = 思考 1 步 + 顶层工具步 */
  stepCount: number
  /** 失败步数（递归含子容器；cancelled 不算失败） */
  failedCount: number
}

/** 过程组统计（组标题「执行过程 · N 步」与失败徽标的唯一数据出口） */
export function processGroupStats(view: AssistantView): ProcessGroupStats {
  const hasGroup = view.thinking !== '' || view.tools.length > 0
  return {
    hasGroup,
    stepCount: (view.thinking !== '' ? 1 : 0) + view.tools.length,
    failedCount: countFailed(view.tools)
  }
}

function countFailed(tools: RenderTool[]): number {
  let n = 0
  for (const rt of tools) {
    if (FAILED_STATUSES.includes(rt.status)) n += 1
    if (rt.sub) n += countFailed(rt.sub.tools)
  }
  return n
}

/** 工具行显示名（spawn 展示为「<子任务标签> · 目标编码」） */
export function toolDisplayName(step: ToolStep, subagentLabel = '子 Agent'): string {
  if (step.name !== SPAWN_TOOL) return step.name
  const code = spawnAgentCode(step)
  return code ? `${subagentLabel} · ${code}` : subagentLabel
}

/** 动作中文标签（未知工具回落「工具调用」；行首已用状态符表意，标签只说"在做什么"） */
const TOOL_LABELS: Record<string, string> = {
  terminal: '终端命令',
  file_editor: '编辑文件',
  browser: '浏览器操作',
  task_tracker: '任务清单'
}

export function toolLabel(name: string, subagentLabel = '子 Agent'): string {
  if (name === SPAWN_TOOL) return subagentLabel
  // 未登记的工具直接给原名（比笼统的「工具调用」更可辨）
  return TOOL_LABELS[name] || name || '工具调用'
}

/**
 * 行内摘要：从入参里挑一句最能说明"做了什么"的文本（命令 > 路径 > URL > 首个短字符串），
 * 让行本身可读，完整 args/result 留给展开明细。
 */
export function stepSummary(step: ToolStep): string {
  const args = step.args
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    const rec = args as Record<string, any>
    for (const key of ['command', 'path', 'file_path', 'url', 'query', 'text']) {
      const value = rec[key]
      if (typeof value === 'string' && value.trim()) return oneLine(value)
    }
    for (const value of Object.values(rec)) {
      if (typeof value === 'string' && value.trim() && value.length <= 120) return oneLine(value)
    }
    return ''
  }
  if (typeof args === 'string' && args.trim()) return oneLine(args)
  return ''
}

function oneLine(text: string): string {
  const flat = text.replace(/\s*\n\s*/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat
}
