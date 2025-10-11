<template>
  <svg
    aria-hidden="true"
    class="svg-icon"
    :width="width"
    :height="height"
  >
    <use
      :xlink:href="symbolId"
      :fill="color"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  prefix: {
    type: String,
    default: 'icon'
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#333'
  },
  width: {
    type: String,
    default: '5vw'
  },
  height: {
    type: String,
    default: '2vh'
  }
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)
</script>
<style scoped></style>
