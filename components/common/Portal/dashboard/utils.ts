import * as echarts from 'echarts'
import bus, { DRAG_GRID_RESIZE } from '@/framework/mitt'

export const colorList = ['#3775F6', '#FFC371', '#FF7C11', '#7031DE', '#485F9B', '#4BC290', '#33BFCF', '#FD716D', '#B8764B', '#948DE0']
export const setEchartsOptionsAndResize = (chart: echarts.ECharts, option: echarts.EChartsOption, notMerge = false) => {
  chart.setOption(option, notMerge)
  // @ts-ignore
  bus.on(DRAG_GRID_RESIZE, chart.resize)
  // @ts-ignore
  window.addEventListener('resize', chart.resize)
}
export const disposeEcharts = (chart: echarts.ECharts) => {
  if(chart) {
    // @ts-ignore
    bus.off(DRAG_GRID_RESIZE, chart.resize)
    // @ts-ignore
    window.removeEventListener('resize', chart.resize)
  }

}
export const getInitEchart = (elementId: string) => {
  const chart = echarts.getInstanceByDom(document.getElementById(elementId) as HTMLDivElement)
  if (chart) return chart
  return echarts.init(document.getElementById(elementId))
}

export const amountFilter = (amount: number | string) => {
  const decimal = (amount + '').split('.')[1]
  return String(+~~amount || 0).replace(/\d{1,3}(?=(\d{3})+(\.\d*)?$)/g, '$&,') + (decimal ? '.' + decimal : '')
}

export const calcArrayMaxValue = (arr: Array<number>) => {
  const max = Math.max(...arr)
  const bits = String(max).split('.')[0].length
  // 计算基数，如99.1的基数是1， 275的基数是10，即只取整数部分，最高位置1，其余位为0，并去掉一位，防止四舍五入的值被忽略
  const base = +('1' + (bits > 1 ? '0'.repeat(bits - 1) : ''))
  const max_int = Math.ceil(Math.max(...arr) / (0.95 * base)) // 不让最高的值超过最上面的刻度
  let max_val = max_int * base // 让显示的刻度是整数
  // 为了防止数据为0时，Y轴不显示，给个最大值
  if (max_val == 0) max_val = 1
  return max_val
}

export const getEchartsLinearGradient = (topColor: string, bottomColor: string) => {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
    offset: 0, color: topColor
  }, {
    offset: 1, color: bottomColor
  }])
}