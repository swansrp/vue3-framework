/**
 * 框架 AI 会话模块入口（新面板，零依赖旧对话组件）
 *
 * 用法：
 *   import { AgentPane } from '@/framework/agent'
 *   <AgentPane :session-id="id" :capabilities="caps" @finished="onFinished" @restart="onRestart" />
 *
 * 能力位由 /agents 清单条目 capabilities 驱动（files.upload/files.read）；
 * 入口文件同时加载模块样式（.bidr-agent-* 前缀，不影响宿主页面）。
 */
import './styles.css'

export { default as AgentPane } from './AgentPane.vue'
export { useAgentConversation } from './useAgentConversation'
export { buildAgentViewItems, fileRefFromEventPayload, payloadText, statusEventText } from './events'
export {
  AGENT_CAPABILITY,
  formatFileSize,
  isTerminalStatus
} from './types'
export type {
  AgentEventFrame,
  AgentFileRef,
  AgentLogItem,
  AgentQuestionT,
  AgentSessionSnapshot,
  AgentStatusItem,
  AgentSummary,
  AgentTextItem,
  AgentToolItem,
  AgentViewItem,
  AttachmentItem,
  FileRef
} from './types'
export type { UseAgentConversationOptions } from './useAgentConversation'