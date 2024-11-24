<template>
  <ul v-if="isNotEmpty(args.column)" class="popup">
    <template v-if="isNotEmpty(args.recordIndexs)">
      <li
        v-if="!config.readOnly && args.column.editable && prop.isCellUpdate(args.recordIndexs[0], args.column)"
        class="popup-item"
        @click="() => emit('resetCell', args)">
        <history-outlined />
        撤销修改
      </li>
      <li
        v-if="!config.readOnly && args.column.editable && prop.isCellUpdate(args.recordIndexs[0], args.column)"
        class="popup-item"
        @click="() => emit('saveCell', args)">
        <save-outlined />
        保存单元格
      </li>
      <li
        v-if="!config.readOnly && prop.isRowUpdate(args.recordIndexs[0])"
        class="popup-item"
        @click="() => emit('saveRow', args)">
        <delivered-procedure-outlined />
        保存整行
      </li>
      <li
        v-if="!prop.isRowUpdate(args.recordIndexs[0])"
        class="popup-item"
        @click="() => emit('detailRow', args)">
        <search-outlined />
        查看详情
      </li>
    </template>
    <li
      v-if="association"
      class="popup-item"
      @click="() => emit('association', args)">
      <deployment-unit-outlined />
      关联信息
    </li>
    <li
      v-if="prop.rowAllowEdit(args)"
      class="popup-item"
      @click="() => emit('editRow', args)">
      <form-outlined />
      编辑记录
    </li>
    <li
      v-if="prop.rowAllowDelete(args)"
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
  DeploymentUnitOutlined,
  FormOutlined,
  HistoryOutlined,
  SaveOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { TableConfigType } from '@/framework/components/common/Portal/type'
import { isNotEmpty } from "@/framework/utils/common";

const prop = defineProps<{
  args: any
  config: TableConfigType
  isCellUpdate: (index: number, column: any) => boolean
  isRowUpdate: (args: any) => boolean
  rowAllowEdit: (args: any) => boolean
  rowAllowDelete: (args: any) => boolean
  association?: boolean
}>()
const emit = defineEmits<{
  (e: 'resetCell', args: any): void
  (e: 'saveCell', args: any): void
  (e: 'saveRow', args: any): void
  (e: 'detailRow', args: any): void
  (e: 'editRow', args: any): void
  (e: 'deleteRow', args: any): void
  (e: 'association', args: any): void
}>()
const {args, config, association} = toRefs(prop)
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
