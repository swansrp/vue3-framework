import FileSaver from "file-saver";
import * as ExcelJs from 'exceljs'
import dayjs from "dayjs";
import {strRemoveLF} from "@/framework/utils/common";
import {getTextWidth} from "@/framework/components/common/Portal/utils";

const DEFAULT_ROW_HEIGHT = 20

export const excelExport = (data: Array<any>, columns: Array<any>, fileName: string) => {
  const workbook = new ExcelJs.Workbook()
  // 添加sheet
  const worksheet = workbook.addWorksheet('sheet')
  // 设置 sheet 的默认行高
  worksheet.properties.defaultRowHeight = DEFAULT_ROW_HEIGHT
  // 设置列
  worksheet.columns = generateHeaders(columns)
  // 添加行
  worksheet.addRows(data)
  // 导出excel
  saveWorkbook(workbook, fileName)
}

const generateHeaders = (columns: Array<any>) => {
  return columns.map((col: any) => ({
    // 显示的 name
    header: strRemoveLF(col.title),
    // 用于数据匹配的 key
    key: col.dataIndex,
    // 列宽
    width: (getTextWidth(col.title) > col.width ? getTextWidth(col.title) : col.width) / 8
  }))
}

const saveWorkbook = (workbook: any, fileName: string) => {
  // 导出文件
  workbook.xlsx.writeBuffer().then((data: any) => {
    const blob = new Blob([data], {type: 'application/vnd.ms-excel'})
    FileSaver.saveAs(blob, fileName + '-' + dayjs().format('YYYYMMDDHHmmss') + '.xlsx')
  })
}





