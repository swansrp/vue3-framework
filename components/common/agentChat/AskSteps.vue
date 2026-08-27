<!--
 * 思考过程步骤列表（维护问数 step 事件实时上屏，用户不傻等）
 * 自 smartQueryAsk/AskSteps.vue 迁入（样式不动，旧位置保留薄 re-export 过渡）
 *
 * 每行：完成态打勾 / 进行中（末条）转圈 + 步骤文案 + 到达时间戳；
 * 后端步骤含工具循环过程日志（LLM 轮次 / 工具调用与返回摘要），逐条追加渲染。
 * 客户页与测试页共用；折叠/展开由调用方用 details 包裹控制。
-->
<template>
  <ul class="ask-steps">
    <li
      v-for="(s, i) in steps"
      :key="i"
      :class="{ running: running && i === steps.length - 1, archive: isArchive(s.text) }"
    >
      <a-spin
        v-if="running && i === steps.length - 1"
        size="small"
      />
      <check-outlined
        v-else
        class="step-done"
      />
      <!-- 思考归档行（多行全文）：可闭合折叠块，进行中默认展开实时可见，历史轮次收起不占屏 -->
      <details
        v-if="isArchive(s.text)"
        class="step-archive"
        :open="running && i === steps.length - 1"
      >
        <summary>{{ archiveHead(s.text) }}</summary>
        <pre class="step-archive-body">{{ archiveBody(s.text) }}</pre>
      </details>
      <template v-else>
        <span
          class="step-text"
          :title="s.text"
        >{{ s.text }}</span>
        <span class="step-time">{{ fmtTime(s.time) }}</span>
      </template>
    </li>
    <li
      v-if="!steps.length && running && !live"
      class="running"
    >
      <a-spin size="small" />
      <span class="step-text">已提交，等待后端响应…</span>
    </li>
    <!-- LLM 流式应答 live 进度：替换式展示（不追加清单），思考全文多行实时上屏 -->
    <li
      v-if="running && live"
      class="running live"
    >
      <a-spin size="small" />
      <span class="step-text">{{ live }}</span>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { CheckOutlined } from '@ant-design/icons-vue'

import type { ChatStep } from './types'

/** 单条步骤（契约上提 types.ts，保留旧名别名兼容存量调用方） */
export type AskStep = ChatStep

withDefaults(defineProps<{
  steps: AskStep[]
  /** 进行中：末条显示转圈，无步骤时显示等待占位 */
  running?: boolean
  /** LLM 流式应答 live 进度（替换式展示，状态行 + 全文多行） */
  live?: string
}>(), {
  running: false,
  live: ''
})

const fmtTime = (t: number) => {
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 思考归档行（后端 StreamingProgressChatModel onComplete 推「【LLM 思考归档】N 字\n全文」，
// 经 step 清单永久留存）：识别前缀并拆标题/正文，渲染为可闭合折叠块不丢失不占屏
const ARCHIVE_PREFIX = '【LLM 思考归档】'

const isArchive = (text: string) => text.startsWith(ARCHIVE_PREFIX)

const archiveHead = (text: string) => {
  const nl = text.indexOf('\n')
  return nl < 0 ? text : text.slice(0, nl)
}

const archiveBody = (text: string) => {
  const nl = text.indexOf('\n')
  return nl < 0 ? '' : text.slice(nl + 1)
}
</script>

<style scoped lang="less">
.ask-steps {
  margin: 0;
  padding-left: 4px;
  list-style: none;
  font-size: 13px;
  color: #555;

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 3px 0;

    :deep(.ant-spin) {
      margin-top: 3px;
      flex-shrink: 0;
    }
  }

  .step-done {
    color: #52c41a;
    margin-top: 3px;
    flex-shrink: 0;
  }

  .step-text {
    flex: 1;
    min-width: 0;
    word-break: break-all;
    line-height: 1.6;
  }

  .step-time {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-tertiary, #999);
    margin-top: 2px;
  }

  li.running .step-text {
    color: var(--text-primary, #333);
  }

  // 思考归档折叠块：全文保留原换行，限高内滚防长思考撑爆气泡/页面；
  // 弱化配色区别于里程碑步骤，闭合后仅留标题行（可再次展开回看）
  li.archive {
    display: flex;
    align-items: flex-start;
  }

  .step-archive {
    flex: 1;
    min-width: 0;
    margin-top: 0;

    summary {
      color: var(--text-secondary, #666);
      font-size: 12px;
      cursor: pointer;
    }

    .step-archive-body {
      margin: 4px 0 2px;
      padding: 6px 8px;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 240px;
      overflow-y: auto;
      color: var(--text-secondary, #555);
    }
  }

  // live 行：LLM 思考/应答全文，多行完整展示（不截断），弱化显示区别于里程碑步骤
  li.live .step-text {
    color: var(--text-secondary, #666);
    font-size: 12px;
    white-space: pre-wrap;
  }
}
</style>
