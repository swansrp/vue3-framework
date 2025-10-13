<template>
  <a-menu v-if="isNotEmpty(args.column)">
    <template v-if="isNotEmpty(args.recordIndexs)">
      <a-menu-item
        v-if="!config.readOnly && args.column.editable && prop.isCellUpdate(args.recordIndexs[0], args.column)"
        key="reset"
        @click="() => emit('resetCell', args)"
      >
        <history-outlined />
        撤销修改
      </a-menu-item>
      <a-menu-item
        v-if="!config.readOnly && args.column.editable && prop.isCellUpdate(args.recordIndexs[0], args.column)"
        key="saveCell"
        @click="() => emit('saveCell', args)"
      >
        <save-outlined />
        保存单元格
      </a-menu-item>
      <a-menu-item
        v-if="!config.readOnly && prop.isRowUpdate(args.recordIndexs[0])"
        key="saveRow"
        @click="() => emit('saveRow', args)"
      >
        <delivered-procedure-outlined />
        保存整行
      </a-menu-item>
      <a-menu-item
        v-if="!prop.isRowUpdate(args.recordIndexs[0])"
        key="detail"
        @click="() => emit('detailRow', args)"
      >
        <eye-outlined />
        查看详情
      </a-menu-item>
    </template>
    <a-menu-item
      v-if="association"
      key="association"
      @click="() => emit('association', args)"
    >
      <deployment-unit-outlined />
      关联信息
    </a-menu-item>
    <template v-if="!config.readOnly">
      <a-menu-divider v-if="isNotEmpty(args.recordIndexs) || association" />
      <a-menu-item
        v-if="prop.rowAllowEdit(args) && config.editModalAble"
        key="edit"
        @click="() => emit('editRow', args)"
      >
        <edit-outlined />
        编辑记录
      </a-menu-item>
      <a-menu-item
        v-if="config.addModalAble"
        key="copy"
        @click="() => emit('copyRow', args)"
      >
        <copy-outlined />
        复制记录
      </a-menu-item>
      <a-menu-divider v-if="prop.rowAllowDelete(args) && config.deleteAble" />
      <a-menu-item
        v-if="prop.rowAllowDelete(args) && config.deleteAble"
        key="delete"
        danger
        @click="() => emit('deleteRow', args)"
      >
        <delete-outlined />
        删除记录
      </a-menu-item>
    </template>
  </a-menu>
</template>

<script lang="ts" setup>
import {
  CopyOutlined,
  DeleteOutlined,
  DeliveredProcedureOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'

import { TableConfigType } from '@/framework/components/common/Portal/type'
import { isNotEmpty } from '@/framework/utils/common'

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
  (e: 'copyRow', args: any): void
  (e: 'editRow', args: any): void
  (e: 'deleteRow', args: any): void
  (e: 'association', args: any): void
}>()
const { args, config, association } = toRefs(prop)
</script>

<style lang="less" scoped>
:deep(.ant-menu) {
  padding: 4px 0;
  min-width: 160px;
}

:deep(.ant-menu-item) {
  height: 30px;
  line-height: 30px;
  padding: 0 16px;
  margin: 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
  
  .anticon {
    font-size: 14px;
    margin-right: 8px;
    flex-shrink: 0;
  }
}

:deep(.ant-menu-item-divider) {
  margin: 4px 0;
}
</style>
