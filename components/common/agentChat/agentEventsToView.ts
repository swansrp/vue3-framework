/**
 * core/llm 过程事件 → 统一视图模型（AssistantView）适配器
 *
 * 与 relay 侧 §5.7 归约（views/AiChat/processTree）平级：两者产出同一个 AssistantView，
 * 由同一个 AgentProcessTree 渲染，实现"一套视图模型吃多路引擎"。
 *
 * 事件映射口径（对照表，2026-09-24 按 core/llm 实际发射点核定）：
 * | 事件 | 去向 |
 * |---|---|
 * | tool_call | ToolStep{id, name, args}（payload 为对象；旧数据字符串则只填 name） |
 * | tool_result | 按 tool_call_id 配对补全（无 id 走位置回退），output 进 result |
 * | llm_output | 追加进 text（多轮以空行分隔） |
 * | log | 追加进 thinking（与既有"思考过程"分组口径一致） |
 * | round_start | **不进视图**：AssistantView 无轮次层，轮次仅用于分组（保留在旧渲染里） |
 * | stage / plan / question / answered / confirmation / guidance / paused / resumed | **不进视图**：属交互与进度区，仍由 AgentChat 既有字段与组件承载 |
 * | run_start / finish / error / stopped | 只用于判终局（取 status 快照为准） |
 * | status.live | 未出结论时作为流式正文（替换式，与后端 pushLive 同口径） |
 */
import {
  completeStep,
  newAssistantMessage,
  SPAWN_TOOL
} from './processTree'
import type { AssistantView, ToolStep, UiMessage } from './processTree'
import type { AgentEventX, AgentSessionStateT } from './types'

const TEXT_TYPES = new Set(['llm_output'])
const THINK_TYPES = new Set(['log'])

/** 事件 payload 取字符串（对象则 JSON 文本，供人读） */
function asText(payload: unknown): string {
  if (payload === null || payload === undefined) return ''
  if (typeof payload === 'string') return payload
  if (typeof payload === 'object') return JSON.stringify(payload)
  return String(payload)
}

function field(payload: unknown, key: string): any {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return (payload as Record<string, any>)[key]
  }
  return undefined
}

function terminalOf(status?: string): AssistantView['terminal'] {
  if (status === 'FINISHED') return 'done'
  if (status === 'FAILED') return 'error'
  if (status === 'STOPPED') return 'cancelled'
  return 'running'
}

/**
 * 事件流 + 状态快照 → AssistantView（纯函数，任何异常都退化为空视图，绝不抛给渲染层）
 */
export function agentEventsToView(
  events: AgentEventX[],
  state?: AgentSessionStateT | null
): AssistantView {
  const msg: UiMessage = newAssistantMessage(state?.sessionId || 'agent')
  try {
    const outputs: string[] = []
    const thinks: string[] = []
    let tools: ToolStep[] = []

    for (const ev of events || []) {
      if (!ev || typeof ev.type !== 'string') continue
      if (ev.type === 'tool_call') {
        const payload = ev.payload
        tools = [...tools, {
          id: String(field(payload, 'tool_call_id') ?? ''),
          name: String(field(payload, 'tool_name') ?? (typeof payload === 'string' ? payload : 'tool')),
          args: field(payload, 'arguments'),
          completed: false
        }]
      } else if (ev.type === 'tool_result' || ev.type === 'error') {
        const id = String(field(ev.payload, 'tool_call_id') ?? '')
        const output = ev.type === 'error'
          ? asText(field(ev.payload, 'error') ?? ev.payload)
          : String(field(ev.payload, 'output') ?? asText(ev.payload))
        tools = completeStep(tools, id, output)
      } else if (TEXT_TYPES.has(ev.type)) {
        const text = asText(ev.payload)
        if (text) outputs.push(text)
      } else if (THINK_TYPES.has(ev.type)) {
        const text = asText(ev.payload)
        if (text) thinks.push(text)
      }
      // 其余类型（round_start/stage/plan/question/…）按对照表不进视图
    }

    const text = outputs.join('\n\n')
    msg.tools = tools.filter(t => t.name !== SPAWN_TOOL) // 本路无子 Agent 语义，防御性剔除
    msg.text = text || (terminalOf(state?.status) === 'running' ? (state?.live || '') : (text || state?.summary || ''))
    msg.thinking = thinks.join('\n')
    msg.status = terminalOf(state?.status)
    if (msg.status === 'error') {
      msg.error = { code: null, message: state?.error || '运行失败' }
    }
  } catch {
    return { thinking: '', text: '', terminal: 'running', tools: [] }
  }

  return {
    thinking: msg.thinking,
    text: msg.text,
    error: msg.error?.message,
    terminal: msg.status,
    tools: msg.tools.map(step => ({
      step,
      status: step.completed ? step.outcome || 'completed' : (msg.status === 'running' ? 'running' : msg.status === 'cancelled' ? 'cancelled' : msg.status === 'error' ? 'failed' : 'completed')
    }))
  }
}
