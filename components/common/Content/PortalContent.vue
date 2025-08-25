<template>
  <portal
    v-if="treeMode"
    ref="portalRef"
    :check-strictly="checkStrictly"
    :table-id="tableId"
    :tree-check-able="multi"
    mode-lock
    read-only
    tree-mode
    @selected-data="onSelectedData" />
  <portal
    v-else
    ref="portalRef"
    :single-select="!multi"
    :row-select-props="rowSelectProps"
    :table-id="tableId"
    check-strictly="check-strictly"
    hide-association
    list-mode
    mode-lock
    read-only
    @selected-data="onSelectedData" />
</template>

<script lang="ts" setup>
import { Ref } from 'vue'
import { isNotEmpty } from '@/framework/utils/common'

const portalRef = ref()
const props = withDefaults(
  defineProps<{
    tableId: string
    modelValue?: any
    treeMode?: boolean
    checkStrictly?: boolean
    multi?: boolean
    valueField?: string
    labelField?: string
    disable?: boolean
    searchAble?: boolean
    rowSelectProps?: Function
    labelInValue?: boolean
  }>(),
  {
    modelValue: undefined,
    treeMode: false,
    checkStrictly: false,
    multi: false,
    valueField: 'id',
    labelField: 'name',
    disable: false,
    searchAble: false,
    rowSelectProps: undefined,
    labelInValue: false
  }
)
const { treeMode, modelValue, tableId, multi, valueField, labelField, labelInValue } = toRefs(props)
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
    if (multi.value) {
      if (isNotEmpty(data)) {
        try {
          selectedData.value = [...data]?.map((item: any) => {
            if (labelInValue.value) {
              return { value: item[valueField.value], label: item[labelField.value], data: item }
            } else {
              return item[valueField.value]
            }
          })
        } catch (e) {

        }
      } else {
        selectedData.value = []
      }

    } else {
      if (isNotEmpty(data)) {
        if (labelInValue.value) {
          selectedData.value = [{ value: data[0][valueField.value], label: data[0][labelField.value] }]
        } else {
          selectedData.value = [data[0][valueField.value]]
        }
      } else {
        selectedData.value = []
      }
    }
  }
  console.log('onSelectedData', selectedData.value)
}
const forceUpdate = () => {
  portalRef.value.queryData()
}
defineExpose({ forceUpdate })
onMounted(() => {
})
</script>

<style lang="less" scoped>
.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
</style>