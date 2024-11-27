<template>
  <a-list
    v-if="!multi"
    :data-source="listData" :disabled="disable" bordered size="small">
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
      v-for="(item, index) in listData" :key="index"
      :value="item.value"
      style="margin: 5px 0">
      <slot v-if="$slots.title" :item="item" name="title"></slot>
      <span v-else class="normal">{{ item[props.labelField] }}</span>
    </a-checkbox>
  </a-checkbox-group>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: any
    multi?: boolean,
    listData: Array<any>,
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
const selectedData: Ref<any> = ref(modelValue.value || [])
const selectedLabel = [] as Array<any>
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()
const checkListNode = (arg: any) => {
  console.log('checkListNode', arg)
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
})
</script>

<style lang="less" scoped></style>