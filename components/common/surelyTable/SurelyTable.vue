<template>
  <s-table
    v-if="updatedColumns.length"
    v-model:pagination="pagination"
    :bordered="bordered"
    summary-fixed
    :stripe="stripe"
    :columns="updatedColumns"
    :data-source="dataSource"
    :animate-rows="false"
    :row-class-name="rowClassName"
    :scroll="{x: getTableWidth(), y: getTableHeight()}"
    :style="{width: String(_tableWidth) === 'auto' ? '100%' : _tableWidth + 'px'}"
    :custom-row="customRow"
    :custom-header-cell="customHeaderCell"
    :row-height="rowHeight"
    @row-drag-end="rowDragEnd"
    @expanded-rows-change="expandedRowsChange"
    @change="change"
    @column-drag-end="columnDragEnd"
  >
    <template
      v-if="needTitle"
      #title
    >
      <slot name="title" />
    </template>
    <template #headerCell="{title}">
      <span v-if="title.indexOf('/') === -1">{{ title }}</span>
      <div
        v-else
        class="table-title-cell"
      >
        <div
          v-for="(item, index) in title.split('/')"
          :key="index"
        >
          {{ item }}
        </div>
      </div>
    </template>
    <template
      v-if="needExpandedRowRender"
      #expandedRowRender="{ record }"
    >
      <slot
        :record="record"
        name="expandedRowRender"
      />
    </template>
    <template
      v-if="summaryList"
      #summary
    >
      <s-table-summary-row>
        <s-table-summary-cell
          v-for="(item, index) in summaryList"
          :key="index"
          :index="index"
        >
          <template v-if="item || item === 0">
            {{ item }}
          </template>
          <template v-else />
        </s-table-summary-cell>
      </s-table-summary-row>
    </template>
    <template #bodyCell="{column, record, text}">
      <slot
        :column="column"
        :record="record"
        :text="text"
        name="bodyCell"
      />
    </template>
    <template #customFilterDropdown="{setSelectedKeys, selectedKeys, confirm, clearFilters, column}">
      <div style="padding: 8px">
        <a-input
          v-if="column.filterComponentType === FILTER_COMPONENT_TYPE.INPUT"
          ref="searchInput"
          :placeholder="`搜索${column.title}`"
          :value="selectedKeys[0]"
          style="width: 188px; margin-bottom: 8px; display: block"
          @change="e => inputOnChange(column, e, setSelectedKeys)"
          @press-enter="handleSearch"
        />
        <a-button
          size="small"
          style="width: 90px;margin-right: 8px"
          type="primary"
          @click="handleSearch"
        >
          <template #icon>
            <search-outlined />
          </template>搜索
        </a-button>
        <a-button
          size="small"
          style="width: 90px"
          @click="handleReset(column, clearFilters)"
        >
          清空
        </a-button>
      </div>
      <slot
        name="customFilterDropdown"
        :set-selected-keys="setSelectedKeys"
        :selected-keys="selectedKeys"
        :confirm="confirm"
        :clear-filters="clearFilters"
        :column="column"
      />
    </template>
    <template #customFilterIcon="{ filtered }">
      <slot
        :filtered="filtered"
        name="customFilterIcon"
      />
    </template>
  </s-table>
</template>

<script lang="ts" setup>
import { SearchOutlined } from '@ant-design/icons-vue'
import { STable, STablePaginationConfig, STableSummaryCell, STableSummaryRow } from '@surely-vue/table'
import { TableColumnType } from 'ant-design-vue'
import { Ref } from 'vue'

import { FILTER_COMPONENT_TYPE, QueryConditionType } from './contant'

import { updateColumns } from '@/framework/hooks/updateSurelyTableColumns'
import { localStorageMethods } from '@/framework/utils/common'
import { AUTO } from '@/framework/utils/constant'

const props = defineProps<{
  tableId?: string,
  columns: any,
  dataSource: Array<object>,
  tableHeight?: number,
  tableWidth?: number,
  summaryList?: Array<any> | undefined,
  pagination?: object | boolean
  rowClassName?: string,
  bordered?: boolean,
  stripe?: boolean,
  customRow?: any
  customHeaderCell?: any,
  rowHeight?: any
}>()

const slots = useSlots()
let needTitle = ref(slots['title'])
let needExpandedRowRender = ref(slots['expandedRowRender'])
const emit = defineEmits(['onRowDrag', 'pageChange', 'expandedRowsChange', 'handleSearch', 'handleReset', 'change'])

let updatedColumns:Ref<any[]> = ref([])
let _tableHeight = ref<number | undefined>()
let _tableWidth = ref<number | undefined>()
let pagination = ref(props.pagination)
let { tableId, columns, dataSource, rowClassName, stripe, customRow, customHeaderCell, rowHeight } = toRefs(props)
let bordered = computed(() => props.bordered === undefined ? true : props.bordered)
let queryCondition: QueryConditionType | {[key: string]: string} = {}

const inputOnChange = (column: any, e: any, setSelectedKeys: Function) => {
  const property = column.dataIndex as string
  const value = e.target.value ? [e.target.value] : []
  queryCondition[property] = {
    property,
    value,
    relation: column.filterType
  }
  setSelectedKeys(value)
}
const initPagination = () => {
  if (pagination && pagination.value) {
    pagination = ref<STablePaginationConfig>({
      showQuickJumper: true,
      showSizeChanger: true,
      showTotal: total => `总计 ${total} 条`,
      pageSize: 20,
    })
  } else pagination!.value = false
}
const expandedRowsChange = (expandedRows: any) => emit('expandedRowsChange', expandedRows)
const handleSearch = () => emit('handleSearch', queryCondition)
const handleReset = (column: TableColumnType, clearFilters: Function) => {
  clearFilters()
  delete queryCondition[column.dataIndex as string]
  emit('handleReset', queryCondition)
}
const change = (pagination: any, filters: any, sorter: any, currentDataSource : any ) =>
  emit('change', pagination, filters, sorter, currentDataSource )
const rowDragEnd = (info: any) => nextTick(() => emit('onRowDrag', dataSource.value, info))
const columnDragEnd = (_info: any) => {
  // 定义一个对象，用于存储dataIndex到顺序的映射关系，不建议使用Map，因为它不能直接转化为字符串
  const columnsOrder: { [key: string]: number } = {}
  // 在@column-drag-end事件中，并不会立刻更新table对应的column，需要在下一次更新中才能获取
  setTimeout(() => {
    updatedColumns.value.forEach((column, index) => {
      // 记录更新后的dataIndex与顺序的映射关系
      columnsOrder[(column as any).dataIndex] = index
    })
    if (tableId === undefined)
      throw new Error('请先为 surely table 设置 tableId 后在使用其表头拖拽功能')
    else
    localStorageMethods.setLocalStorage(tableId.value as string, JSON.stringify(columnsOrder))
  })
}

const getTableWidth = () => {
  if (_tableWidth.value === undefined) return AUTO
  return _tableWidth.value - 20
}
const getTableHeight = () => {
  if (_tableHeight.value === undefined) return AUTO
  return _tableHeight.value
}

initPagination()
updateColumns(updatedColumns, columns, tableId)

watch(() => props.tableWidth, value => value && (_tableWidth.value = value))
watch(() => props.tableHeight, value => value && (_tableHeight.value = value), { immediate: true })

</script>

<style scoped>
.table-title-cell {
  display: flex;
  font-weight: bold;
  flex-direction: column;
  justify-content: center;
}
:deep(.surely-table-header-cell){
  font-weight: bold;
}
:deep(.surely-table-body .surely-table-row-odd:not(.surely-table-row-selected):hover){
    background-color: #f5f7fa;
}
:deep(.surely-table-body .surely-table-row-even:not(.surely-table-row-selected):hover){
    background-color: #f5f7fa;
}
</style>
