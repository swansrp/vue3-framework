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
    <template v-if="searchAble" #header>
      <a-input-search
        v-model:value="inputSearch" placeholder="请输入搜索" size="small"
        @search="onSearch" />
    </template>
  </a-list>
  <template v-else>
    <a-input-search
      v-if="searchAble"
      v-model:value="inputSearch"
      placeholder="请输入搜索"
      size="small"
      @search="onSearch" />
    <a-checkbox-group
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
    search?: (searchInput: any) => void
    searchAble?: boolean
  }>(),
  {
    modelValue: '',
    multi: false,
    labelField: 'label',
    disable: false,
    search: undefined,
    searchAble: false
  }
)
const {listData, modelValue, multi, labelField, search} = toRefs(props)
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
const searchByLabel = (search: any) => {
  if (isNotEmpty(search)) {
    _listData.value = listData.value.filter((item: any) => {
      return item[labelField.value].indexOf(search) !== -1
    })
  } else {
    _listData.value = listData.value
  }
}
const onSearch = () => {
  if (isNotEmpty(search.value)) {
    search.value && search.value(inputSearch.value)
  } else {
    searchByLabel(inputSearch.value)
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