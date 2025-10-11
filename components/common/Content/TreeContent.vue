<template>
  <a-tree
    :key="treeData"
    v-model:checked-keys="selectedData"
    :check-strictly="props.checkStrictly"
    :disabled="disable"
    :tree-data="treeData"
    checkable
    default-expand-all
    show-line
    @check="checkTreeNode"
  >
    <template #title="{ dataRef }">
      <slot
        v-if="$slots.title"
        :item="dataRef"
        name="title"
      />
      <span v-else>{{ dataRef[props.labelField] }}</span>
    </template>
  </a-tree>
</template>

<script lang="ts" setup>
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: any
    multi?: boolean
    treeData: Array<any>,
    labelField?: string,
    checkStrictly?: boolean
    disable?: boolean
  }>(),
  {
    modelValue: '',
    multi: false,
    labelField: 'label',
    checkStrictly: false,
    disable: false
  }
)
const { modelValue, multi, treeData } = toRefs(props)
const selectedData: Ref<any> = ref(modelValue.value || { checked: [] })
const selectedLabel = [] as Array<any>
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()
const checkTreeNode = (_: string, e:{checked: boolean, node: DataNode}) => {
  if(e.checked && !multi.value) {
    selectedData.value = []
    selectedData.value.push(e.node.key)
    selectedLabel.length = 0
    selectedLabel.push(e.node.label)
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
})
</script>

<style lang="less" scoped></style>