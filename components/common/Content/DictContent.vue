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
    v-else-if="!multi"
    :data-source="dictData" :disabled="disable" bordered size="small">
    <template #renderItem="{ item }">
      <a-list-item
        :class="{'activate-item': selectedData.indexOf(item.value) !== -1}"
        @click="checkListNode(item.value)">
        <slot v-if="$slots.title" :item="item" name="title"></slot>
        <span v-else>{{ item[props.labelField] }}</span>
      </a-list-item>
    </template>
  </a-list>
  <a-checkbox-group
    v-else
    v-model:value="selectedData"
    style="display: grid;"
    @change="handleChecked">
    <a-checkbox
      v-for="(item, index) in dictData" :key="index"
      :value="item.value"
      style="margin: 5px 0">
      <slot v-if="$slots.title" :item="item" name="title"></slot>
      <span v-else class="normal">{{ item[props.labelField] }}</span>
    </a-checkbox>
  </a-checkbox-group>
</template>

<script lang="ts" setup>
import { dictStore, useTreeStore } from '@/framework/store/common'
import { Ref } from 'vue'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'

const props = withDefaults(
  defineProps<{
    modelValue?: any
    dict: string
    treeMode?: boolean
    checkStrictly?: boolean
    multi?: boolean
    labelField?: string
    disable?: boolean
  }>(),
  {
    modelValue: undefined,
    treeMode: false,
    checkStrictly: false,
    multi: false,
    labelField: 'label',
    disable: false
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
const checkTreeNode = (_: string, e: { checked: boolean, node: DataNode }) => {
  if (e.checked && !multi.value) {
    selectedData.value = []
    selectedData.value.push(e.node.key)
    selectedLabel.length = 0
    selectedLabel.push(e.node.label)
  }
}
const checkListNode = (arg: any) => {
  if (!multi.value) {
    selectedData.value.length = 0
    selectedData.value.push(arg)
  } else {
    if (selectedData.value.indexOf(arg) === -1) {
      selectedData.value.push(arg)
    } else {
      selectedData.value.splice(selectedData.value.indexOf(arg), 1)
    }
  }
}
const handleChecked = (arg: any) => {
  selectedData.value = arg || []
}
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