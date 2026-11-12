import dayjs from 'dayjs'
import XLSX from 'xlsx-js-style'

import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { getTextWidth } from '@/framework/components/common/Portal/utils'
import { isNotEmpty, strRemoveLF } from '@/framework/utils/common'

/**
 * @param dataSource    使用 ant table 组件时的 data-source 数据
 * @param columns       使用 ant table 组件时的 columns 数据
 * @param fileName      excel导出时的文件名
 */
export const excelExport = (dataSource: any, columns: any, rawColumns: any, fileName: string) => {
  const wb = excel(dataSource, columns, rawColumns)
  XLSX.writeFile(wb, fileName + '-' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx')
}

/**
 * 多Sheet导出: 每个成员一个 sheet(sheet 名=成员名), 一次下载一个工作簿。
 * 供多Tab页面宿主一次导出全部成员表使用。
 * @param sheets 成员载荷数组: dataSource=格式化后全量数据, columns=展示列(含多级表头), rawColumns=原始列, sheetName=sheet名
 */
export const excelExportMultiSheet = (
  sheets: Array<{ dataSource: any, columns: any, rawColumns: any, sheetName: string }>,
  fileName: string
) => {
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()
  sheets.forEach((sheet, index) => {
    const ws = buildWorksheet(sheet.dataSource, sheet.columns, sheet.rawColumns)
    // sheet 名约束: ≤31字符, 不可含 : \ / ? * [ ], 不可重复
    let name = String(sheet.sheetName || '').replace(/[:\/?*\[\]]/g, ' ').trim() || ('sheet' + (index + 1))
    if (name.length > 31) {
      name = name.slice(0, 31)
    }
    let finalName = name
    let seq = 2
    while (used.has(finalName)) {
      finalName = (name.slice(0, 28) + '_' + seq).slice(0, 31)
      seq++
    }
    used.add(finalName)
    XLSX.utils.book_append_sheet(wb, ws, finalName)
  })
  XLSX.writeFile(wb, fileName + '-' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx')
}

/** 列树先序抽叶子(与 jsonDataToArray 的 dataIndexes 同序): aoa 列索引/列宽/金额判断都按叶子对齐 */
const walkLeafColumns = (cols: any[], out: any[] = []): any[] => {
  for (const col of cols || []) {
    if (Array.isArray(col?.children) && col.children.length > 0) {
      walkLeafColumns(col.children, out)
    } else {
      out.push(col)
    }
  }
  return out
}

/** 构造单个 sheet 工作表(多级表头合并/列宽/冻结/样式) */
const buildWorksheet = (dataSource: any, columns: any, rawColumns: any) => {
  const cols = Array.isArray(columns) ? columns : []
  const rawCols = Array.isArray(rawColumns) ? rawColumns : []
  const rows = Array.isArray(dataSource) ? dataSource : []
  if (cols !== columns || rawCols !== rawColumns || rows !== dataSource) {
    console.error('[excel] 列/数据形态异常, 已按空兜底继续导出:', { columns, rawColumns, dataSource })
  }
  const columnHeight = _columnHeight(cols)
  const columnWidth = _columnWidth(cols)
  const header = [] as Array<any>
  for (let rowNum = 0; rowNum < columnHeight; rowNum++) {
    header[rowNum] = []
    for (let colNum = 0; colNum < columnWidth; colNum++) {
      header[rowNum][colNum] = ''
    }
  }
  let offset = 0
  const mergeRecord = [] as any
  for (const item of cols) {
    generateExcelColumn(header, 0, offset, item, mergeRecord)
    offset += _treeWidth(item)
  }
  header.push(...jsonDataToArray(cols, rows))
  // 列宽按【列树叶子序】构建(先序遍历, 与 jsonDataToArray 的 dataIndexes 同序):
  // 多级表头分组会重排列序, 旧按 rawColumns 序构建与 aoa 列索引错位 → 宽度张冠李戴、大面积折行
  const leafCols = walkLeafColumns(cols)
  // 配置宽起底(缺失给 60 保表头可读), 数据实测宽在 aoa_to_sheet 里再取 max
  const columnWidthArray = leafCols.map((col: any) => ({ wpx: Math.max(col.width || 0, 60) }))
  const ws = aoa_to_sheet(header, columnHeight, leafCols, columnWidthArray)
  // 列宽
  ws['!cols'] = [...columnWidthArray]
  ws['!merges'] = mergeRecord
  // 头部冻结
  ws['!freeze'] = {
    xSplit: '1',
    ySplit: '' + columnHeight,
    topLeftCell: 'B' + (columnHeight + 1),
    activePane: 'bottomRight',
    state: 'frozen'
  }
  return ws
}

/**
 * 单表导出工作簿(既有入口, 各表格导出仍在用): sheet 名固定 sheet1
 */
export const excel = (dataSource: any, columns: any, rawColumns: any) => {
  const ws = buildWorksheet(dataSource, columns, rawColumns)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'sheet1')
  return wb
}
const aoa_to_sheet = (data: any, headerRows: any, columns: any, columnWidthArray: Array<any>) => {
  const ws = {}
  const range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } }
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
      if (typeof data[R][C] === 'object') { // 此处预留了自定义设置样式的功能，通过重写recursiveChildrenData方法，可为每一个单元格传入样式属性
        cell = data[R][C]
      } else if (R < headerRows) {
        // 表头: 浅灰蓝底 + 深蓝字加粗(低饱和, 打印/屏显都柔和)
        cell = {
          v: data[R][C],
          s: {
            font: { name: '微软雅黑', sz: 11, bold: true, color: { rgb: '1F4E79' } },
            alignment: {
              wrapText: 1,
              horizontal: 'center',
              vertical: 'center'
            },
            border: {
              top: { style: 'thin', color: { rgb: '9DB6D3' } },
              left: { style: 'thin', color: { rgb: '9DB6D3' } },
              bottom: { style: 'thin', color: { rgb: '8EAADB' } },
              right: { style: 'thin', color: { rgb: '9DB6D3' } }
            },
            fill: { patternType: 'solid', fgColor: { rgb: 'B4C6E7' } }
          }
        }
      } else {
        // 数据行: 浅灰蓝细边框 + 隔行淡蓝斑马纹
        // 边框要压得住斑马底色: 过浅的 E4E9F0 在蓝纹上竖线不可见(用户实测)
        cell = {
          v: data[R][C],
          s: {
            font: { name: '微软雅黑', sz: 11, color: { rgb: '333333' } },
            alignment: {
              wrapText: 1,
              horizontal: 'center',
              vertical: 'center'
            },
            border: {
              top: { style: 'thin', color: { rgb: 'C9D6E8' } },
              left: { style: 'thin', color: { rgb: 'C9D6E8' } },
              bottom: { style: 'thin', color: { rgb: 'C9D6E8' } },
              right: { style: 'thin', color: { rgb: 'C9D6E8' } }
            }
          }
        }
        if ((R - headerRows) % 2 === 1) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'EFF6FC' } }
        }
      }
      const cell_ref = XLSX.utils.encode_cell({ c: C, r: R })
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

        const col = columns[C]
        if (col?.fieldType === FIELD_TYPE.MONEY) {
          //将有千分位的数据去掉千分位
          cell.v = cell.v.replace(/,/g, '')
          const value = parseFloat(cell.v)
          if (!isNaN(value)) {
            cell.v = value
            cell.t = 'n'
            cell.z = '#,##0.00'
          }
        } else if (col?.fieldType === FIELD_TYPE.NUMBER && typeof cell.v === 'string') {
          // NUMBER 列(透视统计列等)进来的是显示层千分位字符串, 还原成数字单元格 Excel 才能直接求和;
          // 整串严格匹配防 parseFloat 把 "123abc" 截成 123; 百分号串还原为小数走百分比格式
          const raw = cell.v.replace(/,/g, '')
          if (/^-?\d+(\.\d+)?$/.test(raw)) {
            const num = Number(raw)
            cell.v = num
            cell.t = 'n'
            // 整数不带小数点: .#### 的小数点是字面量, 整数会显出 "5." 尾巴(用户实测), 按值选格式
            cell.z = Number.isInteger(num) ? '#,##0' : '#,##0.####'
          } else if (/^-?\d+(\.\d+)?%$/.test(raw)) {
            const pct = Number(raw.slice(0, -1))
            cell.v = pct / 100
            cell.t = 'n'
            cell.z = Number.isInteger(pct) ? '0%' : '0.##%'
          }
        }
        ws[cell_ref] = cell
        if (columnWidthArray[C]) {
          // +14: 单元格左右内边距+千分位/格式化误差补偿(MONEY 列 max 时已去掉逗号, 实显更宽), 否则贴边就折行
          columnWidthArray[C].wpx = Math.max(columnWidthArray[C].wpx, getTextWidth(cell.v) + 14)
        }
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
  if (Array.isArray(columnDefine.children) && columnDefine.children.length > 0) {
    mergeRecord.push({ s: { r: rowOffset, c: colOffset }, e: { r: rowOffset, c: colOffset + columnWidth - 1 } })
    let tempOffSet = colOffset
    for (const child of columnDefine.children) {
      generateExcelColumn(columnTable, rowOffset + 1, tempOffSet, child, mergeRecord)
      tempOffSet += _treeWidth(child)
    }
  } else {
    if (rowOffset !== columnTable.length - 1)
      mergeRecord.push({ s: { r: rowOffset, c: colOffset }, e: { r: columnTable.length - 1, c: colOffset } })
  }
}
const _columnHeight = (column: any) => {
  let height = 0
  for (const item of Array.isArray(column) ? column : []) {
    height = Math.max(_treeHeight(item), height)
  }
  return height
}
const _columnWidth = (column: any) => {
  let width = 0
  for (const item of Array.isArray(column) ? column : []) {
    width += _treeWidth(item)
  }
  return width
}
const _treeHeight = (root: any) => {
  if (root) {
    if (Array.isArray(root.children) && root.children.length !== 0) {
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
  if (!Array.isArray(root.children) || root.children.length === 0) return 1
  let width = 0
  for (const child of root.children) {
    width += _treeWidth(child)
  }
  return width
}
const jsonDataToArray = (column: any, data: any) => {
  const dataIndexes = [] as Array<any>
  for (const item of Array.isArray(column) ? column : []) {
    dataIndexes.push(...getLeafDataIndexes(item))
  }
  // 诊断: 有列但没取到任何数据列 dataIndex(叶子缺 dataIndex/壳列结构异常)是"导出有表头无内容"的头号嫌疑
  if (Array.isArray(column) && column.length > 0 && dataIndexes.length === 0) {
    console.error('[excel] 列树未解析出任何叶子 dataIndex, 数据列将全空。列结构:', JSON.parse(JSON.stringify(column)))
  }
  return recursiveChildrenData(dataIndexes, Array.isArray(data) ? data : [])
}
const recursiveChildrenData = (columnIndex: any, data: any) => {
  const result = [] as Array<any>
  for (const rowData of Array.isArray(data) ? data : []) {
    const row = []
    for (const index of columnIndex) {
      row.push(rowData[index])
    }
    result.push(row)
    // children 只在确为数组时才当树展开: 行数据若有同名非数组字段(真值对象/数字)曾致 for...of 抛 not iterable
    if (Array.isArray(rowData.children) && rowData.children.length > 0) {
      result.push(...recursiveChildrenData(columnIndex, rowData.children))
    }
  }
  return result
}
const getLeafDataIndexes = (root: any) => {
  const result = [] as Array<any>
  if (Array.isArray(root?.children) && root.children.length > 0) {
    for (const child of root.children) {
      result.push(...getLeafDataIndexes(child))
    }
  } else {
    result.push(root?.dataIndex)
  }
  return result
}







