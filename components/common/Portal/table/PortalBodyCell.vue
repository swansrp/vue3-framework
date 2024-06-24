<template>
  <template v-if="(column.dataIndex === 'index')">
    <div :style="{textAlign: 'center'}">{{ (index + 1) + config.pageSize * (config.currentPage - 1) }}</div>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.SWITCH">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'" class="modify-badge"
      placement="start">
      <a-switch
        v-model:checked="record[`${column.dataIndex}`]"
        checkedValue="1"
        disabled
        unCheckedValue="0" />
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.SELECT">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'" class="modify-badge"
      placement="start">
      {{ dict.getLabel(column.referenceDict, record[`${column.dataIndex}`]) }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATE">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'" class="modify-badge"
      placement="start">
      {{
        isNotEmpty(record[`${column.dataIndex}`]) ?
          dayjs(record[`${column.dataIndex}`]).format('YYYY-MM-DD')
          :
          ''
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATETIME">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'" class="modify-badge"
      placement="start">
      {{
        isNotEmpty(record[`${column.dataIndex}`]) ?
          dayjs(record[`${column.dataIndex}`]).format('YYYY-MM-DD HH:mm:ss')
          :
          ''
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.dataIndex === 'actionColumn'">
    <!-- (portalConfig: TableConfigType, column: ColumnType, record: any) -->
    <slot
      :column="column"
      :portal-config="config"
      :record="record"
      name="action">
    </slot>
  </template>
  <template v-else>
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'" class="modify-badge"
      placement="start">
      <div
        :style="{textAlign: column.contentAlign || 'left',
                 textOverflow: 'ellipsis',
                 whiteSpace: 'nowrap',
                 overflow: 'hidden',
                 height: '100%'}"
        v-html="strLF2HtmlLF(record[`${column.dataIndex}`])"></div>
    </a-badge-ribbon>
  </template>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import { isNotEmpty, strLF2HtmlLF } from '@/framework/utils/common'
import { FIELD_TYPE, TableConfigType } from '@/framework/components/common/portal/type'
import { dictStore } from '@/framework/store/common'

const prop = defineProps<{
  column: any,
  record: any,
  index: any,
  config: TableConfigType,
  isCellUpdate: (index: number, column: any) => boolean
}>()
const {record, config, column, index} = toRefs(prop)
const dict = dictStore()
</script>

<style lang="less" scoped>
:deep(.modify-badge) {
  height: 0;
  top: 0;

  .ant-ribbon-corner {
    border-color: currentColor transparent transparent currentColor !important;
  }

  .ant-ribbon-corner::after {
    color: rgba(0, 0, 0, 0);
  }
}
</style>
