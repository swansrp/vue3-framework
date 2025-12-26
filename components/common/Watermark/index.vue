<template>
  <div
    v-if="internalConfig.enabled"
    ref="watermarkRef"
    class="watermark-container"
  ></div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

import { title } from '@/../package.json'
import pinia from '@/framework/store'
import { useUserStore } from '@/framework/store/user'

export interface WatermarkStyle {
  fontSize?: string
  color?: string
  rotate?: number
  width?: number
  height?: number
  zIndex?: number
}

export interface WatermarkConfig {
  enabled?: boolean
  text?: string
  style?: WatermarkStyle
}

// 默认配置
const defaultConfig: Required<Omit<WatermarkConfig, 'style'>> & { style: Required<WatermarkStyle> } = {
  enabled: true,
  text: title,
  style: {
    fontSize: '16px',
    color: 'rgba(0, 0, 0, 0.08)',
    rotate: -20,
    width: 300,
    height: 200,
    zIndex: 9999,
  },
}

const props = withDefaults(defineProps<{
  config?: WatermarkConfig
}>(), {
  config: () => ({})
})

const userStore = useUserStore(pinia)
const watermarkRef = ref<HTMLDivElement>()

// 合并默认配置和传入配置
const internalConfig = computed(() => ({
  enabled: props.config?.enabled ?? defaultConfig.enabled,
  text: props.config?.text ?? defaultConfig.text,
  style: { ...defaultConfig.style, ...props.config?.style },
}))

// 监听用户名变化，动态更新水印文本
const watermarkText = computed(() => {
  // 如果外部传入了 text，优先使用外部的
  if (props.config?.text !== undefined) {
    return props.config.text
  }
  // 否则使用默认逻辑：显示项目名 + 用户名
  return (userStore.name || userStore.deptName)
    ? `${userStore.deptName}  ${userStore.name}`
    : title
})

// 创建水印
const createWatermark = () => {
  if (!internalConfig.value.enabled || !watermarkRef.value) return

  const { style } = internalConfig.value
  const {
    fontSize,
    color,
    rotate,
    width,
    height,
    zIndex,
  } = style

  // 创建 canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.clearRect(0, 0, width, height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${fontSize} sans-serif`
    ctx.fillStyle = color
    ctx.rotate((Math.PI / 180) * rotate)
    ctx.fillText(watermarkText.value, width / 2, height / 2)
  }

  // 设置水印背景
  const base64Url = canvas.toDataURL()
  watermarkRef.value.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-image: url(${base64Url});
    background-repeat: repeat;
    z-index: ${zIndex};
  `
}

onMounted(() => {
  createWatermark()
})

// 监听配置和文本变化
watch(
  [internalConfig, watermarkText],
  () => {
    createWatermark()
  },
  { deep: true }
)
</script>

<style scoped>
.watermark-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
