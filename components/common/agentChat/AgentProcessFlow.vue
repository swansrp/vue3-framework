<template>
  <div
    v-if="flow.steps.length || running"
    class="apf"
  >
    <div
      class="apf__head"
      @click="open = !open"
    >
      <span
        class="apf__chev"
        :class="{ 'is-open': open }"
      ></span>
      <span>执行过程（{{ stepCount }} 步{{ totalMs != null ? ` · 共 ${fmtDur(totalMs)}` : '' }}）</span>
      <span
        v-if="running"
        class="apf__meta"
      >{{ waiting ? '等待你的回答' : '执行中…' }}</span>
    </div>
    <div
      class="apf__wrap"
      :class="{ 'is-closed': !open }"
    >
      <div class="apf__inner">
        <ul
          v-if="plan && plan.length"
          class="apf-plan"
        >
          <li
            v-for="p in plan"
            :key="p.id"
            class="apf-plan__item"
            :class="`is-${p.status}`"
          >
            <span class="apf-plan__mark">{{ p.status === 'done' ? '✓' : p.status === 'running' ? '▶' : p.status === 'stopped' ? '⊘' : '○' }}</span>
            <span>{{ p.text }}</span>
          </li>
        </ul>
        <div
          v-for="(s, si) in flow.steps"
          :key="si"
          class="apf__step"
          :class="{ 'is-run': s.running, 'is-log': s.isLog }"
        >
          <span
            class="apf__n"
            :class="{ 'is-log': s.isLog }"
          >{{ s.isLog ? '·' : s.ord }}</span>
          <span class="apf__body">
            <span
              class="apf__line"
              @click="toggleStep(si)"
            >
              {{ s.summary }}
              <span
                v-if="s.polls > 1"
                class="apf__polls"
              >进度检查 {{ s.polls }} 次</span>
              <span
                v-if="!s.isLog && stepMs(s) != null"
                class="apf__dur"
                :class="{ 'is-live': s.running }"
              >{{ fmtDur(stepMs(s)!) }}</span>
              <span
                v-if="s.running && stepMs(s) == null"
                class="apf__runhint"
              >执行中…</span>
            </span>
            <pre
              v-if="expanded.has(si)"
              class="apf__raw"
            >{{ s.detail }}</pre>
          </span>
        </div>
        <div
          v-if="running && !flow.steps.length"
          class="apf__step is-run is-hint"
        >
          <span class="apf__n">…</span><span>正在思考与检索</span>
        </div>
      </div>
    </div>
    <div
      v-if="running && live"
      class="apf-live"
    >
      <div class="apf-live__head">
        <span
          class="apf-live__dot"
          :class="{ 'is-idle': waiting }"
        ></span>{{ waiting ? '等待你的回答' : '实时思考' }}
      </div>
      <div
        ref="liveTextRef"
        class="apf-live__text"
        @scroll="onLiveScroll"
      >
        {{ live }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * agent 执行过程流（平铺步骤流形态的渲染正源）：执行过程块＋计划板清单＋实时思考块。
 * 步骤行分层——工具步带编号与耗时、log 行弱化成灰点不占编号、等待轮询折叠成一行；
 * 执行中整轮与单步耗时按本地钟每秒平滑（免 2s 轮询蹦秒），终态钟停＝耗时定格。
 * 归约＝processFlow.reduceProcessEvents（词汇判据与 core/llm 发射端同源）；
 * 业务工具的人话名/摘要经 labels/summarize 注入——本件不认任何业务工具。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { fmtDur, reduceProcessEvents } from './processFlow'
import type { ProcessFlowOptions, ProcessStep } from './processFlow'
import type { AgentEventX, AgentPlanItemT } from './types'

const props = withDefaults(defineProps<{
  /** 本轮过程事件（seq 单调递增，增量追加） */
  events: AgentEventX[]
  /** 会话执行中（执行中默认展开，终态自动收起；耗时定格） */
  running: boolean
  /** LLM 流式实时内容（status.live，替换式刷新；终态后端清空自然隐藏） */
  live?: string | null
  /** 等待用户回答（ask_user 提问卡在场）：标题切「等待你的回答」，脉冲点停跳 */
  waiting?: boolean
  /** 计划板（status.plan，PlanBoard 快照） */
  plan?: AgentPlanItemT[]
  /** 业务工具人话名（覆盖框架基础表） */
  labels?: Record<string, string>
  /** 业务工具摘要钩子（返回 null＝回落框架默认） */
  summarize?: ProcessFlowOptions['summarize']
  /** 追加等待类工具（同族连续轮询折叠成一行） */
  waitTools?: string[]
}>(), {
  live: null,
  waiting: false,
  plan: undefined,
  labels: undefined,
  summarize: undefined,
  waitTools: undefined
})

const flow = computed(() => reduceProcessEvents(props.events, {
  labels: props.labels,
  summarize: props.summarize,
  waitTools: props.waitTools
}))

const stepCount = computed(() => flow.value.steps.filter(s => !s.isLog).length)

const totalMs = computed(() => {
  const [t0, t1] = flow.value.span
  const end = props.running ? now.value : t1
  return t0 && end && end > t0 ? end - t0 : null
})

/** 折叠态：执行中默认展开、终态自动收起（用户点开/收起优先，直到下一次状态翻转） */
const open = ref(props.running)
watch(() => props.running, (r, prev) => {
  if (r) open.value = true
  else if (prev) open.value = false
})

/** 展开的步骤行（按下标：事件只追加、归约确定性重放，下标跨轮询稳定） */
const expanded = ref(new Set<number>())
const toggleStep = (si: number) => {
  const s = flow.value.steps[si]
  if (!s || s.running) return
  const next = new Set(expanded.value)
  if (next.has(si)) next.delete(si)
  else next.add(si)
  expanded.value = next
}

/** 计时平滑：事件靠 2s 增量轮询带来，只靠归约刷新耗时会两秒一蹦；
 *  执行中每秒推一次本地钟（纯显示层，轮询与归约不动），终态钟停＝耗时定格 */
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
watch(() => props.running, r => {
  if (r && !ticker) {
    now.value = Date.now()
    ticker = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  } else if (!r && ticker) {
    clearInterval(ticker)
    ticker = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
})

const stepMs = (s: ProcessStep): number | null =>
  s.t0 != null ? Math.max(0, (s.t1 ?? now.value) - s.t0) : null

/** live 全文替换刷新后自动跟底＝sticky 记忆态（非瞬时几何判定）：用户滚动时按
 *  40px 余量刷新贴底记忆（贴底 true／上翻 false，模板 @scroll 随 v-if 块挂载/卸载
 *  自动接好监听生命周期），新 live 帧只在记忆为贴底时滚到新底部——瞬时几何判定的
 *  缺陷是单帧增长超余量时"已滚到旧底部≠新底部"判 false，跟随断开且不自恢复
 *  （轮询路径常态触发）；记忆态下跟随只由用户滚动改变，长帧增长不断跟。
 *  sticky 初始 true＝首帧长文起点即贴底跟随；参照同面板 index.vue 外层
 *  nearBottom 的记忆态模式；flush: post＝DOM 已按新 live 渲染，scrollHeight
 *  才是新内容高度（pre 时机读到旧高度会慢一帧） */
const liveTextRef = ref<HTMLElement | null>(null)
const sticky = ref(true)
const onLiveScroll = () => {
  const el = liveTextRef.value
  if (!el) return
  sticky.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
}
watch(() => props.live, (v, ov) => {
  // live 块从无到有＝新一轮/新会话的块重挂载：复位贴底记忆——sticky 是组件级记忆态，
  // 上一轮用户上翻过（false）会带进下一轮，首帧即不跟底（R2 S-6）；块内滚动记忆只在
  // 同一块存活期内有效
  if (v && !ov) sticky.value = true
  const el = liveTextRef.value
  if (!el) return
  if (sticky.value) el.scrollTop = el.scrollHeight
}, { flush: 'post' })
</script>

<style scoped>
/* 直接用框架主题令牌——不读业务侧 --cf-* 别名（那层定义在 InkHub 业务 css，框架页面没有） */
.apf {
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 18px;
  background: var(--bg-elevated);
  margin-bottom: 14px;
}

.apf__head {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.apf__head > span:nth-child(2) {
  flex: 1;
}

/* 折叠箭头改由边框画，不用 ▸ 字符：正文字体（Segoe UI）里没有这个码位，浏览器会退到某个符号字体，
   实测它的行盒只有 11.2px 而本行正文是 17px ⇒ 墨迹位置跟着字体回落漂，调 padding 也定不住 */
.apf__chev {
  flex: none;
  width: 0;
  height: 0;
  border-left: 5px solid var(--text-tertiary);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  /* 行盒（14.95px）比中文字形内容盒（17px）矮，居中后字的墨迹中心比行盒中心高约 1px ⇒ 箭头垫回去 */
  margin-bottom: 2px;
  transition: transform 0.2s ease;
}

.apf__chev.is-open {
  transform: rotate(90deg);
}

/* 折叠动画：grid-template-rows 0fr↔1fr（内容高度自适应，无需 JS 测量） */
.apf__wrap {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s ease;
  margin-top: 8px;
}

.apf__wrap.is-closed {
  grid-template-rows: 0fr;
}

.apf__inner {
  overflow: hidden;
  min-height: 0;
}

.apf__meta {
  font-size: 12px;
  font-weight: 400;
  color: var(--accent);
}

.apf__step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 5px 0;
  font-size: 13px;
  color: var(--text-primary);
  /* 步骤行里带工具入参（文件标识/路径这类长不可断串），窄屏必须能断行 */
  overflow-wrap: anywhere;
  opacity: 0.9;
}

.apf__step.is-run {
  opacity: 1;
  color: var(--accent);
}

/* 「正在思考与检索」这一行（本轮还没有步骤时）：徽标是 20px 的圆，右边 13px 文本行框只有 15px，
   沿用 flex-start 会让字浮在圆心上方 ⇒ 整行居中。省略号的墨迹贴基线画，行盒居中了它仍落在圆心下方
   约 3px，所以给徽标下沿垫 6px 内边距（border-box ⇒ 圆不缩，内容被顶上去 3px）。 */
.apf__step.is-hint {
  align-items: center;
}

.apf__step.is-hint .apf__n {
  box-sizing: border-box;
  padding-bottom: 6px;
}

.apf__n {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-soft, var(--bg-hover));
  color: var(--accent);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 过程日志行（轮次心跳等）：不占编号、弱化成灰字，与工具步骤一眼分层 */
.apf__step.is-log {
  opacity: 0.75;
  color: var(--text-tertiary);
  font-size: 12px;
}

.apf__n.is-log {
  background: transparent;
  color: var(--text-tertiary);
  font-size: 15px;
  line-height: 20px;
}

.apf__runhint {
  color: var(--text-tertiary);
  font-size: 11px;
  margin-left: 6px;
}

/* 耗时靠右成列，读起来像一列数字而不是一串散字；跑着的那条用主蓝点明"还在跳" */
.apf__dur {
  float: right;
  color: var(--text-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.apf__dur.is-live {
  color: var(--accent);
}

.apf__polls {
  color: var(--text-tertiary);
  font-size: 11px;
  margin-left: 6px;
}

.apf__body {
  flex: 1;
  min-width: 0;
}

.apf__line {
  cursor: pointer;
  /* 行盒与 20px 编号圈等高，flex-start 下二者垂直居中对齐 */
  line-height: 20px;
}

.apf__line:hover {
  color: var(--accent);
}

.apf__raw {
  margin: 6px 0 2px;
  padding: 8px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 260px;
  overflow: auto;
}

/* 计划板清单（LLM 拆解的步骤，审计叙事要素） */
.apf-plan {
  list-style: none;
  margin: 0 0 10px;
  padding: 0 0 8px;
  border-bottom: 1px dashed var(--border-subtle);
}

.apf-plan__item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 2px 0;
}

.apf-plan__item.is-done {
  color: var(--text-tertiary);
  text-decoration: line-through;
  text-decoration-color: var(--border-subtle);
}

.apf-plan__item.is-running {
  color: var(--accent);
  font-weight: 600;
}

.apf-plan__mark {
  width: 14px;
  flex-shrink: 0;
  text-align: center;
}

/* 实时思考块（status.live 全文，替换式刷新） */
.apf-live {
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  background: var(--bg-elevated);
  padding: 10px 14px;
  margin-bottom: 14px;
}

.apf-live__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 6px;
}

.apf-live__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: apf-pulse 1.2s ease-in-out infinite;
}

/* 等待用户回答：脉冲停跳（只停动画，不换色系） */
.apf-live__dot.is-idle {
  animation: none;
}

@keyframes apf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.apf-live__text {
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-tertiary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow: auto;
}
</style>
