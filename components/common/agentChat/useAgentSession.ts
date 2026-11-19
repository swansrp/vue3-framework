/**
 * agent 会话数据源 hook（🔴 薄适配层，2026-11-19 P1 引擎唯一化重写）
 *
 * 原双通道实现（SSE 优先＋2s 轮询兜底＋25s 保活＋断流退避重连＋终态兜底收口）
 * 已整体收敛到引擎 useAgentConversation（@/framework/components/common/agent，
 * 旧路径 framework/agent 留 shim）：本文件只做投影委托，保持旧返回形状
 * { status, events, polling, sse, reset }（五个引用直接透传引擎）。
 *
 * 已知语义差异（已裁定接受）：sessionId → null 时新引擎 reset 清空 events/status
 * （旧实现在该场景仅 shutdown、保留残影）；null 只出现在组件卸载/面板关闭路径，
 * 残影本就无人消费。
 */
import type { Ref } from 'vue'

import type { AgentEventX, AgentSessionStateT } from './types'

import { useAgentConversation } from '../agent'

export const useAgentSession = (sessionId: Ref<string | null>): {
  status: Ref<AgentSessionStateT | null>
  events: Ref<AgentEventX[]>
  polling: Ref<boolean>
  sse: Ref<boolean>
  reset: () => void
} => {
  const { status, events, polling, sse, reset } = useAgentConversation(sessionId)
  return { status, events, polling, sse, reset }
}
