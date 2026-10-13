/**
 * agent 勾选定义读写面（core/agent-console，M14 棒 6-E 的 `AgentDefinitionAdminController`）。
 *
 * 🔴 五栏都是**三态**，请求体里必须原样保留 null：
 * `null`＝该维未启用＝全部放行（存量 agent 的形态）／`[]`＝显式勾了零个＝该维登记过的全不给／非空＝取交集。
 * 页面把"未启用"渲染成"全不勾"＝把放行改成关停，所以这一区分在 TS 侧也不能靠 `?? []` 抹平。
 *
 * 写口是**整组覆盖**不是补丁：一次请求给齐五栏，省略某一栏与显式给 null 同义。
 * 闸门在 core 的服务层（平台管理员），前端不建权限表；被拒时 `showErr` 把 `status.details` 弹成红条。
 */
import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { get, post } from '@/framework/network/request'

const definitionApiType = '/api/agent/definition'

/** 三态勾选清单：null＝未启用（放行）／[]＝全不给／非空＝取交集 */
export type SelectionNames = string[] | null

/** agent 勾选视图（sys_agent_definition 一行 + 运行期注册表的展示信息） */
export interface AgentDefinitionView {
  agentKey: string
  /** 注册表里没有该 agent 时为空 */
  displayName?: string
  /** FLOW／AUTONOMOUS／DYNAMIC；同上 */
  kind?: string
  /** false＝运行期注册表里没有这个 agent（多为已退役 agent 留下的历史勾选行） */
  registered: boolean
  /** false＝库里没这行＝从未勾选（三态第一态） */
  hasRow: boolean
  /** 唯一参与运行期的列名（其余四栏本棒只登记） */
  runtimeColumn: string
  capabilityPackages?: SelectionNames
  systemSkills?: SelectionNames
  externalCapabilities?: SelectionNames
  modelPurpose?: SelectionNames
  promptSegments?: SelectionNames
  /** 最后改勾选人的工号（审计列，页面回显用） */
  updateBy?: string
  /** 姓名派生列：读端点按工号查 ac_user.name 回填，查不到为空 ⇒ 页面回落到工号 */
  updateByName?: string
  updateAt?: string
}

/** 写入命令：五栏一次给齐，null＝该栏置回未启用 */
export interface AgentSelectionCmd {
  capabilityPackages: SelectionNames
  systemSkills: SelectionNames
  externalCapabilities: SelectionNames
  modelPurpose: SelectionNames
  promptSegments: SelectionNames
}

/**
 * 勾选清单：在跑的 agent 全列出（含从未勾过的），末尾补注册表查不到的历史行。
 * showErr=true——非管理员被服务层闸拒时要弹出那句，不能静默回空表。
 */
export const listAgentDefinitions = () =>
  get(buildGetApiByType('/list', definitionApiType), {}, {}, false, false, true) as Promise<{
    payload: AgentDefinitionView[]
  }>

/** 单个 agent 的勾选视图（键名两边都查不到时服务端拒绝） */
export const getAgentDefinition = (agentKey: string) =>
  get(buildGetApiByType(`/${agentKey}`, definitionApiType), {}, {}, false, false, true) as Promise<{
    payload: AgentDefinitionView
  }>

/**
 * 整组覆盖五栏勾选（改完下一场会话即刻生效，进行中的会话不受影响）。
 * showSuccess=false：成功提示由页面自己给（要带上"下一场会话生效"这句，服务端 notice 说不清）
 */
export const saveAgentSelection = (agentKey: string, cmd: AgentSelectionCmd) =>
  post(buildPostApiByType(`/${agentKey}/selection`, definitionApiType), {}, cmd, false) as Promise<{
    payload: AgentDefinitionView
  }>
