import * as echarts from 'echarts'
import bus, { DRAG_GRID_RESIZE } from '@/framework/mitt'
import _ from 'lodash'

export const colorList = ['rgba(55,117,246,100)', 'rgba(255,195,113,100)', 'rgba(255,124,17,100)', 'rgba(112,49,222,100)', 'rgba(72,95,155,100)', 'rgba(72,95,155,100)', 'rgba(51,191,207,100)', 'rgba(253,113,109,100)', 'rgba(184,118,75,100)', 'rgba(148,141,224,100)']
export const setEchartsOptionsAndResize = (chart: echarts.ECharts, option: echarts.EChartsOption, notMerge = false) => {
  chart.setOption(option, notMerge)
  // @ts-ignore
  bus.on(DRAG_GRID_RESIZE, chart.resize)
  // @ts-ignore
  window.addEventListener('resize', _.debounce(chart.resize, 50))
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