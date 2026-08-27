/**
 * AgentStages 阶段类型（组件与数据适配层共用）
 */

/** 阶段统一结构（自主会话 AgentStage / flow trace 节点映射共用） */
export interface AgentStageItem {
  key?: string
  title: string
  /** pending / running / ok / error / skipped / stopped */
  status?: string
  startedAt?: number | null
  endedAt?: number | null
  detail?: string | null
  estimatedSecs?: number | null
}
