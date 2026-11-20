/**
 * 框架 AI 会话模块入口（2026-11-19 自 `framework/agent/` 物理迁入，旧路径留 shim 转发）
 *
 * 用法：
 *   import { AgentPane } from '@/framework/components/common/agent'
 *   <AgentPane :session-id="id" :capabilities="caps" @finished="onFinished" @restart="onRestart" />
 *
 * 能力位由 /agents 清单条目 capabilities 驱动（files.upload/files.read）；
 * 入口文件同时加载模块样式（.bidr-agent-* 前缀，不影响宿主页面）。
 */
import './styles.css'

export { default as AgentConclusionCard } from './AgentConclusionCard.vue'
export { default as AgentConfirmCard } from './AgentConfirmCard.vue'
export { default as AgentPane } from './AgentPane.vue'
export { default as AgentProcessGroup } from './AgentProcessGroup.vue'
export { default as AskDecisionCard } from './AskDecisionCard.vue'
export { default as PlanCapsule } from './PlanCapsule.vue'
export { default as AttachmentTray } from './composer/AttachmentTray.vue'
export { default as Composer } from './composer/Composer.vue'
export {
  breakBeforeCircledItems,
  clampLongUrls,
  configureAgentMarkdown,
  markdownOf,
  sanitizeAgentHtml,
  unescapeText
} from './markdown'
export { useAgentConversation } from './useAgentConversation'
export { useStickScroll } from './useStickScroll'
export { buildAgentViewItems, fileRefFromEventPayload, payloadText, statusEventText, toolDigest } from './events'
export { THINK_ARCHIVE_PREFIX, isNoiseLogLine, isThinkArchiveLine } from './processLines'
export {
  AGENT_CAPABILITY,
  AGENT_HEALTH,
  CLARIFY_ANSWER_SKIPPED,
  formatFileSize,
  isTerminalStatus,
  parseChatOption
} from './types'
export type {
  AgentEventFrame,
  AgentFileRef,
  AgentLogItem,
  AgentPlanItemT,
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