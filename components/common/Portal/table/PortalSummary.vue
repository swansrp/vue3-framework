<template>
  <s-table-summary-row v-if="config.summary && (!config.plain || !isEmpty(dataSummary))">
    <s-table-summary-cell
      v-for="(column, colIdx) in leafColumns"
      :key="cellIndex(colIdx)"
      :index="cellIndex(colIdx)"
    >
      <!-- "总计"标签格(它不参与汇总), 默认落首个数据列, 可经 labelDataIndex 指到指定列(透视竖排=透视值名目列) -->
      <div
        v-if="colIdx === labelCellIdx"
        :style="{textAlign: 'center'}"
      >
        总计
      </div>
      <!-- 汇总单元格插槽: 按列 dataIndex 命名(同 bodyCell 范式), 默认保持原渲染 -->
      <slot
        v-else
        :name="'summaryCell_' + column.dataIndex"
        :column="column"
        :value="summaryText(column)"
      >
        <div
          v-if="column.fieldType === FIELD_TYPE.NUMBER"
          :style="{textAlign: 'center'}"
        >
          {{ summaryText(column) }}
        </div>
        <div
          v-else-if="column.fieldType === FIELD_TYPE.MONEY"
          :style="{textAlign: 'center'}"
        >
          {{ moneyText(column) }}
        </div>
        <div
          v-else
          :style="{textAlign: 'center'}"
        >
          {{ summaryText(column) }}
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
    labelDataIndex?: string
  }>(),
  {}
)
const { config, columns, dataSummary, isExpanded, hideRowSelection, labelDataIndex } = toRefs(props)

/**
 * surely-table 的 summary cell index 是「全列表(含行选择列/展开列)的 0 基下标」,
 * 单元格的宽度与横向位置都由它决定, 所以必须从首个数据列的下标起排, 不能固定从 1 开始:
 * 隐藏行选择列时(透视表等)前导列为 0, 从 1 开始会让"总计"吃掉第一个数据列的格子,
 * 整行汇总值左移一列、末列汇总被挤掉。
 */
const leadOffset = computed(() => (hideRowSelection.value ? 0 : 1) + (isExpanded.value ? 1 : 0))

/** 第 colIdx 个数据列对应的 summary cell index */
const cellIndex = (colIdx: number): number => leadOffset.value + colIdx

/**
 * 多级表头: 递归拍平取叶子列再对齐汇总格
 * surely-table 的汇总格下标按可见叶子列排, 传入含 children 的分组壳列会让整行错位/少格
 */
const leafColumns = computed<Array<ColumnType>>(() => {
  const res: Array<ColumnType> = []
  const walk = (cols: Array<ColumnType>) => {
    for (const col of cols || []) {
      if (col.children && col.children.length) {
        walk(col.children)
      } else {
        res.push(col)
      }
    }
  }
  walk(columns.value)
  return res
})

/**
 * "总计"标签落点: labelDataIndex 指到的叶子列, 没配或找不到时回落首个数据列。
 * 指到的列必须真的在 leafColumns 里(竖排布局无真实透视列时不渲染名目列, 此时标签回首个叶子列兜底)。
 */
const labelCellIdx = computed(() => {
  const target = labelDataIndex.value
  if (target) {
    const idx = leafColumns.value.findIndex((col) => col.dataIndex === target)
    if (idx >= 0) {
      return idx
    }
  }
  return 0
})

/**
 * 取该列的汇总原值；没有该键、或值为 null/undefined/空串 才算"无汇总值"。
 * 🔴 不能写成 dataSummary[col.dataIndex] || '--'：合计真的是 0 时（数字 0 与前导零串都是 falsy）
 * 会被吞成 '--'，把"确实合计为 0"显示成"没有合计"。
 */
const summaryValue = (col: ColumnType): any => {
  if (isEmpty(dataSummary.value)) {
    return undefined
  }
  const value = dataSummary.value![col.dataIndex!]
  return value === null || value === undefined || value === '' ? undefined : value
}

/** NUMBER 及其他列类型的汇总值文本(无汇总值才 '--') */
const summaryText = (col: ColumnType): any => {
  const value = summaryValue(col)
  return value === undefined ? '--' : value
}

/** MONEY 列汇总文本：无汇总值给 '--'，有值(含 0)按列配置的小数位与除数格式化 */
const moneyText = (col: ColumnType): string => {
  const value = summaryValue(col)
  if (value === undefined) {
    return '--'
  }
  return formatMoney(value, Number(col.referenceDict?.split(',')[0]), Number(col.referenceDict?.split(',')[1]))
}
onMounted(() => {})
</script>

<style lang="less" scoped></style>