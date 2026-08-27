/**
 * SkillWorkbench api 适配器工厂（skillCode → 通用 /web/api/agent 端点）
 *
 * flow 编排与评价端点已上提 llm 通用底座（framework/apis/agent），各 skill 工作台
 * （chatbi / smart-agent …）不再各写一份薄封装：skillCode 传入即得一套
 * registry/flow/trace/rating 适配器，业务差异只剩 flowMeta 文案与 extraTabs。
 */
import {
  getFlowDetail,
  getFlowRegistry,
  getFlowTraceDetail,
  getFlowTraces,
  getRatingStat,
  resetFlow,
  saveFlow
} from '@/framework/apis/agent'
import type { SkillGraph, SkillRatingQuery, SkillWorkbenchApi } from '@/framework/components/common/skill/SkillWorkbench.vue'

export interface SkillWorkbenchApiOptions {
  /** 是否接入评价统计 Tab（false 时不注入 getRatingStat，组件整体隐藏该 Tab） */
  rating?: boolean
}

export function createSkillWorkbenchApi(skillCode: string, options: SkillWorkbenchApiOptions = {}): SkillWorkbenchApi {
  const withRating = options.rating !== false
  const api: SkillWorkbenchApi = {
    getRegistry: () => getFlowRegistry(skillCode),
    getFlow: (flowKey: string) => getFlowDetail(flowKey),
    saveFlow: (flowKey: string, graph: SkillGraph) => saveFlow(flowKey, graph as Record<string, any>),
    resetFlow: (flowKey: string) => resetFlow(flowKey),
    getTraces: (flowKey: string) => getFlowTraces({ skillCode, flowKey: flowKey || undefined }),
    getTraceDetail: (traceId: string) => getFlowTraceDetail(traceId)
  }
  if (withRating) {
    api.getRatingStat = (query: SkillRatingQuery) =>
      getRatingStat({
        skillCode,
        rating: query.rating,
        operator: query.operator,
        startTime: query.startTime,
        endTime: query.endTime,
        keyword: query.keyword,
        extEquals: query.extEquals
      })
  }
  return api
}
