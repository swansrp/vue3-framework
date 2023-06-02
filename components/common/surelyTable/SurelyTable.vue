<template>
  <s-table
    stripe
    bordered
    summary-fixed
    v-if="updatedColumns.length"
    v-model:pagination="pagination"
    :columns="updatedColumns"
    :data-source="dataSource"
    :rowClassName="rowClassName"
    :scroll="{x: getTableWidth(), y: getTableHeight()}"
    :style="{width: String(tableWidth) === 'auto' ? '100%' : tableWidth + 'px'}"
    @row-drag-end="rowDragEnd"
    @expanded-rows-change="expandedRowsChange"
    @column-drag-end="columnDragEnd">
    <template v-if="needTitle" #title>
      <slot name="title"></slot>
    </template>
    <template #headerCell="{title}">
      <span v-if="title.indexOf('/') === -1">{{ title }}</span>
      <div v-else class="table-title-cell">
        <div v-for="(item, index) in title.split('/')" :key="index">{{ item }}</div>
      </div>
    </template>
    <template v-if="needExpandedRowRender" #expandedRowRender="{ record }">
      <slot :record="record" name="expandedRowRender"></slot>
    </template>
    <template v-if="summaryList" #summary>
      <s-table-summary-row>
        <s-table-summary-cell v-for="(item, index) in summaryList" :key="index" :index="index">
          <template v-if="item || item === 0">{{ item }}</template>
          <template v-else></template>
        </s-table-summary-cell>
      </s-table-summary-row>
    </template>
    <template #bodyCell="{column, record}">
      <slot :column="column" :record="record" name="bodyCell"></slot>
    </template>
  </s-table>
</template>

<script lang="ts" setup>
import {AUTO} from "@/framework/utils/constant"
import {localStorageMethods} from '@/framework/utils/common'
import {updateColumns} from '@/framework/hooks/updateSurelyTableColumns'
import {STable, STablePaginationConfig, STableSummaryCell, STableSummaryRow} from '@surely-vue/table'
import {Ref} from "vue"

const props = defineProps<{
  tableId: string,
  columns: any,
  dataSource: Array<object>,
  tableHeight?: number,
  tableWidth?: number,
  summaryList?: Array<any> | undefined,
  pagination?: object | boolean
  rowClassName?: string
}>()

const slots = useSlots();
let needTitle = ref(slots['title'])
let needExpandedRowRender = ref(slots['expandedRowRender'])
const emit = defineEmits(['onRowDrag', 'pageChange', 'expandedRowsChange'])

let updatedColumns:Ref<any[]> = ref([])
let tableHeight = ref<number | undefined>()
let tableWidth = ref<number | undefined>()
let pagination = ref(props.pagination)
let {tableId, columns, dataSource, rowClassName} = toRefs(props)

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
    localStorageMethods.setLocalStorage(tableId.value, JSON.stringify(columnsOrder))
  })
}
const getTableWidth = () => {
  if (tableWidth.value === undefined) return AUTO
  return tableWidth.value - 20
}
const getTableHeight = () => {
  if (tableHeight.value === undefined) return AUTO
  return tableHeight.value
}

initPagination()
updateColumns(updatedColumns, columns, tableId)

watch(() => props.tableWidth, value => value && (tableWidth.value = value))
watch(() => props.tableHeight, value => value && (tableHeight.value = value), {immediate: true})

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
    background-color: #e0e0e0;
}
:deep(.surely-table.surely-table-stripe .surely-table-body .surely-table-row-odd:not(.surely-table-row-selected)){
    background-color: #e0e0e0;
}

</style>
