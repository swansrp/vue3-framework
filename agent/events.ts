/**
 * 会话事件帧 → 面板视图条目（纯函数，任何异常都退化为"跳过该帧"，绝不抛给渲染层）
 *
 * 映射口径（与后端 AgentEvent 常量一致）：
 * | 事件 | 去向 |
 * |---|---|
 * | llm_output | 助手正文消息（多轮各成一条，不做聚合——过程面板按发生顺序平铺） |
 * | tool_call | 工具卡（running）；tool_result 按 tool_call_id 配对补全，无 id 仅在唯一在途工具时回退，多工具并行不猜（落日志行） |
 * | log | 弱化日志行（渲染成小字，不占正文层级） |
 * | file_attached | 文件卡（payload file_id/name/size/mime → FileRef） |
 * | artifact | 产物下载卡（payload file_id/name/size/mime/format/url → AgentArtifact，P2a） |
 * | paused/resumed/guidance/answered/question/error | 状态条（按事件顺序平铺） |
 * | round_start/run_start/stage/finish/stopped | 不进消息流：轮次无独立语义，终态由 status 快照结论卡承载 |
 *
 * 注意：本文件自持一份映射，不 import 旧对话组件的事件适配器（旧件是另一套视图模型
 * AssistantView，两模块无耦合）。
 */
import type {
  AgentArtifact,
  AgentEventFrame,
  AgentFileRef,
  AgentStatusItem,
  AgentToolItem,
  AgentViewItem
} from './types'

/** payload 取文本：字符串原样；对象 JSON 化（人读）；空值空串 */
export const payloadText = (payload: unknown): string => {
  if (payload === null || payload === undefined) return ''
  if (typeof payload === 'string') return payload
  if (typeof payload === 'object') {
    try {
      return JSON.stringify(payload)
    } catch {
      return String(payload)
    }
  }
  return String(payload)
}

/** payload 取字段（仅对象形态；数组/原始值返回 undefined） */
const field = (payload: unknown, key: string): any => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return (payload as Record<string, any>)[key]
  }
  return undefined
}

/** 文件引用归一：事件 payload 是 snake_case（file_id），容错读 camelCase 旧形态 */
export const fileRefFromEventPayload = (payload: unknown): AgentFileRef | null => {
  const fileId = field(payload, 'file_id') ?? field(payload, 'fileId')
  if (fileId === undefined || fileId === null || String(fileId) === '') return null
  const size = field(payload, 'size')
  return {
    fileId: String(fileId),
    name: String(field(payload, 'name') ?? ''),
    size: typeof size === 'number' ? size : Number(size) || 0,
    mime: field(payload, 'mime') ?? null,
    key: null
  }
}

/**
 * 产物引用归一（P2a）：artifact 事件 payload（file_id/name/size/mime/format/url）→ AgentArtifact。
 * url 缺席（脏帧/旧数据）不挡卡片本身，只是没有下载按钮——按文件名+大小展示。
 */
export const artifactFromEventPayload = (payload: unknown): AgentArtifact | null => {
  const fileId = field(payload, 'file_id') ?? field(payload, 'fileId')
  if (fileId === undefined || fileId === null || String(fileId) === '') return null
  const size = field(payload, 'size')
  return {
    fileId: String(fileId),
    name: String(field(payload, 'name') ?? ''),
    size: typeof size === 'number' ? size : Number(size) || 0,
    mime: field(payload, 'mime') ?? null,
    format: String(field(payload, 'format') ?? ''),
    url: field(payload, 'url') ?? null
  }
}

/** 工具入参展示：对象 JSON 美化（失败回落原文），过长由样式滚动承载不截断 */
const formatArgs = (args: unknown): string => {
  if (args === null || args === undefined) return ''
  if (typeof args === 'string') {
    const trimmed = args.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch {
        // 非合法 JSON：按原文展示
      }
    }
    return args
  }
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}

/** 工具名 → 人话名（框架工具＋epc/InkHub 常见业务工具的摘要口径；未知工具回落原名） */
const TOOL_LABELS: Record<string, string> = {
  sandbox_run: '沙箱执行',
  sandbox_fetch: '取回沙箱产物',
  read_attachment: '读取附件',
  read_file: '读取附件',
  generate_artifact: '生成产物文件',
  upload_file: '上传产物文件',
  save_supervision_log: '保存监理日志',
  askUser: '向用户提问',
  finish: '收口',
  submitExternalTask: '委托外部执行',
  waitExternalTask: '等待外部结果',
  queryExternalTask: '查询外部任务',
  readExternalTaskResult: '读取外部结果',
  cancelExternalTask: '终止外部任务',
  search_docs: '知识库检索',
  fetch_document: '知识库取文',
  grep_document: '知识库深搜'
}

/** 各工具的关键参数字段（按序取第一个非空值作摘要；均缺省回落全文摘要） */
const TOOL_DIGEST_FIELDS: Record<string, string[]> = {
  sandbox_run: ['command'],
  sandbox_fetch: ['rel_path', 'relPath', 'file_path', 'filePath', 'path'],
  read_attachment: ['name', 'file_name', 'fileName', 'file_id', 'fileId'],
  read_file: ['name', 'file_name', 'fileName', 'file_id', 'fileId'],
  generate_artifact: ['file_name', 'fileName', 'name', 'format'],
  upload_file: ['object_name', 'objectName', 'name'],
  save_supervision_log: ['log_date', 'logDate'],
  askUser: ['question'],
  submitExternalTask: ['title', 'task', 'prompt'],
  waitExternalTask: ['task_id', 'taskId'],
  queryExternalTask: ['task_id', 'taskId'],
  readExternalTaskResult: ['task_id', 'taskId'],
  cancelExternalTask: ['task_id', 'taskId'],
  search_docs: ['query', 'keyword', 'q'],
  fetch_document: ['doc_id', 'docId', 'file_id', 'fileId'],
  grep_document: ['keyword', 'pattern', 'query']
}

/** 摘要截断：一句话收口，超长省略号（不换行渲染由样式兜底） */
const clipDigest = (text: string, max = 64): string => {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max)}…` : one
}

/* ==================== 过程流降噪 ==================== */

/**
 * 后端 report 回显日志：与工具卡信息完全重复（名称/参数在 tool_call、返回在 tool_result），
 * 或属 tokens 级噪音——成帧即丢，不进消息流。轮次行（LLM 第 N 轮…）与失败行保留作节奏锚。
 */
const LOG_NOISE_PREFIXES = ['└ 工具调用：', '└ LLM 输出：', 'LLM 响应已收到']

const isNoisyBackendLog = (text: string): boolean =>
  LOG_NOISE_PREFIXES.some(p => text.startsWith(p))

/**
 * LLM 转述噪声：模型会把工具调用/返回/用户作答复读成单行转述文本，信息与工具卡/作答条
 * 完全重复。保守口径——仅「整帧单行」命中这些形态才丢，多段正文（真实回答）绝不触碰。
 */
const NARRATION_NOISE_RES = [
  /^调用工具[:：\s]\s*\S+\s*[({【]/,
  /^└?\s*工具调用[:：]/,
  /^工具\s*\S+\s*返回[:：]/,
  /^用户作答\s*#\d+\s*[（(]?\d*\)?[：:]/
]

const isNarrationNoise = (text: string): boolean => {
  const one = text.trim()
  if (!one || one.includes('\n')) return false
  return NARRATION_NOISE_RES.some(re => re.test(one))
}

/**
 * 工具卡摘要（工作台形态 summary 行用）：人话名＋关键参数一句话。
 * 纯函数——args 解析失败/字段缺失一律回落「人话名＋空摘要」，绝不抛。
 */
export const toolDigest = (name: string, argsText: string): { label: string; digest: string } => {
  const label = TOOL_LABELS[name] || name
  let digest = ''
  try {
    const parsed = typeof argsText === 'string' && argsText.trim()
      ? JSON.parse(argsText)
      : argsText
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const keys = TOOL_DIGEST_FIELDS[name] || []
      for (const key of keys) {
        const value = (parsed as Record<string, any>)[key]
        if (value !== undefined && value !== null && String(value) !== '') {
          digest = clipDigest(String(value))
          break
        }
      }
      if (!digest) {
        // 未登记字段：取第一个字符串值兜底，保证 summary 行不空转
        for (const value of Object.values(parsed as Record<string, any>)) {
          if (typeof value === 'string' && value.trim()) {
            digest = clipDigest(value)
            break
          }
        }
      }
    } else if (typeof parsed === 'string' && parsed.trim()) {
      digest = clipDigest(parsed)
    }
  } catch {
    // 非法 JSON：原文截断兜底
    digest = argsText ? clipDigest(argsText, 48) : ''
  }
  return { label, digest }
}

/** 状态条文案口径（与 events 语义一一对应，业务壳无需再映射） */
export const statusEventText = (type: string, payload: unknown): string => {
  const text = payloadText(payload)
  switch (type) {
    case 'paused':
      return `已暂停${text ? `：${text}` : ''}`
    case 'resumed':
      return text || '已恢复执行'
    case 'guidance':
      return `用户补充：${text}`
    case 'answered':
      return `用户作答：${text}`
    case 'question':
      return `AI 提问：${String(field(payload, 'question') ?? text)}`
    case 'error':
      return `错误：${String(field(payload, 'error') ?? text)}`
    default:
      return text
  }
}

const STATUS_TONES: Record<string, AgentStatusItem['tone']> = {
  paused: 'warn',
  resumed: 'info',
  guidance: 'info',
  answered: 'info',
  question: 'warn',
  error: 'error'
}

const STATUS_TYPES = new Set<string>(['paused', 'resumed', 'guidance', 'answered', 'question', 'error'])

/**
 * 事件帧数组 → 视图条目数组（全量重算；tool_result 通过回填同批对象完成配对）
 */
export const buildAgentViewItems = (events: AgentEventFrame[]): AgentViewItem[] => {
  const items: AgentViewItem[] = []
  const tools: AgentToolItem[] = []

  for (const ev of events || []) {
    if (!ev || typeof ev.type !== 'string') continue
    switch (ev.type) {
      case 'llm_output': {
        const text = payloadText(ev.payload).trim()
        if (text && !isNarrationNoise(text)) {
          items.push({ kind: 'text', id: `t-${ev.seq}`, seq: ev.seq, time: ev.time, text })
        }
        break
      }
      case 'tool_call': {
        const toolCallId = String(field(ev.payload, 'tool_call_id') ?? '')
        const name = String(field(ev.payload, 'tool_name') ?? (typeof ev.payload === 'string' ? ev.payload : '工具调用'))
        const args = formatArgs(field(ev.payload, 'arguments'))
        const digest = toolDigest(name, args)
        const tool: AgentToolItem = {
          kind: 'tool',
          id: `tool-${ev.seq}`,
          seq: ev.seq,
          time: ev.time,
          toolCallId,
          name,
          label: digest.label,
          digest: digest.digest,
          args,
          output: '',
          status: 'running'
        }
        tools.push(tool)
        items.push(tool)
        break
      }
      case 'tool_result': {
        const toolCallId = String(field(ev.payload, 'tool_call_id') ?? '')
        const output = payloadText(field(ev.payload, 'output') ?? ev.payload)
        const matched = toolCallId
          ? tools.find(t => t.toolCallId === toolCallId && t.status === 'running')
          : undefined
        const running = tools.filter(t => t.status === 'running')
        // 无 id 仅在唯一在途工具时可安全回退；多个并行工具时不猜测配对（宁可落日志行）
        const target = matched || (!toolCallId && running.length === 1 ? running[0] : undefined)
        if (target) {
          target.output = output
          target.status = 'done'
        } else if (!toolCallId && running.length > 1) {
          items.push({
            kind: 'log',
            id: `log-${ev.seq}`,
            seq: ev.seq,
            time: ev.time,
            text: `工具结果缺少 tool_call_id，当前 ${running.length} 个工具执行中，无法确定配对：${output}`
          })
        } else if (toolCallId) {
          // id 存在但无在途匹配：历史截断/脏帧，同样不猜测
          items.push({
            kind: 'log',
            id: `log-${ev.seq}`,
            seq: ev.seq,
            time: ev.time,
            text: `工具结果未匹配到在途调用（tool_call_id=${toolCallId}）：${output}`
          })
        } else {
          // 无对应调用（历史截断/异常帧）：降级为日志行，不丢信息
          items.push({ kind: 'log', id: `log-${ev.seq}`, seq: ev.seq, time: ev.time, text: output })
        }
        break
      }
      case 'file_attached': {
        const file = fileRefFromEventPayload(ev.payload)
        if (file) items.push({ kind: 'file', id: `file-${ev.seq}`, seq: ev.seq, time: ev.time, file })
        break
      }
      case 'artifact': {
        const artifact = artifactFromEventPayload(ev.payload)
        if (artifact) {
          items.push({ kind: 'artifact', id: `artifact-${ev.seq}`, seq: ev.seq, time: ev.time, artifact })
        }
        break
      }
      case 'log': {
        const text = payloadText(ev.payload).trim()
        if (text && !isNoisyBackendLog(text) && !isNarrationNoise(text)) {
          items.push({ kind: 'log', id: `log-${ev.seq}`, seq: ev.seq, time: ev.time, text })
        }
        break
      }
      default: {
        if (STATUS_TYPES.has(ev.type)) {
          const text = statusEventText(ev.type, ev.payload)
          if (text) {
            items.push({
              kind: 'status',
              id: `s-${ev.seq}`,
              seq: ev.seq,
              time: ev.time,
              type: ev.type,
              text,
              tone: STATUS_TONES[ev.type] || 'info'
            })
          }
        }
        // round_start/run_start/stage/finish/stopped/未知类型：不进消息流
        break
      }
    }
  }

  return items
}