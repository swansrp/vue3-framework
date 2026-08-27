<!--
 * 「思考中」卡片（问数 / 通用聊天壳共用）
 * 自 smartQueryAsk/AskThinking.vue 迁入（样式不动，旧位置保留薄 re-export 过渡）
 *
 * 头部：呼吸圆点 + 标题 + 耗时胶囊 + 右侧停止按钮（text 型 danger，弱化视觉）；
 * 主体：AskSteps 实时步骤流，限高内滚，避免长过程撑爆气泡。
-->
<template>
  <div class="ask-think-card">
    <div class="ask-think-head">
      <span class="think-dot"></span>
      <span class="think-title">思考中</span>
      <span class="think-elapsed">{{ fmtElapsed(elapsedMs) }}</span>
      <span class="head-spacer"></span>
      <a-button
        size="small"
        type="text"
        danger
        class="think-stop"
        @click="emit('stop')"
      >
        <template #icon>
          <stop-outlined />
        </template>
        停止
      </a-button>
    </div>
    <div
      ref="bodyRef"
      class="ask-think-body"
    >
      <AskSteps
        :steps="steps"
        :live="live"
        running
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { StopOutlined } from '@ant-design/icons-vue'

import AskSteps from './AskSteps.vue'
import type { AskStep } from './AskSteps.vue'

const props = defineProps<{
  steps: AskStep[]
  elapsedMs?: number
  /** LLM 流式应答 live 进度（替换式展示，状态行 + 全文） */
  live?: string
}>()

const emit = defineEmits<{ (e: 'stop'): void }>()

// live 全文/steps 增长时限高容器自动滚到底部，最新思考内容始终可见
const bodyRef = ref<HTMLElement>()
watch(
  () => [props.live, props.steps.length],
  () => nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  }),
  { flush: 'post' }
)

const fmtElapsed = (ms?: number) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`
}
</script>

<style scoped lang="less">
.ask-think-card {
  margin: 2px 0 10px;
  border: 1px solid #e4ebf7;
  border-radius: 10px;
  background: linear-gradient(180deg, #f5f8ff 0%, #fbfdff 100%);
  overflow: hidden;
}

.ask-think-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px dashed #e4ebf7;

  .think-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1677ff;
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
    animation: think-pulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  .think-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .think-elapsed {
    font-size: 12px;
    line-height: 18px;
    color: #8c8c8c;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
  }

  .head-spacer {
    flex: 1;
  }

  .think-stop {
    color: #ff4d4f;
    padding: 0 8px;

    &:hover {
      background: rgba(255, 77, 79, 0.06);
    }
  }
}

.ask-think-body {
  padding: 6px 12px 8px;
  max-height: 240px;
  overflow-y: auto;
}

@keyframes think-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
