import { ColumnType, FIELD_TYPE, TableConfigType } from '@/framework/components/common/Portal/type'
import { dictStore } from '@/framework/store/common'
import { isNotEmpty } from '@/framework/utils/common'
import dayjs from 'dayjs'
import { formatMoney, formatPercent } from '@/framework/utils/formatter'

const dict = dictStore()
export const parse = (record: any, index: number, column: ColumnType, config: TableConfigType) => {
  record.index = (index + 1) + config.pageSize * (config.currentPage - 1)
  if (column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) {
    record[column.dataIndex] = dict.getLabel(column.referenceDict, record[column.dataIndex])
  } else if (column.fieldType === FIELD_TYPE.DATE) {
    record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD') : ''
  } else if (column.fieldType === FIELD_TYPE.DATETIME) {
    record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD HH:mm:ss') : ''
  } else if (column.fieldType === FIELD_TYPE.MONEY) {
    record[column.dataIndex] = formatMoney(record[column.dataIndex], Number(column.referenceDict?.split(',')[0]), Number(column.referenceDict?.split(',')[1]))
  } else if (column.fieldType === FIELD_TYPE.PERCENT) {
    record[column.dataIndex] = formatPercent(record[column.dataIndex], Number(column.referenceDict?.split(',')[0]), Number(column.referenceDict?.split(',')[1]))
  }
  if (column.fieldType !== FIELD_TYPE.TEXT_AREA && column.width !== 0) {
    column.width = column.width > getTextWidth(record[column.dataIndex]) ? column.width : getTextWidth(record[column.dataIndex])
  }
}

export const getTextWidth = (text: string) => {

  const textArray = text?.toString().split(/\n|\\n/g) || []
  let maxWidth = 0
  textArray.forEach((item) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d') as any
    let width
    if (item.length > 25) {
      width = context.measureText(item.substring(0, 14)).width * 1.6
    } else {
      width = context.measureText(item.substring(0, 25)).width * 1.6
    }
    maxWidth = maxWidth > width ? maxWidth : width
  })
  return maxWidth
}