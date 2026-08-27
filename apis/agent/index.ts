/**
 * agent 通用控制与调试接口（llm 基础框架 /web/api/agent 的前端封装）
 *
 * 两类 agent 统一入口：自主会话（start/pause/resume/stop/status/events/rate）+
 * flow 编排管理（registry/detail/save/reset/traces，自 chatbi 上提泛化）。
 * request() 返回 {status, payload, response} 包装，业务数据在 resp.payload。
 */
import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, post } from '@/framework/network/request'

const agentApiType = '/api/agent'

// ==================== 自主会话 ====================

// 两类 agent 注册表清单（key/displayName/type: flow|autonomous/skillCode）
export const listAgents = () =>
  get(buildGetApiByType('/agents', agentApiType), {}, {}, false, false, false)

// 统一注册中心清单（三类归一：flow/autonomous/dynamic，agentCode/displayName/kind/skillCode；
// 历史/评价按 agentCode 归组的展示名数据源）
export const getAgentRegistry = () =>
  get(buildGetApiByType('/registry', agentApiType), {}, {}, false, false, false)

// 发起自主 agent 会话：返回状态快照（sessionId 供控制与轮询）；
// detachPolicy 可选覆盖（'STOP_ON_DETACH' 断开即停 / 'KEEP_RUNNING' 后台继续可重连），
// 策略由发起页面按场景定义，不传回落定义层默认
export const sessionStart = (agentKey: string, payload?: Record<string, any>, detachPolicy?: string) =>
  post(buildPostApiByType('/session/start', agentApiType), {}, { agentKey, payload, detachPolicy }, false)

// 暂停会话（note 暂停说明，事件流展示）；run 线程在下一检查点阻塞
export const sessionPause = (sessionId: string, note?: string) =>
  post(buildPostApiByType(`/session/${sessionId}/pause`, agentApiType), {}, { note }, false)

// 恢复会话（guidance 补充指导语注入下一轮上下文）
export const sessionResume = (sessionId: string, guidance?: string) =>
  post(buildPostApiByType(`/session/${sessionId}/resume`, agentApiType), {}, { guidance }, false)

// 作答 LLM 提问（ask_user 阻塞等待中）：answer 与 skipped 至少其一；
// 作答写入控制键由工具线程消费，问题状态随 status 轮询刷新
export const sessionAnswer = (sessionId: string, questionId: number, answer?: string, skipped?: boolean) =>
  post(buildPostApiByType(`/session/${sessionId}/answer`, agentApiType), {}, { questionId, answer, skipped }, false)

// 收口待确认口径（终态后可操作，重复收口幂等覆盖）：revised=false 一键确认（认可自决口径）；
// revised=true 改口径（note 新口径说明必填）——会话侧仅标状态，业务写回（重生成等）由前端另调业务端点
export const sessionResolveConfirmation = (sessionId: string, confirmationId: number, revised?: boolean, note?: string) =>
  post(
    buildPostApiByType(`/session/${sessionId}/confirmation/${confirmationId}/resolve`, agentApiType),
    {},
    { revised: !!revised, note },
    false
  )

// 停止会话（幂等）：停止键跨实例生效 + 属主线程中断加速收口
export const sessionStop = (sessionId: string) =>
  post(buildPostApiByType(`/session/${sessionId}/stop`, agentApiType), {}, {}, false)

// 会话状态快照（含阶段清单 stages 与失联判定）
export const sessionStatus = (sessionId: string) =>
  get(buildGetApiByType(`/session/${sessionId}/status`, agentApiType), {}, {}, false, false, false)

// 事件流增量读取（seq 大于 sinceSeq，前端 2s 轮询数据源）
export const sessionEvents = (sessionId: string, sinceSeq: number) =>
  get(buildGetApiByType(`/session/${sessionId}/events`, agentApiType), { sinceSeq }, {}, false, false, false)

// 活跃会话列表（本人发起的非终态会话，新→旧；刷新/重连场景数据源，
// 快照带 subject 供业务维度定向重连，如资产生成按业务 agentCode 筛）
export const sessionActive = (agentKey?: string) =>
  get(buildGetApiByType('/sessions/active', agentApiType), { agentKey }, {}, false, false, false)

// 会话整体评价（like/dislike，空=取消；feedback 收集反馈文本）
export const sessionRate = (sessionId: string, rating: string, feedback?: string) =>
  post(buildPostApiByType(`/session/${sessionId}/rate`, agentApiType), {}, { rating, feedback }, false)

// ==================== 通用评价（flow/autonomous 两型统一，skill 底座） ====================

// 回答评价（like/dislike，空=取消）：ratingId 业务自定（如 conversationId:messageId / sessionId）；
// 有业务钩子的 skill（如 chatbi 对话正文双写）由后端按 skillCode 分发接管记录组装
export const saveRating = (req: {
  skillCode: string
  ratingId: string
  rating?: string
  conversationId?: string
  messageId?: string
  question?: string
  answer?: string
  messageTime?: number
  ext?: Record<string, string>
}) => post(buildPostApiByType('/rating/save', agentApiType), {}, req, false)

// 评价运营统计（跨访问人聚合；类型/评价人/时间段/关键词通用维度 + extEquals 业务维度精确匹配，
// extEquals 以 JSON 对象串透传，如 {"tableId":"xxx"}）
export const getRatingStat = (params: {
  skillCode: string
  rating?: string
  operator?: string
  startTime?: number
  endTime?: number
  keyword?: string
  extEquals?: Record<string, string>
}) =>
  get(
    buildGetApiByType('/rating/stat', agentApiType),
    {
      ...params,
      extEquals:
        params.extEquals && Object.keys(params.extEquals).length > 0 ? JSON.stringify(params.extEquals) : undefined
    },
    {},
    false,
    false,
    false
  )

// ==================== flow 编排管理（自 chatbi 上提） ====================

// skill 注册表（skill 下链清单 + 画布可用结点类型 schema；工作台启动数据源）
export const getFlowRegistry = (skillCode: string) =>
  get(buildGetApiByType('/flow/registry', agentApiType), { skillCode }, {}, false, false, false)

// 流程编排详情（库中无自定义时后端返回内置默认链，builtin=true）
export const getFlowDetail = (flowKey: string) =>
  get(buildGetApiByType('/flow/detail', agentApiType), { flowKey }, {}, false, false, false)

// 保存流程编排（后端结构校验后落库，提示词即改即生效）
export const saveFlow = (flowKey: string, graph: Record<string, any>) =>
  post(buildPostApiByType('/flow/save', agentApiType), {}, { flowKey, graph }, false)

// 重置流程编排为内置默认链（删库中自定义记录，幂等）；后端无 @RequestBody，flowKey 走 query 绑定
export const resetFlow = (flowKey: string) =>
  post(buildPostApiByType('/flow/reset', agentApiType), { flowKey }, {}, false)

// 执行轨迹列表（Redis 按访问人保留；skillCode/flowKey 过滤，limit 截断新→旧）
export const getFlowTraces = (params: { skillCode?: string; flowKey?: string; limit?: number }) =>
  get(buildGetApiByType('/flow/traces', agentApiType), params, {}, false, false, false)

// 执行轨迹详情（含 llm 提示词/回答、extract 输入/结果全文）
export const getFlowTraceDetail = (traceId: string) =>
  get(buildGetApiByType(`/flow/trace/${traceId}`, agentApiType), {}, {}, false, false, false)

// ==================== 通用历史对话（跨 agent 聚合，llm conversation 底座） ====================

// 历史对话列表（当前访问人；agentCode 空=跨 agent 聚合，实现「历史在一起显示」）
// scope=all 跨发起人聚合（管理类页面看全量，列表项带 operator）；缺省只看本人
export const listConversations = (agentCode?: string, scope?: string) =>
  get(buildGetApiByType('/conversations', agentApiType), { agentCode, scope }, {}, false, false, false)

// 历史对话详情（正文消息列表，ext.payload 供业务壳重放应答）
export const getConversation = (conversationId: string) =>
  get(buildGetApiByType(`/conversations/${conversationId}`, agentApiType), {}, {}, false, false, false)

// 删除历史对话（幂等）
export const deleteConversation = (conversationId: string) =>
  post(buildPostApiByType(`/conversations/${conversationId}/delete`, agentApiType), {}, {}, false)

// 消息评价（like/dislike，空=取消；正文内嵌 rating + SkillRating 快照双写，返回改写后对话）
export const rateConversationMessage = (conversationId: string, messageId: string, rating: string) =>
  post(buildPostApiByType(`/conversations/${conversationId}/rate`, agentApiType), {}, { messageId, rating }, false)
