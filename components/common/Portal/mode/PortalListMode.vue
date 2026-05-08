<template>
  <s-table
    :columns="[{
      rowDrag: config.orderMode && !config.readOnly,
      align: 'center',
      dataIndex: 'label'
    }]"
    :show-header="isNotEmpty(rowSelection)"
    :data-source="dataSource"
    :pagination="false"
    bordered
    :row-selection="rowSelection"
    :range-selection="isEmpty(rowSelection) ? 'single' : false"
    :custom-row="handleCustomRow"
    row-key="value"
    size="small"
    @row-drag-end="handleRowDragEnd"
  >
    <template #bodyCell="{ column, record}">
      <slot
        name="display"
        :record="record"
      >
        <a-dropdown :trigger="['contextmenu']">
          <div
            :style="{textAlign: column.contentAlign || 'left',
                     textOverflow: 'ellipsis',
                     whiteSpace: 'nowrap',
                     overflow: 'hidden',
                     height: '100%'}"
          >
            {{ record[`${column.dataIndex}`] }}
          </div>
          <template #overlay>
            <a-menu @click="({ key: menuKey }) => handleMenuContext(record.value, menuKey)">
              <a-menu-item key="1">
                查看详情
              </a-menu-item>
              <template v-if="!config.readOnly">
                <a-menu-item key="2">
                  新增记录
                </a-menu-item>
                <a-menu-item key="3">
                  编辑记录
                </a-menu-item>
                <a-menu-item key="4">
                  复制记录
                </a-menu-item>
                <a-menu-item key="5">
                  删除记录
                </a-menu-item>
              </template>
            </a-menu>
          </template>
        </a-dropdown>
      </slot>
    </template>
    <template #tooltipTitle="{ value }">
      {{ value }}
    </template>
    <template #title>
      <div style="display: flex; align-items: center">
        <lock-outlined
          v-if="searchStrict"
          style="margin-right: 5px"
          @click="searchStrict = !searchStrict"
        />
        <unlock-outlined
          v-else
          style="margin-right: 5px"
          @click="searchStrict = !searchStrict"
        />
        <a-input-search
          v-model:value="searchName"
          :placeholder="(searchStrict ? '' : '模糊') + '搜索 ' + (titleColumn.title || '')"
          enter-button
          @search="onListDataSearch"
        />
      </div>
    </template>
    <template #footer>
      <div class="pagination">
        <div>
          <slot name="footer-action"></slot>
        </div>
        <div style="display: flex;">
          <a-pagination
            v-model:current="config.currentPage"
            v-model:page-size="config.pageSize"
            :page-size="config.pageSize"
            :size="config.size"
            :total="config.total"
            hide-on-single-page
            show-less-items
            @change="paginationChange"
          >
            <template #itemRender="{ type, originalElement }">
              <a v-if="type === 'prev'">&lt;</a>
              <a v-else-if="type === 'next'">&gt;</a>
              <component
                :is="originalElement"
                v-else
              />
            </template>
          </a-pagination>
          <div>
            <slot name="end-action"></slot>
          </div>
        </div>
      </div>
    </template>
  </s-table>
</template>

<script lang="ts" setup>
import { LockOutlined, UnlockOutlined } from '@ant-design/icons-vue'

import { ColumnType, TableConfigType, UpdateOrderType } from '@/framework/components/common/Portal/type'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
const prop = defineProps<{
  config: TableConfigType,
  titleColumn: ColumnType,
  dataSource: Array<any>,
  paginationChange: Function,
  rowSelection: any,
  singleSelect?: boolean,
  rowAllowSelect?: (record: any) => boolean
}>()

const { dataSource, config, rowSelection, singleSelect } = toRefs(prop)
const emit = defineEmits<{
  /**
   * 根据名称查找数据
   * @param e
   * @param searchName 搜索
   * @param searchStrict 精确/模糊查找
   */
  (e: 'search', searchName: string, searchStrict: boolean): void
  (e: 'rowDragEnd', data: Array<UpdateOrderType>): void
  (e: 'handleMenuContextView', recordId: any): void
  (e: 'handleMenuContextAdd', recordId: any): void
  (e: 'handleMenuContextModify', recordId: any): void
  (e: 'handleMenuContextCopy', recordId: any): void
  (e: 'handleMenuContextDelete', recordId: any): void
}>()
const searchName = ref('')
const searchStrict = ref(false)
const onListDataSearch = () => {
  emit('search', searchName.value, searchStrict.value)
}
const handleMenuContext = (recordId: any, menuKey: string) => {
  switch (menuKey) {
    case '1':
      emit('handleMenuContextView', recordId)
      break
    case '2':
      emit('handleMenuContextAdd', recordId)
      break
    case '3':
      emit('handleMenuContextModify', recordId)
      break
    case '4':
      emit('handleMenuContextCopy', recordId)
      break
    case '5':
      emit('handleMenuContextDelete', recordId)
      break
    default:
      break
  }
}
const handleRowDragEnd = () => {
  nextTick(() => {
    let updateOrderData: any = []
    dataSource.value.forEach((node: any, index: number) => {
      updateOrderData.push({
        id: node.value,
        showOrder: (index + 1) + config.value.pageSize * (config.value.currentPage - 1)
      })
    })
    emit('rowDragEnd', updateOrderData)
  })
}

// 处理行点击事件
const handleCustomRow = (record: any) => {
  return {
    onClick: (event: MouseEvent) => {
      // 如果没有 rowSelection，说明禁用了行选择
      if (!rowSelection.value) {
        return
      }
      // 如果 rowAllowSelect 返回 false，则不允许选中
      if (prop.rowAllowSelect && !prop.rowAllowSelect(record)) {
        return
      }
      
      // 如果点击的是输入框、按钮等交互元素，不处理行选中
      const target = event.target as HTMLElement
      const tagName = target?.tagName?.toLowerCase()
      const isInteractiveElement = ['input', 'button', 'a', 'select', 'textarea'].includes(tagName || '')
      const hasEditableParent = target?.closest('.surely-table-cell-edit-wrapper')
      
      if (isInteractiveElement || hasEditableParent) {
        return
      }
      
      const rowKey = record.value
      const currentKeys = [...(rowSelection.value.selectedRowKeys || [])]
      
      if (singleSelect?.value) {
        // 单选模式：如果已选中则取消选中，否则选中当前行
        if (currentKeys.includes(rowKey)) {
          rowSelection.value.onChange([])
        } else {
          rowSelection.value.onChange([rowKey])
        }
      } else {
        // 多选模式：切换选中状态
        const index = currentKeys.indexOf(rowKey)
        if (index > -1) {
          // 已选中，则取消选中
          currentKeys.splice(index, 1)
        } else {
          // 未选中，则添加到选中列表
          currentKeys.push(rowKey)
        }
        rowSelection.value.onChange(currentKeys)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
