<template>
  <div class="filter-column">
    <a-select
      v-if="column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE"
      :filter-option="filterOption"
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
      :show-checked-strategy="TreeSelect.SHOW_ALL"
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
      value-format="YYYY-MM-DD HH:mm:ss"
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
      value-format="YYYY-MM-DD HH:mm:ss"
      @change="e => handleSearchConditionChanged(e || [], column)"
    />
    <div
      v-else-if="column.fieldType === FIELD_TYPE.NUMBER || column.fieldType === FIELD_TYPE.MONEY || column.fieldType === FIELD_TYPE.PERCENT"
      style="display: flex; align-items: center;"
    >
      <lock-switch
        v-model="column.filterStrict"
        style="margin-bottom: 8px; margin-right: 5px"
        @click="() => handleNumberConditionChanged([_selectedKeysRef[0], _selectedKeysRef[1]], column)"
      />
      <a-input-group
        compact
        style=" margin-bottom: 8px; "
      >
        <a-input-number
          v-model:value="_selectedKeysRef[0]"
          :placeholder="column.filterStrict ? '大于等于' : '大于'"
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
          :placeholder="column.filterStrict ? '小于等于' : '小于'"
          style="width: 100px; text-align: center"
          @change="e => handleNumberConditionChanged([_selectedKeysRef[0], e], column)"
        />
      </a-input-group>
    </div>
    <div
      v-else
      style="display: flex; align-items: center;"
    >
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
        @change="e => handleSearchConditionChanged(e.target.value ? [e.target.value.trim()] : [], column)"
        @press-enter="handleSearch()"
      />
    </div>
    <div style="display: flex; justify-content: center">
      <a-dropdown :trigger="['contextmenu']">
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
        <template #overlay>
          <a-menu @click="({ key: menuKey }) => handleNullSearch(menuKey, column)">
            <a-menu-item key="1">
              查询为空
            </a-menu-item>
            <a-menu-item key="0">
              查询非空
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-button
        size="small"
        style="width: 90px"
        @click="handleReset(column)"
      >
        重置
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { SearchOutlined } from '@ant-design/icons-vue'
import { TreeSelect } from 'ant-design-vue'

import LockSwitch from '@/framework/components/common/lockSwitch/index.vue'
import { getDefaultFilterType } from '@/framework/components/common/Portal/constant'
import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { filterOption } from '@/framework/components/common/utils'
import { strRemoveLF } from '@/framework/utils/common'

const prop = defineProps<{
  column: any,
  setSelectedKeys: any,
  selectedKeysRef: any,
  confirm: any,
  clearFilters: any,
  clearFilterColumns?: Set<string>
}>()
const emit = defineEmits<{
  (e: 'handleSearchConditionChanged', selectedKeys: any, dataIndex: any, relation: any, filterStrict: boolean): void
  (e: 'update:column', column: any): void
}>()
const { column, setSelectedKeys, selectedKeysRef, confirm, clearFilters } = toRefs(prop)
watch(column, (column) => {
  emit('update:column', column)
}, { deep: true })

const _selectedKeysRef = ref(selectedKeysRef.value)
watch(
  () => selectedKeysRef.value,
  () => _selectedKeysRef.value = selectedKeysRef.value
)

// 监听外部清空信号
watch(
  () => prop.clearFilterColumns,
  (clearSet) => {
    if (clearSet && clearSet.has(column.value.dataIndex)) {
      // 清空本列的筛选值
      _selectedKeysRef.value = []
      setSelectedKeys.value([])
      clearFilters.value()
      // 从清空列表中移除
      clearSet.delete(column.value.dataIndex)
    }
  },
  { deep: true }
)
const handleSearchConditionChanged = (value: any, column: any) => {
  setSelectedKeys.value(value)
  emit('handleSearchConditionChanged', value, column.dataIndex, getDefaultFilterType(column.fieldType, column.filterStrict), column.filterStrict)
}
const handleNumberConditionChanged = (value: any, column: any) => {
  setSelectedKeys.value(value)
  let left
  let right

  if (column.fieldType === FIELD_TYPE.PERCENT) {
    left = value[0] !== undefined ? value[0] === 0 ? 0 : value[0] * column.referenceDict.split(',')[1] / 100 : -Number.MAX_SAFE_INTEGER
    right = value[1] !== undefined ? value[1] === 0 ? 0 : value[1] * column.referenceDict.split(',')[1] / 100 : Number.MAX_SAFE_INTEGER
  } else if (column.fieldType === FIELD_TYPE.MONEY) {
    left = value[0] !== undefined ? value[0] === 0 ? 0 : value[0] * column.referenceDict.split(',')[1] : -Number.MAX_SAFE_INTEGER
    right = value[1] !== undefined ? value[1] === 0 ? 0 : value[1] * column.referenceDict.split(',')[1] : Number.MAX_SAFE_INTEGER
  } else {
    left = value[0] === 0 ? 0 : value[0] || -Number.MAX_SAFE_INTEGER
    right = value[1] === 0 ? 0 : value[1] || Number.MAX_SAFE_INTEGER
  }
  console.log(' handleNumberConditionChanged', column, value, [left, right])
  emit('handleSearchConditionChanged', [left, right], column.dataIndex, getDefaultFilterType(column.fieldType, column.filterStrict), column.filterStrict)
}
const handleSearch = () => {
  confirm.value()
}
const handleNullSearch = (key: string, column: any) => {
  console.log('handleNullSearch', column)
  if (column.fieldType === FIELD_TYPE.DATE) {
    setSelectedKeys.value([null, null])
  } else {
    setSelectedKeys.value([null])
  }
  emit('handleSearchConditionChanged', [null], column.dataIndex, key === '1' ?  FILTER_TYPE.NULL : FILTER_TYPE.NOT_NULL, column.filterStrict)
  confirm.value()
}
const handleReset = (column: any) => {
  handleSearchConditionChanged(null, column)
  clearFilters.value()
}
</script>

<style lang="less" scoped>
.filter-column {
  background-color: var(--bg-elevated);
  width: fit-content;
  padding: 8px 16px 8px 16px
}
</style>
