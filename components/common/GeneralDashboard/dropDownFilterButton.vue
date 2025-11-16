<template>
  <div
    v-if="options.length"
    class="dropdown-container"
    :style="{ minWidth: computedWidth }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="btn selected-btn">
      {{ selectedItem.label }}
    </div>
    <div
      v-if="showDropdown"
      class="dropdown-list"
    >
      <div
        v-for="(item, index) in options"
        :key="index"
        :class="(item.value === selectedItem.value) ? 'btn selected-btn' : 'btn default-btn'"
        @click="handleSelect(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ValueLabel, ValueLabelArray } from '@/framework/utils/type'

type Value = string | number | null

const props = defineProps<{
  options: ValueLabelArray,
  value: Value,
  width?: string | number // 组件宽度，可以是 '200px' 或 200
}>()

const { options } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:value', value: Value): void
}>()

// 计算宽度
const computedWidth = computed(() => {
  if (!props.width) return '160px'
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

let selectedItem = ref(options.value[0])
const showDropdown = ref(false)
let leaveTimer: any = null

const handleMouseEnter = () => {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
  showDropdown.value = true
}

const handleMouseLeave = () => {
  // 延迟关闭，给鼠标移动到下拉菜单留出时间
  leaveTimer = setTimeout(() => {
    showDropdown.value = false
  }, 100)
}

const handleSelect = (item: ValueLabel) => {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
  showDropdown.value = false
  selectedItem.value = item
  emit('update:value', item.value)
}
</script>

<style scoped lang="less">
.dropdown-container {
  position: relative;
  display: inline-block;
  min-width: 160px;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: 4px;
  margin-top: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-list .btn {
  margin-top: 2px;

  &:first-child {
    margin-top: 0;
  }

  &:hover {
    background: #f0f7ff;
    border-color: #40a9ff;
  }
}

.btn {
  height: 36px;
  padding: 0 8px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
}

.selected-btn {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
  font-weight: 500;

  &:hover {
    background: #40a9ff;
    border-color: #40a9ff;
  }
}

.default-btn {
  background: #fff;
  border-color: #d9d9d9;
  color: #666;
}
</style>
