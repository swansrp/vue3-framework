<template>
  <s-table-summary-row v-if="config.summary && (!config.plain || !isEmpty(dataSummary))">
    <s-table-summary-cell
      v-for="index of columns.length"
      :key="index"
      :index="index"
    >
      <div v-if="index === (isExpanded ? 2 : 1)">
        总计
      </div>
      <div v-else-if="index === columns.length + (hideRowSelection ? 0 : 1)"></div>
      <!-- 汇总单元格插槽: 按列 dataIndex 命名(同 bodyCell 范式), 默认保持原渲染 -->
      <slot
        v-else
        :name="'summaryCell_' + colAt(index).dataIndex"
        :column="colAt(index)"
        :value="summaryText(colAt(index))"
      >
        <div
          v-if="colAt(index).fieldType === FIELD_TYPE.NUMBER"
          :style="{textAlign: 'center'}"
        >
          {{ summaryText(colAt(index)) }}
        </div>
        <div
          v-else-if="colAt(index).fieldType === FIELD_TYPE.MONEY"
          :style="{textAlign: 'center'}"
        >
          {{
            isEmpty(dataSummary) ? '--' : formatMoney(dataSummary![colAt(index).dataIndex], Number(colAt(index).referenceDict?.split(',')[0]), Number(colAt(index).referenceDict?.split(',')[1]))
          }}
        </div>
        <div
          v-else
          :style="{textAlign: 'center'}"
        >
          {{ summaryText(colAt(index)) }}
        </div>
      </slot>
    </s-table-summary-cell>
  </s-table-summary-row>
</template>

<script lang="ts" setup>
import { formatMoney } from '../../../../utils/formatter'

import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { isEmpty } from '@/framework/utils/common'

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
const { config, columns, dataSummary, isExpanded, hideRowSelection } = toRefs(props)

/** 汇总单元格对应列(偏移同原模板: 行选择列/展开列) */
const colAt = (index: number): ColumnType =>
  columns.value[index - (hideRowSelection.value ? 0 : 1) - (isExpanded.value ? 1 : 0)]

/** NUMBER 及其他列类型的汇总值文本(空为 '--') */
const summaryText = (col: ColumnType): any =>
  isEmpty(dataSummary.value) ? '--' : (dataSummary.value![col.dataIndex!] || '--')
onMounted(() => {})
</script>

<style lang="less" scoped></style>