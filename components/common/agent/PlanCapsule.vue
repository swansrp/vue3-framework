<template>
  <!-- 无计划（items 空/缺省）整条隐藏：dock 不留空位（规格 §01「会话无计划时整条隐藏」） -->
  <div
    v-if="items.length > 0"
    class="bidr-agent-plan"
  >
    <!-- 展开卡：点胶囊向上展开（底部 dock 下方无空间），浮层不占文档流 -->
    <div
      v-if="expanded"
      class="bidr-agent-plan__card"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="bidr-agent-plan__row"
        :class="`is-${item.status}`"
      >
        <!-- 状态图标：done=绿勾 / running=琥珀 spinner 点 / pending=灰空心圈 / stopped=灰空心圈（压暗靠文字色区分） -->
        <svg
          v-if="item.status === 'done'"
          class="bidr-agent-plan__ok"
          viewBox="0 0 24 24"
        ><path d="M4 12.5 9.5 18 20 6.5" /></svg>
        <span
          v-else
          class="bidr-agent-plan__ring"
          :class="item.status === 'running' ? 'is-amber' : 'is-gray'"
        ></span>
        <span class="bidr-agent-plan__row-txt">{{ item.text }}</span>
        <span
          v-if="item.status === 'running'"
          class="bidr-agent-plan__row-now"
        >进行中</span>
      </div>
    </div>

    <!-- 胶囊（常驻收起态）：状态图标＋标签＋计数 N/M＋chev；三态由 items 推导 -->
    <button
      type="button"
      class="bidr-agent-plan__pill"
      :class="`is-${phase}`"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span
        v-if="phase === 'running'"
        class="bidr-agent-plan__ring is-amber is-bare"
      ></span>
      <span
        v-else
        class="bidr-agent-plan__ring"
        :class="phase === 'stopped' ? 'is-error' : undefined"
      >
        <svg
          v-if="phase === 'done'"
          viewBox="0 0 12 12"
        ><path d="M2 6.4 L4.6 9 L10 3.2" /></svg>
        <svg
          v-else
          viewBox="0 0 12 12"
        ><path d="M3 3 L9 9 M9 3 L3 9" /></svg>
      </span>
      <span class="bidr-agent-plan__pill-label">{{ phaseLabel }}</span>
      <span class="bidr-agent-plan__pill-count">{{ doneCount }}/{{ items.length }}</span>
      <span
        class="bidr-agent-plan__pill-chev"
        :class="{ 'is-up': expanded }"
      ></span>
    </button>
  </div>
</template>

<script lang="ts" setup>
/**
 * 计划胶囊 dock（S7，规格稿 §01）：常驻输入条上方（AgentPane 底部 dock、水平居中、不进对话流），
 * 点胶囊向上展开计划卡。三态：执行中（琥珀 spinner＋琥珀标签）／已完成（绿描边圆勾）／
 * 有失败（红环 ✕）。状态由 items 推导——AgentPlanItemT.status 只有 pending/running/done/stopped：
 * 全 done＝已完成；有 stopped＝红系「已停止」（会话终态非 FINISHED 的收口位）；
 * 其余（含 running/pending 并存）＝执行中。
 * 样式在 ./styles.css（bidr-agent-plan-* 前缀族，与 .bidr-agent-* 纪律一致）。
 */
import { computed, ref } from 'vue'

import type { AgentPlanItemT } from './types'
import './styles.css'

interface Props {
  /** 计划待办清单（status 快照 plan；空/缺省＝会话无计划，整条隐藏） */
  items?: AgentPlanItemT[]
}

const props = withDefaults(defineProps<Props>(), {
  items: () => []
})

/** 本地展开态：默认收起，开合只由用户点击控制（不自开不自关） */
const expanded = ref(false)

/** 完成计数 N/M（stopped/pending/running 均不计入 N，与「有失败 4/5」口径一致） */
const doneCount = computed(() => props.items.filter(i => i.status === 'done').length)

/** 胶囊三态（模板挂 is-{phase} 驱动标签色与图标） */
const phase = computed<'running' | 'done' | 'stopped'>(() => {
  if (props.items.length > 0 && props.items.every(i => i.status === 'done')) return 'done'
  if (props.items.some(i => i.status === 'stopped')) return 'stopped'
  return 'running'
})

const phaseLabel = computed(() => {
  if (phase.value === 'done') return '已完成'
  if (phase.value === 'stopped') return '已停止'
  return '执行中'
})
</script>
