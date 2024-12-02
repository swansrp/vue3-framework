<template>
  <portal
    v-if="treeMode"
    :check-strictly="checkStrictly"
    :table-id="tableId"
    :tree-check-able="multi"
    mode-lock
    read-only
    tree-mode
    @selected-data="onSelectedData" />
  <portal
    v-else :table-id="tableId"
    check-strictly="check-strictly"
    list-mode
    mode-lock
    read-only
    @selected-data="onSelectedData" />
</template>

<script lang="ts" setup>
import { Ref } from 'vue'
import { isNotEmpty } from '@/framework/utils/common'

const props = withDefaults(
  defineProps<{
    tableId: string
    modelValue?: any
    treeMode?: boolean
    checkStrictly?: boolean
    multi?: boolean
    labelField?: string
    disable?: boolean
    searchAble?: boolean
  }>(),
  {
    modelValue: undefined,
    treeMode: false,
    checkStrictly: false,
    multi: false,
    labelField: 'label',
    disable: false,
    searchAble: false
  }
)
const {treeMode, modelValue, tableId, multi} = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()
const selectedData: Ref<any> = ref(modelValue.value || [])
const selectedLabel = [] as Array<any>
watch(
  () => selectedData.value,
  () => {
    emit('update:modelValue', selectedData.value)
    emit('change', selectedData.value, selectedLabel)
  },
  {
    deep: true
  }
)
const onSelectedData = (data: any) => {
  if (treeMode.value) {
    selectedData.value = data || []
  } else {
    if(multi.value) {
      selectedData.value = [data]?.map((item: any) => {
        return item.value
      })
    } else {
      if(isNotEmpty(data)) {
        selectedData.value = [data.value]
      } else {
        selectedData.value = []
      }
    }
  }
  console.log('onSelectedData', selectedData.value)

}
onMounted(() => {
})
</script>

<style lang="less" scoped>
.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
</style>