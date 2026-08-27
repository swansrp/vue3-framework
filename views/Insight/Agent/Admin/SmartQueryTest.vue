<!--
 * 智能问数测试页（chatbi 对话风格）
 *
 * 面向 POC 验收：选 gold 问题（或手编 semantic_query）→ 调 /smart-query/plan
 * → 校验通过则按产物渲染：metric 查询走 ChatBiChart（复用 8 种图表渲染管线，
 * 取数自动命中 /advanced/statistic），list 查询走 ChatBiTable（复用 Portal 穿透表，
 * 配置直传 plan 推导的 portalConfig，取数命中 /advanced/query）。
 * 校验失败在气泡内展示错误清单 + SQL，便于逐题定位。
 *
 * 外壳走通用聊天父组件 AgentChatPanel（气泡/滚动/输入区/历史抽屉/评价/复制全体内置），
 * 历史抽屉管理视图（history-scope=all 跨发起人，列表项带发起人；删除/评价仅本人记录），
 * 本页保留业务编排：Agent/图表选择（#header-extra）、敏感闸（#alert）、
 * gold/semantic_query 高级模式（#input-prefix）、plan 确定性链路与问数轮询链、
 * 图表/明细/调试详情（#message-body）；历史恢复经对话 ext.payload 走 applyAskPayload 重放。
-->
<template>
  <div class="sq-test-page">
    <AgentChatPanel
      ref="panelRef"
      title="智能问数测试"
      :messages="messages"
      :loading="sending"
      :sendable="!!agentCode"
      :agent-code="historyAgentCode"
      history-scope="all"
      :digest-message="digestMessage"
      input-placeholder="输入自然语言问题，Enter 发送（Shift+Enter 换行）；semantic_query JSON 走高级模式发送"
      @send="onSend"
      @stop="stopAsk"
      @clarify-answer="onClarifyAnswer"
      @new-conversation="onNewConversation"
      @restore-conversation="onRestoreConversation"
    >
      <template #header-extra>
        <a-button
          v-if="showBack"
          size="small"
          @click="emit('back')"
        >
          ← 返回列表
        </a-button>
        <a-select
          v-model:value="agentCode"
          class="sq-agent"
          placeholder="选择 Agent"
          :options="agentOptions"
        />
        <a-select
          v-model:value="chartMode"
          class="sq-chartmode"
          placeholder="图表类型（缺省自动推断）"
          allow-clear
          :options="chartModeOptions"
        />
      </template>

      <!-- 敏感治理未就绪警示：LLM 对话（自然语言）被禁止，semantic_query JSON 确定性链路不受影响 -->
      <template #alert>
        <a-alert
          v-if="!sensitiveReady"
          type="warning"
          show-icon
          class="sq-sensitive-alert"
          message="LLM 对话已禁用：请先在 Agent 管理 → 资产 → 敏感字段中逐表声明（标记敏感列或确认该表无敏感字段）（semantic_query JSON 模式不受影响）"
        />
      </template>

      <template #empty>
        <a-empty
          description="输入自然语言问题，或展开高级模式选择 gold 问题 / 编写 semantic_query 后发送"
          class="sq-empty"
        />
      </template>

      <!-- 用户气泡：问题 +（高级模式时）semantic_query JSON 回显 -->
      <template #user-bubble="{ msg }">
        <div class="sq-question">
          {{ (msg as TestMsg).content }}
        </div>
        <pre
          v-if="(msg as TestMsg).sqText"
          class="sq-json"
        >{{ (msg as TestMsg).sqText }}</pre>
      </template>

      <!-- 高级模式（gold 快选 + semantic_query JSON 手编）：输入区上方探出 -->
      <template #input-prefix>
        <div
          v-if="advancedMode"
          class="sq-advanced"
        >
          <a-select
            v-model:value="goldKey"
            class="sq-gold"
            placeholder="选择 gold 问题（自动填入下方 JSON，可继续修改）"
            allow-clear
            :options="goldOptions"
            @change="onGoldPick"
          />
          <a-textarea
            v-model:value="sqText"
            :auto-size="{ minRows: 3, maxRows: 8 }"
            placeholder="semantic_query JSON，例如 {&quot;query_type&quot;:&quot;metric&quot;,&quot;metrics&quot;:[&quot;production_task_count&quot;]}"
            class="sq-textarea"
          />
          <div class="sq-advanced-actions">
            <a-button
              size="small"
              type="primary"
              ghost
              :disabled="!agentCode || !sqText.trim() || sending"
              @click="sendJson()"
            >
              发送 semantic_query JSON
            </a-button>
          </div>
        </div>
        <div class="sq-input-links">
          <a-button
            size="small"
            type="link"
            @click="advancedMode = !advancedMode"
          >
            {{ advancedMode ? '收起 semantic_query JSON ▲' : '高级：semantic_query JSON ▼' }}
          </a-button>
          <a-button
            size="small"
            :loading="agentStarting"
            :disabled="!agentCode || sending"
            @click="startAgentSession"
          >
            自主模式
          </a-button>
        </div>
      </template>

      <!-- 业务产物：校验失败 / 应答渲染 / 调试详情（过程块由面板内置渲染） -->
      <template #message-body="{ msg }">
        <template v-if="(msg as TestMsg).status === 'invalid'">
          <a-alert
            type="error"
            :message="(msg as TestMsg).errorText || ('校验未通过（' + ((msg as TestMsg).errors || []).length + ' 项）')"
            show-icon
          />
          <ul class="sq-errors">
            <li
              v-for="(e, i) in (msg as TestMsg).errors"
              :key="i"
            >
              {{ e.message || e }}
            </li>
          </ul>
          <details v-if="(msg as TestMsg).sql">
            <summary>SQL</summary>
            <pre class="sq-sql">{{ (msg as TestMsg).sql }}</pre>
          </details>
          <details v-if="(msg as TestMsg).semanticQueryText">
            <summary>semantic_query</summary>
            <pre class="sq-json">{{ (msg as TestMsg).semanticQueryText }}</pre>
          </details>
        </template>
        <template v-else-if="(msg as TestMsg).status === 'ok'">
          <div class="sq-okbar">
            <a-tag color="green">
              校验通过
            </a-tag>
            <a-tag v-if="(msg as TestMsg).chartType">
              {{ (msg as TestMsg).chartType }}
            </a-tag>
            <a-tag
              v-for="(w, i) in (msg as TestMsg).warnings"
              :key="i"
              color="orange"
            >
              {{ w.message || w }}
            </a-tag>
          </div>
          <!-- 维护问数：基于 LLM 临时资产建议作答 → 提示条 + 内联数据表格 -->
          <template v-if="(msg as TestMsg).askRows">
            <a-alert
              v-if="(msg as TestMsg).usedProposals"
              type="warning"
              show-icon
              class="sq-proposal-tip"
              :message="`已基于 ${(msg as TestMsg).proposedCount} 项临时资产建议作答，建议已记录待管理员审核（批次 ${(msg as TestMsg).batchNo}）`"
            />
            <a-table
              :columns="(msg as TestMsg).askColumns"
              :data-source="(msg as TestMsg).askRows"
              :pagination="false"
              size="small"
              row-key="__rowKey"
              :scroll="{ y: 300 }"
            />
          </template>
          <template v-else>
            <!-- metric → 图表（复用 chatbi 渲染容器，取数走 /advanced/statistic） -->
            <chat-bi-chart
              v-if="(msg as TestMsg).charts"
              :charts="(msg as TestMsg).charts"
              :portal-config="(msg as TestMsg).portalConfig"
              :grid-columns="12"
            />
            <!-- list → 明细表（复用 chatbi 表格容器：Portal 穿透表 + plan 推导配置直传，取数走 /advanced/query） -->
            <chat-bi-table
              v-if="(msg as TestMsg).tableColumns"
              :table-id="(msg as TestMsg).portalConfig?.name || 'sq_oneshot'"
              :portal-config="(msg as TestMsg).portalConfig"
              :query="(msg as TestMsg).detailQuery"
            />
          </template>
          <div
            v-if="(msg as TestMsg).notes && (msg as TestMsg).notes!.length"
            class="sq-notes"
          >
            <div
              v-for="(n, i) in (msg as TestMsg).notes"
              :key="i"
            >
              {{ n }}
            </div>
          </div>
          <details>
            <summary>SQL</summary>
            <pre class="sq-sql">{{ (msg as TestMsg).sql }}</pre>
          </details>
          <details v-if="(msg as TestMsg).semanticQueryText">
            <summary>semantic_query</summary>
            <pre class="sq-json">{{ (msg as TestMsg).semanticQueryText }}</pre>
          </details>
          <!-- 调试手段：绑定参数 / 原始应答 JSON / 复制 / 重跑同题 -->
          <details v-if="(msg as TestMsg).rawPayload">
            <summary>调试详情</summary>
            <div class="sq-debug-bar">
              <a-button
                size="small"
                @click="copyAllMessage(msg as TestMsg)"
              >
                复制全过程（分析用）
              </a-button>
              <a-button
                size="small"
                @click="copyText(assembleSql((msg as TestMsg).sql, (msg as TestMsg).params), 'SQL')"
              >
                复制可执行 SQL
              </a-button>
              <a-button
                size="small"
                @click="copyText(JSON.stringify((msg as TestMsg).rawPayload, null, 2), '原始应答')"
              >
                复制原始应答 JSON
              </a-button>
              <a-button
                size="small"
                :disabled="sending || !(msg as TestMsg).question"
                @click="rerun(msg as TestMsg)"
              >
                重跑此题
              </a-button>
            </div>
            <template v-if="(msg as TestMsg).params && (msg as TestMsg).params!.length">
              <div class="sq-debug-label">
                SQL 绑定参数（params）
              </div>
              <pre class="sq-json">{{ JSON.stringify((msg as TestMsg).params, null, 2) }}</pre>
            </template>
            <div class="sq-debug-label">
              原始应答 JSON
            </div>
            <pre class="sq-json">{{ JSON.stringify((msg as TestMsg).rawPayload, null, 2) }}</pre>
            <!-- 各阶段发给 LLM 的提示词全文（随实时应答下发；历史回放不带） -->
            <template v-if="(msg as TestMsg).rawPayload?.prompts">
              <div class="sq-debug-label">
                各阶段发出提示词（LLM 输入，供排查）
                <a-button
                  size="small"
                  style="margin-left: 8px"
                  @click="copyPrompts((msg as TestMsg).rawPayload!.prompts)"
                >
                  复制全部阶段提示词
                </a-button>
              </div>
              <div
                v-for="(text, stage) in (msg as TestMsg).rawPayload!.prompts"
                :key="stage"
              >
                <div class="sq-debug-label">
                  提示词 · {{ stage }}
                  <a-button
                    size="small"
                    style="margin-left: 8px"
                    @click="copyText(String(text), stage + ' 提示词')"
                  >
                    复制
                  </a-button>
                </div>
                <pre class="sq-json">{{ text }}</pre>
              </div>
            </template>
          </details>
        </template>
        <a-alert
          v-else-if="(msg as TestMsg).status === 'stopped'"
          type="info"
          :message="(msg as TestMsg).content || '本次问数已停止'"
          show-icon
        />
        <a-alert
          v-else-if="(msg as TestMsg).status === 'error'"
          type="error"
          :message="(msg as TestMsg).errorText || '请求失败'"
          show-icon
        />
      </template>
    </AgentChatPanel>

    <!-- 自主维护问数会话抽屉（agent 会话）：AgentChat（阶段条随工具调用跳动 + 思考过程/暂停补语/停止 + 结论评价）；
         /maintain/agent/ask 返回 sessionId，事件流 2s 轮询；旧一次性/流式入口并存 -->
    <a-drawer
      :open="agentOpen"
      title="维护问数（自主会话）"
      width="720"
      placement="right"
      :mask-closable="false"
      :body-style="{ padding: '0', display: 'flex', flexDirection: 'column' }"
      @close="onAgentClose"
    >
      <div class="agent-chat-wrap">
        <AgentChat
          v-if="agentOpen && agentSessionId"
          :session-id="agentSessionId"
          title="维护问数（自主）"
          @finished="agentTerminal = true"
          @restart="startAgentSession"
        />
      </div>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import { message, Modal, notification } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { advancedQueryRequest } from '@/framework/apis'
import { sessionActive } from '@/framework/apis/agent'
import { getAgentAsset, maintainAgentAsk, queryAgents } from '@/framework/apis/smartAgent'
import { planSmartQuery } from '@/framework/apis/smartQuery'
import AgentChatPanel from '@/framework/components/common/agentChat/AgentChatPanel.vue'
import { applyAskPayload, runAskPoll } from '@/framework/components/common/agentChat/askPoll'
import type { AskOutcome } from '@/framework/components/common/agentChat/askPoll'
import AgentChat from '@/framework/components/common/agentChat/index.vue'
import type { ChatClarifyQuestion, ChatMsgBase, ChatPlanItem, ChatStep } from '@/framework/components/common/agentChat/types'
import type { DashboardItem } from '@/framework/components/common/chartConfig/types'
import ChatBiChart from '@/framework/components/common/chatbi/ChatBiChart.vue'
import ChatBiTable from '@/framework/components/common/chatbi/ChatBiTable.vue'

const emit = defineEmits<{ (e: 'back'): void }>()

// 抽屉承载时：showBack=false 隐藏返回按钮，initialAgentCode 预置该 Agent
const props = withDefaults(defineProps<{
  initialAgentCode?: string,
  showBack?: boolean
}>(), {
  initialAgentCode: '',
  showBack: true
})

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query?.domain ? '/' + currentRoute.value.query.domain : undefined

// ---------------- Agent / 图表类型 ----------------
const agentCode = ref<string>(props.initialAgentCode || 'poc')
const agentOptions = ref<any[]>([])
const chartMode = ref<string | undefined>(undefined)

// 8 种图表格式（与 chatbi chartType 对齐）；缺省由后端按规则推断
const chartModeOptions = [
  'bar', 'line', 'ptLine', 'pie', 'metricsPie', 'treeStackedBar', 'rankingBar', 'comparisonBar'
].map(v => ({ label: v, value: v }))

const loadAgents = () => {
  queryAgents([], [], 50, 1, baseDomain).then((res: any) => {
    agentOptions.value = (res.payload?.records || []).map((a: any) => ({
      label: `${a.agentName || a.agentCode}（${a.agentCode}）`,
      value: a.agentCode
    }))
  })
}

// 历史抽屉按页面当前所选 agent 过滤（与注册中心动态码同构 smartquery:{code}，
// 票据链与自主链对话同码落盘；未选时回落跨 agent 聚合）
const historyAgentCode = computed(() => agentCode.value ? `smartquery:${agentCode.value}` : undefined)

// ---------------- 敏感治理闸（与后端 sensitiveGoverned 同口径：tables[] 逐表覆盖全部实体；兼容旧形态） ----------------
// 未就绪时禁止自然语言 LLM 对话（后端 askInternal 同步拦截双保险）；semantic_query JSON 为确定性链路不受限
const sensitiveReady = ref(false)

const loadSensitiveStatus = () => {
  if (!agentCode.value) {
    sensitiveReady.value = false
    return
  }
  Promise.all([
    getAgentAsset({ agentCode: agentCode.value, assetType: 'sensitive-fields' }, baseDomain),
    getAgentAsset({ agentCode: agentCode.value, assetType: 'entities' }, baseDomain)
  ]).then(([sRes, eRes]: any[]) => {
    try {
      const root = JSON.parse(sRes.payload?.content || '{}')
      const tables = Array.isArray(root.tables) ? root.tables : []
      if (tables.length) {
        // 新口径：每表声明无敏感 或 标记了敏感列即算处理；须覆盖 entities 全部实体
        const covered = new Set(tables
          .filter((t: any) => t && t.entity && (t.no_sensitive || (t.fields || []).length > 0))
          .map((t: any) => String(t.entity).toLowerCase()))
        const entities = JSON.parse(eRes.payload?.content || '[]')
        sensitiveReady.value = Array.isArray(entities) && entities.length > 0
          && entities.every((e: any) => covered.has(String(e.name || '').toLowerCase()))
      } else {
        // 旧形态兼容：fields 非空或全局确认无敏感列
        sensitiveReady.value = (root.fields || []).length > 0 || !!root.no_sensitive
      }
    } catch {
      sensitiveReady.value = false
    }
  }).catch(() => { sensitiveReady.value = false })
}

watch(agentCode, loadSensitiveStatus)

// ---------------- gold 问题集（基于 poc 两表资产） ----------------
const GOLD_QUESTIONS: Array<{ key: string; question: string; sq: any; chartMode?: string }> = [
  {
    key: 'g1',
    question: '一共有多少个生产任务？',
    sq: { query_type: 'metric', metrics: ['production_task_count'] }
  },
  {
    key: 'g2',
    question: '各部门拥有的专业数量 Top10（码值域翻译 + 排行榜）',
    sq: {
      query_type: 'metric',
      metrics: ['major_count'],
      dimensions: ['dept_code'],
      order_by: [{ field: 'major_count', direction: 'desc' }],
      limit: 10
    }
  },
  {
    key: 'g3',
    question: '启动与未启动的生产任务各有多少（维度分组 + 概念口径 is_dct_start）',
    sq: { query_type: 'metric', metrics: ['production_task_count'], dimensions: ['is_dct_start'] }
  },
  {
    key: 'g4',
    question: '生产任务、生产项目、经营项目各有多少（多指标无维度 → 指标饼图）',
    sq: { query_type: 'metric', metrics: ['production_task_count', 'production_project_count', 'business_project_count'] }
  },
  {
    key: 'g5',
    question: '已进入 DC 的生产任务按设计阶段分布（过滤 + 分组）',
    sq: {
      query_type: 'metric',
      metrics: ['production_task_count'],
      dimensions: ['phase_code'],
      filters: { operator: 'AND', conditions: [{ dimension: 'is_in_dct', operator: '=', value: '1' }] }
    }
  },
  {
    key: 'g6',
    question: '有效专业清单（list 明细模式 → 明细表）',
    sq: {
      query_type: 'list',
      entity: 'dim_dc_major_no',
      fields: ['major_code', 'major_name', 'dept_code', 'dept_name', 'is_valid'],
      filters: { operator: 'AND', conditions: [{ dimension: 'is_valid', operator: '=', value: '1' }] },
      limit: 50
    }
  },
  {
    key: 'g7',
    question: '各部门专业数量折线展示（显式 line 图表类型）',
    sq: { query_type: 'metric', metrics: ['major_count'], dimensions: ['dept_code'] },
    chartMode: 'line'
  },
  {
    key: 'g8',
    question: '各专业按部门的生产任务……（超纲题：预期校验失败，验证错误提示）',
    sq: { query_type: 'metric', metrics: ['not_exist_metric'], dimensions: ['dept_code'] }
  }
]

const goldOptions = GOLD_QUESTIONS.map(g => ({ label: `${g.key} ${g.question}`, value: g.key }))
const goldKey = ref<string | undefined>(undefined)
const sqText = ref('')

// a-select 的 SelectValue 联合类型含 LabeledValue/数组，这里只取 gold key，用 any 收口
const onGoldPick = (key: any) => {
  const g = GOLD_QUESTIONS.find(it => it.key === key)
  if (!g) return
  sqText.value = JSON.stringify(g.sq, null, 2)
  chartMode.value = g.chartMode
}

// 高级模式（gold 快选 + semantic_query JSON 手编）默认收起，点链接按钮探出
const advancedMode = ref(false)

// ---------------- 消息流（ChatMsgBase 之上扩展测试页产物/过程态） ----------------
interface TestMsg extends ChatMsgBase, Omit<Partial<AskOutcome>, 'status'> {
  content?: string
  question?: string
  sqText?: string
  errors?: any[]
  chartType?: string
  charts?: DashboardItem[]
  portalConfig?: any
  tableColumns?: any[]
  detailQuery?: (url: string, query: any) => Promise<any>
  queryContext?: string
  // 流式进度（step 事件逐条追加，含工具循环过程日志；带到达时间戳）
  steps: ChatStep[]
  // LLM 流式应答 live 进度（替换式展示，思考卡片末行实时刷新）
  liveText?: string
  // 歧义确认：待答问题（后端 askUser 阻塞等待）与 onQuestion 的 promise resolve（卡片作答回填）
  clarify?: ChatClarifyQuestion
  clarifyResolve?: (answer: string) => void
  // 计划待办清单（submit_plan 提交、随完成挑勾；终态后保留回看）
  plan?: ChatPlanItem[]
  // 耗时（流式进行中由面板秒表展示，完成定案供折叠回看标题）
  startTime?: number
  elapsedMs?: number
}

const messages = ref<TestMsg[]>([])
const sending = ref(false)
const panelRef = ref<InstanceType<typeof AgentChatPanel> | null>(null)
// 维护问数轮询的取消句柄（停止按钮 abort → /ask/cancel）；高级模式 plan 请求无句柄时停止提示不支持
let abortRef: AbortController | null = null
let msgSeq = 0

const scrollBottom = () => panelRef.value?.scrollBottom()

// ---------------- 自主维护问数（agent 会话）：探索→组装验证→提案→作答闭环，阶段随工具调用跳动 ----------------
const agentOpen = ref(false)
const agentSessionId = ref<string | null>(null)
const agentStarting = ref(false)
// 本抽屉会话是否已终态（AgentChat finished 置位；新发起/重连复位）
const agentTerminal = ref(false)

// 关闭仅能点 ×（mask-closable=false 防误触点遮罩关闭）；
// 执行中关闭前二次确认（关闭只隐藏面板、任务后台继续，防误关后以为任务中断）；已终态直接关
const onAgentClose = () => {
  if (agentTerminal.value) {
    agentOpen.value = false
    return
  }
  Modal.confirm({
    title: '确定关闭会话抽屉？',
    content: '关闭仅隐藏面板，不影响会话任务（后台继续执行）。',
    okText: '关闭',
    cancelText: '取消',
    onOk: () => {
      agentOpen.value = false
    }
  })
}

const startAgentSession = () => {
  // 输入框文本由面板持有，自主模式以最近一条已发送问题为准（先发送再发起）
  const lastUser = [...messages.value].reverse().find(m => m.role === 'user')
  const q = (lastUser?.content || '').trim()
  if (!agentCode.value || !q) {
    message.warning('请先发送一条自然语言问题，再发起自主模式')
    return
  }
  agentStarting.value = true
  // 测试/调试页传 KEEP_RUNNING：刷新/关页后台继续，回来可经活跃列表重连（用户对话入口不传走默认断开即停）
  maintainAgentAsk({ agentCode: agentCode.value, question: q, detachPolicy: 'KEEP_RUNNING' }, baseDomain).then((res: any) => {
    const sessionId = res?.payload?.sessionId
    if (!sessionId) {
      message.error('自主会话启动失败：未返回 sessionId')
      return
    }
    notification.close(RECONNECT_NOTIFY_KEY)
    agentSessionId.value = sessionId
    agentTerminal.value = false
    agentOpen.value = true
  }).finally(() => { agentStarting.value = false })
}

// ---------------- 自主会话重连（测试页场景：KEEP_RUNNING 刷新后找回进行中会话） ----------------
// 进页查本人活跃会话，命中则提示重连（按快照 subject=agentCode 定向）；新发起时关闭提示避免残留误导
const RECONNECT_NOTIFY_KEY = 'maintain-query-reconnect'
const reconnectAutonomousAgent = () => {
  sessionActive('maintain-query').then((res: any) => {
    const hits = ((res?.payload || []) as any[]).filter(s => !!s.subject)
    if (!hits.length || agentOpen.value) return
    notification.info({
      key: RECONNECT_NOTIFY_KEY,
      message: '检测到进行中的自主问数会话',
      description: `上次页面关闭后任务仍在后台执行（${hits.length} 个），可重连继续查看进度。`,
      duration: 8,
      btn: () => h('a-button', { type: 'primary', size: 'small', onClick: () => { notification.close(RECONNECT_NOTIFY_KEY); const hit = hits[0]; if (hit.subject) agentCode.value = hit.subject; agentSessionId.value = hit.sessionId; agentTerminal.value = false; agentOpen.value = true } }, '重连查看'),
    })
  }).catch(() => {})
}

// list 明细取数：Portal 列筛选/排序产出的条件透传给 /advanced/query（queryContext 原样带回，
// 后端白名单重校验后合并）；general 模式的扁平 conditionList 包成条件树根节点
const buildDetailQuery = (queryContext: string) => (url: string, q: any) =>
  advancedQueryRequest(
    url,
    new Map<string, any>(),
    { conditionList: q.conditionList || [], andOr: '0' },
    q.sortList || [],
    q.pageSize,
    q.currentPage,
    undefined,
    false,
    false,
    undefined,
    undefined,
    queryContext
  )

// ---------------- 发送入口：自然语言走问数轮询链（面板输入框），JSON 走 plan 确定性链（高级模式按钮） ----------------
const onSend = (text: string) => {
  if (!sensitiveReady.value) {
    message.warning('敏感治理未就绪：请先逐表声明敏感字段（或确认无敏感字段），再进行 LLM 对话')
    return
  }
  sendAsk(text)
}

// 高级模式：发送手编/快选的 semantic_query JSON（确定性链路，不受敏感闸限制）
const sendJson = () => {
  if (!sqText.value.trim()) {
    message.warning('请填写 semantic_query JSON 后再发送')
    return
  }
  let sq: any
  try {
    sq = JSON.parse(sqText.value)
  } catch {
    messages.value.push({
      id: ++msgSeq, role: 'assistant', status: 'error', errorText: 'semantic_query 不是合法 JSON，请检查后再发送',
      time: Date.now(), steps: []
    })
    scrollBottom()
    return
  }
  // 多 Agent 路由：统一补 agent 字段（用户也可在 JSON 里显式指定）
  if (!sq.agent) sq.agent = agentCode.value

  const picked = GOLD_QUESTIONS.find(g => g.key === goldKey.value)
  const question = picked ? picked.question : '自定义查询'
  const now = Date.now()
  messages.value.push({
    id: ++msgSeq, role: 'user', status: 'ok', content: question, question,
    sqText: JSON.stringify(sq, null, 2), time: now, steps: []
  })
  const reply: TestMsg = { id: ++msgSeq, role: 'assistant', status: 'loading', time: now, steps: [] }
  messages.value.push(reply)
  scrollBottom()

  sending.value = true
  planSmartQuery(
    { semanticQuery: sq, chartMode: chartMode.value || undefined, title: undefined },
    baseDomain
  )
    .then((res: any) => {
      const p = res.payload || {}
      reply.sql = p.sql
      reply.warnings = p.warnings || []
      if (!p.valid) {
        reply.status = 'invalid'
        reply.errors = p.errors || [p.errorMessage || '校验未通过']
        return
      }
      reply.status = 'ok'
      const chart = (p.charts || [])[0] || {}
      reply.queryContext = chart.queryContext
      reply.chartType = chart.indicator?.chartType || chart.indicator?.dataMetrics?.[0]?.chartType
      if (sq.query_type === 'list') {
        reply.tableColumns = p.portalConfig?.columns || []
        reply.portalConfig = { ...p.portalConfig, tableId: p.portalConfig?.name, dicts: p.dicts }
        reply.detailQuery = buildDetailQuery(chart.queryContext)
      } else {
        reply.portalConfig = { ...p.portalConfig, tableId: p.portalConfig?.name, dicts: p.dicts }
        reply.charts = [{
          id: 'sq-' + reply.id,
          title: p.portalConfig?.displayName || question,
          subTitle: '',
          description: '',
          displayOrder: 1,
          commonStatistic: '',
          xGrid: 4,
          yGrid: 3,
          xPosition: 1,
          yPosition: 1,
          show: true,
          config: { indicator: chart.indicator, queryContext: chart.queryContext }
        }] as DashboardItem[]
      }
    })
    .catch((e: any) => {
      reply.status = 'error'
      reply.errorText = e?.message || e?.errMsg || 'plan 请求失败'
    })
    .finally(() => {
      sending.value = false
      scrollBottom()
    })
}

// 维护问数提交+轮询版：后端多轮 LLM 编排可达 1-2 分钟，同步接口只能长转圈；
// SSE 易被中间层缓冲掐断（前端收不到 step），改用提交票据 + 2s 轮询进度（同生成 progress 模式），
// 客户端收敛至共享 runAskPoll（step 含工具循环过程日志，思考过程经面板内置思考卡实时上屏），
// 应答渲染走共享 applyAskPayload（与客户页同口径）
const sendAsk = (question: string) => {
  const now = Date.now()
  messages.value.push({
    id: ++msgSeq, role: 'user', status: 'ok', content: question, question, time: now, steps: []
  })
  const reply: TestMsg = {
    id: ++msgSeq, role: 'assistant', status: 'loading', steps: [], liveText: '', question,
    time: now, startTime: now, elapsedMs: 0
  }
  messages.value.push(reply)
  scrollBottom()

  sending.value = true
  abortRef = new AbortController()
  runAskPoll(
    { agentCode: agentCode.value, question, chartMode: chartMode.value || undefined },
    {
      onStep: (text) => {
        reply.steps.push({ text, time: Date.now() })
        scrollBottom()
      },
      onLive: (text) => {
        reply.liveText = text
      },
      // 歧义确认：后端编排阻塞等待作答，弹选项卡并把 resolve 挂到消息上，用户作答后回填继续
      onQuestion: (q) => new Promise<string>((resolve) => {
        reply.clarify = q
        reply.clarifyResolve = resolve
        reply.steps.push({ text: `歧义确认：${q.question}`, time: Date.now() })
        scrollBottom()
      }),
      onPlan: (plan) => {
        reply.plan = plan
        scrollBottom()
      },
      // 终态：应答渲染 + 历史对话定位标识回填（面板内置评价经通用 rate 端点定位）
      onDone: (p, meta) => {
        applyAskPayload(reply as AskOutcome, p)
        reply.conversationId = meta.conversationId
        reply.messageId = meta.messageId
      },
      onError: (text, meta) => {
        reply.status = 'error'
        reply.errorText = text
        reply.conversationId = meta.conversationId
        reply.messageId = meta.messageId
      }
    },
    abortRef.signal
  )
    .catch((e: any) => {
      if (reply.status !== 'loading') return
      reply.status = 'error'
      reply.errorText = e?.name === 'AbortError' ? '已停止本次问答' : (e?.message || '维护问数请求失败')
    })
    .finally(() => {
      sending.value = false
      abortRef = null
      if (reply.status === 'loading') {
        reply.status = 'error'
        reply.errorText = '轮询已结束但未收到应答，请重试'
      }
      reply.elapsedMs = Date.now() - (reply.startTime || Date.now())
      scrollBottom()
    })
}

// 停止维护问数：abort 轮询客户端（内部经 /ask/cancel 打取消标记，后端下个进度点中断编排）；
// 高级模式 plan 请求不支持停止，此时提示不支持
const stopAsk = () => {
  if (!abortRef) {
    message.warning('当前请求不支持停止')
    return
  }
  abortRef.abort()
  message.info('已发送停止请求，后端将在下个进度点中断')
}

// 歧义确认卡片作答：移除卡片并回填 promise（runAskPoll 拿到后提交后端唤醒编排）；
// 消息已结束（如停止/超时）时仅收卡片不回填，后端由取消/超时哨兵自行收口
const onClarifyAnswer = (msg: ChatMsgBase, answer: string) => {
  const m = msg as TestMsg
  m.clarify = undefined
  if (m.status === 'loading' && m.clarifyResolve) {
    m.clarifyResolve(answer)
    m.clarifyResolve = undefined
  }
  scrollBottom()
}

const onNewConversation = () => {
  if (sending.value) return
  messages.value = []
}

// ---------------- 历史恢复（对话详情 ext.payload 与 askPoll 终态同构，重放渲染） ----------------
const onRestoreConversation = (conv: any) => {
  if (sending.value) return
  const restored: TestMsg[] = []
  let seq = msgSeq
  ;(conv?.messages || []).forEach((m: any) => {
    const base = {
      id: ++seq,
      time: m.time || Date.now(),
      conversationId: conv.conversationId,
      messageId: m.messageId,
      rating: m.rating || undefined
    }
    if (m.role === 'user') {
      restored.push({
        ...base, role: 'user', status: 'ok', content: m.content, question: m.content, steps: []
      })
      return
    }
    const payload = m.ext?.payload || {}
    const msg: TestMsg = {
      ...base, role: 'assistant', status: 'loading', content: m.content, question: findQuestionBefore(conv, m),
      steps: (payload.steps || []).map((s: string) => ({ text: s, time: base.time })),
      plan: payload.plan || undefined
    }
    if (payload.status === 'stopped') {
      msg.status = 'stopped'
    } else if (payload.status === 'error') {
      msg.status = 'error'
      msg.errorText = payload.errorMessage || m.content || '维护问数失败'
    } else {
      applyAskPayload(msg as AskOutcome, payload.result || {})
    }
    restored.push(msg)
  })
  msgSeq = seq
  messages.value = restored
}

// 助手消息前最近一条用户提问（重跑按钮用）
const findQuestionBefore = (conv: any, target: any): string | undefined => {
  const list = conv?.messages || []
  const index = list.indexOf(target)
  for (let i = index - 1; i >= 0; i--) {
    if (list[i]?.role === 'user') return list[i].content
  }
  return undefined
}

onUnmounted(() => {
  abortRef?.abort()
})

// 重跑：同题再发一次（仅维护问数应答可重跑，比对多次作答稳定性）
const rerun = (msg: TestMsg) => {
  if (!msg.question || sending.value) return
  if (!sensitiveReady.value) {
    message.warning('敏感治理未就绪，无法重跑 LLM 问数')
    return
  }
  sendAsk(msg.question)
}

// 拼接绑定参数为可直接执行的 SQL（仅调试展示用途：后端执行仍走预编译占位符）：
// 按顺序逐个替换 ? 占位符——null→NULL，数字/布尔直接拼接，字符串单引号包裹（内部 ' 转义为 ''）；
// 无 params 或占位符与参数数不匹配时，顺序替换能替的部分，剩余 ? 保留原样
const assembleSql = (sql?: string, params?: any[]): string => {
  if (!sql) return ''
  if (!params || !params.length) return sql
  let i = 0
  return sql.replace(/\?/g, () => {
    if (i >= params.length) return '?'
    const v = params[i++]
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return `'${String(v).replace(/'/g, "''")}'`
  })
}

// 复制调试文本到剪贴板
const copyText = (text: string | undefined, label: string) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(
    () => message.success(`${label} 已复制`),
    () => message.error('复制失败，请手动选择复制')
  )
}

// 单条消息全过程导出（分析用）：问题 → 思考过程（含每轮思考归档全文）→ 产物与应答；
// 与页面所见同口径，供对比分析程序思考路径/耗时/决策点使用（面板复制全体经 digestMessage 注入本函数）
const buildMsgDigest = (msg: TestMsg, index: number): string => {
  const lines: string[] = []
  const stamp = msg.time ? new Date(msg.time).toLocaleString() : ''
  if (msg.role === 'user') {
    lines.push(`═══ #${index} 用户问题 ${stamp} ═══`)
    lines.push(msg.content || msg.question || '')
    if (msg.sqText) lines.push(`[semantic_query]\n${msg.sqText}`)
    return lines.join('\n')
  }
  lines.push(`═══ #${index} 应答（${msg.status || 'loading'}${elapsedText(msg.elapsedMs)}）${stamp} ═══`)
  if ((msg.steps || []).length) {
    lines.push('【思考过程】')
    msg.steps.forEach(s => lines.push(`${fmtTimeFull(s.time)} ${s.text}`))
  }
  if (msg.liveText) lines.push(`【进行中 live】\n${msg.liveText}`)
  if (msg.errorText) lines.push(`【错误】${msg.errorText}`)
  if (msg.errors?.length) lines.push(`【校验错误】${msg.errors.map(e => e.message || e).join('；')}`)
  if (msg.semanticQueryText) lines.push(`【semantic_query】\n${msg.semanticQueryText}`)
  if (msg.sql) lines.push(`【可执行 SQL】\n${assembleSql(msg.sql, msg.params)}`)
  if (msg.notes?.length) lines.push(`【口径备注】\n${msg.notes.join('\n')}`)
  if (msg.askRows) lines.push(`【应答数据】${msg.askRows.length} 行\n${JSON.stringify(msg.askRows, null, 2)}`)
  return lines.join('\n')
}

const elapsedText = (ms?: number) => {
  if (!ms) return ''
  const s = Math.max(0, Math.round(ms / 1000))
  return ` · ${s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`}`
}

const fmtTimeFull = (t: number) => {
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 一键复制单条全过程（调试栏入口）
const copyAllMessage = (msg: TestMsg) => {
  const idx = messages.value.indexOf(msg) + 1
  copyText(buildMsgDigest(msg, idx), '全过程')
}

// 各阶段提示词整体复制（阶段标题 + 全文分隔，粘贴即可排查）
const copyPrompts = (prompts: Record<string, string>) => {
  const text = Object.entries(prompts)
    .map(([stage, p]) => `===== [${stage}] =====\n${p}`)
    .join('\n\n')
  copyText(text, '各阶段提示词')
}

// 面板复制全体入口（逐条摘要格式化）
const digestMessage = (m: ChatMsgBase): string =>
  buildMsgDigest(m as TestMsg, messages.value.indexOf(m as TestMsg) + 1)

onMounted(() => {
  loadAgents()
  loadSensitiveStatus()
  reconnectAutonomousAgent()
})
</script>

<style scoped lang="less">
.agent-chat-wrap {
  flex: 1;
  min-height: 0;
  padding: 8px;
}

.sq-test-page {
  height: 100%;

  .sq-agent {
    width: 220px;
  }

  .sq-chartmode {
    width: 220px;
  }

  // 测试页应答含图表/明细表，气泡放宽至 88%（覆盖面板默认 72%）
  :deep(.msg.assistant .bubble) {
    width: 88%;
    max-width: 88%;
  }
}

.sq-sensitive-alert {
  margin: 8px 24px 0;
}

.sq-empty {
  margin-top: 80px;
}

.sq-question {
  font-weight: 600;
  margin-bottom: 6px;
}

.sq-json,
.sq-sql {
  margin: 6px 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.sq-errors {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #cf1322;
  font-size: 13px;
}

// 口径备注（应答 notes 逐条展示）
.sq-notes {
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  line-height: 1.7;
}

// 调试详情：操作行 + 分块标签
.sq-debug-bar {
  display: flex;
  gap: 8px;
  margin: 6px 0;
}

.sq-debug-label {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #666);
}

.sq-okbar {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

details {
  margin-top: 8px;

  summary {
    cursor: pointer;
    color: #1677ff;
    font-size: 13px;
  }
}

// 高级模式（gold 快选 + JSON 手编）：输入区上方探出
.sq-advanced {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px dashed var(--border-subtle, #e8e8e8);
  border-radius: 8px;
}

.sq-advanced-actions {
  display: flex;
  justify-content: flex-end;
}

.sq-input-links {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sq-gold {
  flex: 1;
}

.sq-proposal-tip {
  margin-bottom: 8px;
}
</style>
