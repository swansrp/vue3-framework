<!--
 * 计划待办清单（问数票据链 submit_plan 开局提交、start_plan_item 标记执行中、done_plan_item 随完成挑勾）
 * 自 smartQueryAsk/AskPlanChecklist.vue 迁入（样式不动，旧位置保留薄 re-export 过渡）
 * 与抽屉 AgentChat 计划块功能同构（展示形式不同）；执行中实时跳动，终态后保留回看
-->
<template>
  <div class="ask-plan">
    <div class="plan-header">
      <CheckSquareOutlined class="plan-icon" />
      <span class="plan-title">计划待办</span>
      <span class="plan-count">{{ doneCount }}/{{ items.length }}</span>
    </div>
    <div class="plan-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="plan-item"
        :class="{ 'is-done': item.status === 'done', 'is-running': item.status === 'running', 'is-stopped': item.status === 'stopped' }"
      >
        <CheckCircleFilled
          v-if="item.status === 'done'"
          class="plan-check"
        />
        <LoadingOutlined
          v-else-if="item.status === 'running'"
          spin
          class="plan-check"
        />
        <MinusOutlined
          v-else-if="item.status === 'stopped'"
          class="plan-check"
        />
        <ClockCircleOutlined
          v-else
          class="plan-check"
        />
        <span class="plan-text">{{ item.text }}</span>
        <span
          v-if="item.note"
          class="plan-note"
        >（{{ item.note }}）</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { CheckCircleFilled, CheckSquareOutlined, ClockCircleOutlined, LoadingOutlined, MinusOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

import type { ChatPlanItem } from './types'

const props = defineProps<{ items: ChatPlanItem[] }>()

const doneCount = computed(() => props.items.filter(i => i.status === 'done').length)
</script>

<style scoped lang="less">
.ask-plan {
  margin: 6px 0;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-elevated);

  .plan-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-secondary);

    .plan-icon { color: var(--accent-mid); }
    .plan-title { color: var(--text-primary); font-weight: 600; }
    .plan-count { margin-left: auto; }
  }

  .plan-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plan-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
    line-height: 20px;

    .plan-check { color: var(--text-secondary); }
    .plan-text { color: var(--text-primary); }
    .plan-note { color: var(--text-secondary); }

    &.is-done {
      .plan-check { color: var(--success, #52c41a); }
      .plan-text { color: var(--text-secondary); text-decoration: line-through; }
    }

    &.is-running {
      .plan-check { color: var(--accent); }
      .plan-text { color: var(--accent); }
    }

    &.is-stopped {
      opacity: 0.55;

      .plan-check { color: var(--text-secondary); }
      .plan-text { color: var(--text-secondary); }
    }
  }
}
</style>
