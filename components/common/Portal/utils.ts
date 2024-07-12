import { ColumnType, FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { dictStore } from '@/framework/store/common'
import { isNotEmpty } from '@/framework/utils/common'
import dayjs from 'dayjs'
import { formatMoney, formatPercent } from '@/framework/utils/formatter'

const dict = dictStore()
export const parse = (records: any, columnArray: Array<ColumnType>, config: any) => {
  let index = 0;
  records.forEach((record: { [key: string]: any }) => {
    record.index = (index++ + 1) + config.pageSize * (config.currentPage - 1)
    columnArray.forEach((column: any) => {
      if (column.fieldType === FIELD_TYPE.SELECT || column.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) {
        record[column.dataIndex] = dict.getLabel(column.referenceDict, record[column.dataIndex])
      } else if (column.fieldType === FIELD_TYPE.DATE) {
        record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD') : ''
      } else if (column.fieldType === FIELD_TYPE.DATETIME) {
        record[column.dataIndex] = isNotEmpty(record[column.dataIndex]) ? dayjs(record[column.dataIndex]).format('YYYY-MM-DD HH:mm:ss') : ''
      } else if (column.fieldType === FIELD_TYPE.MONEY) {
        record[column.dataIndex] = formatMoney(record[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
      } else if (column.fieldType === FIELD_TYPE.PERCENT) {
        record[column.dataIndex] = formatPercent(record[column.dataIndex], column.referenceDict?.split(',')[0], column.referenceDict?.split(',')[1])
      }
      if (column.fieldType !== FIELD_TYPE.TEXT_AREA) {
        column.width = column.width > getTextWidth(record[column.dataIndex]) ? column.width : getTextWidth(record[column.dataIndex])
      }
    })
  })
  return records
}

export const getTextWidth = (text: string) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d') as any
  return context.measureText(text).width * 1.7
}