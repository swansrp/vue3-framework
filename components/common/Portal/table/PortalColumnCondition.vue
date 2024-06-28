<template>
  <div class="filter-column">
    <a-select
      v-if="column.fieldType === FIELD_TYPE.SELECT"
      :filterOption="filterOption"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :options="column.referenceDictOption"
      :placeholder="`选择 ${column.title}`"
      :value="selectedKeysRef"
      mode="multiple"
      style="width: 188px; margin-bottom: 8px; display: block"
      @change="e => handleSearchConditionChanged(e || [], column)"
    />
    <a-range-picker
      v-else-if="column.fieldType === FIELD_TYPE.DATE"
      v-model:value="_selectedKeysRef"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      style="width: 250px; margin-bottom: 8px; display: flex"
      valueFormat="YYYY-MM-DD HH:mm:ss"
      @change="e => {
        if(e) {
          e[0] = e[0].split(' ')[0] + ' 00:00:00'
          e[1] = e[1].split(' ')[0] + ' 23:59:59'
        }
        handleSearchConditionChanged(e || [], column)
      }"
    />
    <a-range-picker
      v-else-if="column.fieldType === FIELD_TYPE.DATETIME"
      v-model::value="_selectedKeysRef"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      show-time
      style="width: 330px; margin-bottom: 8px; display: flex"
      valueFormat="YYYY-MM-DD HH:mm:ss"
      @change="e => handleSearchConditionChanged(e || [], column)"
    />
    <div v-else style="display: flex; align-items: center;">
      <lock-outlined
        v-if="column.filterStrict" style="margin-bottom: 8px; margin-right: 5px"
        @click="() => {
          column.filterStrict = !column.filterStrict
          handleSearchConditionChanged(_selectedKeysRef[0] ? [_selectedKeysRef[0]] : [], column)
        }" />
      <unlock-outlined
        v-else style="margin-bottom: 8px; margin-right: 5px"
        @click="() => {
          column.filterStrict = !column.filterStrict
          handleSearchConditionChanged(_selectedKeysRef[0] ? [_selectedKeysRef[0]] : [], column)
        }" />
      <a-input
        ref="searchInput"
        v-model:value="_selectedKeysRef[0]"
        :placeholder="(column.filterStrict ? '' : '模糊') + '搜索 ' + `${column.title}`"
        style="width: 170px; margin-bottom: 8px; display: block"
        @change="e => handleSearchConditionChanged(e.target.value ? [e.target.value] : [], column)"
        @press-enter="handleSearch()"
      />
    </div>
    <a-button
      size="small"
      style="width: 90px; margin-right: 8px"
      type="primary"
      @click="handleSearch()"
    >
      <template #icon>
        <search-outlined />
      </template>
      搜索
    </a-button>
    <a-button
      size="small" style="width: 90px"
      @click="handleReset(column)">
      重置
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { LockOutlined, SearchOutlined, UnlockOutlined } from '@ant-design/icons-vue'
import { filterOption } from '@/framework/components/common/utils'

const prop = defineProps<{
  column: any,
  setSelectedKeys: any,
  selectedKeysRef: any,
  confirm: any,
  clearFilters: any
}>()
const emit = defineEmits<{
  (e: 'handleSearchConditionChanged', selectedKeys: any, dataIndex: any, column: any): void
  (e: 'update:column', column: any): void
}>()
const {column, setSelectedKeys, selectedKeysRef, confirm, clearFilters} = toRefs(prop)
watch(column, (column) => {
  emit('update:column', column)
}, {deep: true})

const _selectedKeysRef = ref(selectedKeysRef.value)
watch(
  () => selectedKeysRef.value,
  () => _selectedKeysRef.value = selectedKeysRef.value
)
const handleSearchConditionChanged = (value: any, column: any) => {
  setSelectedKeys.value(value)
  emit('handleSearchConditionChanged', value, column.dataIndex, column)
}
const handleSearch = () => {
  confirm.value()
}
const handleReset = (column: any) => {
  handleSearchConditionChanged(null, column)
  clearFilters.value()
}
</script>

<style lang="less" scoped>
.filter-column {
  background-color: white;
  width: fit-content;
  padding: 8px 16px 8px 16px
}
</style>
