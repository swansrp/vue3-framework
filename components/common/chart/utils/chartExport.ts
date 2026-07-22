/**
 * 图表数据导出 Excel 公共工具
 * 供 ChartDisplayArea.vue 和 ChartCard.vue 复用
 */
import { message } from 'ant-design-vue'
import ExcelJS from 'exceljs'

interface DimensionConfig {
  firstDimension?: {
    groupName?: string
    indicatorItems?: Array<{ itemName: string; itemValue: string }>
  }
  secondDimension?: {
    groupName?: string
    indicatorItems?: Array<{ itemName: string; itemValue: string }>
  }
}

/** 按配置顺序排列维度值（与图表显示一致） */
function getOrderedDimValues(dataValues: string[], configuredItems?: any[]) {
  if (!configuredItems?.length) return dataValues
  const dataSet = new Set(dataValues)
  const ordered = configuredItems.map((i: any) => i.itemName).filter((n: string) => dataSet.has(n))
  const extras = dataValues.filter(v => !configuredItems.some((i: any) => i.itemName === v))
  return [...ordered, ...extras]
}

/** 为 worksheet 应用统一样式 */
function applySheetStyles(worksheet: ExcelJS.Worksheet) {
  const header = worksheet.getRow(1)
  header.font = { bold: true }
  header.alignment = { horizontal: 'center', vertical: 'middle' }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })
  for (let i = 2; i <= worksheet.rowCount; i++) {
    worksheet.getRow(i).eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  }
  worksheet.columns?.forEach((column: any) => {
    let maxLength = 10
    column.eachCell?.({ includeEmpty: true }, (cell: any) => {
      const cellValue = cell.value ? String(cell.value) : ''
      const len = [...cellValue].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)
      maxLength = Math.max(maxLength, len)
    })
    column.width = maxLength + 2
  })
}

/**
 * 将图表数据导出为 Excel 文件
 * @param chartData     图表数据数组（已过滤后的展示数据）
 * @param config        维度配置（含 firstDimension / secondDimension / dataMetrics）
 * @param filename      下载文件名（不含 .xlsx 后缀）
 * @param isLoading     是否正在加载（加载中禁止导出）
 * @param useDataOrder  为 true 时跳过配置顺序，直接用传入数据的顺序（用于同步前端排序结果）
 */
export async function exportChartToExcel(
  chartData: any[],
  config: DimensionConfig | null | undefined,
  filename: string,
  isLoading = false,
  useDataOrder = false
) {
  if (isLoading) {
    message.warning('数据加载中，请稍后再试')
    return
  }
  if (!chartData || chartData.length === 0) {
    message.warning('当前图表没有数据可导出')
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()

    // ===== 指标饼图模式：每个数据指标字段一行，另加“合计”行 =====
    // 依据 config.dataMetrics[].chartType === 'metricsPie' 识别
    const isMetricsPieMode = Array.isArray((config as any)?.dataMetrics) &&
      (config as any).dataMetrics.some((m: any) => m.chartType === 'metricsPie')
    if (isMetricsPieMode) {
      const worksheet = workbook.addWorksheet('指标饼图')
      worksheet.addRow(['数据指标', '数值'])

      // 扩展所有 children（可能存在多个顶层 item，合并其 children）
      const allChildren: Array<{ metric: string; statistic: number }> = []
      chartData.forEach((item: any) => {
        if (item.children && item.children.length > 0) {
          item.children.forEach((child: any) => {
            allChildren.push({ metric: child.metric, statistic: child.statistic })
          })
        } else if (item.metric !== undefined) {
          allChildren.push({ metric: item.metric, statistic: item.statistic })
        }
      })

      // 按出现顺序写入每个指标
      let total = 0
      allChildren.forEach(c => {
        worksheet.addRow([c.metric, Number(c.statistic) || 0])
        total += Number(c.statistic) || 0
      })

      // 合计行
      worksheet.addRow(['合计', total])

      applySheetStyles(worksheet)

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename || '图表数据'}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('导出成功')
      return
    }



    // 展开数据
    const flattenedData: Array<{ firstDim: string; secondDim: string; statisticType: string; statistic: number }> = []
    chartData.forEach((item: any) => {
      const parts = item.metricLabel.split('&&')
      const firstDim = parts[0] || ''
      const secondDim = parts[1] || ''
      if (item.children && item.children.length > 0) {
        item.children.forEach((child: any) => {
          flattenedData.push({ firstDim, secondDim, statisticType: child.metric, statistic: child.statistic })
        })
      } else {
        flattenedData.push({ firstDim, secondDim, statisticType: item.metric || '', statistic: item.statistic })
      }
    })

    // 维度值顺序：开启 useDataOrder 时直接用数据原顺序（同步前端排序），否则按配置顺序
    const rawFirstDimValues = [...new Set(flattenedData.map(d => d.firstDim))]
    const rawSecondDimValues = [...new Set(flattenedData.map(d => d.secondDim))].filter(v => v !== '')
    const statisticTypes = [...new Set(flattenedData.map(d => d.statisticType))]
    const firstDimValues = useDataOrder
      ? rawFirstDimValues
      : getOrderedDimValues(rawFirstDimValues, config?.firstDimension?.indicatorItems)
    const secondDimValues = useDataOrder
      ? rawSecondDimValues
      : getOrderedDimValues(rawSecondDimValues, config?.secondDimension?.indicatorItems)
    const hasSecondDim = secondDimValues.length > 0
    const sanitizeSheetName = (name: string) => name.substring(0, 31).replace(/[\\/*?\[\]:]/g, '')

    // 按指标分别创建 sheet
    for (const stat of statisticTypes) {
      const worksheet = workbook.addWorksheet(sanitizeSheetName(stat || '指标数据'))

      if (hasSecondDim) {
        worksheet.addRow([config?.secondDimension?.groupName || '第二维度', ...firstDimValues])
        for (const secVal of secondDimValues) {
          const row: (string | number | null)[] = [secVal]
          for (const first of firstDimValues) {
            const match = flattenedData.find(d => d.firstDim === first && d.secondDim === secVal && d.statisticType === stat)
            row.push(match ? match.statistic : null)
          }
          worksheet.addRow(row)
        }
      } else {
        worksheet.addRow([config?.firstDimension?.groupName || '第一维度', ...firstDimValues])
        const row: (string | number | null)[] = [stat]
        for (const firstVal of firstDimValues) {
          const match = flattenedData.find(d => d.firstDim === firstVal && d.statisticType === stat)
          row.push(match ? match.statistic : null)
        }
        worksheet.addRow(row)
      }

      applySheetStyles(worksheet)
    }

    // 生成并下载
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename || '图表数据'}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch (error) {
    console.error('导出 Excel 失败:', error)
    message.error('导出 Excel 失败，请稍后重试')
  }
}
