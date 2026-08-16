/**
 * 智能问数面板（主组件）
 *
 * 职责：消息列表 + 输入区 + SSE 流式问答（useChatBiStream），
 * 把 LLM 返回的 chart-spec 经 specMerge 合并为 DashboardItem / 穿透表条件，
 * 分别交给 ChatBiChart / ChatBiTable 渲染；维护最近 5 轮问答上下文。
 * 对话历史后端按访问人保存（Redis，保留天数见系统参数）：首问自动建新对话并经
 * SSE conv 事件回传 conversationId，续问据此续接；头部支持开新对话/历史抽屉恢复。
 *
 * 用法：<ChatBiPanel :table-id="'PmpProjectlifeCycleDataset'" />
 * 全局模式：不传 tableId 时先经 LLM 路由（ChatBiRouterService）选出最相关看板再问答，
 * 路由结果（看板名）显示在头部，清空会话即回到未选板状态。
 * 高度由外层容器给定（height: 100%）。
 */
<template>
  <div class="chatbi-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-title">
        <RobotOutlined class="title-icon" />
        <span>{{ title }}</span>
        <!-- 全局模式：路由命中的看板名，帮助用户确认问题被送到了哪个数据集 -->
        <a-tag
          v-if="!tableId && activePortalName"
          class="header-board"
          :bordered="false"
        >{{ activePortalName }}</a-tag>
      </div>
      <div class="header-actions">
        <a-tooltip title="历史对话">
          <a-button
            size="small"
            type="text"
            @click="openHistory"
          >
            <template #icon>
              <HistoryOutlined />
            </template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="新对话">
          <a-button
            size="small"
            type="text"
            :disabled="messages.length === 0 || loading"
            @click="newConversation"
          >
            <template #icon>
              <PlusOutlined />
            </template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 消息区 -->
    <div
      ref="bodyRef"
      class="panel-body"
    >
      <div
        v-if="messages.length === 0"
        class="empty-hint"
      >
        <RobotOutlined class="empty-icon" />
        <p class="empty-text">{{ emptyText }}</p>
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

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="msg-row"
        :class="`msg-${msg.role}`"
      >
        <div class="avatar">
          <UserOutlined v-if="msg.role === 'user'" />
          <RobotOutlined v-else />
        </div>
        <div class="bubble">
          <!-- 回答正文（代码块已由后端剔除，按纯文本换行展示） -->
          <div
            v-if="msg.content"
            class="msg-content"
            :class="{ 'is-error': msg.status === 'error' }"
          >{{ msg.content }}</div>

          <div
            v-if="msg.status === 'pending' && !msg.content"
            class="msg-pending"
          >
            <LoadingOutlined spin />
            <span>正在思考…</span>
          </div>
          <div
            v-if="msg.status === 'stopped'"
            class="msg-stopped"
          >已停止生成</div>

          <!-- 图表生成物（tableId 优先消息级：历史恢复的消息可能来自其它看板） -->
          <ChatBiChart
            v-if="msg.charts && msg.charts.length > 0"
            :charts="msg.charts"
            :table-id="msg.tableId || activeTableId"
            :grid-columns="gridColumns"
            :loading="!!msg.specLoading"
          />

          <!-- 表格生成物 -->
          <div
            v-for="(t, i) in msg.tables || []"
            :key="`t-${i}`"
            class="table-block"
          >
            <div
              v-if="t.title"
              class="table-block-title"
            >{{ t.title }}</div>
            <ChatBiTable
              :table-id="msg.tableId || activeTableId"
              :condition="t.condition"
              :height="tableHeight"
            />
          </div>

          <!-- 气泡尾部：时间 + 助手回答的评价（done 且有 msgid 才可评，重复点同值=取消） -->
          <div
            v-if="msg.time && msg.status !== 'pending'"
            class="msg-meta"
          >
            <span class="msg-time">{{ formatMsgTime(msg.time) }}</span>
            <template v-if="msg.role === 'assistant' && msg.status === 'done' && msg.messageId">
              <span
                class="rate-btn"
                :class="{ 'is-active': msg.rating === 'like', 'is-busy': ratingBusy }"
                title="有帮助"
                @click="rateMsg(msg, 'like')"
              >
                <LikeOutlined />
              </span>
              <span
                class="rate-btn dislike"
                :class="{ 'is-active': msg.rating === 'dislike', 'is-busy': ratingBusy }"
                title="没帮助"
                @click="rateMsg(msg, 'dislike')"
              >
                <DislikeOutlined />
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="panel-footer">
      <a-textarea
        v-model:value="input"
        class="footer-input"
        :placeholder="placeholder"
        :auto-size="{ minRows: 1, maxRows: 4 }"
        @press-enter="onEnter"
      />
      <a-button
        v-if="!loading"
        type="primary"
        class="footer-btn"
        :disabled="!input.trim() || routing"
        @click="send"
      >
        <template #icon>
          <SendOutlined />
        </template>
      </a-button>
      <a-button
        v-else
        danger
        class="footer-btn"
        @click="stop"
      >
        <template #icon>
          <StopOutlined />
        </template>
      </a-button>
    </div>

    <!-- 历史对话抽屉：按访问人隔离的保存列表（Redis，保留天数见系统参数），点击恢复渲染 -->
    <a-drawer
      v-model:open="historyOpen"
      title="历史对话"
      placement="right"
      :width="340"
    >
      <a-spin :spinning="historyLoading">
        <div
          v-if="!historyLoading && conversations.length === 0"
          class="chatbi-history-empty"
        >
          暂无历史对话
        </div>
        <div
          v-for="c in conversations"
          :key="c.conversationId"
          class="chatbi-history-item"
          :class="{ 'is-active': c.conversationId === conversationId }"
        >
          <div
            class="chatbi-history-main"
            @click="restoreConversation(c)"
          >
            <div class="chatbi-history-title">{{ c.title || '未命名对话' }}</div>
            <div class="chatbi-history-meta">
              {{ formatConvTime(c.updateTime) }} · {{ c.messageCount || 0 }} 条消息
            </div>
          </div>
          <a-button
            size="small"
            type="text"
            danger
            @click="removeConversation(c)"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import { DeleteOutlined, DislikeOutlined, HistoryOutlined, LikeOutlined, LoadingOutlined, PlusOutlined, RobotOutlined, SendOutlined, StopOutlined, UserOutlined } from '@ant-design/icons-vue'
import { computed, nextTick, ref, watch } from 'vue'

import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import type { DashboardItem } from '@/framework/components/common/chartConfig/types'

import { deleteChatBiConversation, getChatBiConversationDetail, getChatBiConversations, getChatBiSemantic, rateChatBi, routeChatBi } from './api'
import ChatBiChart from './ChatBiChart.vue'
import ChatBiTable from './ChatBiTable.vue'
import { buildTableCondition, findIndicatorNode, forgeChartItem, loadIndicatorTree, loadSemanticCatalog, mergeChartSpec } from './specMerge'
import type { ChatBiAskReq, ChatBiConversation, ChatBiHistoryItem, ChatBiRole, ChatBiRouteRes, ChatBiSpec } from './types'
import { useChatBiStream } from './useChatBiStream'

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

// 面板内部消息：在通用消息上扩展图表/表格渲染数据
interface PanelMessage {
  id: string
  role: ChatBiRole
  content: string
  status: 'pending' | 'done' | 'error' | 'stopped'
  spec?: ChatBiSpec | null
  charts?: DashboardItem[]
  tables?: { title: string; condition: ConditionListType }[]
  specLoading?: boolean
  // 消息级看板（历史恢复的消息绑定提问当时的看板；实时问答回落 activeTableId）
  tableId?: string
  // 消息时间（user 发送时 / assistant 完成时打戳；历史恢复取后端存的 time）
  time?: number
  // 助手消息标识（SSE msgid 事件回传，评价定位用；老对话无此字段则不显示评价按钮）
  messageId?: string
  // 用户评价：like-点赞 / dislike-点踩 / null-未评价（历史恢复取后端存的 rating）
  rating?: string | null
}

// 携带上文轮数（user + assistant 各一条算一轮）
const HISTORY_ROUNDS = 5

let seq = 0
const messages = ref<PanelMessage[]>([])
const input = ref('')
const bodyRef = ref<HTMLDivElement | null>(null)
const suggestQuestions = ref<string[]>([])

// ===== 全局模式路由状态 =====

// 当前生效看板：单看板模式恒为 props.tableId；全局模式由路由结果写入，清空会话时复位
const activeTableId = ref<string | null>(props.tableId || null)
// 路由命中的看板名（仅全局模式展示）
const activePortalName = ref('')
// 路由请求进行中（独立于 SSE 的 loading，防止路由期间重复发送）
const routing = ref(false)

// ===== 历史对话状态 =====

// 当前对话标识：null=未开启（下一条提问后端创建新对话并经 SSE conv 事件回填），非空续问续接同一对话
const conversationId = ref<string | null>(null)
// 历史对话抽屉
const historyOpen = ref(false)
const historyLoading = ref(false)
const conversations = ref<ChatBiConversation[]>([])
// 历史恢复进行中（拉详情 + 重放 spec 合并，防止重复点击）
const restoring = ref(false)

const emptyText = computed(() =>
  props.tableId
    ? '基于当前数据集的指标卡片与明细数据，用自然语言直接提问。'
    : '直接用自然语言提问，我将自动匹配最合适的看板并作答。'
)

const { loading, ask, stop: stopStream } = useChatBiStream()

// ===== 消息与滚动 =====

const scrollBottom = async () => {
  await nextTick()
  const el = bodyRef.value
  if (el) el.scrollTop = el.scrollHeight
}

// push 后从数组取响应式代理再修改（直接改原始对象不触发视图更新）
const pushMessage = (msg: PanelMessage): PanelMessage => {
  messages.value.push(msg)
  return messages.value[messages.value.length - 1]
}

// ===== 发送 =====

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

const send = async () => {
  const question = input.value.trim()
  if (!question || loading.value || routing.value) return

  input.value = ''
  pushMessage({ id: `u-${++seq}`, role: 'user', content: question, status: 'done', time: Date.now() })
  const reply = pushMessage({ id: `a-${++seq}`, role: 'assistant', content: '', status: 'pending' })
  scrollBottom()

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
      scrollBottom()
      return
    }
    if (!route?.tableId) {
      reply.status = 'done'
      reply.content = '未能匹配到能回答该问题的看板，本次提问已中断。请换个说法，或联系管理员在 Skill 工作台补充看板业务描述。'
      reply.time = Date.now()
      scrollBottom()
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
      },
      onDelta: text => {
        reply.content += text
        scrollBottom()
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
        scrollBottom()
      },
      onError: message => {
        reply.status = 'error'
        reply.content = reply.content ? `${reply.content}\n${message}` : message
        reply.time = Date.now()
        scrollBottom()
      }
    }
  )
}

const stop = () => {
  stopStream()
  // 主动停止走 AbortError 静默分支，回调不会再来，手动收尾
  const last = messages.value[messages.value.length - 1]
  if (last && last.status === 'pending') {
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

// ===== 历史对话（后端按访问人保存，保留天数见系统参数） =====

const openHistory = async () => {
  historyOpen.value = true
  historyLoading.value = true
  try {
    const resp = await getChatBiConversations()
    conversations.value = (resp?.payload as ChatBiConversation[] | undefined) || []
  } catch {
    // 加载失败提示由 request 层弹出，列表保持现状
  } finally {
    historyLoading.value = false
  }
}

/**
 * 恢复历史对话：拉详情把消息重建为面板消息，带 chart-spec 的助手回复重放
 * applySpec（按消息级看板，与提问当时的取数口径一致）；生效看板取最后一条
 * 带看板信息的消息（全局模式一次对话可能中途换板，以最近为准）
 */
const restoreConversation = async (item: ChatBiConversation) => {
  if (loading.value || routing.value || restoring.value) return
  restoring.value = true
  try {
    const resp = await getChatBiConversationDetail(item.conversationId)
    const detail = (resp?.payload as ChatBiConversation | undefined) || null
    const list = detail?.messages || []
    if (!props.tableId) {
      const lastBoard = [...list].reverse().find(m => m.tableId)
      if (lastBoard?.tableId) {
        activeTableId.value = lastBoard.tableId
        activePortalName.value = lastBoard.portalName || ''
      }
    }
    messages.value = []
    conversationId.value = detail?.conversationId || item.conversationId
    for (const m of list) {
      const isError = m.status === 'error'
      const msg = pushMessage({
        id: `h-${++seq}`,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
        status: isError ? 'error' : 'done',
        time: m.time,
        messageId: m.messageId,
        rating: m.rating || null
      })
      if (msg.role === 'assistant' && !isError && m.spec) {
        await applySpec(msg, m.spec, m.tableId)
      }
    }
    historyOpen.value = false
    scrollBottom()
  } catch {
    // 详情加载失败提示由 request 层弹出，面板保持原状
  } finally {
    restoring.value = false
  }
}

const removeConversation = async (item: ChatBiConversation) => {
  try {
    await deleteChatBiConversation(item.conversationId)
  } catch {
    return // 删除失败提示由 request 层弹出
  }
  conversations.value = conversations.value.filter(c => c.conversationId !== item.conversationId)
  // 删除的是当前对话：正文已删，面板按新对话处理（若正在问答则仅移除列表，续问时后端会另起新对话）
  if (item.conversationId === conversationId.value && !loading.value && !routing.value) {
    newConversation()
  }
}

const formatConvTime = (t?: number) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 气泡时间：当天只显 HH:mm，跨天补 月-日（历史恢复的对话可能跨天）
const formatMsgTime = (t?: number) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return d.toDateString() === new Date().toDateString() ? hm : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}

// ===== 回答评价 =====

// 评价请求进行中（防连点）
const ratingBusy = ref(false)

/**
 * 评价助手回复：重复点击同值=取消；成功后回写选中态。
 * 对话正文内嵌与全局运营统计由后端双写，失败提示由 request 层弹出
 */
const rateMsg = async (msg: PanelMessage, rating: 'like' | 'dislike') => {
  if (!conversationId.value || !msg.messageId || ratingBusy.value) return
  const next = msg.rating === rating ? '' : rating
  ratingBusy.value = true
  try {
    await rateChatBi({ conversationId: conversationId.value, messageId: msg.messageId, rating: next })
    msg.rating = next || null
  } catch {
    // 评价失败保持原选中态，提示由 request 层弹出
  } finally {
    ratingBusy.value = false
  }
}

const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return // Shift+Enter 换行
  e.preventDefault()
  send()
}

const useSuggest = (q: string) => {
  input.value = q
}

// ===== 生成物处理（spec → 图表/表格渲染数据） =====

const applySpec = async (msg: PanelMessage, spec: ChatBiSpec, boardId?: string) => {
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
    scrollBottom()
  }
}

// ===== 推荐问题（语义目录指标名，加载失败静默） =====

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
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

// ===== 头部 =====

.panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;

    .title-icon {
      color: var(--accent);
      font-size: 18px;
    }

    .header-board {
      margin-left: 4px;
      font-weight: 400;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

// ===== 消息区 =====

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-hint {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;

  .empty-icon {
    font-size: 42px;
    color: var(--accent-mid);
  }

  .empty-text {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .suggest-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-width: 420px;

    .suggest-tag {
      cursor: pointer;
      user-select: none;
      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
    }
  }
}

.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  .avatar {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .bubble {
    min-width: 0;
    max-width: calc(100% - 42px);
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
  }

  &.msg-user {
    flex-direction: row-reverse;

    .avatar {
      background: var(--accent-mid);
    }

    .bubble {
      background: var(--accent-soft);
      border-color: var(--accent-mid);
    }

    .msg-content {
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  &.msg-assistant {
    // 回答气泡撑满剩余宽度：图表/表格生成物需要大画布，不能随正文文字长度收缩
    .bubble {
      flex: 1;
      min-width: 0;
    }

    .msg-content {
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-primary);
      font-size: 13px;
      line-height: 1.7;

      &.is-error {
        color: var(--danger);
      }
    }

    .msg-pending {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .msg-stopped {
      color: var(--text-tertiary);
      font-size: 12px;
    }
  }
}

// 生成物图表/表格在气泡内全宽展示
.table-block {
  margin-top: 10px;

  .table-block-title {
    margin-bottom: 6px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
  }
}

// 气泡尾部：时间 + 评价按钮
.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;

  .msg-time {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .rate-btn {
    cursor: pointer;
    color: var(--text-tertiary);
    font-size: 13px;
    line-height: 1;
    user-select: none;
    transition: color 0.2s;

    &:hover,
    &.is-active {
      color: var(--accent);
    }

    // 点踩选中态走警示色，与点赞区分
    &.dislike {
      &:hover,
      &.is-active {
        color: var(--danger);
      }
    }

    &.is-busy {
      pointer-events: none;
      opacity: 0.5;
    }
  }
}

// 用户气泡靠右对齐，时间贴气泡尾部
.msg-user .msg-meta {
  justify-content: flex-end;
}

// ===== 输入区 =====

.panel-footer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);

  .footer-input {
    flex: 1;
  }

  .footer-btn {
    flex-shrink: 0;
  }
}
</style>

<style lang="less">
// 历史对话抽屉内容渲染在 body 下（teleport），scoped 样式作用不到，类名加 chatbi-history- 前缀防全局冲突
.chatbi-history-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.chatbi-history-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 6px;

  + .chatbi-history-item {
    margin-top: 6px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.04);

    .chatbi-history-title {
      color: var(--accent);
    }
  }

  &.is-active {
    border-color: var(--accent-mid);
    background: var(--accent-soft);
  }
}

.chatbi-history-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;

  .chatbi-history-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 13px;
  }

  .chatbi-history-meta {
    margin-top: 2px;
    color: var(--text-tertiary);
    font-size: 12px;
  }
}
</style>
