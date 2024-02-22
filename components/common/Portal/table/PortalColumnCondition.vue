<template>
  <div class="filter-column">
    <a-select
      v-if="column.fieldType === FIELD_TYPE.SELECT"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :options="column.referenceDictOption"
      :placeholder="`选择 ${column.title}`"
      :value="selectedKeysRef"
      mode="multiple"
      style="width: 188px; margin-bottom: 8px; display: block"
      @change="e => {
        setSelectedKeys(e ? e : [])
      }"
    />
    <a-range-picker
      v-else-if="column.fieldType === FIELD_TYPE.DATE"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :value="[dayjs(selectedKeysRef[0]), dayjs(selectedKeysRef[1])]"
      style="width: 250px; margin-bottom: 8px; display: flex"
      @ok="e => setSelectedKeys(e ? [e] : [])"
    />
    <a-range-picker
      v-else-if="column.fieldType === FIELD_TYPE.DATETIME"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :value="[dayjs(selectedKeysRef[0]), dayjs(selectedKeysRef[1])]"
      show-time
      style="width: 330px; margin-bottom: 8px; display: flex"
      @ok="e => setSelectedKeys(e ? [e] : [])"
    />
    <a-input
      v-else
      ref="searchInput"
      :placeholder="`搜索 ${column.title}`"
      :value="selectedKeysRef[0]"
      style="width: 188px; margin-bottom: 8px; display: block"
      @change="e => setSelectedKeys(e.target.value ? [e.target.value] : [])"
      @press-enter="handleSearch(selectedKeysRef, confirm, column.key, hidePopup, column)"
    />
    <a-button
      size="small"
      style="width: 90px; margin-right: 8px"
      type="primary"
      @click="handleSearch(selectedKeysRef, confirm, column.key, hidePopup, column)"
    >
      <template #icon>
        <search-outlined />
      </template>
      搜索
    </a-button>
    <a-button
      size="small" style="width: 90px"
      @click="handleReset(clearFilters, column.dataIndex, hidePopup)">
      重置
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import {FIELD_TYPE, TableConfigType} from '@/framework/components/common/Portal/type'
import {SearchOutlined} from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const prop = defineProps<{
  column: any,
  hidePopup: any,
  setSelectedKeys: any,
  selectedKeysRef: any,
  confirm: any,
  clearFilters: any
  config: TableConfigType
}>()
const emit = defineEmits<{
  (e: 'handleSearch', selectedKeys: any, confirm: any, dataIndex: any, hidePopup: any, column: any): void
  (e: 'handleReset', clearFilters: any, dataIndex: any, hidePopup: any): void
}>()
const {column, hidePopup, setSelectedKeys, selectedKeysRef, confirm, clearFilters, config} = toRefs(prop)
const handleSearch = (selectedKeys: any, confirm: any, dataIndex: any, hidePopup: any, column: any) => {
  emit('handleSearch', selectedKeys, confirm, dataIndex, hidePopup, column)
}
const handleReset = (clearFilters: any, dataIndex: any, hidePopup: any) => {
  emit('handleReset', clearFilters, dataIndex, hidePopup)
}
</script>

<style lang="less" scoped>
.filter-column {
  background-color: white;
  height: 80px;
  width: fit-content;
  padding: 8px 16px 8px 16px
}
</style>
