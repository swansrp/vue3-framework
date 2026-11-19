<template>
  <div
    ref="paneRef"
    class="bidr-agent-pane"
    :class="[{ 'is-dragover': paneDragActive }, { 'is-workbench': isWorkbench }]"
    @dragenter.prevent="onPaneDragEnter"
    @dragover.prevent="onPaneDragOver"
    @dragleave.prevent="onPaneDragLeave"
    @drop.prevent="onPaneDrop"
    @dragend="resetPaneDrag"
  >
    <!-- 头部：标题 + 会话状态 + 能力健康点（能力位缺席时不渲染绿点，也不影响任何交互） -->
    <div class="bidr-agent-pane__header">
      <div class="bidr-agent-pane__title">
        <RobotOutlined class="bidr-agent-pane__title-icon" />
        <span class="bidr-agent-pane__title-text">{{ title || status?.displayName || '智能代理' }}</span>
        <span
          class="bidr-agent-pane__status"
          :class="`is-${statusClass}`"
        >{{ statusText }}</span>
      </div>
      <div class="bidr-agent-pane__meta">
        <!-- 能力探活点已迁至 Composer（地面态发起前显示）：运行中看到探活没有决策价值
             （2026-11-18 用户口径），见 composer/CapabilityHealthDot.vue -->
        <a-button
          v-if="showRestart && isTerminal"
          size="small"
          type="text"
          @click="onRestartClick"
        >
          重新发起
        </a-button>
      </div>
    </div>

    <!-- 轮询连续失败提示：status/events 任一持续失败达阈值后出现，可手动立即刷新 -->
    <div
      v-if="pollError && !isTerminal"
      class="bidr-agent-pane__poll-error"
    >
      <span>状态获取失败，正在重试</span>
      <a-button
        size="small"
        type="link"
        :loading="refreshing"
        @click="onRefreshStatus"
      >
        立即刷新
      </a-button>
    </div>

    <!-- 消息区：事件流归约后的文本/工具卡/文件卡/状态条/日志 -->
    <div
      ref="bodyRef"
      class="bidr-agent-pane__body"
      @scroll="onBodyScroll"
    >
      <!-- 会话启动期不放占位文案（2026-11-18 用户口径「不要显示启动中」）：
           直接乐观渲染用户气泡，事件流到达后自然接上 -->
      <div
        v-if="showOptimisticInstruction"
        class="bidr-agent-msg is-user"
      >
        <div class="bidr-agent-msg__speaker">
          我
        </div>
        <div class="bidr-agent-msg__text is-md">
          {{ initialInstruction }}
        </div>
      </div>

      <!-- 启动空窗 live 卡（U77）：发起后到首个事件前这段「首响延迟」里只有用户气泡＝点了没反应；
           补一张带真实秒表的轻卡（11-18 口径拒绝的是无信息量静态占位，这里秒数是真的），
           首个事件/流式正文到达即整体消失，不与过程卡并存 -->
      <div
        v-if="showStartupCard"
        class="bidr-agent-startup"
      >
        <span class="bidr-agent-startup__dot"></span>
        <span class="bidr-agent-startup__text">已受理 · 模型思考中{{ startupSeconds > 0 ? ` ${fmtDuration(startupSeconds)}` : '' }}</span>
        <span class="bidr-agent-startup__sub">首轮通读素材较慢，有进展会在这里实时显示</span>
      </div>

      <template
        v-for="item in groupedItems"
        :key="item.id"
      >
        <div
          v-if="item.kind === 'text'"
          class="bidr-agent-msg"
          :class="item.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <!-- 说话人标签已全部退役（U71/U73：用户「我」与 AI 侧「AI」都不要，
               左右气泡/卡片本身已能辨识谁在说话） -->
          <!-- LLM 正文 markdown 渲染（净化后 v-html；流式期仍走 live 区纯文本） -->
          <div
            class="bidr-agent-msg__text is-md"
            v-html="markdownOf(item.text)"
          ></div>
          <div class="bidr-agent-msg__time">
            {{ fmtTime(item.time) }}
          </div>
        </div>

        <!-- 过程折叠组：连续的工具调用/日志收进一个可折叠块（正文留主面，过程按需展开）。
             开合只由用户点击控制（不自开不自关）；组头两态（U71）：
             · 运行中＝计数徽标（折叠显数字、点开变箭头）＋「工作中」＋实时时分秒＋一行最新内容预览
             · 已完结＝绿勾＋「已完成」＋耗时（不再显示交互数与预览）；PAUSED 最后一组＝「已暂停」 -->
        <details
          v-else-if="item.kind === 'process'"
          class="bidr-agent-proc"
        >
          <summary
            class="bidr-agent-proc__head"
            :class="`is-${procPhase(item)}`"
          >
            <template v-if="procPhase(item) === 'done'">
              <CheckCircleFilled class="bidr-agent-proc__done" />
            </template>
            <span
              v-else
              class="bidr-agent-proc__toggle"
            >
              <span
                class="bidr-agent-proc__count"
                :class="`is-d${Math.min(3, String(procCount(item)).length)}`"
              >{{ procCount(item) }}</span>
              <span class="bidr-agent-proc__chev"></span>
            </span>
            <span
              class="bidr-agent-proc__label"
              :class="{ 'is-running': procPhase(item) === 'live' }"
            >{{ procPhaseLabel(item) }}</span>
            <span
              v-if="procDurationText(item)"
              class="bidr-agent-proc__state"
              :class="{ 'is-running': procPhase(item) === 'live' }"
            >{{ procDurationText(item) }}</span>
            <span
              v-if="procPhase(item) === 'live' && procPreview(item)"
              class="bidr-agent-proc__preview"
              :title="procPreview(item)"
            >{{ procPreview(item) }}</span>
          </summary>
          <!-- 组内行（§02 规格）：工具/思考行＝18px 编号圈＋名称（500）＋摘要＋单步耗时右缘对齐，
               进行中整行琥珀＋「执行中…」，点行展开入参/返回明细；log 行＝编号位灰点不占编号；
               等待族连续轮询并成一行（「进度检查 N 次」） -->
          <div class="bidr-agent-proc__body">
            <template
              v-for="row in item.rows"
              :key="row.key"
            >
              <details
                v-if="row.kind !== 'log'"
                class="bidr-agent-proc__rowitem"
              >
                <summary
                  class="bidr-agent-proc__row"
                  :class="{ 'is-run': isProcRowRunning(row) }"
                >
                  <span class="bidr-agent-proc__row-n">{{ row.ord }}</span>
                  <span class="bidr-agent-proc__row-main">
                    <span class="bidr-agent-proc__row-line">
                      <span class="bidr-agent-proc__row-name">{{ row.label }}</span>
                      <span
                        v-if="row.kind === 'tool' && row.digest"
                        class="bidr-agent-proc__row-digest"
                        :title="row.digest"
                      >{{ row.digest }}</span>
                      <span
                        v-if="row.kind === 'tool' && row.polls > 1"
                        class="bidr-agent-proc__row-polls"
                      >进度检查 {{ row.polls }} 次</span>
                      <span
                        v-if="isProcRowRunning(row)"
                        class="bidr-agent-proc__row-hint"
                      >执行中…</span>
                      <span
                        v-if="procRowDurText(row)"
                        class="bidr-agent-proc__row-dur"
                      >{{ procRowDurText(row) }}</span>
                    </span>
                  </span>
                </summary>
                <!-- 点行展开明细：入参/返回（工具行）或思考全文（思考行），#fafafa 底 11px mono 限高 220px -->
                <div
                  v-if="row.kind === 'tool' && row.args"
                  class="bidr-agent-tool__section"
                >
                  <div class="bidr-agent-tool__label">
                    入参
                  </div>
                  <pre class="bidr-agent-proc__row-pre">{{ row.args }}</pre>
                </div>
                <div
                  v-if="row.kind === 'tool' && row.output"
                  class="bidr-agent-tool__section"
                >
                  <div class="bidr-agent-tool__label">
                    返回
                  </div>
                  <pre class="bidr-agent-proc__row-pre">{{ row.output }}</pre>
                </div>
                <div
                  v-if="row.kind === 'think' && row.body"
                  class="bidr-agent-tool__section"
                >
                  <pre class="bidr-agent-proc__row-pre">{{ row.body }}</pre>
                </div>
              </details>
              <div
                v-else
                class="bidr-agent-proc__row is-log"
                :title="row.text"
              >
                <span class="bidr-agent-proc__row-n is-dot">·</span>
                <span class="bidr-agent-proc__row-main">{{ row.text }}</span>
              </div>
            </template>
          </div>
        </details>

        <!-- 素材行：一行摘要（图标＋文件名＋体积/类型＋状态），无框无整行底条 -->
        <div
          v-else-if="item.kind === 'file'"
          class="bidr-agent-file"
        >
          <span
            v-if="isFileRead(item.file)"
            class="bidr-agent-file__icon is-read"
            :title="fileReadTitle(item.file)"
          ><CheckCircleFilled /></span>
          <span
            v-else
            class="bidr-agent-file__icon is-uploaded"
            title="已上传"
          ><CheckCircleOutlined /></span>
          <span
            class="bidr-agent-file__name"
            :title="item.file.name"
          >
            {{ item.file.name || item.file.fileId }}
          </span>
          <span class="bidr-agent-file__meta">
            {{ formatFileSize(item.file.size) }}
          </span>
        </div>

        <!-- 产物下载（P2a）：一行可点击文件名，点了直接下载——无白底整行条 -->
        <div
          v-else-if="item.kind === 'artifact'"
          class="bidr-agent-artifact"
        >
          <component
            :is="artifactIcon(item.artifact).icon"
            class="bidr-agent-artifact__icon"
            :class="artifactIcon(item.artifact).cls"
          />
          <a
            v-if="item.artifact.url"
            class="bidr-agent-artifact__link"
            :href="item.artifact.url"
            :download="item.artifact.name || undefined"
            target="_blank"
            rel="noopener"
            :title="`点击下载 ${item.artifact.name || ''}`"
          >{{ item.artifact.name || item.artifact.fileId }}</a>
          <span
            v-else
            class="bidr-agent-artifact__link is-missing"
          >{{ item.artifact.name || item.artifact.fileId }}（链接缺失，可让 AI 重新生成）</span>
          <span class="bidr-agent-artifact__meta">
            {{ formatFileSize(item.artifact.size) }}
            <template v-if="artifactFormatLabel(item.artifact)">
              · {{ artifactFormatLabel(item.artifact) }}
            </template>
          </span>
        </div>

        <div
          v-else-if="item.kind === 'status'"
          class="bidr-agent-strip"
          :class="[`is-${item.tone}`, `is-${item.type}`]"
        >
          <!-- 用户发言（补充/作答）：右蓝气泡已足够辨识，不再加「我」标签（U71） -->
          {{ item.text }}
          <span
            v-if="item.type === 'guidance' || item.type === 'answered'"
            class="bidr-agent-strip__time"
          >{{ fmtTime(item.time) }}</span>
        </div>
      </template>

      <!-- LLM 流式实时内容（替换式最新一帧；终态清空）——实时思考卡：脉冲点＋正文滚动盒；
           可折叠（长思考占屏时可收起，点卡头展开/收起；每段实时内容重新出现默认展开） -->
      <details
        v-if="liveText"
        class="bidr-agent-live"
        :open="!liveCollapsed"
        @toggle="onLiveToggle"
      >
        <summary class="bidr-agent-live__head">
          <span class="bidr-agent-live__chev"></span>
          <span class="bidr-agent-live__dot"></span>
          <!-- 只保留一个在变的字数：正在思考（N 字），不显示「已思 N 字」字样 -->
          <span>{{ livePhase }}<template v-if="liveChars">（{{ liveChars }} 字）</template></span>
        </summary>
        <pre
          v-if="liveBody"
          class="bidr-agent-live__text"
        >{{ liveBody }}</pre>
      </details>

      <!-- 终态结论卡（U73：不再标「AI」说话人，卡片本身即模型输出）——
           两栈单源组件（agentChat 同款，S5），正文走共享 markdown 管线（含圈号分行兜底） -->
      <AgentConclusionCard
        v-if="conclusion"
        :kind="conclusion.kind"
        :title="conclusion.title"
        :text="conclusion.text || ''"
      />
    </div>

    <!-- AI 决策问题（ask_user waiting）：AskDecisionCard 单源（S10，规格 §05）——
         optimistic 接乐观收口（作答即锁定 pending 态，轮询把问题收走即卸载，失败 catch unlock 回滚）；
         外层 .bidr-agent-question 只承担贴底定位，内容排版归卡内 .bidr-agent-ask-* 族 -->
    <div
      v-if="waitingQuestion"
      class="bidr-agent-question"
    >
      <AskDecisionCard
        ref="askCardRef"
        :question="waitingQuestion"
        optimistic
        show-skip
        :busy="answering"
        @answer="onAskAnswer"
      />
    </div>

    <!-- 计划胶囊 dock（S7，规格 §01）：输入条正上方、水平居中、不进对话流；堆叠自上而下＝
         展开卡（胶囊内向上浮层）→胶囊→Composer；无计划整条隐藏（组件内控）；
         只读回放态无输入条，dock 一并隐藏（不悬空挂在回放正文下） -->
    <PlanCapsule
      v-if="!readOnly"
      :items="planItems"
    />

    <!-- 底部输入区：附件（能力位驱动）+ 发送/暂停/停止；只读回放态隐藏（宿主页另有修订输入条）。
         终态续写（U83 起步、2026-11-19 用户终裁「没有结束的概念」收口）：文字与附件在终态
         全部可用——就地续跑（core resumeTerminal 已放开 FINISHED），修订链只作续跑失败兜底 -->
    <Composer
      v-if="!readOnly"
      :capabilities="capabilityList"
      :status="sessionStatus"
      :waiting-question="!!waitingQuestion"
      :disabled="!sessionId"
      terminal-continue
      :items="attachments"
      :sending="sending"
      :stopping="stopping"
      :pausing="pausing"
      interjectable
      :uploading="isUploading"
      show-health
      :health="health"
      :model="model"
      @send="onSend"
      @stop="onStop"
      @pause="onPause"
      @files="onFiles"
      @retry="onRetryFile"
      @remove="removeAttachment"
    />

    <!-- 面板级文件拖拽落区提示（Composer 内另有自己的高亮，根级只覆盖其余区域） -->
    <div
      v-if="paneDragActive && !readOnly"
      class="bidr-agent-pane__drop-hint"
    >
      松开鼠标上传附件
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled, CheckCircleOutlined, FileExcelOutlined,
  FileImageOutlined, FilePdfOutlined, FilePptOutlined, FileTextOutlined,
  FileWordOutlined, RobotOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'

import { useStickScroll } from './useStickScroll'

import AgentConclusionCard from './AgentConclusionCard.vue'
import AskDecisionCard from './AskDecisionCard.vue'
import Composer from './composer/Composer.vue'
import PlanCapsule from './PlanCapsule.vue'
import { markdownOf } from './markdown'
import { THINK_ARCHIVE_PREFIX } from './processLines'
import { formatFileSize, AGENT_CAPABILITY, type AgentArtifact, type AgentFileRef, type AgentToolItem, type AgentViewItem } from './types'
import { useAgentConversation } from './useAgentConversation'

import { sessionInterject } from '@/framework/apis/agent'

interface Props {
  /** 会话标识（父组件 sessionStart 后传入；变化即重置轮询与视图） */
  sessionId: string | null
  /** 面板标题（缺省取会话 displayName） */
  title?: string
  /** 形态位：sidebar＝侧栏密度（缺省，窄列）；workbench＝主区工作台（内容列限宽居中、排版放松）。
   *  布局归属（侧栏/主区）由宿主页决定，本组件只按形态切排版密度 */
  variant?: 'sidebar' | 'workbench'
  /** 能力位（/agents 条目 capabilities；决定附件入口与文件卡「已读取」提示） */
  capabilities?: string[]
  /** 能力位运行级健康快照：**兼容保留**——探活点已迁至 Composer（见 composer/CapabilityHealthDot.vue） */
  health?: Record<string, string> | null
  /** 当前模型名（宿主页从系统参数读取后传入；显示在 Composer 右下角按钮区左侧） */
  model?: string
  /** 终态时是否显示「重新发起」 */
  showRestart?: boolean
  /** 只读回放态：隐藏底部 Composer 与拖拽落区（历史会话回放由宿主页提供修订输入条，避免双输入框） */
  readOnly?: boolean
  /** 发起指令（宿主页在起跑时传入）：会话启动期事件未到，先乐观渲染用户气泡（U63），
   *  run_start 事件到达后自动让位给正式气泡 */
  initialInstruction?: string
  /** 业务工具的人话名（宿主注入，键＝工具注册名）：工具卡标签优先于框架标签表命中；
   *  框架仓只认框架工具，业务名不进框架表（反向耦合已拔除） */
  toolLabels?: Record<string, string>
  /** 上传端口注入（P3-1）：宿主自持附件链路时传入（如 InkHub 素材通道），缺省走框架 sessionUpload。
   *  签名＝(file, onProgress?) => Promise<AgentFileRef|null>；onProgress 0-100（留 1% 收尾口径由引擎统一处理，
   *  handler 只报真实进度）。注入即视为附件能力在场（capabilityList 据此放行 canUpload）。 */
  uploadAttachment?: (file: File, onProgress?: (percent: number) => void) => Promise<AgentFileRef | null>
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  variant: 'sidebar',
  capabilities: () => [],
  health: null,
  model: '',
  showRestart: true,
  readOnly: false,
  initialInstruction: ''
})

const emit = defineEmits<{
  (e: 'finished', kind: 'finish' | 'error' | 'stopped'): void
  (e: 'restart'): void
  /** 终态续写兜底：就地续跑失败（老会话无快照/后端拒绝）时上抛宿主，携该版底稿开新修订会话 */
  (e: 'followup', text: string): void
}>()

// ==================== 正文 Markdown 渲染 ====================
// 管线已抽单源至 ./markdown（S6：unescape→clampUrl→parse→sanitize＋缓存，marked 装配
// 在模块级守卫一次）；本组件只 import markdownOf，epc AiChat 等业务页同源消费。

/**
 * 能力位显式解构（computed）：模板不直接裸引用 props 数组/父级 store 字段，
 * 避免 Vue 3 setup 模板裸引用在运行时才炸（项目钉子教训）。
 */
const capabilityList = computed<string[]>(() => {
  const list = props.capabilities || []
  // 能力位＝声明 ∪ 注入（P3-1）：宿主传 uploadAttachment 即视为附件能力在场，
  // 声明里已有 files.upload 则不重复追加；canUpload/附件按钮/拖拽落区由 Composer 既有闸门自动放行
  if (props.uploadAttachment && !list.includes(AGENT_CAPABILITY.FILES_UPLOAD)) {
    return [...list, AGENT_CAPABILITY.FILES_UPLOAD]
  }
  return list
})
const canUpload = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD))
const canReadFiles = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_READ))
/** 工作台形态（主区）：样式按 .is-workbench 分支放大排版密度；缺省 sidebar 保持窄列密度 */
const isWorkbench = computed(() => props.variant === 'workbench')

// 能力探活点（绿点＋清单＋SSE 健康帧）已整体迁至 composer/CapabilityHealthDot.vue：
// 挂在 Composer（地面态发起前）显示，运行中不再显示（2026-11-18 用户口径）

const sessionIdRef = computed(() => props.sessionId)
const {
  status,
  items,
  attachments,
  sessionStatus,
  isTerminal,
  liveText,
  waitingQuestion,
  pollError,
  isUploading,
  upload,
  retryUpload,
  clearAttachments,
  removeAttachment,
  answer,
  pause,
  resume,
  stop,
  refresh
} = useAgentConversation(sessionIdRef, { toolLabels: props.toolLabels, uploadAttachment: props.uploadAttachment })

// ==================== 计划胶囊数据源（S7） ====================

/** status 快照的 plan 清单（D16 契约位；缺省回落空数组＝无计划，PlanCapsule 整条隐藏） */
const planItems = computed(() => status.value?.plan || [])

// ==================== 发起即显用户消息（U63 乐观气泡） ====================

/** 事件流里还没出现正式的用户气泡（run_start 未到/缺席）时，用宿主页传入的发起指令顶上 */
const hasUserText = computed(() => items.value.some(i => i.kind === 'text' && i.role === 'user'))
const showOptimisticInstruction = computed(() => !!props.initialInstruction && !hasUserText.value)

// ==================== 启动空窗 live 卡（U77） ====================

/** 挂会话时刻（秒表起点）；只在「事件流全空＋RUNNING」窗口显示，首事件到达即消失 */
const startupAt = ref(0)
watch(() => props.sessionId, (id) => {
  startupAt.value = id ? Date.now() : 0
})
const showStartupCard = computed(() =>
  sessionStatus.value === 'RUNNING'
  && items.value.length === 0
  && !liveText.value
  && startupAt.value > 0)
const startupSeconds = computed(() => Math.max(0, Math.floor((nowTick.value - startupAt.value) / 1000)))

// ==================== 过程折叠组（连续工具/日志收纳成可折叠块，正文留主面） ====================

/**
 * 「重新发起」的统一语义（框架层能力，业务页零感知）：
 * ① 会话处于被中断终态（STOPPED/FAILED）→ 先试续跑：core/llm 的 resume 对终态支持
 *    同一 sessionId 追加新 run，并在首轮注入「续跑说明」（已完成不重复、中间产物可复用）；
 *    成功即留在本会话继续跑，不再回到业务表单。
 * ② 已完成（FINISHED）＝用户明确要另起一份 → 直接 emit('restart')，由业务走自己的新建流程
 *    （想继续加工走输入条即可——FINISHED 就地续跑已放开，2026-11-19「没有结束的概念」）；
 *    老会话无参数快照 / 网络失败同样回落 emit('restart')。
 */
const onRestartClick = async () => {
  if (sessionStatus.value === 'STOPPED' || sessionStatus.value === 'FAILED') {
    try {
      await resume('继续完成剩余工作')
      return
    } catch {
      // 后端拒绝（无快照）或网络异常：回落业务侧
    }
  }
  emit('restart')
}

/** 折叠组渲染条目：children 保持事件原顺序（tool/log 混排），rows 为 §02 行模型视图 */
interface AgentProcessGroup {
  kind: 'process'
  id: string
  seq: number
  time: number
  children: AgentViewItem[]
  rows: ProcRow[]
}

type AgentRenderItem = AgentViewItem | AgentProcessGroup

/* ==================== 过程组行模型（§02 规格：编号圈/摘要/耗时右对齐/log 灰点/等待折叠） ==================== */

/** 工具行（等待族连续轮询折叠成一行：polls 计数；to＝最新回包时刻，running＝仍在途） */
interface ProcToolRow {
  kind: 'tool'
  key: string
  ord: number
  label: string
  digest: string
  args: string
  output: string
  polls: number
  from: number
  to: number | null
  running: boolean
  /** 等待族折叠判据签名（同族＋同入参＝同一次等待的连续轮询） */
  wait: boolean
  sig: string
}

/** 思考归档行（深度思考 · N 字；耗时＝归档事件与组内上一事件的差值近似口径） */
interface ProcThinkRow {
  kind: 'think'
  key: string
  ord: number
  label: string
  body: string
  dur: string
}

/** 过程日志行（灰点不占编号、text-secondary、单行截断） */
interface ProcLogRow {
  kind: 'log'
  key: string
  text: string
}

type ProcRow = ProcToolRow | ProcThinkRow | ProcLogRow

/** 等待类工具族（同族连续轮询折叠；判据与 agentChat/processFlow 同口径，框架基础集） */
const WAIT_TOOL_KEYS = new Set(['waitexternaltask'])
const normToolKey = (name: string): string => name.replace(/_/g, '').toLowerCase()

/**
 * 单步耗时人话化（§02 行级口径）：不足 1 秒不出；<60s 一位小数（整数不带小数点）；
 * ≥60s「1m 05s」紧凑形态（组头总耗时仍走中文 fmtDuration，两套口径各司其职）
 */
const fmtStepDur = (sec: number): string => {
  if (!Number.isFinite(sec) || sec <= 0) return ''
  if (sec < 60) {
    const r = Math.round(sec * 10) / 10
    return `${r}s`
  }
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/**
 * 组内 children → 行模型：工具行带编号与耗时（endedAt 由 events 层配对回填）、
 * 思考归档行同编号语系、log 行灰点不占编号；等待族连续轮询并成一行（polls 累计、
 * 显示信息随最新回包刷新）。纯函数，append-only 事件流下重复构建稳定。
 */
const buildProcRows = (children: AgentViewItem[]): ProcRow[] => {
  const rows: ProcRow[] = []
  let ord = 0
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i]
    if (child.kind === 'tool') {
      const wait = WAIT_TOOL_KEYS.has(normToolKey(child.name))
      const prev = rows[rows.length - 1]
      if (wait && prev && prev.kind === 'tool' && prev.wait && prev.sig === child.args) {
        prev.polls += 1
        prev.label = child.label || child.name
        prev.digest = child.digest || ''
        prev.output = child.output
        prev.running = child.status === 'running'
        prev.to = child.endedAt ?? null
        continue
      }
      rows.push({
        kind: 'tool',
        key: `tool-${child.id}`,
        ord: ++ord,
        label: child.label || child.name,
        digest: child.digest || '',
        args: child.args,
        output: child.output,
        polls: 1,
        from: child.time,
        to: child.endedAt ?? null,
        running: child.status === 'running',
        wait,
        sig: child.args
      })
    } else if (child.kind === 'log' && isThinkingLog(child.text)) {
      const prevChild = children[i - 1]
      rows.push({
        kind: 'think',
        key: `think-${child.id}`,
        ord: ++ord,
        label: `深度思考${thinkingChars(child.text) ? ` · ${thinkingChars(child.text)} 字` : ''}`,
        body: thinkingBody(child.text),
        dur: prevChild ? fmtStepDur((child.time - prevChild.time) / 1000) : ''
      })
    } else if (child.kind === 'log') {
      rows.push({ kind: 'log', key: `log-${child.id}`, text: child.text })
    }
  }
  return rows
}

/**
 * 归组：连续 tool/log 折叠为一个 process 组，text/file/artifact/status 留主面。
 * 事件流全量重算但 append-only 顺序稳定，组身份随首元素 id，重复渲染不抖动。
 */
const groupedItems = computed<AgentRenderItem[]>(() => {
  const out: AgentRenderItem[] = []
  let bucket: AgentViewItem[] = []
  const flush = () => {
    if (bucket.length === 0) return
    const first = bucket[0]
    out.push({
      kind: 'process',
      id: `proc-${first.id}`,
      seq: first.seq,
      time: first.time,
      children: bucket,
      rows: buildProcRows(bucket)
    })
    bucket = []
  }
  for (const item of items.value) {
    if (item.kind === 'tool' || item.kind === 'log') {
      bucket.push(item)
    } else {
      flush()
      out.push(item)
    }
  }
  flush()
  return out
})

/**
 * 秒级心跳（让时长实时跳）：会话 RUNNING 期间每 1s 刷新 nowTick，暂停/终态即停。
 * 深度思考时没有工具事件，若仍按「首尾事件差」秒数会冻住。
 */
const nowTick = ref(Date.now())
let durationTimer: ReturnType<typeof setInterval> | null = null
const hasLiveCounter = computed(() => sessionStatus.value === 'RUNNING')
watch(hasLiveCounter, active => {
  if (active && !durationTimer) {
    durationTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
  } else if (!active && durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
})

/** 最后一个过程组 id（运行中只有它按当前时刻实时跳，历史组冻结为最终时长） */
const lastProcGroupId = computed(() => {
  const arr = groupedItems.value
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    const it = arr[i]
    if (it.kind === 'process') return it.id
  }
  return null
})

/**
 * 组相位（U71，取代旧的「组内有工具在途」判据——那个在工具间隙会翻转，导致
 * 「工作中」消失、组头文案来回跳）：
 * · live   ＝会话 RUNNING 且该组是最后一个过程组（模型思考期间也算，天然不抖）
 * · paused ＝会话 PAUSED 且是最后一组
 * · done   ＝其余，全部按已完成展示（绿勾＋已完成＋耗时）
 */
type ProcPhase = 'live' | 'paused' | 'done'
const procPhase = (group: AgentProcessGroup): ProcPhase => {
  if (group.id !== lastProcGroupId.value) return 'done'
  if (sessionStatus.value === 'RUNNING') return 'live'
  if (sessionStatus.value === 'PAUSED') return 'paused'
  return 'done'
}

/** 组头状态字：运行中「工作中」/ 暂停「已暂停」/ 终态「已完成」 */
const procPhaseLabel = (group: AgentProcessGroup): string => {
  const phase = procPhase(group)
  if (phase === 'live') return '工作中'
  if (phase === 'paused') return '已暂停'
  return '已完成'
}

/** 折叠组时长：运行/暂停中的最后一组按当前时刻算；其余＝首尾事件差 */
const procDuration = (group: AgentProcessGroup): number | null => {
  const first = group.children[0]
  if (!first) return null
  const last = group.children[group.children.length - 1]
  const live = procPhase(group) !== 'done' && sessionStatus.value === 'RUNNING'
  const end = live ? nowTick.value : (last ? last.time : first.time)
  const sec = Math.round((end - first.time) / 1000)
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

/**
 * 折叠组交互数（工具调用＋深度思考各算 1，纯日志行不算；等待折叠族整段算 1）——
 * 计数就是折叠头的展开按钮（折叠显示数字、点开变箭头，U67），与组内编号行同源（行模型）。
 */
const procCount = (group: AgentProcessGroup): number => group.rows.filter(row => row.kind !== 'log').length

/**
 * 时长人话化（U68）：裸秒数退役——<60s 显示「N 秒」、<1h 显示「N 分 N 秒」、
 * 再往上「N 时 N 分 N 秒」（132s → 2分12秒）。
 */
const fmtDuration = (sec: number): string => {
  const s = sec % 60
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  if (h > 0) return `${h}时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

/** 折叠组时长文案：状态字后直接跟时间（「工作中 1分44秒」/「已完成 1分42秒」）；不足 1 秒不出 */
const procDurationText = (group: AgentProcessGroup): string => {
  const sec = procDuration(group)
  if (sec === null) return ''
  return fmtDuration(sec)
}

/**
 * 单次深度思考耗时已在行模型构建时算好（think.dur，归档事件与组内上一事件差值近似口径；
 * 组内第一条无前序事件不出，宁缺不编）。
 */

/** 行级单步耗时：执行中按本地钟实时跳（nowTick 每秒推），终态定格＝首发起→最新回包 */
const procRowDurText = (row: ProcRow): string => {
  if (row.kind === 'think') return row.dur
  if (row.kind === 'log') return ''
  const live = row.running && sessionStatus.value === 'RUNNING'
  const end = live ? nowTick.value : row.to
  if (end == null) return ''
  return fmtStepDur((end - row.from) / 1000)
}

/** 行执行中（整行琥珀＋「执行中…」）：工具在途且会话 RUNNING（PAUSED 下不当在跑） */
const isProcRowRunning = (row: ProcRow): boolean =>
  row.kind === 'tool' && row.running && sessionStatus.value === 'RUNNING'

/** 思考归档日志（后端「【LLM 思考归档】N 字\n正文」）识别与拆分，供折叠「深度思考」步骤渲染
 *  （前缀词汇＝processLines 单源，与 agentChat 两栈共用一份并集） */
const isThinkingLog = (text: string): boolean => text.startsWith(THINK_ARCHIVE_PREFIX)
const thinkingChars = (text: string): string => {
  const m = text.split('\n')[0].match(/(\d+)\s*字/)
  return m ? m[1] : ''
}
const thinkingBody = (text: string): string => {
  const nl = text.indexOf('\n')
  return nl >= 0 ? text.slice(nl + 1) : ''
}

/**
 * 乐观作答（S10 起与 AskDecisionCard 分工）：卡片自持视觉锁定（optimistic＝作答即 pending 态，
 * 轮询把问题收走/换新即卸载）；本组件只留 pendingAnswer 标记驱动头部状态条「已作答」，
 * 轮询追上（问题消失或换新问题）即清标记，提交失败由 catch 调卡片 unlock() 回滚。
 */
const pendingAnswer = ref<number | null>(null)
watch(waitingQuestion, q => {
  if (!q || q.id !== pendingAnswer.value) pendingAnswer.value = null
})

const statusClass = computed(() => (waitingQuestion.value ? 'waiting' : sessionStatus.value.toLowerCase()))

const statusText = computed(() => {
  if (waitingQuestion.value) return '待回答'
  if (pendingAnswer.value !== null) return '已作答'
  switch (sessionStatus.value) {
    case 'RUNNING': return '执行中'
    case 'PAUSED': return '已暂停'
    case 'FINISHED': return '已完成'
    case 'FAILED': return '失败'
    case 'STOPPED': return '已停止'
    default: return sessionStatus.value
  }
})

// ==================== 文件卡「已读取」判定 ====================

/**
 * 文件已读取的判据：能力位 files.read 在场，且工具调用中出现附件读取类调用
 * （会话受限工具 read_attachment，兼容历史 read_file/readFile 命名），
 * 其入参文本里带该文件的 fileId 或文件名（模型按引用读文件的常见形态）。
 * 只做展示增强，判定不到不影响文件卡本身（仍显示「已上传」）。
 */
const readProbeText = computed(() => items.value
  .filter((item): item is AgentToolItem => item.kind === 'tool')
  .filter(item => /read[-_.]?(file|attachment)/i.test(item.name))
  .map(item => item.args)
  .join('\n'))

const isFileRead = (file: AgentFileRef): boolean => {
  // 预解析通过（后端随 file_attached 带 parse_chars）：解析正文已在沙箱可直接读，
  // 模型不会再调 read_attachment——只靠工具探针永远点不亮，这里认「已解析＝可读」
  if (file.parseChars && file.parseChars > 0) return true
  return readByToolCall(file)
}

/** 模型确实调过读取类工具且入参带该文件（历史/运行期直传附件的「已读取」来源） */
const readByToolCall = (file: AgentFileRef): boolean => {
  if (!canReadFiles.value || !readProbeText.value) return false
  return readProbeText.value.includes(file.fileId) || (!!file.name && readProbeText.value.includes(file.name))
}

/** 实心对勾悬浮文案：区分「模型读过」与「预解析已就绪」两种来源 */
const fileReadTitle = (file: AgentFileRef): string => {
  if (readByToolCall(file)) return '已读取'
  return file.parseChars ? `已解析 · ${file.parseChars} 字，模型可直接读取` : '已读取'
}

// ==================== 产物下载卡（P2a） ====================

/** 格式图标判定（2026-11-18）：此前只有 Word/其它＝PDF 两套，Excel/PPT/图片会误挂红 PDF 图标；
 *  现按扩展名（回落 format 字段）分派——docx→Word、pdf→PDF、xls/csv→Excel、ppt→PPT、
 *  图片→图片图标，未知回落通用文档图标 */
const artifactIcon = (artifact: AgentArtifact): { icon: Component; cls: string } => {
  const name = artifact.name || ''
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || artifact.format || '').toLowerCase()
  if (ext === 'doc' || ext === 'docx') return { icon: FileWordOutlined, cls: 'is-word' }
  if (ext === 'pdf') return { icon: FilePdfOutlined, cls: 'is-pdf' }
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return { icon: FileExcelOutlined, cls: 'is-excel' }
  if (ext === 'ppt' || ext === 'pptx') return { icon: FilePptOutlined, cls: 'is-ppt' }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return { icon: FileImageOutlined, cls: 'is-img' }
  return { icon: FileTextOutlined, cls: 'is-text' }
}

/** 格式徽标文案：与 artifactIcon 同一张扩展名表 */
const artifactFormatLabel = (artifact: AgentArtifact): string => {
  const name = artifact.name || ''
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || artifact.format || '').toLowerCase()
  if (ext === 'doc' || ext === 'docx') return 'Word 文档'
  if (ext === 'pdf') return 'PDF 文档'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'Excel 表格'
  if (ext === 'ppt' || ext === 'pptx') return 'PPT 演示'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return '图片'
  return (artifact.format || '').toLowerCase() ? (artifact.format as string).toUpperCase() : ''
}

// ==================== 终态结论 ====================

const terminalKind = computed<'finish' | 'error' | 'stopped'>(() => {
  if (sessionStatus.value === 'FINISHED') return 'finish'
  if (sessionStatus.value === 'FAILED') return 'error'
  return 'stopped'
})

const conclusion = computed(() => {
  if (!isTerminal.value) return null
  if (terminalKind.value === 'finish') {
    return { kind: 'finish' as const, title: '任务完成', text: status.value?.summary || '' }
  }
  if (terminalKind.value === 'error') {
    return { kind: 'error' as const, title: '任务失败', text: status.value?.error || '' }
  }
  return { kind: 'stopped' as const, title: '已停止', text: status.value?.error || '已完成部分保留，可重新发起继续' }
})

// 终态回调只发一次（同一 sessionId）；切换会话复位；离开终态（续跑）也复位——
// 就地续跑再收口时 host 需要再次收到 finished（列表刷新拿到更新后的记录）
const finishedFor = ref<string | null>(null)
watch(() => props.sessionId, () => {
  finishedFor.value = null
})
watch([() => props.sessionId, isTerminal], () => {
  if (!props.sessionId || !isTerminal.value) {
    if (!isTerminal.value) finishedFor.value = null
    return
  }
  if (finishedFor.value === props.sessionId) return
  finishedFor.value = props.sessionId
  emit('finished', terminalKind.value)
}, { immediate: true })

// ==================== 决策问题作答（AskDecisionCard 单源，S10） ====================

const answering = ref(false)
const askCardRef = ref<InstanceType<typeof AskDecisionCard> | null>(null)

/** 提交作答的乐观收口（选项单击/自由输入/跳过/底部 Composer 共用）：状态条标「已作答」，
 *  卡片乐观锁定（optimistic 自持），失败清标记＋unlock 卡片回滚可重答 */
const submitAnswer = async (qid: number, text?: string, skipped?: boolean) => {
  pendingAnswer.value = qid
  answering.value = true
  try {
    await answer(qid, text, skipped)
  } catch (e: any) {
    pendingAnswer.value = null
    askCardRef.value?.unlock()
    message.error(e?.message || (skipped ? '操作失败' : '作答失败'))
    throw e
  } finally {
    answering.value = false
  }
}

/** 决策卡作答（统一签名）：选项 raw / 自由输入文本 / 空串跳过，接线等价旧三入口 */
const onAskAnswer = async (payload: { text: string; skipped?: boolean }) => {
  const q = waitingQuestion.value
  if (!q || answering.value) return
  await submitAnswer(q.id, payload.text || undefined, payload.skipped).catch(() => { /* 错误已提示 */ })
}

// ==================== 发送 / 停止 / 上传 ====================

const sending = ref(false)
const stopping = ref(false)
const pausing = ref(false)

/**
 * 发送语义按会话状态路由（自主会话没有"追加用户消息"端点）：
 * - 有 waiting 问题 → 作答（sessionAnswer）；
 * - PAUSED → 补指导语并恢复（sessionResume）；
 * - RUNNING → 插话；终态（含 FINISHED）→ 就地续跑，失败回落 followup 修订链。
 */
// 发送后清掉已上传的待发附件（2026-11-16 口径：附件已给到模型，不再占输入区）；
// 上传中/失败条目保留给用户处理
const onSend = async (text: string) => {
  if (!props.sessionId) return
  sending.value = true
  try {
    if (waitingQuestion.value) {
      // 作答：提交即乐观收起问题卡（失败由 submitAnswer 提示并回滚）
      try {
        await submitAnswer(waitingQuestion.value.id, text)
      } catch {
        return
      }
    } else if (sessionStatus.value === 'RUNNING') {
      // 运行期插话（排队/插话功能）：文本入队，模型下一轮循环头消费；GUIDANCE 事件即时上屏
      await sessionInterject(props.sessionId, text)
    } else if (sessionStatus.value === 'PAUSED') {
      await resume(text || undefined)
    } else {
      // 终态（STOPPED/FAILED/FINISHED）就地续跑（2026-11-19 用户终裁「没有结束的概念」，
      // core resumeTerminal 已放开 FINISHED）：输入文字作续跑指导语，附件已在会话事件流中；
      // 续跑不可用（老会话无快照/后端拒绝）回落业务修订链
      try {
        await resume(text || (sessionStatus.value === 'FINISHED' ? '继续加工既有成果' : '继续完成剩余工作'))
      } catch {
        emit('followup', text)
      }
    }
    clearAttachments()
  } catch (e: any) {
    message.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

const onStop = async () => {
  // 与暂停互斥：按钮已互相禁用，这里兜底并发入口
  if (stopping.value || pausing.value) return
  stopping.value = true
  try {
    await stop()
    message.info('停止请求已发出，等待任务收口…')
  } catch (e: any) {
    message.error(e?.message || '停止失败')
  } finally {
    stopping.value = false
  }
}

const onPause = async () => {
  // 与停止互斥：按钮已互相禁用，这里兜底并发入口
  if (pausing.value || stopping.value) return
  pausing.value = true
  try {
    await pause('用户暂停，等待补充指导')
    message.info('暂停请求已发出，等待任务在下一检查点暂停…')
  } catch (e: any) {
    message.error(e?.message || '暂停失败')
  } finally {
    pausing.value = false
  }
}

/** 顺序上传（避免并发抢同一会话的附件计数/事件序），单个失败只提示不清空其余 */
const onFiles = async (files: File[]) => {
  const batchSessionId = props.sessionId
  if (!batchSessionId) return
  // 上传中拒绝新批：附件按钮/拖拽落区已禁用，这里是文件选择器并发等边界兜底
  if (isUploading.value) {
    message.info('附件上传中，请稍候再试')
    return
  }
  for (const file of files) {
    if (props.sessionId !== batchSessionId) {
      message.warning('会话已切换，剩余文件未上传')
      break
    }
    try {
      await upload(file)
    } catch (e: any) {
      message.error(`${file.name}：${e?.message || '上传失败'}`)
    }
  }
}

/** 失败重试（chip 上的「重试」）：原文件重传，失败原因仍由 chip 呈现 */
const onRetryFile = async (uid: string) => {
  try {
    await retryUpload(uid)
  } catch (e: any) {
    message.error(e?.message || '重试失败')
  }
}

// ==================== 面板级拖拽落区（F1：正文/头部/决策卡拖入不导航） ====================

const paneRef = ref<HTMLDivElement | null>(null)
const paneDragDepth = ref(0)

/** 是否文件拖拽（非文件拖拽只兜底 preventDefault，不做任何上传动作） */
const hasFileDrag = (e: DragEvent): boolean => {
  const types = e.dataTransfer?.types
  return !!types && Array.from(types).includes('Files')
}

/** 拖拽是否落在 Composer 内（Composer 自带 drop 处理，根级不得重复入队） */
const isComposerTarget = (e: DragEvent): boolean => {
  const target = e.target as Element | null
  return !!target && typeof target.closest === 'function' && !!target.closest('.bidr-agent-composer')
}

/** 根级是否接收文件：能力位在场、无上传在途（终态也放行——续跑消费，2026-11-19「没有结束的概念」） */
const paneDropAllowed = () => canUpload.value && !isUploading.value

const resetPaneDrag = () => {
  paneDragDepth.value = 0
}

const onPaneDragEnter = (e: DragEvent) => {
  // 进入 Composer 时收起面板级提示（Composer 自带拖拽高亮与 drop 处理）
  if (isComposerTarget(e)) {
    resetPaneDrag()
    return
  }
  if (!paneDropAllowed() || !hasFileDrag(e)) return
  paneDragDepth.value += 1
}

const onPaneDragOver = (e: DragEvent) => {
  if (!paneDropAllowed() || isComposerTarget(e) || !hasFileDrag(e)) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

/** 离开面板才归零（relatedTarget 仍在面板内＝子元素间移动，不闪断高亮） */
const onPaneDragLeave = (e: DragEvent) => {
  const related = e.relatedTarget as Node | null
  if (related && paneRef.value?.contains(related)) return
  resetPaneDrag()
}

const onPaneDrop = (e: DragEvent) => {
  resetPaneDrag()
  if (isComposerTarget(e) || !hasFileDrag(e)) return
  if (!canUpload.value) return
  if (isUploading.value) {
    message.info('附件上传中，请稍候再拖入')
    return
  }
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) void onFiles(files)
}

/** 拖出窗口/拖动结束的全局兜底：避免 dragleave 丢失导致高亮残留 */
const onWindowDragEnd = () => resetPaneDrag()
const onWindowDragLeave = (e: DragEvent) => {
  if (!e.relatedTarget) resetPaneDrag()
}

const paneDragActive = computed(() => paneDropAllowed() && paneDragDepth.value > 0)

onMounted(() => {
  window.addEventListener('dragend', onWindowDragEnd)
  window.addEventListener('drop', onWindowDragEnd)
  window.addEventListener('dragleave', onWindowDragLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragend', onWindowDragEnd)
  window.removeEventListener('drop', onWindowDragEnd)
  window.removeEventListener('dragleave', onWindowDragLeave)
})

// ==================== 轮询失败手动刷新 ====================

const refreshing = ref(false)

const onRefreshStatus = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

// 待发队列只装「本次 UI 选入且尚未发送」的附件：已进会话的附件由事件流文件卡留痕，
// 不再回填输入区（2026-11-16 口径：发出去的文件不再显示，下一条消息不携带它们）

// ==================== 实时思考卡折叠 ====================

/**
 * 实时卡默认收起（U64：用户不打开就保持关闭），开合只由用户点击控制＋阶段驱动（watch 挂在
 * 下方 livePhase 定义之后）：「生成中」自动展开、「正在思考」自动收起，同阶段内用户手动
 * 开合不被自动翻转。
 */
const liveCollapsed = ref(true)
const onLiveToggle = (e: Event) => {
  const el = e.target as HTMLDetailsElement | null
  if (el) liveCollapsed.value = !el.open
}

/** 消息时间戳：当天 HH:mm:ss，跨天补 MM-DD（事件 time 为 epoch 毫秒；缺席回空串不渲染） */
const fmtTime = (ms?: number): string => {
  if (!ms) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const hms = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay ? hms : `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hms}`
}

/**
 * 实时思考卡拆分：liveText 形如「思考中·已思 N 字\n正文」/「应答中·已收 N 字\n正文」。
 * 卡头只显示阶段＋「（N 字）」（唯一在变），正文去掉首行状态——不再出现「已思 N 字」字样。
 * 阶段名（U79 用户定稿）：思考段＝「正在思考」；过程组内的思考归档步骤仍叫「深度思考」（历史名词）。
 */
const livePhase = computed(() => {
  const first = (liveText.value || '').split('\n')[0] || ''
  return first.startsWith('应答中') ? '生成中' : '正在思考'
})
// 阶段驱动的开合（U64/U68）：「生成中」＝模型正文流式，必须看得见→自动展开；
// 「正在思考」＝过程细节→自动收起（折叠头的实时预览行已能看到当前内容）
watch(livePhase, phase => {
  liveCollapsed.value = phase !== '生成中'
})
const liveChars = computed(() => {
  const m = (liveText.value || '').match(/(\d+)\s*字/)
  return m ? m[1] : ''
})
const liveBody = computed(() => {
  const text = liveText.value || ''
  const nl = text.indexOf('\n')
  return nl >= 0 ? text.slice(nl + 1) : ''
})

/** 单行截断（U65 预览行用）：压平空白，超长 …（CSS 省略号兜底，这里控制 title 全文长度） */
const clipOneLine = (text: string, max = 120): string => {
  const one = (text || '').replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max)}…` : one
}

/** 实时流当前内容（最后一个非空行）：折叠头预览跟它走＝跟着模型最新一笔思考/输出刷，
 *  不再固定显示开头一句（U71：取首行时长思考看着像卡住） */
const livePreviewLine = computed(() => {
  const lines = (liveBody.value || '').split('\n').map(line => line.trim()).filter(Boolean)
  return clipOneLine(lines[lines.length - 1] || '')
})

/**
 * 折叠头一行实时预览（U65）：运行中的最后一组优先跟实时流，
 * 其余取组内最后一个孩子的单行摘要（工具＝名称＋参数摘要、思考＝正文尾行、日志＝原文）。
 * 只有运行态显示（终态组头改绿勾＋已完成，不再挂预览）。
 */
const procPreview = (group: AgentProcessGroup): string => {
  if (sessionStatus.value === 'RUNNING' && group.id === lastProcGroupId.value && livePreviewLine.value) {
    return livePreviewLine.value
  }
  const last = group.children[group.children.length - 1]
  if (!last) return ''
  if (last.kind === 'tool') {
    return clipOneLine([last.label, last.digest].filter(Boolean).join(' '))
  }
  if (last.kind === 'log') {
    if (!isThinkingLog(last.text)) return clipOneLine(last.text)
    const lines = thinkingBody(last.text).split('\n').map(line => line.trim()).filter(Boolean)
    return clipOneLine(lines[lines.length - 1] || '')
  }
  return ''
}

// ==================== 滚动跟随（贴近底部才自动滚，用户上翻阅读不打断；S8 单源 useStickScroll） ====================

const bodyRef = ref<HTMLDivElement | null>(null)
const { onScroll: onBodyScroll, scrollBottom: stickBottom } = useStickScroll(() => bodyRef.value, 48)

watch(() => items.value.length, () => stickBottom())
watch(liveText, () => stickBottom())
watch(conclusion, v => {
  if (v) stickBottom()
})
</script>