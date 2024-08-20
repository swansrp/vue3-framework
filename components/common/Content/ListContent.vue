<template>
  <a-list
    :data-source="dictData" :disabled="disable" bordered size="small">
    <template #renderItem="{ item }">
      <a-list-item
        :class="{'activate-item': selectedData.checked.indexOf(item.value) !== -1}"
        @click="checkListNode(item.value)">
        <span>{{ item[props.labelField] }}</span>
      </a-list-item>
    </template>
  </a-list>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: any
    multi?: boolean,
    dictData: Array<any>,
    labelField?: string,
    disable?: boolean
  }>(),
  {
    modelValue: '',
    multi: false,
    labelField: 'label',
    disable: false
  }
)
const {modelValue, multi} = toRefs(props)
const selectedData: Ref<any> = ref(modelValue.value || {checked: []})
const selectedLabel = [] as Array<any>
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()
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
})
</script>

<style lang="less" scoped></style>