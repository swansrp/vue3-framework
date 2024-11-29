<template>
  <tree-content
    v-if="treeMode"
    v-model="selectedData"
    :checkStrictly="props.checkStrictly"
    :disable="props.disabled"
    :labelField="props.labelField"
    :multi="props.multi"
    treeData="treeData"
  >
    <template #title="{ dataRef }">
      <slot v-if="$slots.title" :item="dataRef" name="title"></slot>
      <span v-else>{{ dataRef[props.labelField] }}</span>
    </template>
  </tree-content>
  <list-content
    v-else
    v-model="selectedData"
    :disable="props.disabled"
    :labelField="props.labelField"
    :listData="dictData"
    :multi="props.multi"
    :search-able="searchAble"
  >
    <template #title="{ dataRef }">
      <slot v-if="$slots.title" :item="dataRef" name="title"></slot>
      <span v-else>{{ dataRef[props.labelField] }}</span>
    </template>
  </list-content>
</template>

<script lang="ts" setup>
import { dictStore, useTreeStore } from '@/framework/store/common'
import { Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: any
    dict: string
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
const {dict, treeMode, modelValue, multi} = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()

const treeData: Ref<Array<any>> = ref([])
const dictData: Ref<Array<any>> = ref([])

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
onMounted(() => {
  if (treeMode.value) {
    useTreeStore().getTree(dict.value).then(res => treeData.value = res)
  } else {
    dictStore().getDict(dict.value).then(res => dictData.value = res)
  }
})
</script>

<style lang="less" scoped>
.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
</style>