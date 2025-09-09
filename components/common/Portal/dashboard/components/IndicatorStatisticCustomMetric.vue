<template>
  <a-drawer
    v-model:open="advancedCondition.show"
    :width="950"
    placement="right"
    title="设置指标项条件"
    @close="advancedConditionDrawClose"
  >
    <template #extra>
      <slot name="extra">
      </slot>
    </template>

    <a-space size="large">
      <span><strong>指标：</strong>{{ advancedCondition.group }}</span>
      <span><strong>指标项名称：</strong>{{ advancedCondition.name }}</span>
      <span><strong>指标项值：</strong>{{ advancedCondition.value }}</span>
    </a-space>

    <advanced-search
      :key="key"
      :width="900"
      :advanced="advanced"
      :columns="advancedCondition.columnArray"
      :condition="advancedCondition.condition"
      :ok-text="advancedCondition.okText"
      @get-condition="handleAdvancedConditionConfirm" />
  </a-drawer>
</template>

<script lang="ts" setup>

import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'

let key = 0
const props = withDefaults(
  defineProps<{
    advancedCondition: any,
    advanced?: boolean
  }>(),
  {
    advanced: true
  }
)
const { advancedCondition } = toRefs(props)
const emit = defineEmits<{
  (e: 'confirm', condition: ConditionType, name: string): void
}>()
const advancedConditionDrawClose = () => {
  advancedCondition.value.show = false
}
const handleAdvancedConditionConfirm = (condition: ConditionType) => {
  advancedCondition.value.condition = condition
  console.debug('getAdvancedCondition', advancedCondition.value.condition)
  nextTick(() => {
    emit('confirm', advancedCondition.value.condition, advancedCondition.value.name)
    advancedConditionDrawClose()
  })
}

watch(
  () => advancedCondition.value,
  () => key++,
  {
    deep: true
  }
)
onMounted(() => {
})
</script>

<style scoped lang="less"></style>