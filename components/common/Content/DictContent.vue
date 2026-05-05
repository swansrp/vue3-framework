<template>
  <tree-content
    v-if="treeMode"
    v-model="selectedData"
    :check-strictly="props.checkStrictly"
    :disable="props.disabled"
    :label-field="props.labelField"
    :multi="props.multi"
    :tree-data="treeData"
  >
    <template #title="{ item }">
      <slot
        v-if="$slots.title"
        :item="item"
        name="title"
      ></slot>
      <span v-else>{{ item && item[props.labelField] }}</span>
    </template>
  </tree-content>
  <list-content
    v-else
    v-model="selectedData"
    :disable="props.disabled"
    :label-field="props.labelField"
    :list-data="dictData"
    :multi="props.multi"
    :search-able="searchAble"
  >
    <template #title="{ item }">
      <slot
        v-if="$slots.title"
        :item="item"
        name="title"
      ></slot>
      <span v-else>{{ item && item[props.labelField] }}</span>
    </template>
  </list-content>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import { dictStore, useTreeStore } from '@/framework/store/common'

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
const { dict, treeMode, modelValue } = toRefs(props)
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
  background-color: var(--accent-soft);
  border-right: 3px solid var(--accent);
}
</style>