<!--
 * AgentConclusionCard —— 终态结论卡（两栈单源，S5）
 *
 * 渲染＝白卡＋左 3px 状态色标（finish=success / error=error / stopped=border 基色）
 * ＋标题行（状态色图标＋title）＋正文 markdown（净化后 v-html，含圈号分行兜底）。
 *
 * 消费方：AgentPane（气泡栈终态）与 agentChat/index.vue（旧面板终态）——
 * 原本两处文案逐字相同的结论现在同源渲染。样式类沿用 styles.css 的
 * .bidr-agent-conclusion*（组件自带 import，任何宿主都吃到；AgentPane 工作台形态的
 * 覆盖段靠全局选择器 .bidr-agent-pane.is-workbench 前缀继续生效）。
-->
<template>
  <div
    class="bidr-agent-conclusion"
    :class="`is-${kind}`"
  >
    <div class="bidr-agent-conclusion__title">
      <CheckCircleFilled v-if="kind === 'finish'" />
      <CloseCircleFilled v-else-if="kind === 'error'" />
      <StopOutlined v-else />
      <span>{{ title }}</span>
    </div>
    <div
      v-if="text"
      class="bidr-agent-conclusion__text is-md"
      v-html="mdHtml"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { CheckCircleFilled, CloseCircleFilled, StopOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

import { breakBeforeCircledItems, markdownOf } from './markdown'

import './styles.css'

interface Props {
  /** 终态种类：finish＝任务完成 / error＝任务失败 / stopped＝已停止 */
  kind: 'finish' | 'error' | 'stopped'
  /** 标题（如「任务完成」） */
  title: string
  /** 正文（markdown；summary/error 落库文本，渲染前经共享管线净化） */
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  text: ''
})

const mdHtml = computed(() => markdownOf(breakBeforeCircledItems(props.text || '')))
</script>
