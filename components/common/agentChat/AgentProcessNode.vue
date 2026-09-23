<!--
 * AgentProcessNode —— 过程树行（工具步）：行首状态符（完成挑勾 / 进行中转圈 / 失败红叉 / 取消灰减号）
 * + 中文动作标签 + 入参摘要一行；点击行展开 args/result 明细；
 * spawn 容器步（step.sub）递归嵌套 AgentProcessTree 子组。
 * 与 AgentProcessTree 成对使用；行样式集中在本组件（scoped 不跨组件生效）。
-->
<template>
  <div class="proc-node">
    <div
      class="proc-node__line"
      :class="{ 'is-clickable': hasDetail }"
      @click="toggle"
    >
      <LoadingOutlined
        v-if="rt.status === 'running'"
        class="proc-node__icon is-running"
      />
      <CloseCircleFilled
        v-else-if="isFailed"
        class="proc-node__icon is-failed"
      />
      <MinusCircleFilled
        v-else-if="rt.status === 'cancelled'"
        class="proc-node__icon is-cancelled"
      />
      <CheckCircleFilled
        v-else
        class="proc-node__icon is-done"
      />
      <span class="proc-node__label">{{ label }}</span>
      <span
        v-if="statusText"
        class="proc-node__status"
        :class="`is-${rt.status}`"
      >{{ statusText }}</span>
      <span
        v-if="summary"
        class="proc-node__summary"
      >· {{ summary }}</span>
      <CaretRightOutlined
        v-if="hasDetail"
        class="proc-node__chevron"
        :class="{ 'is-open': expanded }"
      />
    </div>

    <div
      v-if="expanded && hasDetail"
      class="proc-node__detail"
    >
      <pre
        v-if="errorText"
        class="proc-node__err"
      >{{ errorText }}</pre>
      <pre
        v-if="argsText"
        class="proc-node__block"
      >{{ argsText }}</pre>
      <pre
        v-if="rt.step.result"
        class="proc-node__block"
      >{{ rt.step.result }}</pre>
    </div>

    <AgentProcessTree
      v-if="rt.sub"
      class="proc-node__sub"
      :view="subView"
      :heading="`子 Agent · ${rt.sub.agentCode || '—'}`"
      show-text
      nested
    />
  </div>
</template>

<script lang="ts" setup name="AgentProcessNode">
import {
  CaretRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  MinusCircleFilled
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

import AgentProcessTree from './AgentProcessTree.vue'
import {
  runStatusToTerminal,
  SPAWN_TOOL,
  spawnErrorText,
  stepSummary,
  toolLabel
} from './processTree'
import type { AssistantView, RenderTool, RunStatus } from './processTree'

const props = defineProps<{
  rt: RenderTool
}>()

const expanded = ref(false)

const label = computed(() => toolLabel(props.rt.step.name))

const summary = computed(() => stepSummary(props.rt.step))

const isFailed = computed(() =>
  props.rt.status === 'failed' || props.rt.status === 'timeout' || props.rt.status === 'rejected'
)

/** 完成态不再刷"完成"（挑勾已表意）；仅非完成态给状态短语 */
const statusText = computed(() =>
  ({
    running: '执行中',
    failed: '失败',
    timeout: '超时',
    rejected: '未执行',
    cancelled: '已取消'
  } as Partial<Record<RunStatus, string>>)[props.rt.status] || ''
)

const errorText = computed(() =>
  props.rt.step.name === SPAWN_TOOL ? spawnErrorText(props.rt.step.result) : null
)

const argsText = computed(() => {
  const args = props.rt.step.args
  if (args === null || args === undefined) return ''
  if (typeof args === 'string') return args
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
})

const hasDetail = computed(() => !!errorText.value || !!argsText.value || !!props.rt.step.result)

const toggle = () => {
  if (hasDetail.value) expanded.value = !expanded.value
}

/** 子组伪视图：SubRun → AssistantView（终局态随子运行状态） */
const subView = computed<AssistantView>(() => ({
  thinking: '',
  text: props.rt.sub?.text ?? '',
  terminal: runStatusToTerminal(props.rt.sub?.status ?? 'running'),
  tools: props.rt.sub?.tools ?? []
}))
</script>

<style scoped lang="less">
@proc-code-font: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

.proc-node {
  margin: 1px 0;
}

.proc-node__line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  min-width: 0;
  color: var(--text-secondary, #8c8c8c);
  user-select: none;

  &.is-clickable {
    cursor: pointer;

    &:hover .proc-node__label,
    &:hover .proc-node__summary {
      color: var(--text-primary, #262626);
    }
  }
}

.proc-node__icon {
  flex-shrink: 0;
  font-size: 12px;

  &.is-done {
    color: #52c41a;
  }

  &.is-running {
    color: var(--accent, #1677ff);
  }

  &.is-failed {
    color: #cf1322;
  }

  &.is-cancelled {
    color: #d9d9d9;
  }
}

.proc-node__label {
  flex-shrink: 0;
  color: var(--text-primary, #333);
  transition: color 0.15s;
}

.proc-node__status {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-tertiary, #bfbfbf);

  &.is-failed,
  &.is-timeout,
  &.is-rejected {
    color: #cf1322;
  }
}

.proc-node__summary {
  flex: 1;
  min-width: 0;
  font-family: @proc-code-font;
  font-size: 11px;
  color: var(--text-tertiary, #a6a6a6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.proc-node__chevron {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 9px;
  color: var(--text-tertiary, #bfbfbf);
  transition: transform 0.15s;

  &.is-open {
    transform: rotate(90deg);
  }
}

.proc-node__detail {
  margin: 2px 0 6px 18px;
}

.proc-node__err {
  margin: 0 0 4px;
  padding: 8px 10px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #cf1322;
  font-family: @proc-code-font;
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.proc-node__block {
  margin: 0 0 4px;
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

.proc-node__sub {
  margin-left: 18px;
  padding-left: 8px;
  border-left: 1px solid var(--border-subtle, #f0f0f0);
}
</style>
