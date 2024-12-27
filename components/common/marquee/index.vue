<template>
  <div v-if="!marquee" class="marquee-text" :style="{width: isNaN(Number(width))?width:width+'px'}">{{ content }}</div>
  <div v-show="marquee" ref="marqueeContainer" :style="{width: isNaN(Number(width))?width:width+'px'}" class="marquee">
    <div :style="{animationDuration: duration + 's'}" class="marquee-content">
      {{ content }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const _ = getInstance()
const props = withDefaults(
  defineProps<{
    width?: string | number
    duration?: number
    delay?: number
    content: string
  }>(),
  {
    duration: 20,
    delay: 3,
    width: '100px'
  }
)
const marqueeContainer = ref()
const {content, width, duration, delay} = toRefs(props)
const marquee = ref(false)
let initTimer = null as any
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
    const containerWidth = marqueeContainer.value.offsetWidth
    const contentWidth = scrollContent.scrollWidth
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
    initTimer = setTimeout(initAnimationRender, delay.value * 500)
  }
}
onMounted(() => {
  initAnimationRender()
})
</script>

<style lang="less" scoped>
.marquee-text {
  white-space: nowrap;
  overflow: hidden;
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