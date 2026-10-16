<template>
  <div
    v-if="archives.length"
    class="apa"
  >
    <div
      class="apa__head"
      @click="open = !open"
    >
      <span
        class="apa__chev"
        :class="{ 'is-open': open }"
      ></span>
      <span>思考过程（{{ archives.length }} 轮）</span>
    </div>
    <pre
      v-show="open"
      class="apa__text"
    >{{ archives.join('\n\n') }}</pre>
  </div>
</template>

<script lang="ts" setup>
/**
 * 轮末思考归档折叠区：【LLM 思考归档】log 事件（流式模型轮末推的思考全文）终态后在此承载，
 * 默认收起。运行中的实时思考走 AgentProcessFlow 的 live 块；无归档整件不渲染。
 * 词汇判据＝processLines.isThinkArchiveLine（与 core/llm 发射端同源）。
 */
import { computed, ref } from 'vue'

import { reduceProcessEvents } from './processFlow'
import type { AgentEventX } from './types'

const props = defineProps<{ events: AgentEventX[] }>()

const archives = computed(() => reduceProcessEvents(props.events).archives)
const open = ref(false)
</script>

<style scoped>
/* 直接用框架主题令牌——不读业务侧 --cf-* 别名（那层定义在 InkHub 业务 css，框架页面没有） */
.apa {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-elevated);
  padding: 8px 14px;
  margin-bottom: 14px;
}

.apa__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  cursor: pointer;
}

.apa__chev {
  flex: none;
  width: 0;
  height: 0;
  border-left: 5px solid var(--text-tertiary);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  margin-bottom: 2px;
  transition: transform 0.2s ease;
}

.apa__chev.is-open {
  transform: rotate(90deg);
}

.apa__text {
  margin: 8px 0 0;
  padding: 0;
  border: 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-tertiary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}
</style>
