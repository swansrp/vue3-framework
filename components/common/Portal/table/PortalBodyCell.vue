<template>
  <template v-if="(column.dataIndex === 'index')">
    <!-- (portalConfig: TableConfigType, column: ColumnType, record: any) -->
    <slot
      v-if="!displayIndex"
      :column="column"
      :portal-config="config"
      :record="record"
      name="index"
    />
    <div
      v-else
      :style="{textAlign: 'center'}"
    >
      {{ (index + 1) + config.pageSize * (config.currentPage - 1) }}
    </div>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.SWITCH">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      <a-switch
        v-model:checked="record[column.dataIndex]"
        checked-value="1"
        disabled
        un-checked-value="0"
      />
    </a-badge-ribbon>
  </template>
  <template
    v-else-if="column.fieldType === FIELD_TYPE.SELECT ||
      column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE"
  >
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{ dict.getLabel(column.referenceDict, record[column.dataIndex]) }}
    </a-badge-ribbon>
  </template>
  <template
    v-else-if="column.fieldType === FIELD_TYPE.TREE ||
      column.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE"
  >
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{ treeDict.getLabel(column.referenceDict, record[column.dataIndex]) }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATE">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{
        isNotEmpty(record[column.dataIndex]) ?
          dayjs(record[column.dataIndex]).format('YYYY-MM-DD')
          :
          ''
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.DATETIME">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{
        isNotEmpty(record[column.dataIndex]) ?
          dayjs(record[column.dataIndex]).format('YYYY-MM-DD HH:mm:ss')
          :
          ''
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.MONEY">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{
        formatMoney(record[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.PERCENT">
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      {{
        formatPercent(record[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
      }}
    </a-badge-ribbon>
  </template>
  <template v-else-if="column.fieldType === FIELD_TYPE.IMAGE">
    <multimedia
      v-model="record[column.dataIndex]"
      :height="column.referenceDict?.split(',')[1] || 120"
      :type="column.fieldType"
      :width="column.referenceDict?.split(',')[0] || 120"
      use-original-file-name
    />
  </template>
  <template
    v-else-if="column.fieldType === FIELD_TYPE.AUDIO || column.fieldType === FIELD_TYPE.VIDEO ||
      column.fieldType === FIELD_TYPE.FILE"
  >
    <multimedia
      v-model="record[column.dataIndex]"
      :height="35"
      :type="column.fieldType"
      :width="80"
    />
  </template>
  <template v-else-if="column.dataIndex === 'actionColumn'">
    <!-- (portalConfig: TableConfigType, column: ColumnType, record: any) -->
    <slot
      :column="column"
      :portal-config="config"
      :record="record"
      name="action"
    />
  </template>
  <template v-else>
    <a-badge-ribbon
      :color="isCellUpdate(index, column) ? 'red' : 'rgba(0,0,0,0)'"
      class="modify-badge"
      placement="start"
    >
      <div
        :style="{display: 'block',
                 textAlign: column.contentAlign || 'left',
                 textOverflow: 'ellipsis',
                 whiteSpace: 'nowrap',
                 overflow: 'hidden',
                 height: '100%'}"
        v-html="strLF2HtmlLF(displayMap.get(index+column.dataIndex).current || record[column.dataIndex])"
      />
    </a-badge-ribbon>
  </template>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'

import { FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { isNotEmpty, strLF2HtmlLF } from '@/framework/utils/common'
import { formatMoney, formatPercent } from '@/framework/utils/formatter'

const prop = defineProps<{
  column: any,
  record: any,
  displayMap: any,
  index: any,
  config: TableConfigType,
  isCellUpdate: (index: number, column: any) => boolean,
  displayIndex: boolean
}>()
const { record, displayMap, config, column, index, displayIndex } = toRefs(prop)
const dict = dictStore()
const treeDict = useTreeStore()
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
