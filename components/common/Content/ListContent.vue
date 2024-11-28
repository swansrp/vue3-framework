<template>
  <a-list
    v-if="!multi"
    :data-source="_listData" :disabled="disable" bordered size="small">
    <template #renderItem="{ item }">
      <a-list-item
        :class="{'activate-item': selectedData.indexOf(item.value) !== -1}"
        @click="checkListNode(item.value)">
        <slot v-if="$slots.title" :item="item" name="title"></slot>
        <span v-else>{{ item[props.labelField] }}</span>
      </a-list-item>
    </template>
    <template #header>
      <a-input-search v-model:value="inputSearch" placeholder="请输入搜索" size="small" @search="onSearch" />
    </template>
  </a-list>
  <a-checkbox-group
    v-else
    v-model:value="selectedData"
    style="display: grid;"
    @change="handleChecked">
    <a-checkbox
      v-for="(item, index) in _listData" :key="index"
      :value="item.value"
      style="margin: 5px 0">
      <slot v-if="$slots.title" :item="item" name="title"></slot>
      <span v-else class="normal">{{ item[props.labelField] }}</span>
    </a-checkbox>
  </a-checkbox-group>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'
import { isNotEmpty } from '@/framework/utils/common'

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
const {listData, modelValue, multi, labelField} = toRefs(props)
const _listData = ref(listData.value)
watch(
  () => listData.value,
  () => _listData.value = listData.value,
  {
    deep: true,
    immediate: true
  }
)
const inputSearch = ref('')
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
const onSearch = () => {
  debugger
  if (isNotEmpty(inputSearch.value)) {
    _listData.value = listData.value.filter((item: any) => {
      return item[labelField.value].indexOf(inputSearch.value) !== -1
    })
  } else {
    _listData.value = listData.value
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