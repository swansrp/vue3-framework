<template>
  <s-table-summary-row v-if="config.summary && !config.plain">
    <s-table-summary-cell v-for="index of columns.length" :key="index" :index="index">
      <div v-if="index === 1">总计</div>
      <div v-else-if="index === columns.length"></div>
      <div v-else-if="columns[index - 1].fieldType === FIELD_TYPE.NUMBER" :style="{textAlign: 'center'}">
        {{
          dataSummary[columns[index - 1].dataIndex] || '--'
        }}
      </div>
      <div v-else-if="columns[index - 1].fieldType === FIELD_TYPE.MONEY" :style="{textAlign: 'center'}">
        {{
          formatMoney(dataSummary[columns[index - 1].dataIndex], Number(columns[index - 1].referenceDict?.split(',')[0]), Number(columns[index - 1].referenceDict?.split(',')[1]))
        }}
      </div>
      <div v-else :style="{textAlign: 'center'}"> {{
        dataSummary[columns[index - 1].dataIndex] || '--'
      }}
      </div>
    </s-table-summary-cell>
  </s-table-summary-row>
</template>

<script lang="ts" setup>
import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { formatMoney } from '../../../../utils/formatter'

const props = withDefaults(
  defineProps<{
    config: TableConfigType
    columns: Array<ColumnType>,
    dataSummary: { [key: string]: any }
  }>(),
  {}
)
const emit = defineEmits<{}>()
onMounted(() => {
})
</script>

<style lang="less" scoped></style>