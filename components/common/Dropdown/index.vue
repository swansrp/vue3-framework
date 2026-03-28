<template>
  <div
    v-if="options.length"
    class="dropdown-container"
    :style="containerStyle"
    @mouseleave="showDropdown = false"
  >
    <div
      class="btn selected-btn"
      :style="selectedBtnStyle"
      @mouseenter="showDropdown = true"
    >
      {{ selectedItem.label }}
    </div>
    <div
      v-if="showDropdown && options.length > 1"
      class="dropdown-list"
    >
      <div
        v-for="(item, index) in options"
        :key="index"
        :class="
          isEqual(item.value, selectedItem.value) ? 'btn selected-btn' : 'btn default-btn'
        "
        :style="
          isEqual(item.value, selectedItem.value)
            ? selectedBtnStyle
            : hoveredIndex === index
              ? hoverBtnStyle
              : defaultBtnStyle
        "
        @click="handleSelect(item)"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = null"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { PropType, watch } from 'vue'

import selectedBgImage from './imgs/btn-active.png'
import hoverBgImage from './imgs/btn-hover.svg'
import defaultBgImage from './imgs/btn.png'

import { ValueLabel, ValueLabelArray } from '@/framework/utils/type'

type Value = string | number | null | (string | number)[];

// 比较两个值是否相等（支持数组）
const isEqual = (a: Value, b: Value): boolean => {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return false
}

const props = defineProps({
  options: {
    type: Array as PropType<ValueLabelArray>,
    required: true,
  },
  value: {
    type: [String, Number, Array] as PropType<Value>,
    default: null,
  },
  width: { type: Number, default: 150 },
  height: { type: Number, default: 53 },
  fontSize: { type: Number, default: 20 },
  fontFamily: { type: String, default: '"PangMenZhengDao", serif' },
  color: { type: String, default: '#fff' },
  selectedBgImage: { type: String, default: selectedBgImage },
  defaultBgImage: { type: String, default: defaultBgImage },
  hoverBgImage: { type: String, default: hoverBgImage },
})

const { options, value } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:value', value: Value): void;
}>()

let selectedItem = ref(options.value[0])
const showDropdown = ref(false)
const hoveredIndex = ref<number | null>(null)

const containerStyle = computed(() => ({
  fontFamily: props.fontFamily,
  color: props.color,
}))

const selectedBtnStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${props.width}px`,
    height: `${props.height}px`,
    fontSize: `${props.fontSize}px`,
    backgroundSize: '100% 100%',
  }
  if (props.selectedBgImage) {
    style.backgroundImage = `url(${props.selectedBgImage})`
  }
  return style
})

const defaultBtnStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${props.width}px`,
    height: `${props.height}px`,
    fontSize: `${props.fontSize}px`,
    backgroundSize: '100% 100%',
  }
  if (props.defaultBgImage) {
    style.backgroundImage = `url(${props.defaultBgImage})`
  }
  return style
})

const hoverBtnStyle = computed(() => {
  const style: Record<string, string> = {
    width: `${props.width}px`,
    height: `${props.height}px`,
    fontSize: `${props.fontSize}px`,
    backgroundSize: '100% 100%',
  }
  if (props.hoverBgImage) {
    style.backgroundImage = `url(${props.hoverBgImage})`
  }
  return style
})

// 监听 value prop 变化，更新选中项
watch(
  value,
  (newValue) => {
    const targetItem = options.value.find((item) => isEqual(item.value, newValue))
    if (targetItem) {
      selectedItem.value = targetItem
    }
  },
  { immediate: true }
)

// 监听 options 变化，确保选中项仍然有效
watch(
  options,
  (newOptions) => {
    if (newOptions.length > 0) {
      const targetItem = newOptions.find((item) => isEqual(item.value, value.value))
      if (targetItem) {
        selectedItem.value = targetItem
      } else {
        // 如果当前值不在新选项中，选择第一个
        selectedItem.value = newOptions[0]
        emit('update:value', newOptions[0].value)
      }
    }
  },
  { deep: true }
)

const handleSelect = (item: ValueLabel) => {
  showDropdown.value = false
  selectedItem.value = item
  emit('update:value', item.value)
}
</script>

<style scoped>
.dropdown-container {
  position: relative;
  display: inline-block;
  z-index: 100;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  padding: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: #092a44;
  border: 2px solid rgb(0, 158, 220);
  z-index: 10000;
}

.dropdown-list div {
  margin-top: 2px;
}

.btn {
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.selected-btn {
  background-size: 100% 100%;
}

.default-btn {
  background-size: 100% 100%;
}
</style>
