<!--
 * 智能问数面板（主组件）
 *
 * 职责：外壳走通用聊天父组件 AgentChatPanel（气泡/滚动/输入区/历史抽屉/评价内置），
 * 本页保留业务编排——SSE 流式问答（useChatBiStream，引擎与后端链路不动），
 * 把 LLM 返回的 chart-spec 经 specMerge 合并为 DashboardItem / 穿透表条件，
 * 分别交给 ChatBiChart / ChatBiTable 渲染（#message-body 注入）；维护最近 5 轮问答上下文。
 * 对话历史走通用 /api/agent/conversations 端点（agentCode=flow:ask 过滤），
 * 首问自动建新对话并经 SSE conv 事件回传 conversationId，续问据此续接；
 * 历史恢复经 restore-conversation 拿详情，按 ext.spec 重放 applySpec。
 *
 * 用法：<ChatBiPanel :table-id="'PmpProjectlifeCycleDataset'" />
 * 全局模式：不传 tableId 时先经 LLM 路由（ChatBiRouterService）选出最相关看板再问答，
 * 路由结果（看板名）显示在头部（#header-extra），清空会话即回到未选板状态。
 * 高度由外层容器给定（height: 100%）。
-->
<template>
  <div class="chatbi-panel">
    <AgentChatPanel
      ref="panelRef"
      :title="title"
      :messages="messages"
      :loading="loading"
      :sendable="!routing"
      :agent-code="'flow:ask'"
      :input-placeholder="placeholder"
      :digest-message="digestMessage"
      @send="send"
      @stop="stop"
      @new-conversation="newConversation"
      @restore-conversation="onRestoreConversation"
    >
      <!-- 全局模式：路由命中的看板名，帮助用户确认问题被送到了哪个数据集 -->
      <template #header-extra>
        <a-tag
          v-if="!tableId && activePortalName"
          class="header-board"
          :bordered="false"
        >
          {{ activePortalName }}
        </a-tag>
      </template>

      <template #empty>
        <div class="cb-empty">
          <RobotOutlined class="empty-icon" />
          <p class="empty-text">
            {{ emptyText }}
          </p>
          <div class="suggest-list">
            <a-tag
              v-for="(q, i) in suggestQuestions"
              :key="i"
              class="suggest-tag"
              @click="useSuggest(q)"
            >
              {{ q }}
            </a-tag>
          </div>
        </div>
      </template>

      <!-- 业务产物：流式正文 / 图表 / 表格（气泡尾部时间与评价由面板内置） -->
      <template #message-body="{ msg }">
        <template v-if="(msg as PanelMsg).status === 'stopped' && !(msg as PanelMsg).content">
          <div class="msg-stopped">
            已停止生成
          </div>
        </template>
        <div
          v-if="(msg as PanelMsg).content"
          class="msg-content"
          :class="{ 'is-error': (msg as PanelMsg).status === 'error' }"
        >
          {{ (msg as PanelMsg).content }}
        </div>
        <div
          v-if="(msg as PanelMsg).status === 'loading' && !(msg as PanelMsg).content"
          class="msg-pending"
        >
          <LoadingOutlined spin />
          <span>正在思考…</span>
        </div>

        <!-- 图表生成物（tableId 优先消息级：历史恢复的消息可能来自其它看板） -->
        <ChatBiChart
          v-if="(msg as PanelMsg).charts && (msg as PanelMsg).charts!.length > 0"
          :charts="(msg as PanelMsg).charts"
          :table-id="(msg as PanelMsg).tableId || activeTableId"
          :grid-columns="gridColumns"
          :loading="!!(msg as PanelMsg).specLoading"
        />

        <!-- 表格生成物 -->
        <div
          v-for="(t, i) in (msg as PanelMsg).tables || []"
          :key="`t-${i}`"
          class="table-block"
        >
          <div
            v-if="t.title"
            class="table-block-title"
          >
            {{ t.title }}
          </div>
          <ChatBiTable
            :table-id="(msg as PanelMsg).tableId || activeTableId"
            :condition="t.condition"
            :height="tableHeight"
          />
        </div>
      </template>
    </AgentChatPanel>
  </div>
</template>

<script lang="ts" setup>
import { LoadingOutlined, RobotOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'


import { getChatBiSemantic, routeChatBi } from './api'
import ChatBiChart from './ChatBiChart.vue'
import ChatBiTable from './ChatBiTable.vue'
import { buildTableCondition, findIndicatorNode, forgeChartItem, loadIndicatorTree, loadSemanticCatalog, mergeChartSpec } from './specMerge'
import type { ChatBiAskReq, ChatBiHistoryItem, ChatBiRouteRes, ChatBiSpec } from './types'
import { useChatBiStream } from './useChatBiStream'

import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import AgentChatPanel from '@/framework/components/common/agentChat/AgentChatPanel.vue'
import type { ChatMsgBase } from '@/framework/components/common/agentChat/types'
import type { DashboardItem } from '@/framework/components/common/chartConfig/types'

interface Props {
  // 归属穿透表 code（图表取数与穿透表共享同一数据集）；不传进入全局模式，先 LLM 路由选板再问答
  tableId?: string
  title?: string
  placeholder?: string
  // 图表栅格列数：面板窄容器默认 4，全宽路由页可传 12
  gridColumns?: number
  // 表格生成物高度
  tableHeight?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  title: '智能问数',
  placeholder: '用一句话描述你想看的指标或明细，Enter 发送',
  gridColumns: 4,
  tableHeight: 420
})

// 面板内部消息：在通用消息契约上扩展 SSE 流式正文与图表/表格渲染数据
// （pending 态统一映射为契约的 loading；终态沿用后端存的 done/error）
interface PanelMsg extends ChatMsgBase {
  content: string
  spec?: ChatBiSpec | null
  charts?: DashboardItem[]
  tables?: { title: string; condition: ConditionListType }[]
  specLoading?: boolean
  // 消息级看板（历史恢复的消息绑定提问当时的看板；实时问答回落 activeTableId）
  tableId?: string
}

// 携带上文轮数（user + assistant 各一条算一轮）
const HISTORY_ROUNDS = 5

let seq = 0
const panelRef = ref<InstanceType<typeof AgentChatPanel> | null>(null)
const messages = ref<PanelMsg[]>([])
const suggestQuestions = ref<string[]>([])

// ===== 全局模式路由状态 =====

// 当前生效看板：单看板模式恒为 props.tableId；全局模式由路由结果写入，清空会话时复位
const activeTableId = ref<string | null>(props.tableId || null)
// 路由命中的看板名（仅全局模式展示）
const activePortalName = ref('')
// 路由请求进行中（独立于 SSE 的 loading，防止路由期间重复发送；经 sendable 封住面板发送）
const routing = ref(false)

// 当前对话标识：null=未开启（下一条提问后端创建新对话并经 SSE conv 事件回填），非空续问续接同一对话
const conversationId = ref<string | null>(null)

const emptyText = computed(() =>
  props.tableId
    ? '基于当前数据集的指标卡片与明细数据，用自然语言直接提问。'
    : '直接用自然语言提问，我将自动匹配最合适的看板并作答。'
)

const { loading, ask, stop: stopStream } = useChatBiStream()

// push 后从数组取响应式代理再修改（直接改原始对象不触发视图更新）
const pushMessage = (msg: PanelMsg): PanelMsg => {
  messages.value.push(msg)
  return messages.value[messages.value.length - 1]
}

// ===== 发送（面板已清空输入框，问题文本经参数传入） =====

/**
 * 全局模式选板：LLM 按问题 + 最近对话 + 当前看板从路由目录重新选出最相关看板；
 * 未命中返回 null（本次提问中断，不沿用旧看板），接口异常由调用方捕获收尾
 */
const routeQuestion = async (
  question: string,
  currentTableId: string | null,
  history: ChatBiHistoryItem[]
): Promise<ChatBiRouteRes | null> => {
  routing.value = true
  try {
    const resp = await routeChatBi({
      question,
      currentTableId: currentTableId || undefined,
      history
    })
    return (resp?.payload as ChatBiRouteRes) || null
  } finally {
    routing.value = false
  }
}

// 最近 N 轮已完成的消息作为问答/路由上下文（user/assistant 正文）
const buildHistory = (): ChatBiHistoryItem[] =>
  messages.value
    .filter(m => m.status === 'done')
    .slice(-(HISTORY_ROUNDS * 2))
    .map(m => ({ role: m.role, content: m.content }))

const send = async (question: string) => {
  if (loading.value || routing.value) return

  pushMessage({ id: `u-${++seq}`, role: 'user', content: question, status: 'done', time: Date.now() })
  const reply = pushMessage({ id: `a-${++seq}`, role: 'assistant', content: '', status: 'loading', time: Date.now() })

  // 全局模式每次提问都重新路由（结合对话上下文与当前看板判断话题延续还是切板）；
  // 单看板模式锁定 props.tableId 不路由
  let tableId = activeTableId.value
  if (!props.tableId) {
    reply.content = '正在匹配看板…'
    let route: ChatBiRouteRes | null = null
    try {
      route = await routeQuestion(question, activeTableId.value, buildHistory())
    } catch {
      // 路由接口异常已由 request 层弹出提示，这里只收尾消息
      reply.status = 'error'
      reply.content = '看板路由失败，请稍后重试。'
      reply.time = Date.now()
      return
    }
    if (!route?.tableId) {
      reply.status = 'done'
      reply.content = '未能匹配到能回答该问题的看板，本次提问已中断。请换个说法，或联系管理员在 Skill 工作台补充看板业务描述。'
      reply.time = Date.now()
      return
    }
    tableId = route.tableId
    activeTableId.value = tableId
    activePortalName.value = route.portalName || ''
    reply.content = ''
  }

  const req: ChatBiAskReq = {
    tableId,
    question,
    history: buildHistory(),
    // 空则后端创建新对话并经 conv 事件回传 id，续问续接同一份保存的对话
    conversationId: conversationId.value || undefined,
    portalName: activePortalName.value || undefined
  }

  await ask(
    req,
    {
      onConversation: id => {
        conversationId.value = id
        // 对话标识回填本轮回复（面板内置评价按 conversationId+messageId 定位）
        reply.conversationId = id
      },
      onDelta: text => {
        reply.content += text
        panelRef.value?.scrollBottom()
      },
      onSpec: spec => {
        applySpec(reply, spec)
      },
      onMessageId: messageId => {
        reply.messageId = messageId
      },
      onDone: content => {
        if (content) reply.content = content
        reply.status = 'done'
        reply.time = Date.now()
        panelRef.value?.scrollBottom()
      },
      onError: message => {
        reply.status = 'error'
        reply.content = reply.content ? `${reply.content}\n${message}` : message
        reply.time = Date.now()
        panelRef.value?.scrollBottom()
      }
    }
  )
}

const stop = () => {
  stopStream()
  // 主动停止走 AbortError 静默分支，回调不会再来，手动收尾
  const last = messages.value[messages.value.length - 1]
  if (last && last.status === 'loading') {
    last.status = 'stopped'
    last.time = Date.now()
  }
}

// 开新对话：清屏并复位对话标识，下一条提问由后端创建新对话；已保存的旧对话仍可在历史抽屉找回
const newConversation = () => {
  if (loading.value || routing.value) return
  messages.value = []
  conversationId.value = null
  // 全局模式回到未选板状态，下次提问重新路由；单看板模式复位为 props.tableId 无副作用
  activeTableId.value = props.tableId || null
  activePortalName.value = ''
}

// ===== 历史对话恢复（通用对话详情经面板 restore-conversation 透传） =====

/**
 * 重建消息：通用消息 ext 里带 spec（chart-spec 编排指令）的助手回复重放
 * applySpec（按消息级看板，与提问当时的取数口径一致）；生效看板取最后一条
 * 带看板信息的消息（全局模式一次对话可能中途换板，以最近为准）
 */
const onRestoreConversation = async (detail: any) => {
  if (loading.value || routing.value) return
  const list: any[] = detail?.messages || []
  if (!props.tableId) {
    const lastBoard = [...list].reverse().find(m => m.ext?.tableId)
    if (lastBoard) {
      activeTableId.value = lastBoard.ext.tableId
      activePortalName.value = lastBoard.ext.portalName || ''
    }
  }
  messages.value = []
  conversationId.value = detail?.conversationId || null
  for (const m of list) {
    const msg = pushMessage({
      id: `h-${++seq}`,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || '',
      status: m.status || 'done',
      time: m.time,
      conversationId: detail?.conversationId,
      messageId: m.messageId,
      rating: m.rating || undefined
    })
    if (msg.role === 'assistant' && msg.status === 'done' && m.ext?.spec) {
      await applySpec(msg, m.ext.spec, m.ext.tableId)
    }
  }
}

// ===== 复制全体摘要 =====

const digestMessage = (msg: ChatMsgBase): string => {
  const m = msg as PanelMsg
  if (m.role === 'user') return `提问：${m.content}`
  const parts: string[] = []
  if (m.content) parts.push(m.status === 'error' ? `回答（失败）：${m.content}` : `回答：${m.content}`)
  const charts = m.charts?.length || 0
  const tables = m.tables?.length || 0
  if (charts) parts.push(`（附 ${charts} 个图表）`)
  if (tables) parts.push(`（附 ${tables} 个明细表）`)
  if (m.status === 'stopped' && !m.content) parts.push('（已停止生成）')
  return parts.join(' ')
}

// ===== 推荐问题与建议入框 =====

const useSuggest = (q: string) => {
  // 建议直接作为问题发送（与旧版仅填入输入框相比少一步确认）
  send(q)
}

const loadSuggests = async () => {
  if (!activeTableId.value) return
  try {
    const resp = await getChatBiSemantic(activeTableId.value)
    const indicators = resp?.payload?.indicators
    if (Array.isArray(indicators) && indicators.length > 0) {
      suggestQuestions.value = indicators.slice(0, 4).map(i => `展示「${i.title}」`)
    }
  } catch {
    // 语义目录加载失败不影响问答主流程
  }
}

// ===== 生成物处理（spec → 图表/表格渲染数据） =====

const applySpec = async (msg: PanelMsg, spec: ChatBiSpec, boardId?: string) => {
  msg.spec = spec
  // 历史恢复传消息级看板（与提问当时的取数口径一致）；实时问答回落当前生效看板
  if (boardId) msg.tableId = boardId
  const charts = Array.isArray(spec.charts) ? spec.charts : []
  const tables = Array.isArray(spec.tables) ? spec.tables : []
  if (charts.length === 0 && tables.length === 0) return

  msg.specLoading = true
  try {
    if (charts.length > 0) {
      const tableId = boardId || activeTableId.value || ''
      // 存在自造形态才拉语义目录；存在复用形态才拉指标树（两种目录均按 tableId 缓存）
      const catalog = charts.some(cs => cs.config) ? await loadSemanticCatalog(tableId) : null
      const tree = charts.some(cs => !cs.config) ? await loadIndicatorTree(tableId) : []
      const items: DashboardItem[] = []
      charts.forEach((cs, i) => {
        if (cs.config) {
          if (!catalog) {
            console.warn('chatbi 语义目录不可用，跳过自造图表:', cs.config.title || cs.config.chartType)
            return
          }
          const item = forgeChartItem(cs, catalog, tableId, i)
          if (item) items.push(item)
          return
        }
        const node = findIndicatorNode(tree, cs.indicatorId)
        if (!node) {
          console.warn('chatbi 未找到指标卡片，跳过生成物:', cs.indicatorId)
          return
        }
        const item = mergeChartSpec(node, cs, tableId, i)
        if (item) items.push(item)
      })
      if (items.length > 0) msg.charts = items
    }
    if (tables.length > 0) {
      msg.tables = tables.map(t => ({
        title: t.title || '',
        condition: buildTableCondition(t)
      }))
    }
  } catch (e) {
    console.error('chatbi 生成物解析失败:', e)
  } finally {
    msg.specLoading = false
    panelRef.value?.scrollBottom()
  }
}

// 外层切表时同步生效看板；activeTableId 变化（含全局模式路由命中）刷新推荐问题
watch(() => props.tableId, v => {
  activeTableId.value = v || null
  activePortalName.value = ''
})
watch(activeTableId, loadSuggests, { immediate: true })
</script>

<style scoped lang="less">
.chatbi-panel {
  height: 100%;
}

.header-board {
  margin-left: 2px;
}

.cb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 24px;

  .empty-icon {
    font-size: 40px;
    color: var(--accent);
    opacity: 0.6;
  }

  .empty-text {
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .suggest-list {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;

    .suggest-tag {
      cursor: pointer;
      font-size: 12px;
      transition: color 0.15s;

      &:hover {
        color: #1677ff;
      }
    }
  }
}

.msg-content {
  white-space: pre-wrap;
  word-break: break-all;

  &.is-error {
    color: #ff4d4f;
  }
}

.msg-pending {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary, #999);
  font-size: 13px;
}

.msg-stopped {
  color: var(--text-tertiary, #999);
  font-size: 13px;
}

.table-block {
  margin-top: 8px;

  .table-block-title {
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}
</style>
