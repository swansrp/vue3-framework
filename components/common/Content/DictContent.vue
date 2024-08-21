<template>
  <a-tree
    v-if="treeMode"
    :key="treeData"
    v-model:checkedKeys="selectedData"
    :checkStrictly="props.checkStrictly"
    :disabled="disable"
    :tree-data="treeData"
    checkable
    defaultExpandAll
    show-line
    @check="checkTreeNode">
    <template #title="{ dataRef }">
      <slot v-if="$slots.title" :item="dataRef" name="title"></slot>
      <span v-else>{{ dataRef[props.labelField] }}</span>
    </template>
  </a-tree>
  <a-list
    v-else
    :data-source="dictData" :disabled="disable" bordered size="small">
    <template #renderItem="{ item }">
      <a-list-item
        :class="{'activate-item': selectedData.checked.indexOf(item.value) !== -1}"
        @click="checkListNode(item.value)">
        <slot v-if="$slots.title" :item="dataRef" name="title"></slot>
        <span v-else>{{ item[props.labelField] }}</span>
      </a-list-item>
    </template>
  </a-list>
</template>

<script lang="ts" setup>
import { dictStore, useTreeStore } from '@/framework/store/common'
import { Ref } from 'vue'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'

const props = withDefaults(
  defineProps<{
    modelValue: any
    dict: string
    treeMode?: boolean
    checkStrictly?: boolean
    multi?: boolean
    labelField?: string
    disable?: boolean
  }>(),
  {
    treeMode: false,
    checkStrictly: false,
    multi: false,
    labelField: 'label',
    disable: false
  }
)
const {dict , treeMode, modelValue, multi} = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()

const treeData: Ref<Array<any>> = ref([])
const dictData: Ref<Array<any>> = ref([])

const selectedData: Ref<any> = ref(modelValue.value || {checked: []})
const selectedLabel = [] as Array<any>
const checkTreeNode = (_: string, e:{checked: boolean, node: DataNode}) => {
  if(e.checked && !multi.value) {
    selectedData.value.checked.length = 0
    selectedData.value.checked.push(e.node.key)
    selectedLabel.length = 0
    selectedLabel.push(e.node.label)
  }
}
const checkListNode = (arg: any) => {
  if(!multi.value) {
    selectedData.value.checked.length = 0
    selectedData.value.checked.push(arg)
  } else {
    if(selectedData.value.checked.indexOf(arg) === -1) {
      selectedData.value.checked.push(arg)
    } else {
      selectedData.value.checked.splice(selectedData.value.checked.indexOf(arg), 1)
    }
  }
}
watch(
  () => selectedData.value,
  () => {
    emit('update:modelValue', selectedData.value)
    emit('change', selectedData.value, selectedLabel)
  }
)
onMounted(() => {
  if(treeMode.value) {
    useTreeStore().getTree(dict.value).then(res =>  treeData.value = res)
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