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
        <!-- 能力健康点（原逐项徽标收敛为一个点）：绿＝声明能力全部可用、红＝有不可用；
             点开列清单逐项 ✓/✕，SSE 探活变化实时翻转（healthMap 同源） -->
        <div
          v-if="capabilityItems.length"
          ref="capWrapRef"
          class="bidr-agent-pane__capwrap"
        >
          <span
            class="bidr-agent-pane__capdot"
            :class="`is-${capDotState}`"
            :title="capDotTitle"
            @click.stop="capListOpen = !capListOpen"
          ></span>
          <div
            v-if="capListOpen"
            class="bidr-agent-pane__caplist"
          >
            <div class="bidr-agent-pane__caplist-head">
              能力状态
            </div>
            <div
              v-for="item in capabilityItems"
              :key="item.label"
              class="bidr-agent-pane__capitem"
            >
              <span
                class="bidr-agent-pane__capitem-mark"
                :class="item.ok ? 'is-ok' : 'is-bad'"
              >{{ item.ok ? '✓' : '✕' }}</span>
              <span class="bidr-agent-pane__capitem-label">{{ item.label }}</span>
              <span class="bidr-agent-pane__capitem-note">{{ item.note }}</span>
            </div>
          </div>
        </div>
        <a-button
          v-if="showRestart && isTerminal"
          size="small"
          type="text"
          @click="emit('restart')"
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
      <div
        v-if="!status && items.length === 0"
        class="bidr-agent-pane__empty"
      >
        会话启动中…
      </div>

      <template
        v-for="item in groupedItems"
        :key="item.id"
      >
        <div
          v-if="item.kind === 'text'"
          class="bidr-agent-msg"
        >
          <!-- LLM 正文 markdown 渲染（净化后 v-html；流式期仍走 live 区纯文本） -->
          <div
            class="bidr-agent-msg__text is-md"
            v-html="markdownOf(item.text)"
          ></div>
        </div>

        <!-- 过程折叠组：连续的工具调用/日志收进一个可折叠块（正文留主面，过程按需展开）；
             组内工具在途时默认展开＋转圈，全部完成自动收起 -->
        <details
          v-else-if="item.kind === 'process'"
          class="bidr-agent-proc"
          :open="item.running"
        >
          <summary class="bidr-agent-proc__head">
            <span class="bidr-agent-proc__chev"></span>
            <span class="bidr-agent-proc__label">{{ procLabel(item) }}</span>
            <span
              class="bidr-agent-proc__state"
              :class="item.running ? 'is-running' : 'is-done'"
            >{{ item.running ? '执行中…' : '已完成' }}</span>
          </summary>
          <div class="bidr-agent-proc__body">
            <template
              v-for="child in item.children"
              :key="child.id"
            >
              <details
                v-if="child.kind === 'tool'"
                class="bidr-agent-tool"
                :open="child.status === 'running'"
              >
                <summary class="bidr-agent-tool__head">
                  <LoadingOutlined
                    v-if="child.status === 'running'"
                    spin
                    class="bidr-agent-tool__spin"
                  />
                  <CheckCircleFilled
                    v-else
                    class="bidr-agent-tool__done"
                  />
                  <span class="bidr-agent-tool__name">{{ child.label || child.name }}</span>
                  <span
                    v-if="child.digest"
                    class="bidr-agent-tool__digest"
                    :title="child.digest"
                  >{{ child.digest }}</span>
                  <span
                    class="bidr-agent-tool__state"
                    :class="{ 'is-running': child.status === 'running' }"
                  >{{ child.status === 'running' ? '调用中' : '已完成' }}</span>
                </summary>
                <div
                  v-if="child.args"
                  class="bidr-agent-tool__section"
                >
                  <div class="bidr-agent-tool__label">
                    入参
                  </div>
                  <pre class="bidr-agent-tool__pre">{{ child.args }}</pre>
                </div>
                <div
                  v-if="child.output"
                  class="bidr-agent-tool__section"
                >
                  <div class="bidr-agent-tool__label">
                    返回
                  </div>
                  <pre class="bidr-agent-tool__pre">{{ child.output }}</pre>
                </div>
              </details>
              <div
                v-else-if="child.kind === 'log'"
                class="bidr-agent-proc__log"
                :title="child.text"
              >
                {{ child.text }}
              </div>
            </template>
          </div>
        </details>

        <div
          v-else-if="item.kind === 'file'"
          class="bidr-agent-file"
        >
          <FileTextOutlined class="bidr-agent-file__icon" />
          <div class="bidr-agent-file__main">
            <div
              class="bidr-agent-file__name"
              :title="item.file.name"
            >
              {{ item.file.name || item.file.fileId }}
            </div>
            <div class="bidr-agent-file__meta">
              {{ formatFileSize(item.file.size) }}<template v-if="item.file.mime">
                · {{ item.file.mime }}
              </template>
            </div>
          </div>
          <span
            v-if="isFileRead(item.file)"
            class="bidr-agent-file__read"
          >
            <CheckCircleFilled /> 已读取
          </span>
          <span
            v-else
            class="bidr-agent-file__state"
          >已上传</span>
        </div>

        <!-- 产物下载卡（P2a）：AI 生成的 docx/pdf 产物，点击即下载 -->
        <div
          v-else-if="item.kind === 'artifact'"
          class="bidr-agent-artifact"
        >
          <FileWordOutlined
            v-if="isWordArtifact(item.artifact)"
            class="bidr-agent-artifact__icon is-word"
          />
          <FilePdfOutlined
            v-else
            class="bidr-agent-artifact__icon is-pdf"
          />
          <div class="bidr-agent-artifact__main">
            <div
              class="bidr-agent-artifact__name"
              :title="item.artifact.name"
            >
              {{ item.artifact.name || item.artifact.fileId }}
            </div>
            <div class="bidr-agent-artifact__meta">
              {{ formatFileSize(item.artifact.size) }}
              <template v-if="artifactFormatLabel(item.artifact)">
                · {{ artifactFormatLabel(item.artifact) }}
              </template>
            </div>
          </div>
          <a
            v-if="item.artifact.url"
            class="bidr-agent-artifact__download"
            :href="item.artifact.url"
            :download="item.artifact.name || undefined"
            target="_blank"
            rel="noopener"
          >
            <a-button
              size="small"
              type="primary"
              ghost
            >
              <DownloadOutlined /> 下载
            </a-button>
          </a>
          <span
            v-else
            class="bidr-agent-artifact__state"
          >链接缺失，可让 AI 重新生成</span>
        </div>

        <div
          v-else-if="item.kind === 'status'"
          class="bidr-agent-strip"
          :class="[`is-${item.tone}`, `is-${item.type}`]"
        >
          {{ item.text }}
        </div>
      </template>

      <!-- LLM 流式实时内容（替换式最新一帧；终态清空）——实时思考卡：脉冲点＋正文滚动盒 -->
      <div
        v-if="liveText"
        class="bidr-agent-live"
      >
        <div class="bidr-agent-live__head">
          <span class="bidr-agent-live__dot"></span>
          <span>实时思考…</span>
        </div>
        <pre class="bidr-agent-live__text">{{ liveText }}</pre>
      </div>

      <!-- 终态结论卡 -->
      <div
        v-if="conclusion"
        class="bidr-agent-conclusion"
        :class="`is-${conclusion.kind}`"
      >
        <div class="bidr-agent-conclusion__title">
          <CheckCircleFilled v-if="conclusion.kind === 'finish'" />
          <CloseCircleFilled v-else-if="conclusion.kind === 'error'" />
          <StopOutlined v-else />
          <span>{{ conclusion.title }}</span>
        </div>
        <div
          v-if="conclusion.text"
          class="bidr-agent-conclusion__text is-md"
          v-html="markdownOf(conclusion.text)"
        ></div>
      </div>
    </div>

    <!-- AI 决策问题（ask_user waiting）：点选项即作答，自由输入走底部 Composer -->
    <div
      v-if="waitingQuestion"
      class="bidr-agent-question"
    >
      <div class="bidr-agent-question__head">
        <span class="bidr-agent-question__title">AI 需要你的决策</span>
        <span class="bidr-agent-question__id">#{{ waitingQuestion.id }}</span>
      </div>
      <div
        class="bidr-agent-question__text is-md"
        v-html="markdownOf(waitingQuestion.question)"
      ></div>
      <div
        v-if="questionOptions.length > 0"
        class="bidr-agent-question__options"
      >
        <button
          v-for="(opt, oi) in questionOptions"
          :key="oi"
          type="button"
          class="bidr-agent-question__option"
          :disabled="answering"
          @click="onAnswerOption(opt.raw)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="bidr-agent-question__actions">
        <a-button
          size="small"
          :loading="answering"
          @click="onSkipQuestion"
        >
          交由 AI 决定
        </a-button>
      </div>
    </div>

    <!-- 底部输入区：附件（能力位驱动）+ 发送/暂停/停止 -->
    <Composer
      :capabilities="capabilityList"
      :status="sessionStatus"
      :waiting-question="!!waitingQuestion"
      :disabled="isTerminal || !sessionId"
      :items="attachments"
      :sending="sending"
      :stopping="stopping"
      :pausing="pausing"
      :uploading="isUploading"
      @send="onSend"
      @stop="onStop"
      @pause="onPause"
      @files="onFiles"
      @remove="removeAttachment"
    />

    <!-- 面板级文件拖拽落区提示（Composer 内另有自己的高亮，根级只覆盖其余区域） -->
    <div
      v-if="paneDragActive"
      class="bidr-agent-pane__drop-hint"
    >
      松开鼠标上传附件
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled, CloseCircleFilled, DownloadOutlined, FilePdfOutlined, FileTextOutlined,
  FileWordOutlined, LoadingOutlined, RobotOutlined, StopOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { marked } from 'marked'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import Composer from './composer/Composer.vue'
import { formatFileSize, AGENT_CAPABILITY, AGENT_HEALTH, type AgentArtifact, type AgentFileRef, type AgentToolItem, type AgentViewItem } from './types'
import { useAgentConversation } from './useAgentConversation'

import { name } from '@/../package.json'
import { getSseStream, readSseStream } from '@/framework/utils/sse'

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
  /** 能力位运行级健康快照（/agents 条目 health；探活件上报，key=能力位名，value=up/down/unconfigured）。
   *  缺席/undefined＝旧后端＝徽标全亮（兼容） */
  health?: Record<string, string> | null
  /** 终态时是否显示「重新发起」 */
  showRestart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  variant: 'sidebar',
  capabilities: () => [],
  health: null,
  showRestart: true
})

const emit = defineEmits<{
  (e: 'finished', kind: 'finish' | 'error' | 'stopped'): void
  (e: 'restart'): void
}>()

// ==================== 正文 Markdown 渲染（marked＋本地净化，口径同 AiChat） ====================

// marked v17：gfm 已含 tables，独立 tables 键已移除（TypeScript 选项校验）
marked.setOptions({ breaks: true, gfm: true })

/** 剥离脚本载体：script/iframe 等标签、on* 事件属性、javascript: 链接（LLM 输出不可信） */
const sanitizeHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.body.querySelectorAll('script,style,iframe,object,embed,link,meta,base').forEach(el => el.remove())
  doc.body.querySelectorAll('*').forEach(el => {
    // getAttributeNames 返回 string[]（NamedNodeMap 不可直接迭代）
    for (const name of el.getAttributeNames()) {
      const lower = name.toLowerCase()
      if (lower.startsWith('on') || ((lower === 'href' || lower === 'src') && (el.getAttribute(name) || '').trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(name)
      }
    }
  })
  return doc.body.innerHTML
}

/** 渲染缓存（items 全量重算每轮轮询都会重渲染；同文本只 parse 一次） */
const markdownCache = new Map<string, string>()

const markdownOf = (text: string): string => {
  if (!text) return ''
  const cached = markdownCache.get(text)
  if (cached !== undefined) return cached
  const html = sanitizeHtml(marked.parse(text) as string)
  if (markdownCache.size > 200) markdownCache.clear()
  markdownCache.set(text, html)
  return html
}

/**
 * 能力位显式解构（computed）：模板不直接裸引用 props 数组/父级 store 字段，
 * 避免 Vue 3 setup 模板裸引用在运行时才炸（项目钉子教训）。
 */
const capabilityList = computed<string[]>(() => props.capabilities || [])
const canUpload = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD))
const canReadFiles = computed(() => capabilityList.value.includes(AGENT_CAPABILITY.FILES_READ))
/** 工作台形态（主区）：样式按 .is-workbench 分支放大排版密度；缺省 sidebar 保持窄列密度 */
const isWorkbench = computed(() => props.variant === 'workbench')

/**
 * 徽标健康两态判定：SSE 实时值（sseHealth）优先，缺席回落 props.health（首屏初始值）；
 * 两者都缺席（旧后端）＝全亮；down/unconfigured＝灰。
 */
const sseHealth = ref<Record<string, string> | null>(null)
const healthMap = computed<Record<string, string> | null>(() => sseHealth.value ?? (props.health || null))
const healthDimmed = (capability: string): boolean => {
  const value = healthMap.value?.[capability]
  return value === AGENT_HEALTH.DOWN || value === AGENT_HEALTH.UNCONFIGURED
}

// ==================== 能力健康点（原逐项徽标收敛为一个点＋点开清单） ====================

/** 能力清单行：ok＝可用（探活 up 或无探活腿＝声明即可用）；note＝一句话状态说明 */
interface CapabilityItem {
  label: string
  ok: boolean
  note: string
}

/** 探活值→一句话状态说明（health 缺席＝旧后端＝按可用处理） */
const healthNote = (capability: string): string => {
  const value = healthMap.value?.[capability]
  if (value === AGENT_HEALTH.DOWN) return '服务不可达'
  if (value === AGENT_HEALTH.UNCONFIGURED) return '未配置'
  return '正常'
}

/** 能力清单（绿点下拉消费；与 /agents 契约 capabilities 推导同源） */
const capabilityItems = computed<CapabilityItem[]>(() => {
  const items: CapabilityItem[] = []
  // 附件上传（files.upload）/文件可读（files.read）无探活腿，声明即可用
  if (capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD)) items.push({ label: '附件上传', ok: true, note: '随会话可用' })
  if (canReadFiles.value) items.push({ label: '文件可读', ok: true, note: '随会话可用' })
  if (capabilityList.value.includes(AGENT_CAPABILITY.ARTIFACTS_DOC)) {
    items.push({ label: '产物导出', ok: !healthDimmed(AGENT_CAPABILITY.ARTIFACTS_DOC), note: healthNote(AGENT_CAPABILITY.ARTIFACTS_DOC) })
  }
  if (capabilityList.value.includes(AGENT_CAPABILITY.OCR)) {
    items.push({ label: '文字识别', ok: !healthDimmed(AGENT_CAPABILITY.OCR), note: healthNote(AGENT_CAPABILITY.OCR) })
  }
  if (capabilityList.value.includes(AGENT_CAPABILITY.EXEC_SANDBOX)) {
    items.push({ label: '沙箱执行', ok: !healthDimmed(AGENT_CAPABILITY.EXEC_SANDBOX), note: healthNote(AGENT_CAPABILITY.EXEC_SANDBOX) })
  }
  return items
})

/** 绿点两态：任一声明能力不可用＝红，否则绿（health 缺席＝全绿兼容） */
const capDotState = computed<'ok' | 'bad'>(() =>
  capabilityItems.value.some(item => !item.ok) ? 'bad' : 'ok')

const capDotTitle = computed(() => {
  const bad = capabilityItems.value.filter(item => !item.ok).length
  return bad === 0 ? '能力全部可用（点开查看清单）' : `有 ${bad} 项能力不可用（点开查看）`
})

/** 清单开合＋点外部收起（document 级监听，挂载/卸载随既有钩子） */
const capListOpen = ref(false)
const capWrapRef = ref<HTMLElement | null>(null)
const onDocClickForCapList = (e: MouseEvent) => {
  if (capListOpen.value && capWrapRef.value && !capWrapRef.value.contains(e.target as Node)) {
    capListOpen.value = false
  }
}

// ==================== 健康度实时通道（SSE，探活状态变化即翻转徽标） ====================

/**
 * SSE 直连地址：agentChat 会话流（useAgentSession）同款拼法——VITE_baseURL＋应用名前缀
 * ＋/web/api/agent/**（epc 部署在 /epc-ai/ 下，裸写 /web/api 会 404）；鉴权头由
 * getSseStream 注入（Bearer，与 request.ts 拦截器同口径），不走 request 封装。
 */
const HEALTH_STREAM_URL = `${import.meta.env.VITE_baseURL}/${name}/web/api/agent/health/stream`

/** 断流重连上限与间隔：超额降级 props.health（现状行为）；建连失败（旧后端 404 等）不重试 */
const HEALTH_SSE_MAX_ATTEMPTS = 3
const HEALTH_SSE_RETRY_MS = 5000

let healthAbortController: AbortController | null = null
/** 本生命周期内通道不可用（建连失败或重连超额）：不再尝试，徽标回落 props.health */
let healthSseDead = false
let healthSseAttempts = 0
let healthSseRetryTimer: ReturnType<typeof setTimeout> | null = null

const closeHealthSse = () => {
  if (healthSseRetryTimer) {
    clearTimeout(healthSseRetryTimer)
    healthSseRetryTimer = null
  }
  healthAbortController?.abort()
  healthAbortController = null
}

const retryHealthSse = () => {
  healthSseAttempts += 1
  if (healthSseAttempts > HEALTH_SSE_MAX_ATTEMPTS) {
    healthSseDead = true
    sseHealth.value = null
    return
  }
  healthSseRetryTimer = setTimeout(() => {
    healthSseRetryTimer = null
    void connectHealthSse()
  }, HEALTH_SSE_RETRY_MS)
}

const connectHealthSse = async () => {
  if (healthSseDead || healthAbortController) return
  healthAbortController = new AbortController()
  const { signal } = healthAbortController
  try {
    const resp = await getSseStream(HEALTH_STREAM_URL, signal)
    // 传输层嗅探（站内信流同款）：ok＋text/event-stream＋有 body 才算建连；
    // 旧后端 404／错误信封 200+JSON＝不满足 → 本生命周期降级 props.health 不再重试
    const contentType = resp.headers.get('content-type') || ''
    if (!resp.ok || !contentType.includes('text/event-stream') || !resp.body) {
      resp.body?.cancel().catch(() => { })
      healthAbortController = null
      healthSseDead = true
      return
    }
    healthSseAttempts = 0
    await readSseStream(resp.body, (event, data) => {
      if (event === 'health') {
        try {
          sseHealth.value = JSON.parse(data)
        } catch {
          // 坏帧忽略：快照以最近一帧合法 JSON 为准
        }
      }
      // connected 帧＝通道就绪确认；:ping 注释行 readSseStream 已过滤，均无需处理
    })
    // 读流正常退出＝断流（后端重启/代理斩断）：有限次重连，超额降级
    healthAbortController = null
    retryHealthSse()
  } catch {
    healthAbortController = null
    if (!signal.aborted) {
      retryHealthSse()
    }
  }
}

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
  refreshFiles,
  removeAttachment,
  answer,
  pause,
  resume,
  stop,
  refresh
} = useAgentConversation(sessionIdRef)

// ==================== 过程折叠组（连续工具/日志收纳成可折叠块，正文留主面） ====================

/** 折叠组渲染条目：children 保持事件原顺序（tool/log 混排） */
interface AgentProcessGroup {
  kind: 'process'
  id: string
  seq: number
  time: number
  children: AgentViewItem[]
  /** 组内任一工具在途＝默认展开＋头部转圈；全部完成自动收起 */
  running: boolean
}

type AgentRenderItem = AgentViewItem | AgentProcessGroup

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
      running: bucket.some(i => i.kind === 'tool' && i.status === 'running')
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

/** 折叠组时长（首尾事件差取整秒；无有效差值返回 null 不展示） */
const procDuration = (group: AgentProcessGroup): number | null => {
  const first = group.children[0]
  const last = group.children[group.children.length - 1]
  if (!first || !last) return null
  const sec = Math.round((last.time - first.time) / 1000)
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

/** 折叠组标题（参考 IDE agent 流的「执行过程」卡头）：执行过程（N 步 · 共 Xs） */
const procLabel = (group: AgentProcessGroup): string => {
  const tools = group.children.filter(i => i.kind === 'tool').length
  const span = procDuration(group)
  const inner: string[] = []
  if (tools > 0) inner.push(`${tools} 步`)
  if (span !== null) inner.push(`共 ${span}s`)
  return inner.length ? `执行过程（${inner.join(' · ')}）` : '执行过程'
}

const statusClass = computed(() => (waitingQuestion.value ? 'waiting' : sessionStatus.value.toLowerCase()))

const statusText = computed(() => {
  if (waitingQuestion.value) return '待回答'
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
  if (!canReadFiles.value || !readProbeText.value) return false
  return readProbeText.value.includes(file.fileId) || (!!file.name && readProbeText.value.includes(file.name))
}

// ==================== 产物下载卡（P2a） ====================

/** 格式图标判定：docx/doc 走 Word 图标，其余（pdf 等）走 PDF 图标 */
const isWordArtifact = (artifact: AgentArtifact): boolean =>
  /\.docx?$/i.test(artifact.name || '') || artifact.format?.toLowerCase() === 'docx'

/** 格式徽标文案：docx→Word 文档、pdf→PDF 文档，其余回落大写格式串 */
const artifactFormatLabel = (artifact: AgentArtifact): string => {
  const fmt = (artifact.format || '').toLowerCase()
  if (fmt === 'docx') return 'Word 文档'
  if (fmt === 'pdf') return 'PDF 文档'
  return fmt ? fmt.toUpperCase() : ''
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

// 终态回调只发一次（同一 sessionId）；切换会话复位
const finishedFor = ref<string | null>(null)
watch(() => props.sessionId, () => {
  finishedFor.value = null
})
watch([() => props.sessionId, isTerminal], () => {
  if (!props.sessionId || !isTerminal.value) return
  if (finishedFor.value === props.sessionId) return
  finishedFor.value = props.sessionId
  emit('finished', terminalKind.value)
}, { immediate: true })

// ==================== 决策问题作答 ====================

/** 候选项展示：JSON 对象串取 label/desc，提交仍用 raw（保证回传无损） */
const questionOptions = computed(() => (waitingQuestion.value?.options || []).map(raw => {
  const text = raw || ''
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj === 'object') {
        const label = typeof obj.label === 'string' ? obj.label : ''
        const desc = typeof obj.desc === 'string' ? obj.desc : ''
        if (label || desc) return { label: label || desc, raw }
      }
    } catch {
      // 非合法 JSON：回落原文
    }
  }
  return { label: text, raw }
}))

const answering = ref(false)

const onAnswerOption = async (option: string) => {
  const q = waitingQuestion.value
  if (!q || answering.value) return
  answering.value = true
  try {
    await answer(q.id, option)
  } catch (e: any) {
    message.error(e?.message || '作答失败')
  } finally {
    answering.value = false
  }
}

const onSkipQuestion = async () => {
  const q = waitingQuestion.value
  if (!q || answering.value) return
  answering.value = true
  try {
    await answer(q.id, undefined, true)
  } catch (e: any) {
    message.error(e?.message || '操作失败')
  } finally {
    answering.value = false
  }
}

// ==================== 发送 / 停止 / 上传 ====================

const sending = ref(false)
const stopping = ref(false)
const pausing = ref(false)

/**
 * 发送语义按会话状态路由（自主会话没有"追加用户消息"端点）：
 * - 有 waiting 问题 → 作答（sessionAnswer）；
 * - PAUSED → 补指导语并恢复（sessionResume）；
 * - RUNNING/终态 → 不发（Composer 已置灰，这里兜底提示）。
 */
const onSend = async (text: string) => {
  if (!props.sessionId) return
  sending.value = true
  try {
    if (waitingQuestion.value) {
      await answer(waitingQuestion.value.id, text)
    } else if (sessionStatus.value === 'PAUSED') {
      await resume(text || undefined)
    } else {
      message.info('任务执行中，如需补充指导请先暂停')
    }
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

/** 根级是否接收文件：能力位在场、非终态、无上传在途 */
const paneDropAllowed = () => canUpload.value && !isTerminal.value && !isUploading.value

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
  if (!canUpload.value || isTerminal.value) return
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
  document.addEventListener('click', onDocClickForCapList)
  void connectHealthSse()
})

onBeforeUnmount(() => {
  window.removeEventListener('dragend', onWindowDragEnd)
  window.removeEventListener('drop', onWindowDragEnd)
  window.removeEventListener('dragleave', onWindowDragLeave)
  document.removeEventListener('click', onDocClickForCapList)
  closeHealthSse()
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

// 会话就绪且能力位在场时回显服务端已传清单（刷新/重连恢复 chips）
watch([() => props.sessionId, capabilityList], ([id, caps]) => {
  if (id && caps.includes(AGENT_CAPABILITY.FILES_UPLOAD)) void refreshFiles()
}, { immediate: true })

// ==================== 滚动跟随（贴近底部才自动滚，用户上翻阅读不打断） ====================

const bodyRef = ref<HTMLDivElement | null>(null)
const nearBottom = ref(true)

const onBodyScroll = () => {
  const el = bodyRef.value
  if (!el) return
  nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

const scrollBottom = async () => {
  await nextTick()
  const el = bodyRef.value
  if (el && nearBottom.value) el.scrollTop = el.scrollHeight
}

watch(() => items.value.length, () => void scrollBottom())
watch(liveText, () => void scrollBottom())
watch(conclusion, v => {
  if (v) void scrollBottom()
})
</script>