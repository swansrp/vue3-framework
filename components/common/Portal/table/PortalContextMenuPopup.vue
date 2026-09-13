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
        v-if="config.detailAble !== false && !prop.isRowUpdate(args.recordIndexs[0])"
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
/** surely-table 右键菜单: 只要有可见菜单项才展示; 全被禁用(只读页/无详情/无可编辑)时
 *  emit('hide') 通知父层调 hidePopup() 收起弹层, 避免右键弹空白框。 */
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
import { isEmpty, isNotEmpty } from '@/framework/utils/common'

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
  (e: 'hide'): void
}>()
const { args, config, association } = toRefs(prop)

/** 与模板 v-if 严格一致: 是否至少有一个可见菜单项 */
const hasAnyItem = computed(() => {
  if (isEmpty(args.value.column)) return false
  const a = args.value
  const cfg = config.value
  const hasRowItems = isNotEmpty(a.recordIndexs) && (
    (!cfg.readOnly && a.column.editable && prop.isCellUpdate(a.recordIndexs[0], a.column)) ||
    (!cfg.readOnly && prop.isRowUpdate(a.recordIndexs[0])) ||
    (cfg.detailAble !== false && !prop.isRowUpdate(a.recordIndexs[0]))
  )
  const hasEditItems = !cfg.readOnly && (
    (prop.rowAllowEdit(a) && cfg.editModalAble) ||
    cfg.addModalAble ||
    (prop.rowAllowDelete(a) && cfg.deleteAble)
  )
  return !!association.value || !!hasRowItems || !!hasEditItems
})
// 无可见菜单项时立即收起 surely 弹层(右键交还浏览器默认菜单)
watchEffect(() => {
  if (!hasAnyItem.value) emit('hide')
})
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
