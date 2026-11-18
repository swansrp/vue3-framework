<template>
  <div
    v-if="items.length"
    ref="wrapRef"
    class="bidr-agent-health"
    :class="`is-${placement}`"
  >
    <span
      class="bidr-agent-health__dot"
      :class="`is-${dotState}`"
      :title="dotTitle"
      role="button"
      @click.stop="open = !open"
    ></span>
    <div
      v-if="open"
      class="bidr-agent-health__list"
    >
      <div class="bidr-agent-health__head">
        能力状态
      </div>
      <div
        v-for="item in items"
        :key="item.label"
        class="bidr-agent-health__item"
      >
        <span
          class="bidr-agent-health__mark"
          :class="item.ok ? 'is-ok' : 'is-bad'"
        >{{ item.ok ? '✓' : '✕' }}</span>
        <span class="bidr-agent-health__label">{{ item.label }}</span>
        <span class="bidr-agent-health__note">{{ item.note }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { AGENT_CAPABILITY, AGENT_HEALTH } from '../types'

import { name } from '@/../package.json'
import { getSseStream, readSseStream } from '@/framework/utils/sse'

/**
 * 能力健康点（framework 通用件）：绿＝声明能力全部可用、红＝有不可用；点开清单逐项 ✓/✕。
 *
 * 位置语义（2026-11-18 用户口径）：探活的价值在**发起前**（知道沙箱/OCR/产物腿能不能用），
 * 跑起来之后看到没意义——所以挂在 Composer（地面态输入框）里，AgentPane 运行中不再显示。
 * 数据源与 /agents 契约同源：props.capabilities 推导条目，props.health 为首屏初值，
 * 挂载后订阅 SSE 健康帧实时翻转（断流有限重连，超额降级 props.health）。
 */
interface Props {
  /** 能力位（/agents 条目 capabilities：files.upload/files.read/ocr/artifacts.doc/exec.sandbox） */
  capabilities?: string[]
  /** 能力位运行级健康快照（/agents 条目 health；key=能力位名，value=up/down/unconfigured） */
  health?: Record<string, string> | null
  /** 清单弹出方向：up＝在底部输入条里向上弹（缺省）；down＝靠页面上方时向下弹 */
  placement?: 'up' | 'down'
}

const props = withDefaults(defineProps<Props>(), {
  capabilities: () => [],
  health: null,
  placement: 'up'
})

const capabilityList = computed<string[]>(() => props.capabilities || [])

// ==================== 探活状态（SSE 实时值优先，缺席回落 props.health） ====================

const sseHealth = ref<Record<string, string> | null>(null)

const healthMap = computed<Record<string, string> | null>(() => sseHealth.value ?? (props.health || null))

/** down/unconfigured＝不可用（灰/红）；缺席（旧后端）＝按可用处理 */
const healthDimmed = (capability: string): boolean => {
  const value = healthMap.value?.[capability]
  return value === AGENT_HEALTH.DOWN || value === AGENT_HEALTH.UNCONFIGURED
}

/** 探活值→一句话状态说明 */
const healthNote = (capability: string): string => {
  const value = healthMap.value?.[capability]
  if (value === AGENT_HEALTH.DOWN) return '服务不可达'
  if (value === AGENT_HEALTH.UNCONFIGURED) return '未配置'
  return '正常'
}

interface CapabilityItem {
  label: string
  ok: boolean
  note: string
}

/** 能力清单（与 /agents 契约 capabilities 推导同源；无探活腿的能力位声明即可用） */
const items = computed<CapabilityItem[]>(() => {
  const list: CapabilityItem[] = []
  if (capabilityList.value.includes(AGENT_CAPABILITY.FILES_UPLOAD)) list.push({ label: '附件上传', ok: true, note: '随会话可用' })
  if (capabilityList.value.includes(AGENT_CAPABILITY.FILES_READ)) list.push({ label: '文件可读', ok: true, note: '随会话可用' })
  if (capabilityList.value.includes(AGENT_CAPABILITY.ARTIFACTS_DOC)) {
    list.push({ label: '产物导出', ok: !healthDimmed(AGENT_CAPABILITY.ARTIFACTS_DOC), note: healthNote(AGENT_CAPABILITY.ARTIFACTS_DOC) })
  }
  if (capabilityList.value.includes(AGENT_CAPABILITY.OCR)) {
    list.push({ label: '文字识别', ok: !healthDimmed(AGENT_CAPABILITY.OCR), note: healthNote(AGENT_CAPABILITY.OCR) })
  }
  if (capabilityList.value.includes(AGENT_CAPABILITY.EXEC_SANDBOX)) {
    list.push({ label: '沙箱执行', ok: !healthDimmed(AGENT_CAPABILITY.EXEC_SANDBOX), note: healthNote(AGENT_CAPABILITY.EXEC_SANDBOX) })
  }
  return list
})

/** 绿点两态：任一声明能力不可用＝红，否则绿（health 缺席＝全绿兼容） */
const dotState = computed<'ok' | 'bad'>(() => (items.value.some(item => !item.ok) ? 'bad' : 'ok'))

const dotTitle = computed(() => {
  const bad = items.value.filter(item => !item.ok).length
  return bad === 0 ? '能力全部可用（点开查看清单）' : `有 ${bad} 项能力不可用（点开查看）`
})

// ==================== 清单开合＋点外部收起 ====================

const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

const onDocClick = (e: MouseEvent) => {
  if (open.value && wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

// ==================== 健康度实时通道（SSE） ====================

/**
 * SSE 直连地址：与 AgentPane 对话流同款拼法——VITE_baseURL＋应用名前缀＋/web/api/agent/**；
 * 鉴权头由 getSseStream 注入（Bearer，与 request.ts 拦截器同口径）
 */
const HEALTH_STREAM_URL = `${import.meta.env.VITE_baseURL}/${name}/web/api/agent/health/stream`

const HEALTH_SSE_MAX_ATTEMPTS = 3
const HEALTH_SSE_RETRY_MS = 5000

let abortController: AbortController | null = null
/** 本生命周期内通道不可用（建连失败或重连超额）：不再尝试，圆点回落 props.health */
let sseDead = false
let sseAttempts = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

const closeSse = () => {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  abortController?.abort()
  abortController = null
}

const retrySse = () => {
  sseAttempts += 1
  if (sseAttempts > HEALTH_SSE_MAX_ATTEMPTS) {
    sseDead = true
    sseHealth.value = null
    return
  }
  retryTimer = setTimeout(() => {
    retryTimer = null
    void connectSse()
  }, HEALTH_SSE_RETRY_MS)
}

const connectSse = async () => {
  if (sseDead || abortController) return
  abortController = new AbortController()
  const { signal } = abortController
  try {
    const resp = await getSseStream(HEALTH_STREAM_URL, signal)
    // 传输层嗅探：ok＋text/event-stream＋有 body 才算建连；旧后端 404／错误信封＝本生命周期降级
    const contentType = resp.headers.get('content-type') || ''
    if (!resp.ok || !contentType.includes('text/event-stream') || !resp.body) {
      resp.body?.cancel().catch(() => { })
      abortController = null
      sseDead = true
      return
    }
    sseAttempts = 0
    await readSseStream(resp.body, (event, data) => {
      if (event === 'health') {
        try {
          sseHealth.value = JSON.parse(data)
        } catch {
          // 坏帧忽略：快照以最近一帧合法 JSON 为准
        }
      }
      // connected 帧＝通道就绪确认；:ping 注释行 readSseStream 已过滤
    })
    // 读流正常退出＝断流：有限次重连，超额降级
    abortController = null
    retrySse()
  } catch {
    abortController = null
    if (!signal.aborted) {
      retrySse()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  void connectSse()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  closeSse()
})
</script>