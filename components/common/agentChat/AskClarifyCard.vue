<template>
  <!-- 歧义确认卡片：问数解析遇真歧义（同值跨多维/术语多口径/分组候选多选）时，
       后端 askUser 工具阻塞等待，轮询携带问题渲染本卡；作答经 maintainAskAnswer 唤醒编排。
       自 smartQueryAsk/AskClarifyCard.vue 迁入（样式不动，旧位置保留薄 re-export 过渡）；
       answered 态只读回显（历史恢复重放已作答问题用），未作答才可交互 -->
  <div
    class="clarify-card"
    :class="{ 'is-answered': !!answered }"
  >
    <div class="clarify-header">
      <QuestionCircleFilled class="clarify-icon" />
      <span class="clarify-title">需要你确认口径</span>
    </div>
    <div class="clarify-text">
      {{ question.question }}
    </div>
    <div
      v-if="optionViews.length > 0"
      class="clarify-options"
    >
      <div
        v-for="(view, oi) in optionViews"
        :key="oi"
        class="clarify-option"
        :class="{ 'is-selected': selectedOption === view.raw }"
        @click="!answered && (selectedOption = selectedOption === view.raw ? '' : view.raw)"
      >
        <div class="clarify-option-main">
          <span
            v-if="view.key"
            class="clarify-option-key"
          >{{ view.key }}</span>
          <span class="clarify-option-label">{{ view.label }}</span>
        </div>
        <div
          v-if="view.desc"
          class="clarify-option-desc"
        >
          {{ view.desc }}
        </div>
      </div>
    </div>
    <a-textarea
      v-if="!answered"
      v-model:value="customAnswer"
      class="clarify-input"
      placeholder="或直接输入你的口径（优先于选中的候选项）"
      :auto-size="{ minRows: 1, maxRows: 3 }"
    />
    <div
      v-if="answered"
      class="clarify-answer"
    >
      {{ answered === CLARIFY_ANSWER_SKIPPED ? '已交由 AI 决定口径' : `已回答：${parseChatOption(answered).label}` }}
    </div>
    <div
      v-else
      class="clarify-actions"
    >
      <a-button
        size="small"
        type="primary"
        :disabled="submitted || (!selectedOption && !customAnswer.trim())"
        @click="submit"
      >
        提交回答
      </a-button>
      <a-button
        size="small"
        :disabled="submitted"
        @click="skip"
      >
        交由 AI 决定
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { QuestionCircleFilled } from '@ant-design/icons-vue'

import { CLARIFY_ANSWER_SKIPPED, parseChatOption } from './types'
import type { ChatClarifyQuestion } from './types'

const props = defineProps<{
  question: ChatClarifyQuestion
  /** 已作答文本（历史恢复重放传 CLARIFY_ANSWER_SKIPPED 或实际作答；空=未作答可交互） */
  answered?: string
}>()

// 候选项分层渲染视图（JSON 对象串解析 key/label/desc；选中/作答仍以 raw 为身份）
const optionViews = computed(() => (props.question.options || []).map(parseChatOption))

const emit = defineEmits<{
  /** 作答：非空文本=用户口径；空串=交由 AI 决定 */
  (e: 'answer', text: string): void
}>()

const selectedOption = ref('')
const customAnswer = ref('')
// 防重复提交：作答后父级即移除卡片，这里兜底点击竞态
const submitted = ref(false)

const submit = () => {
  if (submitted.value) return
  submitted.value = true
  emit('answer', customAnswer.value.trim() || selectedOption.value)
}

const skip = () => {
  if (submitted.value) return
  submitted.value = true
  emit('answer', '')
}
</script>

<style scoped lang="less">
.clarify-card {
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px solid #91caff;
  border-radius: 8px;
  background: #f0f7ff;
}

.clarify-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;

  .clarify-icon {
    color: #1677ff;
  }

  .clarify-title {
    font-weight: 600;
    color: #1677ff;
  }
}

.clarify-text {
  margin-bottom: 8px;
  color: #333;
  white-space: pre-wrap;
}

.clarify-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.clarify-option {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #1677ff;
  }

  &.is-selected {
    border-color: #1677ff;
    background: #e6f4ff;
    color: #1677ff;
  }

  .clarify-option-main {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .clarify-option-key {
    flex-shrink: 0;
    padding: 0 5px;
    border: 1px solid currentColor;
    border-radius: 4px;
    font-size: 11px;
    line-height: 16px;
  }

  .clarify-option-label {
    word-break: break-all;
  }

  .clarify-option-desc {
    margin-top: 2px;
    font-size: 11px;
    line-height: 16px;
    color: #8c8c8c;
  }
}

.clarify-input {
  margin-bottom: 8px;
}

.clarify-answer {
  font-size: 12px;
  color: #52c41a;
}

.clarify-actions {
  display: flex;
  gap: 8px;
}

.clarify-card.is-answered {
  border-color: #d9d9d9;
  background: #fafafa;

  .clarify-icon,
  .clarify-title {
    color: #8c8c8c;
  }

  .clarify-option {
    cursor: default;

    &:hover {
      border-color: #d9d9d9;
    }

    &.is-selected {
      border-color: #b7eb8f;
      background: #f6ffed;
      color: #52c41a;
    }
  }
}
</style>
