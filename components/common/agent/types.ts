/**
 * 框架 AI 会话面板类型契约（后端 core/llm agent session 对应结构）——🔴 会话域类型唯一正源
 *
 * P1 数据层统一（2026-11-19）：旧对话栈（components/common 下同域旧件）的会话域类型
 * （AgentStageT/AgentPlanItemT/AgentQuestionT/AgentConfirmationT/
 * AgentSessionStateT→AgentSessionSnapshot/isTerminalStatus/AgentEventX→AgentEventFrame）
 * 与通用候选项契约（ChatOptionView/parseChatOption）已迁入本文件，
 * 旧对话组件侧改为 re-export 本模块（引用方向恒为旧栈 → 本模块，反向禁止）。
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
  /**
   * 预解析正文长度（Markdown 字符数）：仅「发起前素材」链路有——登记时后端已按 read_attachment
   * 同一条腿解析过、沙箱里放了 parsed/<名>.md，模型读解析正文而不再调 read_attachment；
   * 前端据此点亮「已解析」（键缺席＝运行期直传，未经预解析）
   */
  parseChars?: number | null
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
  /** 模型可在会话沙箱执行命令、放入原件并取回产出文件（sandbox_run/sandbox_fetch/sandbox_put_attachment 三只，沙箱端口在场才装配） */
  EXEC_SANDBOX: 'exec.sandbox'
} as const

/** 能力位健康值常量（与后端 AgentCapabilityHealthProvider 常量同口径，值恒小写） */
export const AGENT_HEALTH = {
  /** 探测可达 */
  UP: 'up',
  /** 已配置但服务不可达（连接异常/非预期状态码/密钥无效） */
  DOWN: 'down',
  /** 未配置（对应腿 base-url/密钥缺失或未启用），不发包不计失败 */
  UNCONFIGURED: 'unconfigured'
} as const

/** /agents 清单条目（本模块只消费 key/displayName/capabilities/health，其余字段透传） */
export interface AgentSummary {
  /** autonomous 型=agentKey；flow 型=flowKey */
  key: string
  displayName: string
  type?: string
  skillCode?: string | null
  /** 附件能力位；空/缺省＝附件能力整体不启用 */
  capabilities?: string[]
  /** 能力位运行级健康快照（探活件上报；key=能力位名，value=up/down/unconfigured）。
   *  声明级 capabilities 的运行级补充；旧后端不出该字段＝undefined＝徽标全亮（兼容） */
  health?: Record<string, string>
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

/**
 * 「交由 AI 决定」哨兵（历史恢复重放时区分空作答与未作答）。
 * 正源在此（S10：AskDecisionCard 重放态消费）；agentChat/types.ts 旧位改 re-export
 * （引用方向恒为 agentChat → agent，反向禁止）。
 */
export const CLARIFY_ANSWER_SKIPPED = '（交由 AI 决定）'

/** 执行阶段（后端 AgentStage；迁自旧对话栈 types.ts，P1 归一正源） */
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
 *  会话终态时 running 由后端收口置位：FINISHED→done 补挑勾 / 其余→stopped。迁自旧对话栈 types.ts） */
export interface AgentPlanItemT {
  id: number
  text: string
  status: 'pending' | 'running' | 'done' | 'stopped'
  note?: string | null
}

/** 待确认口径条目（后端 AgentConfirmation：ask_user 超时/跳过后 LLM 自决的口径，finish 前逐条登记，
 *  会话终态后由用户在确认页裁决——确认（认可自决口径）或改口径（新口径说明交由业务重算）。
 *  迁自旧对话栈 types.ts，P1 归一正源） */
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

/**
 * 会话状态快照（P1 归一后同时承接旧对话栈 AgentSessionStateT 口径）：
 * 旧 StateT 独有字段（operator/skillCode/heartbeat/traceId）与阶段/计划/确认清单
 * （stages/plan/confirmations，D15-17 前置）一律收为可选——新面板不消费、旧组件照常读写。
 */
export interface AgentSessionSnapshot {
  sessionId?: string
  agentKey?: string
  displayName?: string
  /** 操作人（旧对话栈 StateT 独有；本面板不消费） */
  operator?: string
  /** 技能编码（flow 型会话；旧对话栈 StateT 独有） */
  skillCode?: string | null
  status: 'RUNNING' | 'PAUSED' | 'FINISHED' | 'FAILED' | 'STOPPED' | string
  startedAt?: number
  endedAt?: number | null
  /** 保活时间戳（旧对话栈 StateT 独有；本面板不消费） */
  heartbeat?: number
  summary?: string | null
  error?: string | null
  /** 链路追踪标识（旧对话栈 StateT 独有；本面板不消费） */
  traceId?: string | null
  /** LLM 流式实时内容（替换式最新一帧；终态清空） */
  live?: string | null
  /** 执行阶段清单（D15 前置：阶段条渲染依据） */
  stages?: AgentStageT[]
  /** 计划待办清单（D16 前置：计划勾选清单渲染依据） */
  plan?: AgentPlanItemT[]
  questions?: AgentQuestionT[]
  /** 待确认口径清单（D17 前置：终态确认页渲染依据） */
  confirmations?: AgentConfirmationT[]
}

/** 终态判定（FINISHED/FAILED/STOPPED 三态不再轮询） */
export const isTerminalStatus = (status?: string | null) =>
  status === 'FINISHED' || status === 'FAILED' || status === 'STOPPED'

/** 上传队列条目（AttachmentTray 渲染：名称/大小/进度/删除/失败重试） */
export interface AttachmentItem {
  /** 前端本地唯一键（stage-* 待发；upload-* 本次上传；srv-* 历史回显） */
  uid: string
  name: string
  size: number
  /** 0-100；上传完成即为 100 */
  progress: number
  /**
   * staged＝已选待处理（尚未上传）；uploading＝上传中；parsing＝预解析中（发起前素材校验）；
   * parsed＝解析通过（可随会话发送）；done＝上传完成（仅上传场景，无预解析）；
   * error＝上传或解析失败（error 字段为原因，可重试/移除）
   */
  status: 'staged' | 'uploading' | 'parsing' | 'parsed' | 'done' | 'error'
  /** 上传成功回填的服务端标识（去重/文件卡联动） */
  fileId?: string
  error?: string
  /** 解析通过的正文规模（字符数；chips 展示「已解析 · N 字」） */
  parseChars?: number
  /** 解析附注（如「文档解析能力未启用，已跳过校验」；chips tooltip/副行展示） */
  parseNote?: string
  /** 原始文件（失败重试与发起前暂存用；历史回显条目没有） */
  file?: File
}

/** 会话消息流条目（events.ts 归约产出，AgentPane 逐条渲染） */
export interface AgentTextItem {
  kind: 'text'
  id: string
  seq: number
  time: number
  text: string
  /** 说话人：user＝用户首轮指令/输入；assistant（缺省）＝模型输出。驱动左右/气泡样式区分 */
  role?: 'user' | 'assistant'
}

export interface AgentToolItem {
  kind: 'tool'
  id: string
  seq: number
  time: number
  /** 后端工具调用标识（tool_call 与 tool_result 配对键） */
  toolCallId: string
  name: string
  /** 人话名（toolDigest 映射产出；缺席回落 name 渲染） */
  label?: string
  /** 关键参数一句话摘要（summary 行展示；原始 args 仍收折叠体） */
  digest?: string
  /** 入参（JSON 文本，便于折叠展示） */
  args: string
  /** 返回（未配对前为空） */
  output: string
  status: 'running' | 'done'
  /** 回包时刻（tool_result 配对时回填；单步耗时＝endedAt − time，未配对缺席） */
  endedAt?: number
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

// ==================== 通用聊天契约（迁自旧对话栈 types.ts，P1 归一正源） ====================

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