/**
 * 框架 AI 会话面板类型契约（后端 core/llm agent session 对应结构）
 *
 * 与旧对话组件的类型定义平级、互不依赖：本模块是独立的新面板，
 * 只认后端 HTTP/事件协议，不 import 旧对话组件（旧件仍被 epc/InkHub/agent-console 共用）。
 * 字段口径：文件引用跨模块契约 fileId/name/size/mime/key（后端 FileRef），
 * 事件 payload 用 snake_case（file_id），组装视图时在 events.ts 内归一。
 */

/** 会话附件引用（后端 com.bidr.llm.agent.file.FileRef） */
export interface AgentFileRef {
  /** 会话内附件标识（上传响应与 file_attached 事件的 file_id 同值） */
  fileId: string
  /** 原始文件名（含扩展名） */
  name: string
  /** 字节数 */
  size: number
  /** 内容类型（未知时后端回落 octet-stream） */
  mime?: string | null
  /** 存储层对象键（实现私有；事件重建的引用恒为 null） */
  key?: string | null
}

/** 契约名别名：后端 DTO 即 FileRef（附件协议最小定位单元） */
export type FileRef = AgentFileRef

/** 能力位常量（与后端 AgentSummary.capabilities / AgentDescriptor.capabilities 同口径） */
export const AGENT_CAPABILITY = {
  /** 可上传附件（存储端口在场才装配） */
  FILES_UPLOAD: 'files.upload',
  /** 模型可读文件（会话受限工具 read_attachment 可用时装配） */
  FILES_READ: 'files.read',
  /** 模型可生成可下载产物（generate_artifact 工具实转时装配） */
  ARTIFACTS_DOC: 'artifacts.doc',
  /** 照片/扫描件可 OCR 转写（后端增强转写腿在场＝声明级，探活只观测不影响本位） */
  OCR: 'ocr',
  /** 模型可在会话沙箱执行命令并取回产出文件（sandbox_run/sandbox_fetch，沙箱端口在场才装配） */
  EXEC_SANDBOX: 'exec.sandbox'
} as const

/** /agents 清单条目（本模块只消费 key/displayName/capabilities，其余字段透传） */
export interface AgentSummary {
  /** autonomous 型=agentKey；flow 型=flowKey */
  key: string
  displayName: string
  type?: string
  skillCode?: string | null
  /** 附件能力位；空/缺省＝附件能力整体不启用 */
  capabilities?: string[]
}

/** 会话事件帧（seq 会话内单调递增，sinceSeq 增量轮询依据） */
export interface AgentEventFrame {
  seq: number
  type: string
  payload: any
  time: number
}

/** 用户决策问题（ask_user 提问；waiting 条目可交互作答） */
export interface AgentQuestionT {
  id: number
  question: string
  options?: string[] | null
  status: 'waiting' | 'answered' | 'skipped' | 'expired'
  answer?: string | null
  askedAt?: number
  answeredAt?: number | null
}

/** 会话状态快照（只声明本面板消费的字段，其余透传） */
export interface AgentSessionSnapshot {
  sessionId?: string
  agentKey?: string
  displayName?: string
  status: 'RUNNING' | 'PAUSED' | 'FINISHED' | 'FAILED' | 'STOPPED' | string
  startedAt?: number
  endedAt?: number | null
  summary?: string | null
  error?: string | null
  /** LLM 流式实时内容（替换式最新一帧；终态清空） */
  live?: string | null
  questions?: AgentQuestionT[]
}

/** 终态判定（FINISHED/FAILED/STOPPED 三态不再轮询） */
export const isTerminalStatus = (status?: string | null) =>
  status === 'FINISHED' || status === 'FAILED' || status === 'STOPPED'

/** 上传队列条目（AttachmentTray 渲染：名称/大小/进度/删除） */
export interface AttachmentItem {
  /** 前端本地唯一键（upload-* 为本次上传；srv-* 为回显的历史附件） */
  uid: string
  name: string
  size: number
  /** 0-100；上传完成即为 100 */
  progress: number
  status: 'uploading' | 'done' | 'error'
  /** 上传成功回填的服务端标识（去重/文件卡联动） */
  fileId?: string
  error?: string
}

/** 会话消息流条目（events.ts 归约产出，AgentPane 逐条渲染） */
export interface AgentTextItem {
  kind: 'text'
  id: string
  seq: number
  time: number
  text: string
}

export interface AgentToolItem {
  kind: 'tool'
  id: string
  seq: number
  time: number
  /** 后端工具调用标识（tool_call 与 tool_result 配对键） */
  toolCallId: string
  name: string
  /** 入参（JSON 文本，便于折叠展示） */
  args: string
  /** 返回（未配对前为空） */
  output: string
  status: 'running' | 'done'
}

export interface AgentFileCardItem {
  kind: 'file'
  id: string
  seq: number
  time: number
  file: AgentFileRef
}

/** 会话产物引用（后端 com.bidr.llm.agent.file.AgentArtifact，artifact 事件 payload 归一产物） */
export interface AgentArtifact {
  /** 会话内产物标识（artifact 事件的 file_id 同值） */
  fileId: string
  /** 展示用文件名（含扩展名，如「监理日志-2026-11-13.docx」） */
  name: string
  /** 字节数 */
  size: number
  /** 内容类型（docx/pdf 固定 MIME） */
  mime?: string | null
  /** 产物格式（docx/pdf，小写；格式图标与下载文件名用） */
  format: string
  /** 生成时点的预签名读址（约 1 小时有效；下载按钮 href，过期后让 AI 重新生成） */
  url?: string | null
}

/** 产物下载卡条目（artifact 事件 → AgentPane 渲染下载按钮） */
export interface AgentArtifactCardItem {
  kind: 'artifact'
  id: string
  seq: number
  time: number
  artifact: AgentArtifact
}

export interface AgentStatusItem {
  kind: 'status'
  id: string
  seq: number
  time: number
  /** 原事件类型（paused/resumed/guidance/answered/question/error） */
  type: string
  text: string
  tone: 'info' | 'warn' | 'error'
}

export interface AgentLogItem {
  kind: 'log'
  id: string
  seq: number
  time: number
  text: string
}

export type AgentViewItem =
  | AgentTextItem
  | AgentToolItem
  | AgentFileCardItem
  | AgentArtifactCardItem
  | AgentStatusItem
  | AgentLogItem

/** 字节数人性化（chips/文件卡共用；1 位小数足够展示） */
export const formatFileSize = (size?: number | null): string => {
  const n = typeof size === 'number' && size > 0 ? size : 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}