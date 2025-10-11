<template>
  <lock-outlined
    v-if="modelValue"
    @click="() => {
      emit('update:modelValue', !modelValue)
      emit('onClick')
    }"
  />
  <unlock-outlined
    v-else
    @click="() => {
      emit('update:modelValue', !modelValue)
      emit('onClick')
    }"
  />
</template>

<script lang="ts" setup>
import { LockOutlined, UnlockOutlined } from '@ant-design/icons-vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
  }>(),
  {
    modelValue: true
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'onClick'): void
}>()
const { modelValue } = toRefs(props)
onMounted(() => {
})
</script>

<style lang="less" scoped></style>