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
        >{{ statusText }}<template v-if="runningElapsedText"> · {{ runningElapsedText }}</template></span>
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
      <!-- 阶段条（AgentStages 复用件，棒1）：自主规划边执行边跳动，对话流顶部展示全局进度；
           运行中/终态都显示（终态保留回看，对齐 agentChat）；未声明阶段的 agent 不渲染 -->
      <div
        v-if="stageItems.length > 0"
        class="bidr-agent-stages"
      >
        <AgentStages
          :stages="stageItems"
          :plan="planItems"
          :started-at="status?.startedAt"
        />
      </div>

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
             单组展示件 AgentProcessGroup（棒2 自本文件原样抽出）：§02 行模型/组头相位/计数/
             耗时/实时预览全在组件内，类名与 DOM 结构不变；本面板只做多组编排——归组循环＋
             谁是当前组（lastProcGroupId）＋会话态（running/paused），InkHubChat 多轮对话线
             （棒3）按轮各喂一组复用同件，两壳观感统一 -->
        <AgentProcessGroup
          v-else-if="item.kind === 'process'"
          :items="item.children"
          :running="sessionStatus === 'RUNNING'"
          :paused="sessionStatus === 'PAUSED'"
          :current="item.id === lastProcGroupId"
          :live="livePreviewLine"
          :now="nowTick"
        />

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
            @click.prevent="onArtifactClick(item.artifact)"
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

      <!-- 待确认口径卡（棒1）：LLM 自决口径经 report_unconfirmed 登记，pending 条目非空即渲染
           （对话流内、结论卡之前）；裁决接线归 AgentConfirmCard（终态两钮/运行中只提示），
           裁决成功本地收走该条（轮询快照同步兜底），改口径向上透传业务壳触发重算 -->
      <AgentConfirmCard
        v-if="pendingConfirmations.length > 0"
        :session-id="sessionId || ''"
        :items="pendingConfirmations"
        :terminal="isTerminal"
        @resolved="onConfirmationResolved"
        @confirmation-revised="onConfirmationRevised"
      />

      <!-- 终态结论卡（U73：不再标「AI」说话人，卡片本身即模型输出）——
           两栈单源组件（agentChat 同款，S5），正文走共享 markdown 管线（含圈号分行兜底）；
           totalText＝全程三口径之一（startedAt→endedAt，棒1） -->
      <AgentConclusionCard
        v-if="conclusion"
        :kind="conclusion.kind"
        :title="conclusion.title"
        :text="conclusion.text || ''"
        :total-text="totalText"
      />

      <!-- 终态评价区（规格 §10，棒1）：like/dislike 方钮（同值再点＝取消，对齐 agentChat）；
           status 快照无 rating 回显字段（M-5 取证），本会话内存态——刷新后不回显为已知项 -->
      <div
        v-if="conclusion && !readOnly"
        class="bidr-agent-rate"
      >
        <span class="bidr-agent-rate__label">本次会话：</span>
        <span
          class="bidr-agent-rate__btn"
          :class="{ 'is-active': rating === 'like' }"
          title="有帮助"
          @click="onRate('like')"
        >
          <LikeOutlined />
        </span>
        <span
          class="bidr-agent-rate__btn is-dislike"
          :class="{ 'is-active': rating === 'dislike' }"
          title="没帮助"
          @click="onRate('dislike')"
        >
          <DislikeOutlined />
        </span>
      </div>
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

    <!-- 点踩反馈收集弹层（对齐 agentChat：首点 dislike 先收集反馈再提交） -->
    <a-modal
      v-model:open="feedbackOpen"
      title="感谢反馈，请告诉我们哪里没帮助"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitFeedback"
    >
      <a-textarea
        v-model:value="feedbackText"
        :rows="4"
        placeholder="例如：生成的指标口径不对 / 缺少 XX 维度 / 速度太慢…"
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled, CheckCircleOutlined, DislikeOutlined, FileExcelOutlined,
  FileImageOutlined, FilePdfOutlined, FilePptOutlined, FileTextOutlined,
  FileWordOutlined, LikeOutlined, RobotOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'

import AgentStages from '@/framework/components/common/agentStages/index.vue'
import type { AgentStageItem } from '@/framework/components/common/agentStages/types'

import { useStickScroll } from './useStickScroll'

import AgentConfirmCard from './AgentConfirmCard.vue'
import AgentConclusionCard from './AgentConclusionCard.vue'
import AgentProcessGroup from './AgentProcessGroup.vue'
import AskDecisionCard from './AskDecisionCard.vue'
import Composer from './composer/Composer.vue'
import { clipOneLine, fmtDuration } from './fmt'
import PlanCapsule from './PlanCapsule.vue'
import { markdownOf } from './markdown'
import { formatFileSize, AGENT_CAPABILITY, type AgentArtifact, type AgentConfirmationT, type AgentFileRef, type AgentToolItem, type AgentViewItem } from './types'
import { useAgentConversation } from './useAgentConversation'

import { sessionArtifactUrl, sessionInterject, sessionRate } from '@/framework/apis/agent'

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
  /** 待确认口径改口径（棒1）：签名与 agentChat 一致，业务壳监听后触发受影响产出重算 */
  (e: 'confirmation-revised', item: AgentConfirmationT, note: string): void
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

// ==================== 阶段条 / 待确认口径（棒1 能力补齐，交互对齐 agentChat） ====================

/** status 快照的 stages 清单（AgentStages 复用件数据源；浅拷贝避免视图直写快照） */
const stageItems = computed<AgentStageItem[]>(() =>
  (status.value?.stages || []).map(s => ({ ...s })))

/** 待确认口径 pending 集合：快照 pending 条目再剔除本地已裁决（裁决成功即收走，不等 2s 轮询） */
const resolvedConfirmIds = ref(new Set<number>())
const pendingConfirmations = computed<AgentConfirmationT[]>(() =>
  (status.value?.confirmations || []).filter(c =>
    c.status === 'pending' && !resolvedConfirmIds.value.has(c.id)))

/** 单条裁决成功（确认/改口径皆发）：本地收走该条，轮询快照把状态改写后自然一致 */
const onConfirmationResolved = (id: number) => {
  const next = new Set(resolvedConfirmIds.value)
  next.add(id)
  resolvedConfirmIds.value = next
}

/** 改口径向上透传（签名与 agentChat 一致）：会话侧已标 revised，业务写回归业务壳 */
const onConfirmationRevised = (item: AgentConfirmationT, note: string) => {
  emit('confirmation-revised', item, note)
}

// ==================== 终态评价（棒1，规格 §10；对齐 agentChat） ====================

// status 快照无 rating 回显字段（M-5 取证：评价落 skill 底座 SkillRatingRecord，
// status VO 无该字段），本会话内存态；换会话即重置（刷新后不回显＝已知项）
const rating = ref<'like' | 'dislike' | null>(null)
const feedbackOpen = ref(false)
const feedbackText = ref('')

/** 评价接线（同值再点＝取消，空串提交；首次点踩先弹反馈收集再提交） */
const onRate = async (value: 'like' | 'dislike') => {
  const sid = props.sessionId
  if (!sid) return
  if (value === 'dislike' && rating.value !== 'dislike') {
    feedbackOpen.value = true
    return
  }
  const next = rating.value === value ? '' : value
  try {
    await sessionRate(sid, next)
    rating.value = (next || null) as 'like' | 'dislike' | null
  } catch (e: any) {
    message.error(e?.message || '评价失败')
  }
}

const submitFeedback = async () => {
  const sid = props.sessionId
  if (!sid) return
  try {
    await sessionRate(sid, 'dislike', feedbackText.value.trim() || undefined)
    rating.value = 'dislike'
  } catch (e: any) {
    message.error(e?.message || '评价失败')
  } finally {
    feedbackOpen.value = false
    feedbackText.value = ''
  }
}

// 换会话即复位：口径裁决遮罩/评价态不跨会话残留
watch(() => props.sessionId, () => {
  resolvedConfirmIds.value = new Set()
  rating.value = null
  feedbackOpen.value = false
  feedbackText.value = ''
})

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

/** 折叠组渲染条目：children 保持事件原顺序（tool/log 混排）；§02 行模型（rows 视图）
 *  已随 AgentProcessGroup 组件内建（棒2 抽出），本面板只管归组编排 */
interface ProcGroupItem {
  kind: 'process'
  id: string
  seq: number
  time: number
  children: AgentViewItem[]
}

type AgentRenderItem = AgentViewItem | ProcGroupItem

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
      children: bucket
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

/* 组头相位/计数/组耗时/实时预览的推导已随 AgentProcessGroup 组件内建（棒2 抽出）：
 * 本面板只按「谁是最后一组＋会话态」给每个组传 current/running/paused/live（模板消费处） */

// fmtDuration/clipOneLine 已单源到 ./fmt（棒3：与 AgentProcessGroup 同一份口径，行为逐字不变）

/**
 * 乐观作答（S10 起与 AskDecisionCard 分工）：卡片自持视觉锁定（optimistic＝作答即 pending 态，
 * 轮询把问题收走/换新即卸载）；本组件只留 pendingAnswer 标记驱动头部状态条「已作答」，
 * 轮询追上（问题消失或换新问题）即清标记，提交失败由 catch 调卡片 unlock() 回滚。
 */
const pendingAnswer = ref<number | null>(null)
watch(waitingQuestion, q => {
  if (!q || q.id !== pendingAnswer.value) pendingAnswer.value = null
})

/** 产物打开防抖标记（续签在途防重复点） */
const artifactOpening = ref('')
/**
 * 产物点击续签（2026-11-20 真机反馈）：artifact 事件携带的预签名地址仅生成时刻约 1h 有效，
 * 历史回放/隔天点击必过期（OSS 403）——先调后端续签口取新鲜地址再跳转；续签失败（旧后端/
 * 能力未装配）回落事件自带地址（新会话内仍然有效）。
 */
const onArtifactClick = async (artifact: AgentArtifact) => {
  const sid = props.sessionId
  if (!sid || artifactOpening.value) return
  artifactOpening.value = artifact.fileId
  try {
    const fresh = (await sessionArtifactUrl(sid, artifact.fileId))?.payload as { url?: string } | undefined
    const url = fresh?.url || artifact.url
    if (url) window.open(url, '_blank', 'noopener')
  } catch {
    if (artifact.url) window.open(artifact.url, '_blank', 'noopener')
  } finally {
    artifactOpening.value = ''
  }
}

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

// ==================== 全程三口径（棒1）：结论卡全程＋头部运行秒表 ====================

/** 结论卡全程时长：startedAt→endedAt（终态快照双戳齐全才算；不足 1 秒不出） */
const totalText = computed(() => {
  const { startedAt, endedAt } = status.value || {}
  if (!isTerminal.value || !startedAt || !endedAt) return ''
  const sec = Math.round((endedAt - startedAt) / 1000)
  return sec >= 1 ? fmtDuration(sec) : ''
})

/** 头部运行秒表：RUNNING（非只读回放）时状态文案后「· X分X秒」，nowTick 每秒驱动；
 *  起点＝后端 startedAt（缺席回落挂载时刻 startupAt）；不足 1 秒不出 */
const runningElapsedText = computed(() => {
  if (sessionStatus.value !== 'RUNNING' || props.readOnly) return ''
  const start = status.value?.startedAt || startupAt.value
  if (!start) return ''
  const sec = Math.floor((nowTick.value - start) / 1000)
  return sec >= 1 ? fmtDuration(sec) : ''
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

/** 实时流当前内容（最后一个非空行）：过程组头预览（经 :live 传给 AgentProcessGroup）跟它走＝
 *  跟着模型最新一笔思考/输出刷，不再固定显示开头一句（U71：取首行时长思考看着像卡住） */
const livePreviewLine = computed(() => {
  const lines = (liveBody.value || '').split('\n').map(line => line.trim()).filter(Boolean)
  return clipOneLine(lines[lines.length - 1] || '')
})

// ==================== 滚动跟随（贴近底部才自动滚，用户上翻阅读不打断；S8 单源 useStickScroll） ====================

const bodyRef = ref<HTMLDivElement | null>(null)
const { onScroll: onBodyScroll, scrollBottom: stickBottom } = useStickScroll(() => bodyRef.value, 48)

watch(() => items.value.length, () => stickBottom())
watch(liveText, () => stickBottom())
watch(conclusion, v => {
  if (v) stickBottom()
})
</script>