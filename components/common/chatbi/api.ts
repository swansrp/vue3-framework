/**
 * 智能问数后端接口
 *
 * 问答走 useChatBiStream 的 SSE fetch（axios 不支持流式），这里只放普通 GET/POST。
 * request() 返回 {status, payload, response} 包装，业务数据在 resp.payload。
 */
import type { ChatBiFlowGraph, ChatBiRateReq, ChatBiRouteReq, ChatBiSensitiveSaveReq } from './types'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import {
  getFlowDetail,
  getFlowRegistry,
  getFlowTraceDetail,
  getFlowTraces,
  getRatingStat,
  resetFlow,
  saveFlow,
  saveRating
} from '@/framework/apis/agent'
import { get, post } from '@/framework/network/request'

// 语义目录（指标卡片清单 + 字段元数据）；失败静默，由调用方兜底
export const getChatBiSemantic = (tableId: string) =>
  get(buildGetApiByType('/insight/chatbi/semantic'), { tableId }, {}, false, false, false)

// 敏感列配置页列清单（看板全量有效列 + 敏感标记与配对列回显；含不可筛选的文本列）
export const getChatBiSensitiveColumns = (tableId: string) =>
  get(buildGetApiByType('/insight/chatbi/sensitive/columns'), { tableId }, {}, false, false, false)

// 保存敏感列配置（整板覆盖：勾选列+配对替换列，空清单即清空恢复；即改即生效不受目录缓存影响）
export const saveChatBiSensitiveColumns = (req: ChatBiSensitiveSaveReq) =>
  post(buildPostApiByType('/insight/chatbi/sensitive/save'), {}, req, false)

// 看板路由目录（候选注册制：仅写了业务描述的看板；路由失败时也可用于手动选板）
export const getChatBiRouteCatalog = () =>
  get(buildGetApiByType('/insight/chatbi/route/catalog'), {}, {}, false, false, false)

// 看板路由：按问题选出最相关看板（全局模式每次提问都带当前看板与最近对话重路由）；
// payload.tableId 为空表示未命中，由调用方引导手动选板
export const routeChatBi = (req: ChatBiRouteReq) =>
  post(buildPostApiByType('/insight/chatbi/route'), {}, req, false)

// 保存看板业务描述（写描述=注册进路由候选，description 空白视为注销）
export const saveChatBiTableDesc = (tableId: string, description?: string) =>
  post(buildPostApiByType('/insight/chatbi/route/desc'), {}, { tableId, description }, false)

// 全量看板与业务描述（候选注册管理页数据源；desc Tab 左树据此按 display_name 的 '-' 分隔建 folder）
export const getChatBiPortalDescAll = () =>
  get(buildGetApiByType('/insight/chatbi/route/desc/all'), {}, {}, false, false, false)

// AI 生成看板描述草稿（后端汇总看板元数据喂模型，不落库；payload 为草稿文本，回填编辑框供修改）
export const generateChatBiTableDesc = (tableId: string) =>
  get(buildGetApiByType('/insight/chatbi/route/desc/generate'), { tableId }, {}, false, false, false)

// ── flow 编排六端点已上提 llm 通用 /web/api/agent/flow/*（ChatBiController 删原端点），
// 此处薄委托 apis/agent 保持导出签名不变（config.vue 注入面零改动）──

// skill 注册表（skill 下链清单 + 画布可用结点类型 schema；工作台启动数据源，新结点类型前端零改动）
export const getChatBiFlowRegistry = (skillCode: string) => getFlowRegistry(skillCode)

// 流程编排详情（库中无自定义时后端返回内置默认链，builtin=true）
export const getChatBiFlow = (flowKey: string) => getFlowDetail(flowKey)

// 保存流程编排（后端结构校验后落库，提示词即改即生效）
export const saveChatBiFlow = (flowKey: string, graph: ChatBiFlowGraph) => saveFlow(flowKey, graph)

// 重置流程编排为内置默认链（删库中自定义记录，幂等）
export const resetChatBiFlow = (flowKey: string) => resetFlow(flowKey)

// 执行轨迹列表（Redis 按访问人保留，天数见系统参数；flowKey 空返回全部链路；列表视图不带结点事件）
export const getChatBiFlowTraces = (flowKey?: string) => getFlowTraces(flowKey ? { flowKey } : {})

// 执行轨迹详情（含 llm 渲染后提示词/模型回答、extract 输入/提取结果全文）
export const getChatBiFlowTraceDetail = (traceId: string) => getFlowTraceDetail(traceId)

// 历史对话列表（Redis 按访问人保留，天数见系统参数；新→旧，列表视图不带消息明细）
export const getChatBiConversations = () =>
  get(buildGetApiByType('/insight/chatbi/conversation/list'), {}, {}, false, false, false)

// 对话详情（含全部消息与 chart-spec，前端恢复渲染用）
export const getChatBiConversationDetail = (conversationId: string) =>
  get(buildGetApiByType('/insight/chatbi/conversation/detail'), { conversationId }, {}, false, false, false)

// 删除历史对话（仅能删自己的；删除当前对话后面板按新对话处理）
export const deleteChatBiConversation = (conversationId: string) =>
  post(buildPostApiByType('/insight/chatbi/conversation/delete'), { conversationId }, {}, false)

// ── 评价两端点已上提 llm 通用 /web/api/agent/rating/*（ChatBiController 删原端点），
// 此处薄委托 apis/agent 保持导出签名不变（对话正文双写由后端 ChatBiRatingListener 钩子承接）──

// 评价助手回复（like/dislike，空=取消；messageId 空=最近一条回答，仅能评自己的对话）
export const rateChatBi = (req: ChatBiRateReq) =>
  saveRating({
    skillCode: 'chatbi',
    ratingId: `${req.conversationId}:${req.messageId || ''}`,
    rating: req.rating
  })

// 评价运营统计（跨访问人聚合；筛选：类型/看板/评价人/时间段/关键词，看板维度经 extEquals 透传）
export const getChatBiRatingStat = (params: {
  rating?: string
  tableId?: string
  operator?: string
  startTime?: number
  endTime?: number
  keyword?: string
}) =>
  getRatingStat({
    skillCode: 'chatbi',
    rating: params.rating,
    operator: params.operator,
    startTime: params.startTime,
    endTime: params.endTime,
    keyword: params.keyword,
    extEquals: params.tableId ? { tableId: params.tableId } : undefined
  })
