<template>
  <div @click="emit('click')">
    <div
      v-if="!marquee"
      :style="{maxWidth: parseCssValue(maxWidth), width: parseCssValue(width)}"
      class="marquee-text"
    >
      {{ content }}
    </div>
    <div
      v-show="marquee"
      ref="marqueeContainer"
      :style="{maxWidth: parseCssValue(maxWidth), width: parseCssValue(width)}"
      class="marquee"
    >
      <div
        :style="{animationDuration: duration + 's'}"
        class="marquee-content"
      >
        {{ content }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getTextWidth, parseCssValue } from '@/framework/utils/common'

const _ = getInstance()
const props = withDefaults(
  defineProps<{
    width?: string | number
    maxWidth?: string | number
    duration?: number
    delay?: number
    // 字体变粗时,汉字占位宽度会变宽,所以需要根据字体大小动态计算宽度
    fontSize?: number
    content: string
  }>(),
  {
    duration: 20,
    delay: 3,
    width: 'auto',
    maxWidth: 'auto',
    fontSize: 1.6
  }
)
const { content, width, duration, delay, fontSize } = toRefs(props)
const emit = defineEmits<{
  (e: 'click'): void
}>()
const marqueeContainer = ref()
const marquee = ref(false)
let startTimer = null as any
let stopTimer = null as any
const initAnimationRender = () => {
  marquee.value = false
  if (isNotEmpty(startTimer)) {
    clearTimeout(startTimer)
  }
  startTimer = setTimeout(startAnimationRender, delay.value * 500)
}
const startAnimationRender = () => {
  if (marqueeContainer.value) {
    const scrollContent = marqueeContainer.value.querySelector('.marquee-content') as any
    scrollContent.style.animationPlayState = 'running'
    const containerWidth = Number(width.value)
    const contentWidth = getTextWidth(content.value, false, fontSize.value)
    if (isNotEmpty(stopTimer)) {
      clearTimeout(stopTimer)
    }
    if (contentWidth > containerWidth) {
      stopTimer = setTimeout(stopAnimationRender, (contentWidth - containerWidth) / contentWidth * duration.value * 1000)
      marquee.value = true
    }

  }
}
const stopAnimationRender = () => {
  if (marqueeContainer.value) {
    const scrollContent = marqueeContainer.value.querySelector('.marquee-content') as any
    if (scrollContent.style.animationPlayState === 'running') {
      scrollContent.style.animationPlayState = 'paused'
    }
    if (isNotEmpty(startTimer)) {
      clearTimeout(startTimer)
    }
    setTimeout(initAnimationRender, delay.value * 500)
  }
}
onMounted(() => {
  initAnimationRender()
})
</script>

<style lang="less" scoped>
.marquee-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1
}

.marquee {
  white-space: nowrap; /* 防止文字换行 */
  overflow: hidden; /* 隐藏溢出的内容 */
  box-sizing: border-box; /* 包括padding和border在内的总宽度 */
}

.marquee-content {
  display: inline-block; /* 使内容成为内联块级元素 */
  padding-left: 0%; /* 初始状态，内容在视图外 */
  animation: marquee linear infinite;
  animation-play-state: paused;
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%); /* 移动整个内容的宽度 */
  }
}
</style>