import * as echarts from 'echarts'
import { amountFilter, calcArrayMaxValue, getEchartsLinearGradient } from "../utils"
import { Bar3dDataType } from "../type"


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

export const getEchartsBar3dOption = ({
                                        category,
                                        number,
                                        amount
                                      }: Bar3dDataType, isPercent: boolean, typeName: string) => {
  const yAxisSplitNumber = 5
  const number_max = calcArrayMaxValue(number)
  const amount_max = calcArrayMaxValue(amount.map(Number))
  const amount_sum = amount.reduce((pre: number, cur: number | string) => pre + +cur, 0)
  const percent_list = amount.map((item: number | string) => {
    if (amount_sum === 0) return '0%'
    return (+item / amount_sum * 100).toFixed(2) + '%'
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
        return `${ typeName }所属板块：${ params[0].axisValue }</br>${ dotHtml } ${ typeName }数量 ${ params[2].data }</br>${ dotHtml2 } ${ typeName }金额 ${ amountFilter(params[0].data) }万`
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
        color: "#B4C0CC",
        fontSize: 12,
        fontFamily: 'Noto Sans SC'
      }
    },
    yAxis: [{
      type: "value",
      name: "单位：个",
      min: 0,
      max: number_max,
      interval: number_max / yAxisSplitNumber,
      splitNumber: yAxisSplitNumber,
      nameTextStyle: {
        color: "#FFD15C",
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Noto Sans SC'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#3F4F5E',
          type: 'dashed'
        }
      },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        show: true,
        color: "#FFD15C",
        fontSize: 14,
        fontFamily: 'D-DIN'
      }
    },
      {
        type: "value",
        name: '单位：万元',
        min: 0,
        max: amount_max,
        interval: amount_max / yAxisSplitNumber,
        splitNumber: yAxisSplitNumber,
        nameTextStyle: {
          padding: [0, 0, 0, 5],
          color: "#15B1FF",
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'Noto Sans SC'
        },
        position: "right",
        splitLine: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          show: true,
          color: "#15B1FF",
          fontSize: 14,
          fontFamily: 'D-DIN'
        }
      }
    ],
    series: [
      {
        type: 'custom',
        data: amount,
        yAxisIndex: 1,
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
        yAxisIndex: 1,
        zlevel: 6,
        label: {
          show: isPercent,
          position: 'top',
          fontSize: 14,
          color: '#fff',
          offset: [0, -5],
          formatter: (params: any) => percent_list[params.dataIndex]
        },
        itemStyle: { color: 'transparent' },
        data: amount
      },
      {
        type: "line",
        yAxisIndex: 0,
        symbol: "circle",
        symbolSize: 16,
        itemStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.3, [
            { offset: 0, color: '#FFD15C' },
            { offset: 0.5, color: '#FFD15C' },
            { offset: 1, color: 'rgba(0,0, 0, 0)' }
          ]),
          borderColor: 'rgba(255, 209, 92, 0.4)',
          borderWidth: 1
        },
        lineStyle: {
          color: "#FFD15C",
          width: 1
        },
        zlevel: 5,
        data: number
      }
    ]
  })
}
