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
      <slot name="extra"></slot>
    </template>
    <advanced-search
      :key="key"
      :advanced="advanced"
      :columns="advancedCondition.columnArray"
      :condition="advancedCondition.condition"
      :ok-text="advancedCondition.okText"
      @get-condition="handleAdvancedConditionConfirm"
    />
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
  console.debug('getAdvancedCondition', advancedCondition.value.condition)
  emit('confirm', advancedCondition.value.condition)
  advancedConditionDrawClose()
}
watch(
  // 只认「开关抽屉」与「列/条件整体换了一份」这三个引用级变化来重建内容。
  // 之前是 deep 监听整个 advancedCondition：用户对条件行的每一次增删改都落在 condition 对象内部，
  // 也会触发 key++ ⇒ 编辑中途整块组件销毁重建（下拉收起、输入闪回空白），表现为"加不了也改不了"
  () => [advancedCondition.value.show, advancedCondition.value.columnArray, advancedCondition.value.condition],
  () => key++
)
onMounted(() => {
})
</script>

<style lang="less" scoped></style>