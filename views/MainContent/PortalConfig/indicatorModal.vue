<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full>
    <content-layout :width="400" style="margin-top: 20px">
      <template #side>
        <portal
          :advance-condition="groupAdvanceCondition"
          :bind-default-value="defaultValue"
          table-id="SysPortalIndicatorGroup"
          tree-mode
          @selected-data="onSelectedData" />
      </template>
      <template #content>
        <portal
          ref="indicatorRef"
          :action-width="0"
          :advance-condition="advanceCondition"
          :bind-default-value="{groupId: selectedTreeData[0]}"
          style="margin-top: 10px"
          table-id="SysPortalIndicator">
          <template #add="{modal, columnDisplayMap}">
            <dialog-box v-model:visible="modal.show" title="新增指标" :width="800">{{ columnDisplayMap }}</dialog-box>
          </template>
          <template #modify="{modal, columnDisplayMap}">
            <dialog-box v-model:visible="modal.show" title="修改指标" :width="800">{{ columnDisplayMap }}</dialog-box>
          </template>
        </portal>
      </template>
    </content-layout>
  </dialog-box>
</template>

<script lang="ts" setup>

import { buildCondition } from '@/framework/components/common/Portal/utils'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    config: any
    dict: any
  }>(),
  {}
)
const { config, dict, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
const defaultValue = reactive({ portalName: undefined })
watch(
  () => config.value,
  () => {
    console.log('=========', config.value)
    defaultValue.portalName = config.value.name
  },
  {
    immediate: true,
    deep: true
  }
)
const _show = ref(props.show)
watch(
  () => show.value,
  () => _show.value = show.value
)
watch(
  () => _show.value,
  () => emit('update:show', _show.value)
)
const selectedTreeData = ref<any>([])
const onSelectedData = (data: any) => {
  selectedTreeData.value = [...data]
}
const indicatorRef = ref()
const advanceCondition = computed(() => {
  const conditionList = isNotEmpty(selectedTreeData.value) ? [buildCondition('groupId', FILTER_TYPE.EQUAL, selectedTreeData.value)] : []
  return { conditionList } as ConditionListType
})
const groupAdvanceCondition = computed(() => {
  const conditionList = [buildCondition('portalName', FILTER_TYPE.EQUAL, [config.value.name])]
  return { conditionList } as ConditionListType
})
onMounted(() => {
})
</script>

<style lang="less" scoped></style>