import * as echarts from 'echarts'
import { amountFilter, calcArrayMaxValue, getEchartsLinearGradient } from "../utils"
import { MetricStatisticType } from "../type"
import { formatPercent } from '@/framework/utils/formatter'


// 以下两个变量分表定义了立体住的宽度和长度，为了美观，最好长是宽的2倍
const cubeArgX = 15
const cubeArgY = 4

const CubeLeft = echarts.graphic.extendShape({
  shape: { x: 0, y: 0 },
  buildPath: function (ctx, shape) {
    const xAxisPoint = shape.xAxisPoint
    const c0 = [shape.x, shape.y]
    const c1 = [shape.x - cubeArgX, shape.y - cubeArgY]
    const c2 = [xAxisPoint[0] - cubeArgX, xAxisPoint[1] - cubeArgY]
    const c3 = [xAxisPoint[0], xAxisPoint[1]]
    ctx.moveTo(c0[0], c0[1])!.lineTo(c1[0], c1[1]).lineTo(c2[0], c2[1]).lineTo(c3[0], c3[1]).closePath()
  }
})

const CubeRight = echarts.graphic.extendShape({
  shape: { x: 0, y: 0 },
  buildPath: function (ctx, shape) {
    const xAxisPoint = shape.xAxisPoint
    const c1 = [shape.x, shape.y]
    const c2 = [xAxisPoint[0], xAxisPoint[1]]
    const c3 = [xAxisPoint[0] + cubeArgX, xAxisPoint[1] - cubeArgY]
    const c4 = [shape.x + cubeArgX, shape.y - cubeArgY]
    ctx.moveTo(c1[0], c1[1])!.lineTo(c2[0], c2[1]).lineTo(c3[0], c3[1]).lineTo(c4[0], c4[1]).closePath()
  }
})

const CubeTopRight = echarts.graphic.extendShape({
  shape: { x: 0, y: 0 },
  buildPath: function (ctx, shape) {
    const c1 = [shape.x, shape.y]
    const c2 = [shape.x + cubeArgX, shape.y - cubeArgY]
    const c3 = [shape.x + 0, shape.y - 2 * cubeArgY]
    ctx.moveTo(c1[0], c1[1])!.lineTo(c2[0], c2[1]).lineTo(c3[0], c3[1]).closePath()
  }
})

const CubeTopLeft = echarts.graphic.extendShape({
  shape: { x: 0, y: 0 },
  buildPath: function (ctx, shape) {
    const c1 = [shape.x, shape.y]
    const c3 = [shape.x + 0, shape.y - 2 * cubeArgY]
    const c4 = [shape.x - cubeArgX, shape.y - cubeArgY]
    ctx.moveTo(c1[0], c1[1])!.lineTo(c3[0], c3[1]).lineTo(c4[0], c4[1]).closePath()
  }
})

echarts.graphic.registerShape('CubeLeft', CubeLeft)
echarts.graphic.registerShape('CubeRight', CubeRight)
echarts.graphic.registerShape('CubeTopLeft', CubeTopLeft)
echarts.graphic.registerShape('CubeTopRight', CubeTopRight)

const buildShapeObj = (api: any) => {
  const location = api.coord([api.value(0), api.value(1)])
  return {
    api,
    xValue: api.value(0),
    yValue: api.value(1),
    x: location[0],
    y: location[1],
    xAxisPoint: api.coord([api.value(0), 0])
  }
}

export const getEchartsBar3dOption = (data: Array<MetricStatisticType>, isPercent: boolean) => {
  const yAxisSplitNumber = 5
  const length = data[0].children.length
  const amount = data.map(item => item.statistic)
  console.log(amount)
  const category = data.map(item => item.metric)
  const amountMax = calcArrayMaxValue(amount)
  const amountSum = amount.reduce((pre: number, cur: number) => pre + +cur, 0)
  const percentList = amount.map((item: number) => {
    return formatPercent(item / amountSum * 100, 2)
  })
  return ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        label: { show: false }
      },
      textStyle: {
        fontFamily: 'Noto Sans SC',
        fontSize: 16
      },
      formatter: (params: any) => {
        const buildDotDom = (color: string) =>
          `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${ color }"></span>`
        const dotHtml = buildDotDom('#FFD15C')
        const dotHtml2 = buildDotDom('#0783FA')
        // return `${ params[0].axisValue }</br>${ dotHtml } ${ params[2].data }</br>${ dotHtml2 } ${ amountFilter(params[0].data) }`
        return `${ params[0].axisValue }`
      }
    },
    grid: {
      left: 10,
      right: 5,
      bottom: 10,
      top: 45,
      containLabel: true
    },
    xAxis: {
      data: category,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#3F4F5E',
          width: 2
        }
      },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        interval: 0,
        fontSize: 12,
        fontFamily: 'Noto Sans SC'
      }
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        max: amountMax,
        interval: amountMax / yAxisSplitNumber,
        splitNumber: yAxisSplitNumber,
        nameTextStyle: {
          padding: [0, 0, 0, 5],
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'Noto Sans SC'
        },
        position: "left",
        splitLine: { show: true },
        axisTick: { show: true },
        axisLine: { show: true },
        axisLabel: {
          show: true,
          fontSize: 14,
          fontFamily: 'D-DIN'
        }
      }
    ],
    series: [
      {
        type: 'custom',
        data: amount,
        renderItem: (_: any, api: any) => {
          return {
            type: 'group',
            children: [
              {
                type: 'CubeLeft',
                shape: buildShapeObj(api),
                style: { fill: getEchartsLinearGradient('#0E3C69', '#0E336E') }
              },
              {
                type: 'CubeRight',
                shape: buildShapeObj(api),
                style: { fill: getEchartsLinearGradient('#2A8BEF', '#15418C') }
              },
              {
                type: 'CubeTopLeft',
                shape: buildShapeObj(api),
                style: { fill: '#2484BA' }
              },
              {
                type: 'CubeTopRight',
                shape: buildShapeObj(api),
                style: { fill: '#2D9DD6' }
              }
            ]
          }
        }
      },
      {
        type: 'bar',
        zlevel: 6,
        label: {
          show: true,
          position: 'top',
          fontSize: 14,
          offset: [0, -5],
          formatter: (params: any) => amount[params.dataIndex]
        },
        itemStyle: { color: 'transparent' },
        data: amount
      }
    ]
  })
}
