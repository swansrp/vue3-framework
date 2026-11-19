<!--
 * AskDecisionCard —— 决策/澄清卡单源（S10，D6/D21，规格稿 §05）
 *
 * 四个可配置维度的能力并集：
 * - mode：single（缺省）＝单击即答（点选项直接 emit）；multi＝点选聚合，提交按钮一次 emit
 * - replay：question.status 已收口（answered/skipped/expired）或显式置 true＝只读回显
 *   （选中项高亮/置灰、显示 answer 与 CLARIFY_ANSWER_SKIPPED 哨兵语义）
 * - optimistic：作答即视觉锁定 pending 态（选中项高亮＋「已提交」小字），等轮询把问题收走；
 *   提交失败由消费方调 unlock() 回滚（defineExpose）
 * - showSkip：「交由 AI 决定」＝空串作答（skipped: true），空串语义由消费方接线约定
 *
 * 消费方：AgentPane（optimistic=true 接 pendingAnswer 乐观逻辑）与
 * agentChat/index.vue（optimistic=false、showSkip=true）——提交行为语义保持：
 * 原来怎么调 answer/sessionAnswer（text / skipped），接线后等价。
 * 样式：styles.css 的 .bidr-agent-ask-* 前缀族（只增不改）。
-->
<template>
  <div
    class="bidr-agent-ask"
    :class="{ 'is-replay': isReplay, 'is-locked': locked }"
  >
    <div class="bidr-agent-ask__head">
      <span class="bidr-agent-ask__title">{{ title }}</span>
      <span
        v-if="question.id"
        class="bidr-agent-ask__id"
      >#{{ question.id }}</span>
      <span
        v-if="locked"
        class="bidr-agent-ask__pending"
      ><LoadingOutlined spin />已提交，等待 AI 继续…</span>
    </div>
    <div
      class="bidr-agent-ask__text is-md"
      v-html="mdHtml"
    ></div>
    <div
      v-if="optionViews.length > 0"
      class="bidr-agent-ask__options"
    >
      <button
        v-for="(opt, oi) in optionViews"
        :key="oi"
        type="button"
        class="bidr-agent-ask__option"
        :class="{ 'is-picked': isPicked(opt) }"
        :disabled="disabled"
        @click="onPick(opt)"
      >
        <!-- 候选项三层解析单源（parseChatOption）：key 编号 accent 色＋label 主文本＋desc 次行小字；
             作答回传仍用 raw 保证无损 -->
        <span
          v-if="opt.key"
          class="bidr-agent-ask__option-key"
        >{{ opt.key }}</span>
        <span class="bidr-agent-ask__option-label">{{ opt.label }}</span>
        <span
          v-if="opt.desc"
          class="bidr-agent-ask__option-desc"
        >{{ opt.desc }}</span>
      </button>
    </div>
    <!-- 卡内自由输入：给想自己组织语言的用户；点选项仍是单击即答 -->
    <div
      v-if="!isReplay"
      class="bidr-agent-ask__write"
    >
      <a-textarea
        v-model:value="draft"
        class="bidr-agent-ask__write-input"
        :auto-size="{ minRows: 2, maxRows: 6 }"
        :bordered="false"
        :disabled="disabled"
        placeholder="也可以直接输入你的口径…（Enter 发送，Shift+Enter 换行）"
        @press-enter="onEnter"
      />
      <div class="bidr-agent-ask__bar">
        <span class="bidr-agent-ask__spacer"></span>
        <a-button
          size="small"
          type="primary"
          :disabled="disabled || (mode === 'multi' ? selected.size === 0 : !draft.trim())"
          :loading="busy"
          @click="mode === 'multi' ? submitMulti() : sendDraft()"
        >
          提交作答
        </a-button>
      </div>
    </div>
    <div
      v-if="showSkip && !isReplay"
      class="bidr-agent-ask__actions"
    >
      <a-button
        size="small"
        :loading="busy"
        @click="skip"
      >
        交由 AI 决定
      </a-button>
    </div>
    <!-- 已答重放：只读回显（哨兵/作答/超时三态） -->
    <div
      v-if="isReplay"
      class="bidr-agent-ask__answered"
    >
      {{ replayText }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { LoadingOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'

import { markdownOf } from './markdown'
import { CLARIFY_ANSWER_SKIPPED, parseChatOption, type AgentQuestionT, type ChatOptionView } from './types'

import './styles.css'

interface Props {
  /** 决策问题（ask_user waiting 条目；status 驱动重放态推导） */
  question: AgentQuestionT
  /** 选择模式：single（缺省）＝单击即答；multi＝点选聚合后提交 */
  mode?: 'single' | 'multi'
  /** 只读回显（true＝强制重放；缺省由 question.status 推导＝已收口即重放） */
  replay?: boolean
  /** 乐观收口：作答即视觉锁定 pending 态，等事件确认（失败消费方调 unlock() 回滚） */
  optimistic?: boolean
  /** 显示「交由 AI 决定」跳过按钮 */
  showSkip?: boolean
  /** 提交中（消费方异步在途时禁用交互并显示 loading） */
  busy?: boolean
  /** 卡头标题 */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'single',
  replay: false,
  optimistic: false,
  showSkip: false,
  busy: false,
  title: 'AI 需要你的决策'
})

const emit = defineEmits<{
  /** 作答：text＝选项 raw 或自由输入（multi＝多选聚合换行拼接）；skipped＝空串跳过语义；
   *  optionKeys＝三层解析出的编号（可空） */
  (e: 'answer', payload: { text: string; skipped?: boolean; optionKeys?: string[] }): void
}>()

/** 已答重放：显式 prop 或 question.status 已收口（answered/skipped/expired）→ 只读回显 */
const isReplay = computed(() =>
  props.replay || ['answered', 'skipped', 'expired'].includes(props.question.status))

const optionViews = computed(() => (props.question.options || []).map(parseChatOption))

const mdHtml = computed(() => markdownOf(props.question.question || ''))

/** 乐观锁：作答即锁定（等轮询把问题收走/换新问题）；失败由消费方 unlock() 回滚 */
const locked = ref(false)
const disabled = computed(() => isReplay.value || locked.value || props.busy)

/** single：单击即答后高亮（乐观锁定期间可见选中态）；multi：多选集合（raw 身份） */
const pickedRaw = ref('')
const selected = ref(new Set<string>())
const draft = ref('')

// 换新问题即整体复位（上一问的草稿/选择/锁不带进下一问）
watch(() => props.question.id, () => {
  locked.value = false
  pickedRaw.value = ''
  selected.value = new Set()
  draft.value = ''
})

/** 选中态：重放＝answer 命中的选项；multi＝集合；single＝最近一次作答的选项 */
const isPicked = (opt: ChatOptionView): boolean => {
  if (isReplay.value) {
    const a = props.question.answer
    return !!a && a === opt.raw
  }
  return props.mode === 'multi' ? selected.value.has(opt.raw) : pickedRaw.value === opt.raw
}

const onPick = (opt: ChatOptionView) => {
  if (disabled.value) return
  if (props.mode === 'multi') {
    const next = new Set(selected.value)
    if (next.has(opt.raw)) next.delete(opt.raw)
    else next.add(opt.raw)
    selected.value = next
    return
  }
  pickedRaw.value = opt.raw
  if (props.optimistic) locked.value = true
  emit('answer', { text: opt.raw, optionKeys: opt.key ? [opt.key] : undefined })
}

const sendDraft = () => {
  const text = draft.value.trim()
  if (!text || disabled.value) return
  if (props.optimistic) locked.value = true
  emit('answer', { text })
}

const submitMulti = () => {
  if (disabled.value || selected.value.size === 0) return
  const picked = optionViews.value.filter(o => selected.value.has(o.raw))
  if (props.optimistic) locked.value = true
  emit('answer', {
    text: picked.map(o => o.raw).join('\n'),
    optionKeys: picked.map(o => o.key).filter(Boolean)
  })
}

const skip = () => {
  if (disabled.value) return
  if (props.optimistic) locked.value = true
  emit('answer', { text: '', skipped: true })
}

const onEnter = (e: KeyboardEvent) => {
  // 中文输入法回车用于确认候选词，不应发送
  if (e.isComposing || e.keyCode === 229) return
  if (e.shiftKey) return
  e.preventDefault()
  sendDraft()
}

/** 只读回显文案：skipped/expired 有哨兵口径，answered 显示作答（哨兵＝跳过语义） */
const replayText = computed(() => {
  const q = props.question
  if (q.status === 'expired') return '已超时未作答，由 AI 自行决断'
  const a = q.answer
  if (q.status === 'skipped' || !a) return '已交由 AI 决定'
  if (a === CLARIFY_ANSWER_SKIPPED) return '已交由 AI 决定'
  return `已回答：${parseChatOption(a).label}`
})

defineExpose({
  /** 乐观锁定失败回滚（消费方 catch 分支调用，草稿保留可重试） */
  unlock: () => {
    locked.value = false
  },
  /** 清空自由输入草稿（消费方提交成功后调用；换新问题自动复位无需手调） */
  clearInput: () => {
    draft.value = ''
  }
})
</script>
