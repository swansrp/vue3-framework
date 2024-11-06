import XLSX from "xlsx-js-style"
import dayjs from 'dayjs'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { getTextWidth } from '@/framework/components/common/Portal/utils'
import { isNotEmpty, strRemoveLF } from '@/framework/utils/common'

/**
 * @param dataSource    使用 ant table 组件时的 data-source 数据
 * @param columns       使用 ant table 组件时的 columns 数据
 * @param fileName      excel导出时的文件名
 */
export const excelExport = (dataSource: any, columns: any, rawColumns: any, fileName: string) => {
  const columnHeight = _columnHeight(columns)
  const columnWidth = _columnWidth(columns)
  const header = [] as Array<any>
  for (let rowNum = 0; rowNum < columnHeight; rowNum++) {
    header[rowNum] = []
    for (let colNum = 0; colNum < columnWidth; colNum++) {
      header[rowNum][colNum] = ''
    }
  }
  let offset = 0
  const mergeRecord = [] as any
  for (const item of columns) {
    generateExcelColumn(header, 0, offset, item, mergeRecord)
    offset += _treeWidth(item)
  }
  header.push(...jsonDataToArray(columns, dataSource))
  // 列宽
  const columnWidthArray = [] as Array<any>
  rawColumns.forEach((col: any) => {
    const textWidth = getTextWidth(col.title)
    const wpx = textWidth < col.width ? textWidth : col.width
    columnWidthArray.push({wpx})
  })
  const ws = aoa_to_sheet(header, columnHeight, rawColumns, columnWidthArray)
  // 列宽
  ws['!cols'] = [...columnWidthArray]
  console.log(ws['!cols'])
  ws['!merges'] = mergeRecord
  // 头部冻结
  ws["!freeze"] = {
    xSplit: "1",
    ySplit: "" + columnHeight,
    topLeftCell: "B" + (columnHeight + 1),
    activePane: "bottomRight",
    state: "frozen"
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "sheet1")
  XLSX.writeFile(wb, fileName + '-' + dayjs().format('YYYYMMDDHHmmss') + ".xlsx")
}
const aoa_to_sheet = (data: any, headerRows: any, columns: any, columnWidthArray: Array<any>) => {
  const ws = {}
  const range = {s: {c: 10000000, r: 10000000}, e: {c: 0, r: 0}}
  // 遍历步骤1里面的二维数组数据
  for (let R = 0; R !== data.length; ++R) {
    for (let C = 0; C !== data[R].length; ++C) {
      if (range.s.r > R) {
        range.s.r = R
      }
      if (range.s.c > C) {
        range.s.c = C
      }
      if (range.e.r < R) {
        range.e.r = R
      }
      if (range.e.c < C) {
        range.e.c = C
      }
      /// 构造cell对象，对所有excel单元格使用如下样式
      let cell
      // console.log(data[R][C], C, columns[C])
      if (typeof data[R][C] === "object") { // 此处预留了自定义设置样式的功能，通过重写recursiveChildrenData方法，可为每一个单元格传入样式属性
        cell = data[R][C]
      } else {
        cell = {
          v: data[R][C],
          s: {
            font: {name: "宋体", sz: 11, color: {auto: 1}},
            // 单元格对齐方式
            alignment: {
              /// 自动换行
              wrapText: 1,
              // 水平居中
              horizontal: "center",
              // 垂直居中
              vertical: "center"
            }
          }
        }
      }
      // 头部列表加边框
      if (R < headerRows) {
        cell.s.border = {
          top: {style: 'thin', color: {rgb: "000000"}},
          left: {style: 'thin', color: {rgb: "000000"}},
          bottom: {style: 'thin', color: {rgb: "000000"}},
          right: {style: 'thin', color: {rgb: "000000"}}
        }
        // 给个背景色
        cell.s.fill = {
          patternType: 'solid',
          fgColor: {theme: 3, "tint": 0.3999755851924192, rgb: 'DDD9C4'},
          bgColor: {theme: 7, "tint": 0.3999755851924192, rgb: '8064A2'}
        }
      }
      const cell_ref = XLSX.utils.encode_cell({c: C, r: R})
      // 该单元格的数据类型，只判断了数值类型、布尔类型，字符串类型，省略了其他类型
      // 自己可以翻文档加其他类型
      if (isNotEmpty(cell)) {
        if (typeof cell.v === 'number') {
          cell.t = 'n'
        } else if (typeof cell.v === 'boolean') {
          cell.t = 'b'
        } else {
          cell.t = 's'
        }

        if (columns[C].fieldType === FIELD_TYPE.MONEY) {
          //将有千分位的数据去掉千分位
          cell.v = cell.v.replace(/,/g, "")
          const value = parseFloat(cell.v)
          if (!isNaN(value)) {
            cell.t = 'n'
            cell.z = '#,##0.00'
          }
        }
        ws[cell_ref] = cell
        columnWidthArray[C].wpx = Math.max(columnWidthArray[C].wpx, getTextWidth(cell.v))
      }
    }
  }
  if (range.s.c < 10000000) {
    ws['!ref'] = XLSX.utils.encode_range(range)
  }
  return ws
}
const generateExcelColumn = (columnTable: any, rowOffset: any, colOffset: any, columnDefine: any, mergeRecord: any) => {
  const columnWidth = _treeWidth(columnDefine)
  columnTable[rowOffset][colOffset] = strRemoveLF(columnDefine.title)
  if (columnDefine.children) {
    mergeRecord.push({s: {r: rowOffset, c: colOffset}, e: {r: rowOffset, c: colOffset + columnWidth - 1}})
    let tempOffSet = colOffset
    for (const child of columnDefine.children) {
      generateExcelColumn(columnTable, rowOffset + 1, tempOffSet, child, mergeRecord)
      tempOffSet += _treeWidth(child)
    }
  } else {
    if (rowOffset !== columnTable.length - 1)
      mergeRecord.push({s: {r: rowOffset, c: colOffset}, e: {r: columnTable.length - 1, c: colOffset}})
  }
}
const _columnHeight = (column: any) => {
  let height = 0
  for (const item of column) {
    height = Math.max(_treeHeight(item), height)
  }
  return height
}
const _columnWidth = (column: any) => {
  let width = 0
  for (const item of column) {
    width += _treeWidth(item)
  }
  return width
}
const _treeHeight = (root: any) => {
  if (root) {
    if (root.children && root.children.length !== 0) {
      let maxChildrenLen = 0
      for (const child of root.children) {
        maxChildrenLen = Math.max(maxChildrenLen, _treeHeight(child))
      }
      return 1 + maxChildrenLen
    } else {
      return 1
    }
  } else {
    return 0
  }
}
const _treeWidth = (root: any) => {
  if (!root) return 0
  if (!root.children || root.children.length === 0) return 1
  let width = 0
  for (const child of root.children) {
    width += _treeWidth(child)
  }
  return width
}
const jsonDataToArray = (column: any, data: any) => {
  const dataIndexes = [] as Array<any>
  for (const item of column) {
    dataIndexes.push(...getLeafDataIndexes(item))
  }
  return recursiveChildrenData(dataIndexes, data)
}
const recursiveChildrenData = (columnIndex: any, data: any) => {
  const result = [] as Array<any>
  for (const rowData of data) {
    const row = []
    for (const index of columnIndex) {
      row.push(rowData[index])
    }
    result.push(row)
    if (rowData.children) {
      result.push(...recursiveChildrenData(columnIndex, rowData.children))
    }
  }
  return result
}
const getLeafDataIndexes = (root: any) => {
  const result = [] as Array<any>
  if (root.children) {
    for (const child of root.children) {
      result.push(...getLeafDataIndexes(child))
    }
  } else {
    result.push(root.dataIndex)
  }
  return result
}







