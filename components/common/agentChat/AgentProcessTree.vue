<!--
 * AgentProcessTree —— 执行过程树（递归折叠：思考 / 工具步 / 子 Agent 嵌套组）
 *
 * 消费 AssistantView（agentChat/processTree.ts 的唯一渲染出口），与来源无关：
 * 任何引擎的适配器产出 msg.process 后由 AgentChatPanel 直接挂载本组件。
 * 视觉口径（对齐 Qoder 过程块）：圆角卡片 + chevron 组头 + 行内图标；
 * 状态文案只在非完成态出现；运行中自动展开、终局自动折叠；嵌套子组走左侧细轨道。
-->
<template>
  <div
    class="proc-tree"
    :class="{ 'is-nested': nested }"
  >
    <div
      class="proc-tree__head"
      @click="groupOpen = !groupOpen"
    >
      <CaretRightOutlined
        class="proc-tree__chevron"
        :class="{ 'is-open': groupOpen }"
      />
      <span class="proc-tree__title">{{ headingText }}</span>
      <span
        v-if="stats.failedCount"
        class="proc-tree__failed"
      >{{ stats.failedCount }} 失败</span>
    </div>

    <div
      v-show="groupOpen"
      class="proc-tree__body"
    >
      <div
        v-if="view.thinking"
        class="proc-think"
      >
        <div
          class="proc-think__line"
          @click="thinkOpen = !thinkOpen"
        >
          <LoadingOutlined
            v-if="running"
            class="proc-think__icon is-running"
          />
          <BulbOutlined
            v-else
            class="proc-think__icon"
          />
          <span class="proc-think__name">{{ running ? '思考中' : '已思考' }} · {{ view.thinking.length }} 字</span>
          <CaretRightOutlined
            class="proc-think__chevron"
            :class="{ 'is-open': thinkOpen }"
          />
        </div>
        <pre
          v-show="thinkOpen"
          class="proc-think__detail"
        >{{ view.thinking }}</pre>
      </div>

      <AgentProcessNode
        v-for="(rt, i) in view.tools"
        :key="rt.step.id || `${i}-${rt.step.name}`"
        :rt="rt"
      />

      <div
        v-if="showText && view.text"
        class="proc-tree__text"
      >
        {{ view.text }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup name="AgentProcessTree">
import { BulbOutlined, CaretRightOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { computed, onUnmounted, ref, watch } from 'vue'

import AgentProcessNode from './AgentProcessNode.vue'
import { processGroupStats } from './processTree'
import type { AssistantView } from './processTree'

const props = withDefaults(defineProps<{
  /** 渲染视图（buildAssistantView 出口；嵌套子组可由 SubRun 构造伪视图） */
  view: AssistantView
  /** 组头文案（缺省「执行过程 · N 步」；嵌套子组传「子 Agent · 编码」） */
  heading?: string
  /** 组内是否渲染正文 text（顶层消息正文由壳渲染，子组文本在组内显示） */
  showText?: boolean
  /** 嵌套缩进样式 */
  nested?: boolean
}>(), {
  heading: '',
  showText: false,
  nested: false
})

const stats = computed(() => processGroupStats(props.view))

const running = computed(() => props.view.terminal === 'running')

/** 运行中逐秒计数（起点取本轮 accepted 时刻，缺省回落组件挂载时刻） */
const startedAt = props.view.startedAt ?? Date.now()
const elapsed = ref(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
let tick: ReturnType<typeof setInterval> | undefined
const stopTick = () => {
  if (tick) {
    clearInterval(tick)
    tick = undefined
  }
}
watch(running, live => {
  stopTick()
  if (live) {
    tick = setInterval(() => {
      elapsed.value = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
  }
}, { immediate: true })
onUnmounted(stopTick)

const headingText = computed(() =>
  props.heading
  || (running.value
    ? `正在执行中 · ${elapsed.value}s`
    : `执行过程 · ${stats.value.stepCount} 步`)
)

/** 运行中默认展开；终局自动折叠（结论时过程收起） */
const groupOpen = ref(props.view.terminal === 'running')
watch(() => props.view.terminal, t => {
  if (t !== 'running') groupOpen.value = false
})

const thinkOpen = ref(false)
</script>

<style scoped lang="less">
@proc-code-font: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

.proc-tree {
  margin: 6px 0;
  padding-bottom: 1px;
  border: 1px solid var(--border-subtle, #f0f0f0);
  border-radius: 8px;
  background: var(--bg-base, #fafafa);
  font-size: 12px;
  overflow: hidden;

  &.is-nested {
    margin: 2px 0;
    padding-bottom: 0;
    border: none;
    background: transparent;
    overflow: visible;
  }
}

.proc-tree__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  user-select: none;
  color: var(--text-secondary, #8c8c8c);
  transition: background 0.15s;

  &:hover {
    background: var(--bg-elevated, #f5f5f5);
  }
}

.proc-tree__chevron {
  font-size: 9px;
  color: var(--text-tertiary, #bfbfbf);
  transition: transform 0.15s;

  &.is-open {
    transform: rotate(90deg);
  }
}

.proc-tree__title {
  font-weight: 500;
}

.proc-tree__failed {
  padding: 0 6px;
  border-radius: 8px;
  background: #fff2f0;
  color: #cf1322;
  font-size: 11px;
}

.proc-tree__body {
  padding: 0 10px 8px 11px;
}

.proc-tree__text {
  padding: 6px 0 2px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: var(--text-primary, #333);
}

.proc-think__line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  cursor: pointer;
  user-select: none;
  color: var(--text-secondary, #8c8c8c);
}

.proc-think__icon {
  font-size: 12px;
  color: var(--text-tertiary, #bfbfbf);
}

.proc-think__name {
  flex: 1;
}

.proc-think__chevron {
  font-size: 9px;
  color: var(--text-tertiary, #bfbfbf);
  transition: transform 0.15s;

  &.is-open {
    transform: rotate(90deg);
  }
}

.proc-think__detail {
  margin: 2px 0 6px 20px;
  padding: 8px 10px;
  max-height: 240px;
  overflow: auto;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-subtle, #f0f0f0);
  border-radius: 6px;
  font-family: @proc-code-font;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary, #666);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
