/**
 * flow 执行轨迹 → 阶段条数据适配（AgentStages 的 flow 数据源）
 *
 * trace.nodes 按执行序记录已完成节点（ok/skipped/error + 实耗）；
 * 未出现节点按链默认序补齐：running 中首个未到达标 running、其余 pending；
 * 终态 success/error 后未到达节点一律 skipped（条件边跳过/失败截断）。
 * startedAt/endedAt 由 trace.startTime 与累计 elapsedMs 推算（近似值，供实耗展示）。
 */
import type { AgentStageItem } from './types'

export type { AgentStageItem }

export interface FlowGraphLike {
  nodes: {
    id: string
    type: string
    name?: string
    enabled?: boolean
    config?: Record<string, any>
  }[]
}

export interface FlowTraceLike {
  traceId?: string
  status?: string // running | success | error
  startTime?: number | null
  nodes?: {
    nodeId: string
    name?: string
    status?: string // ok | skipped | error
    elapsedMs?: number
    summary?: string
  }[]
}

export const flowTraceToStages = (graph?: FlowGraphLike | null, trace?: FlowTraceLike | null): AgentStageItem[] => {
  if (!graph?.nodes || graph.nodes.length === 0) return []
  // 业务节点（过滤 start/编排辅助节点；enabled=false 引擎直通，展示为 skipped）
  const chainNodes = graph.nodes.filter(n => n.type !== 'start' && n.type !== 'output')
  const traceNodes = trace?.nodes || []
  const byId = new Map(traceNodes.map(n => [n.nodeId, n]))

  // 起点推算：trace.startTime + 逐节点累计实耗
  let cursor = trace?.startTime || Date.now()
  const stamp = (elapsedMs?: number): { startedAt: number; endedAt: number | null } => {
    const startedAt = cursor
    const endedAt = elapsedMs != null ? startedAt + elapsedMs : null
    cursor = endedAt || startedAt
    return { startedAt, endedAt }
  }

  const stages: AgentStageItem[] = []
  const seen = new Set<string>()
  for (const node of chainNodes) {
    const ev = byId.get(node.id)
    if (ev) {
      seen.add(node.id)
      const { startedAt, endedAt } = stamp(ev.elapsedMs)
      stages.push({
        key: node.id,
        title: node.name || node.id,
        status: ev.status === 'ok' ? 'ok' : (ev.status === 'error' ? 'error' : 'skipped'),
        startedAt,
        endedAt,
        detail: ev.summary || null,
        estimatedSecs: node.config?.estimatedSecs ?? null
      })
    }
  }
  // 未到达节点补齐（running：首个 running 其余 pending；终态：一律 skipped）
  const terminal = trace?.status === 'success' || trace?.status === 'error'
  let runningAssigned = false
  for (const node of chainNodes) {
    if (seen.has(node.id)) continue
    stages.push({
      key: node.id,
      title: node.name || node.id,
      status: node.enabled === false ? 'skipped' : (terminal ? 'skipped' : (runningAssigned ? 'pending' : 'running')),
      estimatedSecs: node.config?.estimatedSecs ?? null
    })
    if (!terminal && node.enabled !== false) runningAssigned = true
  }
  return stages
}
