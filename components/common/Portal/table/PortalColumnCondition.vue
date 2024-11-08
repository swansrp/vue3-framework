<template>
  <div class="filter-column">
    <a-select
      v-if="column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE"
      :filterOption="filterOption"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :options="column.referenceDictOption"
      :placeholder="'选择' + strRemoveLF(column.title)"
      :value="_selectedKeysRef"
      mode="multiple"
      style="width: 300px; margin-bottom: 8px; display: block"
      @change="e => handleSearchConditionChanged(e || [], column)"
    />
    <a-tree-select
      v-else-if="column.fieldType === FIELD_TYPE.TREE || column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
      :get-popup-container="(triggerNode) => triggerNode.parentNode"
      :placeholder="'选择' + strRemoveLF(column.title)"
      :show-checked-strategy="TreeSelect.SHOW_PARENT"
      :tree-data="column.referenceDictOption"
      :value="_selectedKeysRef"
      allow-clear
      style="width: 300px; margin-bottom: 8px; display: block"
      tree-checkable
      tree-default-expand-all
      tree-node-filter-prop="label"
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
    <div
      v-else-if="column.fieldType === FIELD_TYPE.NUMBER || column.fieldType === FIELD_TYPE.MONEY || column.fieldType === FIELD_TYPE.PERCENT"
      style="display: flex; align-items: center;">
      <lock-switch
        v-model="column.filterStrict"
        style="margin-bottom: 8px; margin-right: 5px"
      />
      <a-input-number
        v-if="column.filterStrict"
        v-model:value="_selectedKeysRef[0]"
        style=" margin-bottom: 8px; width: 170px;"
        @change="e => handleNumberConditionChanged([e, e], column)" />
      <a-input-group
        v-else
        compact style=" margin-bottom: 8px; ">
        <a-input-number
          v-model:value="_selectedKeysRef[0]"
          placeholder="大于等于"
          style="width: 100px; text-align: center"
          @change="e => handleNumberConditionChanged([e, _selectedKeysRef[1]], column)"
        />
        <a-input
          class="site-input-split"
          disabled
          placeholder="~"
          style="width: 30px; border-left: 0; pointer-events: none"
        />
        <a-input-number
          v-model:value="_selectedKeysRef[1]"
          class="site-input-right"
          placeholder="小于等于"
          style="width: 100px; text-align: center"
          @change="e => handleNumberConditionChanged([_selectedKeysRef[0], e], column)"
        />
      </a-input-group>
    </div>
    <div v-else style="display: flex; align-items: center;">
      <lock-switch
        v-model="column.filterStrict"
        style="margin-bottom: 8px; margin-right: 5px"
        @click="() => handleSearchConditionChanged(_selectedKeysRef[0] ? [_selectedKeysRef[0]] : [], column)"
      />
      <a-input
        ref="searchInput"
        v-model:value="_selectedKeysRef[0]"
        :placeholder="(column.filterStrict ? '' : '模糊') + '搜索 ' + strRemoveLF(column.title)"
        style="width: 170px; margin-bottom: 8px; display: block"
        @change="e => handleSearchConditionChanged(e.target.value ? [e.target.value] : [], column)"
        @press-enter="handleSearch()"
      />
    </div>
    <div style="display: flex; justify-content: center">
      <a-button
        size="small"
        style="width: 90px; margin-right: 8px;"
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
  </div>
</template>

<script lang="ts" setup>
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { SearchOutlined } from '@ant-design/icons-vue'
import { filterOption } from '@/framework/components/common/utils'
import { strRemoveLF } from '@/framework/utils/common'
import { TreeSelect } from 'ant-design-vue';
import LockSwitch from '@/framework/components/common/lockSwitch/index.vue'

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
  () => {
    console.log(' selectedKeysRef.value', selectedKeysRef.value)
    _selectedKeysRef.value = selectedKeysRef.value
  }
)
const handleSearchConditionChanged = (value: any, column: any) => {
  setSelectedKeys.value(value)
  emit('handleSearchConditionChanged', value, column.dataIndex, column)
}
const handleNumberConditionChanged = (value: any, column: any) => {
  setSelectedKeys.value(value)
  let left
  let right

  if (column.fieldType === FIELD_TYPE.PERCENT) {
    left = value[0] !== undefined ? value[0] === 0 ? 0 : value[0] * column.referenceDict.split(',')[1] / 100 : Number.MIN_VALUE
    right = value[1] !== undefined ? value[1] === 0 ? 0 : value[1] * column.referenceDict.split(',')[1] / 100 : Number.MAX_VALUE
  } else if (column.fieldType === FIELD_TYPE.MONEY) {
    left = value[0] !== undefined ? value[0] === 0 ? 0 : value[0] * column.referenceDict.split(',')[1] : Number.MIN_VALUE
    right = value[1] !== undefined ? value[1] === 0 ? 0 : value[1] * column.referenceDict.split(',')[1] : Number.MAX_VALUE
  } else {
    left = value[0] === 0 ? 0 : value[0] || Number.MIN_VALUE
    right = value[1] === 0 ? 0 : value[1] || Number.MAX_VALUE
  }
  console.log(' handleNumberConditionChanged', column, value, [left, right])
  emit('handleSearchConditionChanged', [left, right], column.dataIndex, column)
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
