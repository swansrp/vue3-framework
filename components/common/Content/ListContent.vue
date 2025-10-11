<template>
  <a-list
    v-if="!multi"
    :data-source="_listData"
    :disabled="disable"
    bordered
    size="small"
  >
    <template #renderItem="{ item }">
      <a-list-item
        :class="{'activate-item':
          labelInValue ?
            selectedData.findIndex(data=>data.value === item[valueField]) !== -1
            : selectedData.indexOf(item[valueField]) !== -1}"
        @click="checkListNode(item)"
      >
        <slot
          :item="item"
          name="title"
        >
          <span>{{ item[props.labelField] }}</span>
        </slot>
      </a-list-item>
    </template>
    <template
      v-if="searchAble"
      #header
    >
      <a-input-search
        v-model:value="inputSearch"
        placeholder="请输入搜索"
        size="small"
        @search="onSearch"
      />
    </template>
  </a-list>
  <template v-else>
    <a-input-search
      v-if="searchAble"
      v-model:value="inputSearch"
      placeholder="请输入搜索"
      size="small"
      @search="onSearch"
    />
    <a-checkbox
      v-for="(item, index) in _listData"
      :key="index"
      v-model:checked="item.checked"
      style="width: 100%;margin-top: 10px"
      @change="handleChecked(item)"
    >
      <slot
        :item="item"
        name="title"
      >
        <span class="normal">{{ item[props.labelField] }}</span>
      </slot>
    </a-checkbox>
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
    valueField?: string,
    labelField?: string,
    disable?: boolean
    search?: (searchInput: any) => void
    searchAble?: boolean
    labelInValue?: boolean
  }>(),
  {
    modelValue: [],
    multi: false,
    valueField: 'value',
    labelField: 'label',
    disable: false,
    search: undefined,
    searchAble: false,
    labelInValue: false
  }
)
const { listData, modelValue, multi, valueField, labelField, search, labelInValue } = toRefs(props)
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
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()
const checkListNode = (arg: any) => {
  selectedData.value.length = 0
  if (labelInValue.value) {
    selectedData.value.push({ value: arg[valueField.value], label: arg[labelField.value], data: arg })
  } else {
    selectedData.value.push(arg[valueField.value])
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
  if (arg.checked) {
    if (labelInValue.value) {
      selectedData.value.push({ value: arg[valueField.value], label: arg[labelField.value], data: arg })
    } else {
      selectedData.value.push(arg[valueField.value])
    }
  } else {
    if (labelInValue.value) {
      selectedData.value.splice(selectedData.value.findIndex((item: any) => item.value === arg[valueField.value]), 1)
    } else {
      selectedData.value.splice(selectedData.value.findIndex((item: any) => item === arg[valueField.value]), 1)
    }
  }
}
watch(
  () => selectedData.value,
  () => {
    console.log('selectedData.value', selectedData.value)
    emit('update:modelValue', selectedData.value)
    emit('change', selectedData.value)
  },
  {
    deep: true
  }
)
onMounted(() => {
})
</script>

<style lang="less" scoped></style>