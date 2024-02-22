<template>
  <ul class="popup">
    <li
      v-if="!config.readOnly && args.column.editable && isCellUpdate(args.recordIndexs[0], args.column)"
      class="popup-item"
      @click="() => emit('resetCell', args)">
      <history-outlined />
      撤销修改
    </li>
    <li
      v-if="!config.readOnly && args.column.editable && isCellUpdate(args.recordIndexs[0], args.column)"
      class="popup-item"
      @click="() => emit('saveCell', args)">
      <save-outlined />
      保存单元格
    </li>
    <li
      v-if="!config.readOnly && isRowUpdate(args.recordIndexs[0])"
      class="popup-item"
      @click="() => emit('saveRow', args)">
      <delivered-procedure-outlined />
      保存整行
    </li>
    <li
      v-if="!isRowUpdate(args.recordIndexs[0])"
      class="popup-item"
      @click="() => emit('detailRow', args)">
      <search-outlined />
      查看详情
    </li>
    <li
      v-if="rowAllowEdit(args)"
      class="popup-item"
      @click="() => emit('editRow', args)">
      <form-outlined />
      编辑记录
    </li>
    <li
      v-if="rowAllowDelete(args)"
      class="popup-item"
      @click="() => emit('deleteRow', args)">
      <delete-outlined />
      删除记录
    </li>
  </ul>
</template>

<script lang="ts" setup>
import {
  DeleteOutlined,
  DeliveredProcedureOutlined,
  FormOutlined,
  HistoryOutlined,
  SaveOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import {TableConfigType} from '@/framework/components/common/portal/type'
const prop = defineProps<{
  args: any
  config: TableConfigType
}>()
const emit = defineEmits<{
  (e: 'resetCell', args: any): void
  (e: 'saveCell', args: any): void
  (e: 'saveRow', args: any): void
  (e: 'detailRow', args: any): void
  (e: 'editRow', args: any): void
  (e: 'deleteRow', args: any): void
  (e: 'isCellUpdate', index: number, column: any, result: { updated: boolean }): void
  (e: 'isRowUpdate', args: any, result: { updated: boolean }): void
  (e: 'rowAllowEdit', args: any, result: { updated: boolean }): void
  (e: 'rowAllowDelete', args: any, result: { updated: boolean }): void
}>()
const {args, config} = toRefs(prop)
const isCellUpdate = (index: number, column: any) => {
  let result = {updated: false}
  emit('isCellUpdate', index, column, result)
  return result.updated
}
const isRowUpdate = (args: any) => {
  let result = {updated: false}
  emit('isRowUpdate', args, result)
  return result.updated
}
const rowAllowEdit = (args: any) => {
  let result = {updated: false}
  emit('rowAllowEdit', args, result)
  return result.updated
}
const rowAllowDelete = (args: any) => {
  let result = {updated: false}
  emit('rowAllowDelete', args, result)
  return result.updated
}
</script>

<style lang="less" scoped>
.popup {
  width: 120px;
  height: 20px;

  .popup-item {
    cursor: pointer;
    padding: 8px;

    &:hover {
      background-color: var(--surely-table-row-hover-bg);
    }

    &.disabled {
      color: var(--surely-table-disabled-color);
      cursor: not-allowed;
    }
  }
}
</style>
