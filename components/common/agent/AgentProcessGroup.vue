<template>
  <!-- 过程折叠组（§02 形态，自 AgentPane 抽出的单组展示件）：
       开合只由用户点击控制（不自开不自关）；组头两态（U71）：
       · 运行中＝计数徽标（折叠显数字、点开变箭头）＋「工作中」＋实时时分秒＋一行最新内容预览
       · 已完结＝绿勾＋「已完成」＋耗时（不再显示交互数与预览）；PAUSED 最后一组＝「已暂停」 -->
  <details class="bidr-agent-proc">
    <summary
      class="bidr-agent-proc__head"
      :class="`is-${phase}`"
    >
      <template v-if="phase === 'done'">
        <CheckCircleFilled class="bidr-agent-proc__done" />
      </template>
      <span
        v-else
        class="bidr-agent-proc__toggle"
      >
        <span
          class="bidr-agent-proc__count"
          :class="`is-d${Math.min(3, String(count).length)}`"
        >{{ count }}</span>
        <span class="bidr-agent-proc__chev"></span>
      </span>
      <span
        class="bidr-agent-proc__label"
        :class="{ 'is-running': phase === 'live' }"
      >{{ phaseLabel }}</span>
      <span
        v-if="durationText"
        class="bidr-agent-proc__state"
        :class="{ 'is-running': phase === 'live' }"
      >{{ durationText }}</span>
      <span
        v-if="phase === 'live' && preview"
        class="bidr-agent-proc__preview"
        :title="preview"
      >{{ preview }}</span>
    </summary>
    <!-- 组内行（§02 规格）：工具/思考行＝18px 编号圈＋名称（500）＋摘要＋单步耗时右缘对齐，
         进行中整行琥珀＋「执行中…」，点行展开入参/返回明细；log 行＝编号位灰点不占编号；
         等待族连续轮询并成一行（「进度检查 N 次」） -->
    <div class="bidr-agent-proc__body">
      <template
        v-for="row in rows"
        :key="row.key"
      >
        <details
          v-if="row.kind !== 'log'"
          class="bidr-agent-proc__rowitem"
        >
          <summary
            class="bidr-agent-proc__row"
            :class="{ 'is-run': isRowRunning(row) }"
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
                  v-if="isRowRunning(row)"
                  class="bidr-agent-proc__row-hint"
                >执行中…</span>
                <span
                  v-if="rowDurText(row)"
                  class="bidr-agent-proc__row-dur"
                >{{ rowDurText(row) }}</span>
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
</template>

<script lang="ts" setup>
/**
 * 过程折叠组（单组展示件，2026-11-20 自 AgentPane.vue 原样抽出）：
 * 输入＝本轮连续 tool/log 事件（AgentViewItem[]，append-only），组件内自建 §02 行模型
 * （编号圈/摘要/单步耗时右对齐/log 灰点/等待族折叠/点行展开 pre），组头相位/计数/耗时/
 * 实时预览推导原样平移。多组编排（何时成组、谁是当前组）归宿主——AgentPane 按
 * groupedItems 循环喂组，InkHubChat 多轮对话线（棒3）按轮各喂一组，两壳观感统一。
 *
 * 相位推导（与 AgentPane 原口径逐字等价）：
 * · live   ＝本组是宿主当前组（current）且会话运行中（running）——「工作中」＋实时跳秒＋预览
 * · paused ＝当前组且会话暂停（paused）——「已暂停」
 * · done   ＝其余——绿勾＋「已完成」＋耗时定格
 */
import { CheckCircleFilled } from '@ant-design/icons-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import './styles.css'

import { THINK_ARCHIVE_PREFIX } from './processLines'
import type { AgentViewItem } from './types'

interface Props {
  /** 本组事件（连续 tool/log 混排，归组产物；行模型在组件内构建） */
  items: AgentViewItem[]
  /** 会话运行中：行级琥珀「执行中…」与耗时跳秒的依据（与 AgentPane 的 sessionStatus==='RUNNING' 同义） */
  running?: boolean
  /** 会话暂停中（与 current 合取才有相位效果） */
  paused?: boolean
  /** 本组是宿主当前活动组（AgentPane＝最后一个过程组；InkHubChat＝进行中的那一轮） */
  current?: boolean
  /** 实时预览行文案（宿主实时流最新一行；仅 live 相位显示，缺席回落组内最后孩子摘要） */
  live?: string
  /** 组耗时起点（缺省取首条 item.time） */
  startedAt?: number
  /** 外部秒级心跳（宿主 nowTick，ms；缺省且 running 时组件自走 1s 定时器） */
  now?: number
}

const props = withDefaults(defineProps<Props>(), {
  running: false,
  paused: false,
  current: false,
  live: ''
})

/* ==================== 行模型（§02 规格：编号圈/摘要/耗时右对齐/log 灰点/等待折叠） ==================== */

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
 * 归组后 children → 行模型：工具行带编号与耗时（endedAt 由 events 层配对回填）、
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

const rows = computed<ProcRow[]>(() => buildProcRows(props.items))

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

/** 单行截断（U65 预览行用）：压平空白，超长 …（CSS 省略号兜底，这里控制 title 全文长度）。
 *  与 AgentPane 的 livePreviewLine 同一份口径（行级 3 行小助手，随组件就近维护） */
const clipOneLine = (text: string, max = 120): string => {
  const one = (text || '').replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max)}…` : one
}

/* ==================== 心跳（耗时跳秒） ==================== */

/**
 * 秒级心跳：会话 RUNNING 期间让时长实时跳。宿主传了 now（AgentPane 的 nowTick）就共用
 * 外部心跳保证逐帧同秒；缺席（InkHubChat 裸用）且 running 时组件自走 1s 定时器，
 * 暂停/终态即停——深度思考期间没有工具事件，没有心跳秒数会冻住。
 */
const localTick = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | null = null
watch(() => [props.running, props.now] as const, ([running, now]) => {
  const need = running && now === undefined
  if (need && !tickTimer) {
    tickTimer = setInterval(() => { localTick.value = Date.now() }, 1000)
  } else if (!need && tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})
const nowTick = computed(() => (props.now === undefined ? localTick.value : props.now))

/* ==================== 组头相位 / 计数 / 耗时 / 预览 ==================== */

/**
 * 组相位（U71，原 AgentPane 口径平移：live 判据＝当前组＋会话 RUNNING，模型思考期间
 * 也算，天然不抖——不会因工具间隙翻转导致组头文案来回跳）：
 * · live   ＝当前组且 running
 * · paused ＝当前组且 paused
 * · done   ＝其余，全部按已完成展示（绿勾＋已完成＋耗时）
 */
type ProcPhase = 'live' | 'paused' | 'done'
const phase = computed<ProcPhase>(() => {
  if (!props.current) return 'done'
  if (props.running) return 'live'
  if (props.paused) return 'paused'
  return 'done'
})

/** 组头状态字：运行中「工作中」/ 暂停「已暂停」/ 终态「已完成」 */
const phaseLabel = computed(() => {
  if (phase.value === 'live') return '工作中'
  if (phase.value === 'paused') return '已暂停'
  return '已完成'
})

/**
 * 折叠组交互数（工具调用＋深度思考各算 1，纯日志行不算；等待折叠族整段算 1）——
 * 计数就是折叠头的展开按钮（折叠显示数字、点开变箭头，U67），与组内编号行同源（行模型）。
 */
const count = computed(() => rows.value.filter(row => row.kind !== 'log').length)

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

/** 组耗时：live（当前组＋运行中）按当前时刻算；其余＝首尾事件差（startedAt 缺省取首条 item.time） */
const duration = computed<number | null>(() => {
  const start = props.startedAt ?? (props.items.length > 0 ? props.items[0].time : null)
  if (start == null) return null
  const last = props.items[props.items.length - 1]
  const live = phase.value === 'live'
  const end = live ? nowTick.value : (last ? last.time : start)
  const sec = Math.round((end - start) / 1000)
  return Number.isFinite(sec) && sec > 0 ? sec : null
})

/** 组时长文案：状态字后直接跟时间（「工作中 1分44秒」/「已完成 1分42秒」）；不足 1 秒不出 */
const durationText = computed(() => {
  const sec = duration.value
  return sec === null ? '' : fmtDuration(sec)
})

/**
 * 单次深度思考耗时已在行模型构建时算好（think.dur，归档事件与组内上一事件差值近似口径；
 * 组内第一条无前序事件不出，宁缺不编）。
 */

/** 行级单步耗时：执行中按本地钟实时跳（nowTick 每秒推），终态定格＝首发起→最新回包 */
const rowDurText = (row: ProcRow): string => {
  if (row.kind === 'think') return row.dur
  if (row.kind === 'log') return ''
  const live = row.running && props.running
  const end = live ? nowTick.value : row.to
  if (end == null) return ''
  return fmtStepDur((end - row.from) / 1000)
}

/** 行执行中（整行琥珀＋「执行中…」）：工具在途且会话 RUNNING（PAUSED 下不当在跑） */
const isRowRunning = (row: ProcRow): boolean =>
  row.kind === 'tool' && row.running && props.running

/**
 * 折叠头一行实时预览（U65）：live 相位优先跟宿主传入的实时流行（live prop，AgentPane
 * ＝livePreviewLine），缺席回落组内最后一个孩子的单行摘要（工具＝名称＋参数摘要、
 * 思考＝正文尾行、日志＝原文）。只有 live 相位显示（终态组头改绿勾＋已完成，不挂预览）。
 */
const preview = computed(() => {
  if (props.running && props.current && props.live) return props.live
  const last = props.items[props.items.length - 1]
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
})
</script>
