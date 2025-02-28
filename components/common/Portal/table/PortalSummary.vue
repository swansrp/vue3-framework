<template>
  <s-table-summary-row v-if="config.summary && !config.plain">
    <s-table-summary-cell v-for="index of columns.length" :key="index" :index="index">
      <div v-if="index === (1 + isExpanded ? 1 : 0)">总计</div>
      <div v-else-if="index === columns.length + (hideRowSelection ? 0 : 1)"></div>
      <div
        v-else-if="columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].fieldType === FIELD_TYPE.NUMBER"
        :style="{textAlign: 'center'}">
        {{
          _.$isEmpty(dataSummary) ? '--' : (dataSummary[columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].dataIndex] || '--')
        }}
      </div>
      <div
        v-else-if="columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].fieldType === FIELD_TYPE.MONEY"
        :style="{textAlign: 'center'}">
        {{
          _.$isEmpty(dataSummary) ? '--' : (formatMoney(dataSummary[columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].dataIndex], Number(columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].referenceDict?.split(',')[0]), Number(columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].referenceDict?.split(',')[1])))
        }}
      </div>
      <div v-else :style="{textAlign: 'center'}"> {{
        _.$isEmpty(dataSummary) ? '--' : (dataSummary[columns[index - (hideRowSelection ? 0 : 1) - (isExpanded ? 1 : 0)].dataIndex] || '--')
      }}
      </div>
    </s-table-summary-cell>
  </s-table-summary-row>
</template>

<script lang="ts" setup>
import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { formatMoney } from '../../../../utils/formatter'
const _ = getInstance()
const props = withDefaults(
  defineProps<{
    config: TableConfigType
    columns: Array<ColumnType>,
    dataSummary: { [key: string]: any } | null,
    isExpanded: boolean
    hideRowSelection: boolean
  }>(),
  {}
)
const {config, columns, dataSummary, isExpanded, hideRowSelection} = toRefs(props)
onMounted(() => {})
</script>

<style lang="less" scoped></style>