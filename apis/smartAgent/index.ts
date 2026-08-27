import {
  baseDomain,
  buildPostApiByType,
  addRequest,
  deleteRequest,
  generalQueryRequest,
  updateRequest
} from '@/framework/apis'
import { request } from '@/framework/network/request'
import { postSse, readSseStream } from '@/framework/utils/sse'

const agentType = '/insight/agent'
const agentAdminApi = agentType + '/admin'
const buildPostApi = (url: string, domain: string = baseDomain) => buildPostApiByType(url, agentType, domain)

export const queryAgents = (conditionList: Array<any>, sortList: Array<any>, pageSize: number, currentPage: number, domain: string = baseDomain) =>
  generalQueryRequest(agentAdminApi, undefined, conditionList, sortList, pageSize, currentPage, domain)

export const addAgent = (data: object, domain: string = baseDomain) => addRequest(agentAdminApi, data, domain)

export const updateAgent = (data: object, domain: string = baseDomain) => updateRequest(agentAdminApi, {}, data, domain)

export const deleteAgent = (id: string, domain: string = baseDomain) => deleteRequest(agentAdminApi, id, domain)

export const listAgentTables = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/tables', domain), {}, data, true, true) as Promise<any>

export const selectedAgentTables = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/tables/selected', domain), {}, data, true, true) as Promise<any>

export const saveAgentTables = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/tables/save', domain), {}, data, true, true) as Promise<any>

// 敏感治理实体清单（敏感字段 tab 行源：entities 草稿优先，无骨架按选表派生 + 实时列元数据）
export const getGovernEntities = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/govern/entities', domain), {}, data, true, true) as Promise<any>

// 键/分区预选（实体确认页行源：预选业务键+依据、候选列、分区识别、索引全清单实时读）
export const getGovernKeys = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/govern/keys', domain), {}, data, true, true) as Promise<any>

// 生成资产草稿：payload = { agentCode, mode }，mode = skeleton 仅骨架 / pipeline 固定流水线 / autonomous AI 自主
export const generateAgentAssets = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/generate', domain), {}, data, true, true) as Promise<any>

export const generateAgentProgress = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/generate/progress', domain), {}, data, true, true) as Promise<any>

// 停止生成任务（全局单任务）：写停止键 + 中断属主线程，已完成部分保留草稿，重新发起可继续
export const generateAgentStop = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/generate/stop', domain), {}, data, true, true) as Promise<any>

export const getAgentAsset = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/asset', domain), {}, data, true, true) as Promise<any>

export const saveAgentAsset = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/asset/save', domain), {}, data, true, true) as Promise<any>

// 表级模板（跨 Agent 复用）：显式保存/导入，防个别 Agent 特化配置随保存自动污染共享模板；
// list 为「从模板导入」预览（表全名/来源 Agent/更新时间），save/import 返回实际命中表清单 { tables: [] }
export const listAgentTemplates = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/list', domain), {}, data, true, true) as Promise<any>

export const saveAgentTemplates = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/save', domain), {}, data, true, true) as Promise<any>

export const importAgentTemplates = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/import', domain), {}, data, true, true) as Promise<any>

// 模板库管理页（跨数据源）：总览（数据源/库/表树源）、详情、手工编辑保存、删除；模板身份 = ds_name + table_name
export const listAllTemplates = (domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/all', domain), {}, {}, true, true) as Promise<any>

export const getTemplateDetail = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/detail', domain), {}, data, true, true) as Promise<any>

export const updateTemplate = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/update', domain), {}, data, true, true) as Promise<any>

export const deleteTemplate = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/table-template/delete', domain), {}, data, true, true) as Promise<any>

// AI 评审报告（最新一份；无报告返空串）：评审自主会话落盘，发布/校验不参与；评审面板与生成入口弱提醒共用
export const getReviewReport = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/review/report', domain), {}, data, true, true) as Promise<any>

// 评审条目处理标记/撤销（人工消化闭环）：resolved 写回报告 JSON 落盘；index 为 items 原始下标
export const resolveReviewItem = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/review/report/resolve', domain), {}, data, true, true) as Promise<any>

// 单类资产 LLM 重生成（指标/关系/概念/敏感字段；guidance 人工指导语可空），进度复用 /generate/progress
export const regenAgentAsset = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/asset/regenerate', domain), {}, data, true, true) as Promise<any>

// 资产编辑页 AI 补全（指标/关系/概念单条表单）：已填项保留、空缺项按专属提示词+骨架补齐，
// 同步返回补全后对象（不落盘，用户确认保存才盖章认证）
export const aiCompleteAgentAsset = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/asset/ai-complete', domain), {}, data, true, true) as Promise<any>

// AI 补全 SSE 流式版（主入口）：tick 心跳（data=已耗时秒）+ delta token 增量经 onEvent 实时回调，
// done 携带补全后 JSON 全文并解析返回；error/断流以异常抛出（活性可见，转圈可分辨死活）；
// fetch 直连不走 axios（axios 不支持流式读响应体），鉴权头同 request.ts 口径
export const aiCompleteAgentAssetStream = async (
  data: object,
  onEvent: (event: string, text: string) => void,
  domain: string = baseDomain
) => {
  const resp = await postSse(
    import.meta.env.VITE_baseURL + domain + '/web' + agentType + '/admin/asset/ai-complete/stream', data)
  if (!resp.ok || !resp.body) {
    throw new Error(resp.status === 401 ? '登录状态已失效，请重新登录' : `请求失败（HTTP ${resp.status}）`)
  }
  let formJson = ''
  let errText = ''
  await readSseStream(resp.body, (event, text) => {
    if (event === 'done') formJson = text
    else if (event === 'error') errText = text || 'AI 补全失败'
    else onEvent(event, text)
  })
  if (errText) throw new Error(errText)
  if (!formJson) throw new Error('连接中断，未收到补全结果')
  return JSON.parse(formJson)
}

// 资产包导入（skill 调试产物）：七类资产整体覆盖，后端存草稿后直接发布刷新，上传即可用
export const importAgentAssets = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/assets/import', domain), {}, data, true, true) as Promise<any>

export const publishAgent = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/publish', domain), {}, data, true, true) as Promise<any>

// 资产草稿交叉校验（发布前预检）：payload = { hasErrors, issues: [{ assetType, level, message }] }
export const validateAgentAssets = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/validate', domain), {}, data, true, true) as Promise<any>

// 发布校验错误一键自动修复：悬空引用类确定性修复后重校验；
// payload = { summary: 逐类修复摘要, hasErrors, issues: 修复后剩余问题 }
export const autoFixAgentAssets = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/validate/auto-fix', domain), {}, data, true, true) as Promise<any>

// 配置自查（确定性无 LLM）：探人工配置疑似错误（单位矛盾/缺单位/码值域覆盖不全），
// payload = findings 清单（snake_case：type/entity/table/field/current/suggestion/evidence/missing_codes）；
// 已裁决经验（unitVerified/ignoredCodes）自动免检，同表复用不重复提疑点
export const detectAgentConflicts = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/conflicts/detect', domain), {}, data, true, true) as Promise<any>

// 配置疑点逐条裁决：adopt 采纳建议（写配置）/ keep 维持原值（不改配置），两者都固化为经验标记；
// 不提供批量裁决（语义裁决须逐条），返回裁决后剩余疑点清单
export const resolveAgentConflict = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/conflicts/resolve', domain), {}, data, true, true) as Promise<any>

// 各 Agent 未发布草稿资产数（管理页行内徽标 + 发布提醒）
export const draftAssetCounts = (domain: string = baseDomain) =>
  request(buildPostApi('/admin/draft-counts', domain), {}, {}, true, true) as Promise<any>

export const getAgentPrompts = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/prompts', domain), {}, data, true, true) as Promise<any>

export const saveAgentPrompts = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/prompts/save', domain), {}, data, true, true) as Promise<any>

export const getDefaultPrompts = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/prompts/defaults', domain), {}, data, true, true) as Promise<any>

export const refreshAgents = (domain: string = baseDomain) =>
  request(buildPostApi('/admin/refresh', domain), {}, {}, true, true) as Promise<any>

// 维护问数：自然语言 → LLM 解析 → 校验；资产缺失时 LLM 建议资产 + 临时层一次性作答，建议落待审提案
export const maintainAsk = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/ask', domain), {}, data, true, true) as Promise<any>

// 维护问数（提交+轮询，SSE 替代主通道）：submit 即刻返回 ticketId；poll 每 2s 增量拉 steps + 终态；cancel 停止
export const maintainAskSubmit = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/ask/submit', domain), {}, data, true, true) as Promise<any>

export const maintainAskPoll = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/ask/poll', domain), {}, data, true, true) as Promise<any>

export const maintainAskCancel = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/ask/cancel', domain), {}, data, true, true) as Promise<any>

// 歧义确认作答：编排阻塞在 askUser 等待时，前端选项卡作答唤醒继续（answer 空=交由 AI 决定）
export const maintainAskAnswer = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/ask/answer', domain), {}, data, true, true) as Promise<any>

// 自主维护问数（agent 会话）：返回 sessionId，过程事件流/暂停/补语/停止经通用会话端点 /web/api/agent/session/*
export const maintainAgentAsk = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/agent/ask', domain), {}, data, true, true) as Promise<any>

export const listProposals = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/proposals/list', domain), {}, data, true, true) as Promise<any>

// 各 Agent 待审提案数（管理页行内徽标 + 未处理提示）
export const pendingProposalCounts = (domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/proposals/pending-counts', domain), {}, {}, true, true) as Promise<any>

export const mergeProposals = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/proposals/merge', domain), {}, data, true, true) as Promise<any>

export const rejectProposals = (data: object, domain: string = baseDomain) =>
  request(buildPostApi('/admin/maintain/proposals/reject', domain), {}, data, true, true) as Promise<any>
