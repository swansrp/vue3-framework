<template>
  <!-- region 高级筛选 -->
  <a-drawer
    v-model:open="advancedCondition.show"
    :width="1050"
    placement="right"
    title="高级筛选"
    @close="advancedConditionDrawClose"
  >
    <template #extra>
      <slot name="extra">
      </slot>
    </template>
    <advanced-search
      :key="key"
      :advanced="advanced"
      :columns="advancedCondition.columnArray"
      :condition="advancedCondition.condition"
      :ok-text="advancedCondition.okText"
      @get-condition="handleAdvancedConditionConfirm" />
  </a-drawer>

  <!-- endregion -->
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
  (e: 'confirm', condition: ConditionType): void
}>()
const advancedConditionDrawClose = () => {
  advancedCondition.value.show = false
}
const handleAdvancedConditionConfirm = (condition: ConditionType) => {
  advancedCondition.value.condition = condition
  console.log('getAdvancedCondition', advancedCondition.value.condition)
  emit('confirm', advancedCondition.value.condition)
  advancedConditionDrawClose()
}
watch(
  () => advancedCondition.value,
  () => {
    console.log(advancedCondition.value)
    key++
  },
  {
    deep: true
  }
)
onMounted(() => {
})
</script>

<style lang="less" scoped></style>