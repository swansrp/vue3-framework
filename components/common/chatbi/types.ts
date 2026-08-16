/**
 * 智能问数（ChatBI）类型定义
 *
 * 与后端 com.bidr.insight.vo 协议严格对齐：
 * - 请求：ChatBiAskReq（tableId + question + history，POST /web/insight/chatbi/ask）
 * - 生成物：ChatBiSpec（charts + tables 轻量编排指令，SSE spec 事件下发）
 * - 语义目录：ChatBiSemanticCatalog（GET /web/insight/chatbi/semantic）
 *
 * 前端拿到 spec 后经 specMerge 合并指标卡片完整配置，
 * 复用 ChartCard / portal 穿透表渲染（见 specMerge.ts）
 */

// ===== 请求与对话历史 =====

export type ChatBiRole = 'user' | 'assistant'

export interface ChatBiHistoryItem {
  role: ChatBiRole
  content: string
}

export interface ChatBiAskReq {
  tableId: string
  question: string
  /** 前端编排的完整 system 提示词（开发调试模式传入；空则后端按语义目录拼装） */
  systemPrompt?: string
  /** 历史对话标识（续问传上一轮 SSE conv 事件回传值；空=新对话由后端创建） */
  conversationId?: string
  /** 看板名（全局模式路由命中名透传，历史对话恢复头部标识用） */
  portalName?: string
  history?: ChatBiHistoryItem[]
}

// ===== 生成物协议（```chart-spec JSON）=====

export interface ChatBiTimeFilter {
  // 日期字段属性名（语义目录 fields[].property）
  property: string
  // 开始值（含），格式与字段目录一致，如 2024-01-01
  start: string
  // 结束值（含），如 2024-12-31
  end: string
}

export interface ChartPatch {
  // 图表类型：bar/line/ptLine/pie/metricsPie/treeStackedBar/rankingBar/comparisonBar
  chartType?: string
  // 可见一级维度项名称（firstDimension.indicatorItems[].itemName 子集）
  visibleFirstDimensions?: string[]
  // 可见二级维度项名称（secondDimension.indicatorItems[].itemName 子集）
  visibleSecondDimensions?: string[]
  // 可见统计指标名称（dataMetrics[].dataName 子集，空则全部）
  visibleMetrics?: string[]
  timeFilter?: ChatBiTimeFilter | null
}

export interface BlueprintMetric {
  // 指标显示名（缺省取字段显示名，计数类用“数量”）
  name?: string
  // 聚合字段（空=计数 count(1)；字段目录中数值类字段，metricsPie 必填）
  field?: string
}

// 图表自造参数：LLM 按用户提问填充的语义插槽（ChartSpec.config），
// 前端 specMerge.forgeChartItem 编译成完整指标卡片配置后交给 ChartCard 渲染
export interface ChartBlueprint {
  // 图表标题（中文，面向业务用户）
  title?: string
  // 图表类型：bar/line/ptLine/pie/metricsPie/treeStackedBar/rankingBar/comparisonBar
  chartType?: string
  // 一级维度字段（bar/line/ptLine/pie 必填；字段目录中有 values 的字段）
  dimensionField?: string
  // 一级维度项（可选子集与顺序，label/value 取自字段 values；缺省=全量展开）
  dimensionItems?: SemanticValue[]
  // 二级维度字段（可选，交叉分析）
  secondDimensionField?: string
  // 二级维度项（可选）
  secondDimensionItems?: SemanticValue[]
  // 树维度字段（treeStackedBar 必填；fieldType=tree/tree-multi）
  treeField?: string
  // 统计指标（1~4 个）
  metrics?: BlueprintMetric[]
  // 分组字段（rankingBar 必填；X 轴取 Top-N 的实体/文本字段）
  groupByField?: string
  // 排行数量（rankingBar，默认 10）
  topN?: number
  // 排行排序（rankingBar）：asc-从小到大 / desc-从大到小（默认）
  sortOrder?: string
  // 周期日期字段（comparisonBar 必填；字段目录中的日期字段）
  dateField?: string
  // 卡片级筛选条件（与表格条件同构，编译进图表全局筛选）
  filters?: ChatBiConditionNode[]
  // 时间范围过滤（编译进图表全局筛选的介于条件）
  timeFilter?: ChatBiTimeFilter | null
}

export interface ChartSpec {
  // 指标卡片 id（复用已配置卡片时必填，与 config 二选一）：
  // 雪花大数会被安全转字符串（useChatBiStream.safeParse），与指标树节点 id 统一按字符串比较
  indicatorId?: number | string
  reason?: string
  // indicatorId 形态适用：轻量补丁（未给出的项沿用卡片默认配置）
  patch?: ChartPatch
  // 自造形态（与 indicatorId 二选一）：语义插槽由前端编译成完整卡片配置
  config?: ChartBlueprint
}

export interface ChatBiConditionNode {
  property: string
  // 1-等于/2-不等于/3-大于/4-大于等于/5-小于/6-小于等于/9-模糊匹配/11-在列表内/13-介于/15-包含
  relation: number
  // 介于为 [start, end] 两项，在列表内为多值
  value: string[]
  // 与上一条件的连接方式：0-且 / 1-或
  andOr?: '0' | '1'
}

export interface TableSpec {
  title?: string
  reason?: string
  conditions?: ChatBiConditionNode[]
}

export interface ChatBiSpec {
  charts?: ChartSpec[]
  tables?: TableSpec[]
}

// ===== 语义目录 =====

export interface SemanticIndicator {
  id: number | string
  title: string
  subTitle?: string
  description?: string
  dimensions?: string[]
  metrics?: string[]
  chartTypes?: string[]
}

export interface SemanticValue {
  // 条件取值（字典 dictValue，筛选条件实际生效值）
  value: string
  // 业务显示名（字典 label）
  label: string
}

export interface SemanticField {
  property: string
  label: string
  // 语义化类型：text/enum/enum-multi/tree/tree-multi/boolean/number/money/percent/date/datetime/entity
  fieldType?: string
  // 可选值域（enum/tree 类字段；超长被后端截断，取值必须用 value 而非 label）
  values?: SemanticValue[]
  // 树字典编码（仅 tree/tree-multi 有值；treeStackedBar 自造图编译 treeDimension 依赖）
  dictName?: string
  // 日期格式标识（DATETIME/YYYY-MM-DD/YYYYMMDD/YYYY-MM/YYYYMM/YYYY）
  dateFormat?: string
  aggregate?: boolean
  // 敏感列标注（值域不外泄：列定义保留供指名查询，values 不下发）
  sensitive?: boolean
  // 配对替换列属性名（如 项目名称→项目编号，跨轮/批量子集查询改用它做条件）
  replaceProperty?: string
}

// indicator 筛选组（sys_portal_indicator_group）：用户口语筛选（如"华北区域"）的落点，
// 命中项 conditions 即前端筛选提交的叶子条件，模型应原样复制进 tables[].conditions
export interface SemanticIndicatorCondition {
  property: string
  // 与 ChatBiConditionNode.relation 同义：1-等于 11-在列表内 …
  relation?: number
  value: string[]
}

export interface SemanticIndicatorGroupItem {
  // 项名（用户口语指向，如：华北）
  title: string
  // 项标识（sys_portal_indicator.item_value）
  key?: string
  // 命中该项时应满足的叶子条件
  conditions?: SemanticIndicatorCondition[]
}

export interface SemanticIndicatorGroup {
  // 组名（如：区域）
  title: string
  items: SemanticIndicatorGroupItem[]
}

export interface ChatBiSemanticCatalog {
  tableId: string
  portalName?: string
  indicators: SemanticIndicator[]
  // 看板预设筛选组（口语筛选优先落点，未配置时为空）
  indicatorGroups?: SemanticIndicatorGroup[]
  fields: SemanticField[]
}

// ===== 看板路由（全局模式：每次提问结合上下文重新选板）=====

export interface ChatBiRouteItem {
  // 看板标识（sys_portal.name，即 portalName；语义目录/表格渲染同键）
  tableId: string
  portalName?: string
  // 看板中文名（sys_portal.display_name，辅助路由判断与列表展示）
  title?: string
  // 业务描述（后端 insight_chatbi_table_desc，供大模型判断看板相关性）
  description?: string
}

export interface ChatBiRouteRes {
  // 选中的表格code；null 表示未能匹配看板
  tableId?: string | null
  portalName?: string
}

// ===== 敏感列配置（值不外泄：列定义保留供指名查询，值域清单不下发模型）=====

export interface ChatBiSensitiveColumn {
  // 列属性名（配置锚点，portal 模式=column.property，DATASET 模式=columnAlias）
  property: string
  label?: string
  // 语义化类型（与语义目录 fieldType 同口径）
  fieldType?: string
  // 列备注（DATASET 模式 remark 原文）
  remark?: string
  // 是否已配置为敏感列
  sensitive?: boolean
  // 配对替换列属性名（如 项目名称→项目编号；未配置为空）
  replaceProperty?: string
}

export interface ChatBiSensitiveSaveReq {
  tableId: string
  // 整板覆盖：全量勾选的敏感列及其配对列（空数组即清空该板敏感配置）
  columns: { property: string; replaceProperty?: string }[]
}

export interface ChatBiRouteReq {
  question: string
  // 当前看板 tableId（模型判断话题延续还是切板用，可空）
  currentTableId?: string
  // 最近对话（user/assistant 正文，理解指代与话题延续）
  history?: ChatBiHistoryItem[]
}

// ===== 流程编排（DAG 管理页 #/insight/chatbi/config）=====

export interface ChatBiFlowNode {
  id: string
  // 结点类型（registry.nodeTypes[].type 开放集；chatbi 已知成员：
  // start/semantic/route_catalog/llm/extract/output，新类型由执行器元数据驱动渲染）
  type: string
  name?: string
  // 类型专属配置：llm 的 template/role/stream/includeHistory/userVar/outputVar、
  // extract 的 mode/inputVar、output 的 outputs、semantic 的 tableIdVar/outputVar 等
  config?: Record<string, unknown>
  x?: number
  y?: number
  // false=跳过执行，控制流直通（画布上禁用结点不断链）
  enabled?: boolean
}

export interface ChatBiFlowEdge {
  source: string
  target: string
  // 条件表达式：空=恒真 / var == 'x' / var != 'x' / notEmpty(var)
  condition?: string
}

export interface ChatBiFlowGraph {
  nodes: ChatBiFlowNode[]
  edges: ChatBiFlowEdge[]
}

export interface ChatBiFlowDetail {
  flowKey: string
  name?: string
  // true=库中无自定义（后端返回内置默认链），重置即回到此链
  builtin: boolean
  graph: ChatBiFlowGraph
}

// ===== skill 注册表（GET /flow/registry；工作台启动数据源）=====

// 结点类型配置项 schema（与后端 FlowNodeMeta.ConfigField 对齐；input 决定控件）
export interface ChatBiFlowConfigField {
  // config 键（读写 graph.nodes[].config[key]）
  key: string
  label?: string
  // 控件类型：text/textarea/select/switch/outputMap
  input?: string
  // 输入提示（text/textarea）
  placeholder?: string
  // switch 的行内提示
  hint?: string
  // textarea 行数
  rows?: number
  // select 选项（value 即 config 存值）
  options?: { value: string; label?: string }[]
  // 画布新增结点的初始 config 值（null/undefined 不预置该键）
  defaultValue?: unknown
}

// 结点类型元数据（执行器声明；palette 与属性表单据此 schema 渲染，新结点类型前端零改动）
export interface ChatBiFlowNodeMeta {
  type: string
  // 画布显示名（palette 名称与新增结点缺省名）
  label?: string
  // 类型职责一句话（palette 提示）
  desc?: string
  // 结点级块提示（属性面板尾部），空不渲染
  hint?: string
  // 配置表单 schema（空=该类型无需额外配置）
  fields?: ChatBiFlowConfigField[]
}

export interface ChatBiFlowRegistry {
  skillCode: string
  // skill 下的链清单（画布链切换封闭集成员）
  flows: { flowKey: string; displayName?: string }[]
  // 画布可用结点类型（该 skill 各链当前生效 graph 出现过的类型并集，业务私有类型不跨 skill 泄漏）
  nodeTypes: ChatBiFlowNodeMeta[]
}

// ===== 执行轨迹（skill 调试反馈回路；后端内存最近 50 条，重启即清）=====

export interface ChatBiFlowTraceNodeEvent {
  nodeId: string
  type: string
  name?: string
  // ok | skipped | error
  status: string
  // 结点耗时（毫秒；流式挂起结点只含发起阶段）
  elapsedMs: number
  // 变量摘要（一行：模型输出字数/提取结果/目录条数等）
  summary?: string
  // 调试全文（llm 渲染后提示词与模型回答、extract 输入与提取结果；其余类型为空）
  detail?: string | null
}

export interface ChatBiFlowTraceRecord {
  traceId: string
  // route | ask
  flowKey: string
  startTime?: number | null
  // running 态为空
  endTime?: number | null
  // running | success | error
  status: string
  // 用户问题摘要（截断 200 字）
  question?: string
  // 访问人（发起本次执行的操作员，列表按访问人隔离）
  operator?: string
  // true=本次执行用的是内置默认链（库中无自定义或非法回落）
  builtin?: boolean
  // 失败原因（status=error 时）
  error?: string | null
  // 结点事件（按执行顺序；列表视图不带，详情才有）
  nodes?: ChatBiFlowTraceNodeEvent[]
}

// ===== 会话消息（面板渲染态）=====

export type ChatBiMessageStatus = 'pending' | 'done' | 'error' | 'stopped'

export interface ChatBiMessage {
  id: string
  role: ChatBiRole
  content: string
  spec?: ChatBiSpec | null
  status: ChatBiMessageStatus
}

// ===== 历史对话（Redis 按访问人保留，天数见系统参数）=====

export interface ChatBiConversationMessage {
  role: ChatBiRole
  content: string
  /** assistant 的 chart-spec 编排指令（结构化对象，恢复渲染经 specMerge 重建图表/表格） */
  spec?: ChatBiSpec | null
  /** done-正常 / error-失败（失败回复恢复时按错误样式展示） */
  status?: string
  /** 本条消息关联看板（恢复时图表取数用；全局模式一次对话可能换板，消息级存） */
  tableId?: string
  portalName?: string
  /** 消息时间（毫秒时间戳） */
  time?: number
  /** 消息标识（后端生成；assistant 消息经 SSE msgid 事件回传，评价时按它定位） */
  messageId?: string
  /** 用户评价：like-点赞 / dislike-点踩 / 空-未评价（仅 assistant 消息有值） */
  rating?: string | null
}

export interface ChatBiConversation {
  conversationId: string
  /** 对话标题（首问摘要，截断 50 字） */
  title?: string
  operator?: string
  createTime?: number
  /** 最近活跃时间（列表按它倒序） */
  updateTime?: number
  /** 消息条数（列表视图展示用） */
  messageCount?: number
  /** 消息明细（列表视图不带，详情才有） */
  messages?: ChatBiConversationMessage[]
}

// ===== 回答评价（对话内嵌回显 + 全局运营统计）=====

export interface ChatBiRateReq {
  conversationId: string
  /** 被评价的助手消息标识（空=最近一条回答） */
  messageId?: string
  /** like-点赞 / dislike-点踩 / 空-取消评价 */
  rating?: string
}

export interface ChatBiRatingRecord {
  ratingId: string
  conversationId: string
  messageId?: string
  /** 评价人（对话归属人，统计跨人聚合） */
  operator?: string
  /** 该轮提问摘要（截断 200 字） */
  question?: string
  /** 被评价回答摘要（截断 200 字） */
  answer?: string
  /** like-点赞 / dislike-点踩 */
  rating?: string
  tableId?: string
  portalName?: string
  /** 回答消息时间（毫秒时间戳） */
  messageTime?: number
  /** 评价时间（毫秒时间戳，列表按它倒序） */
  ratingTime?: number
}

export interface ChatBiRatingStatRes {
  total: number
  likeCount: number
  dislikeCount: number
  /** 按评价时间倒序，上限 1000 条 */
  records: ChatBiRatingRecord[]
}
