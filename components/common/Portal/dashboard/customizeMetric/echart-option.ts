import * as echarts from 'echarts'
import { calcArrayMaxValue, colorList, getEchartsLinearGradient } from "../utils"
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
  console.log('====getEchartsBar3dOption====', data)
  const yAxisSplitNumber = 5
  // 类型
  const category = data.map(item => item.metricLabel)
  // 每个类型数据总值
  const amountSum = data.map((item: MetricStatisticType) => item.children[0].statistic)
  // 数据最大值
  const dataMax = calcArrayMaxValue(amountSum)
  // 数据总值
  const dataSum = amountSum.reduce((pre: number, cur: number) => pre + +cur, 0)
  // 每个类型占比
  const amountPercent = data.map(item => item.children[0].statistic / dataSum * 100)

  // 分级数值
  const metricValue = [] as Array<Array<number>>
  // 分级名称
  const metricLabel = [] as Array<string>
  // 绘图用累加和
  const amount = [] as Array<Array<number>>
  // 分级占比
  const percent = [] as Array<Array<number>>
  const length = data[0].children[0].children.length
  const customOptions = [] as Array<any>

  const colorIndex = Math.floor(Math.random() * colorList.length % colorList.length)
  if (length === 0) {
    metricValue[0] = data.map(item => item.children[0].statistic)
    amount[0] = data.map(item => item.children[0].statistic)
    customOptions.push(buildCustomOption(amount[0], colorList[colorIndex], 0))
  } else {
    amount[0] = [] as Array<number>
    percent[0] = [] as Array<number>
    metricValue[0] = [] as Array<number>
    metricLabel[0] = data[0].children[0].children[0].metricLabel
    for (let j = 0; j < data.length; j++) {
      metricValue[0][j] = data[j].children[0].children[0].statistic
      amount[0][j] = data[j].children[0].children[0].statistic
      percent[0][j] = data[j].children[0].children[0].statistic / amountSum[j] * 100
    }
    for (let i = 1; i < length; i++) {
      amount[i] = [] as Array<number>
      percent[i] = [] as Array<number>
      metricValue[i] = [] as Array<number>
      metricLabel[i] = data[0].children[0].children[i].metricLabel
      for (let j = 0; j < data.length; j++) {
        metricValue[i][j] = data[j].children[0].children[i].statistic
        amount[i][j] = data[j].children[0].children[i].statistic + amount[i - 1][j]
        percent[i][j] = data[j].children[0].children[i].statistic / amountSum[j] * 100
      }
    }
    for (let i = 0; i < length; i++) {
      const customData = [] as Array<number>
      for (let j = 0; j < data.length; j++) {
        customData.push(amount[i][j])
      }
      customOptions.push(buildCustomOption(customData, colorList[Math.floor(i % 10)], length - i))
    }
  }

  console.log('类型:', category)
  console.log('每个类型数据总值:', amountSum)
  console.log('数据最大值:', dataMax)
  console.log('数据总值:', dataSum)
  console.log('每个类型占比:', amountPercent)
  console.log('分级数值:', metricValue)
  console.log('分级显示:', metricLabel)
  console.log('分级占比:', percent)
  console.log('分级累积数值:', amount)

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
        let display
        if(length === 0) {
          display = buildDotDom(colorList[colorIndex]) + params[0].axisValue
          for(let i = params.length - 2; i >= 0; i--) {
            display += ':'
            display += (metricValue[0][params[i].dataIndex] + (isPercent ? '(' + formatPercent(amountPercent[params[i].dataIndex]) +  ')' : ''))
          }
        } else {
          display = params[0].axisValue
          for(let i = params.length - 2; i >= 0; i--) {
            display += '</br>'
            display += (buildDotDom(colorList[Math.floor(i % 10)]) + metricLabel[i]) + ':' + metricValue[i][params[i].dataIndex] + '(' + formatPercent(percent[i][params[i].dataIndex]) +  ')'
          }
        }

        return `${display}`
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
        max: dataMax,
        interval: dataMax / yAxisSplitNumber,
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
      ...customOptions,
      {
        type: 'bar',
        zlevel: 6,
        label: {
          show: true,
          position: 'top',
          fontSize: 14,
          offset: [0, -5],
          formatter: (params: any) => formatPercent(amountPercent[params.dataIndex])
        },
        itemStyle: { color: 'transparent' },
        data: amountSum
      }
    ]
  })
}
const buildAlphaColor = (color: any, a=100) => {
  return color.replace('100)', a+')')
}
const buildCustomOption = (data: Array<number>, color: string, zlevel: number) => {
  return {
    type: 'custom',
    data: data,
    zlevel,
    renderItem: (_: any, api: any) => {
      return {
        type: 'group',
        children: [
          {
            type: 'CubeLeft',
            shape: buildShapeObj(api),
            style: { fill: getEchartsLinearGradient(buildAlphaColor(color,90), buildAlphaColor(color, 0.1)) }
          },
          {
            type: 'CubeRight',
            shape: buildShapeObj(api),
            style: { fill: getEchartsLinearGradient(buildAlphaColor(color, 90), buildAlphaColor(color, 0.1)) }
          },
          {
            type: 'CubeTopLeft',
            shape: buildShapeObj(api),
            style: { fill: buildAlphaColor(color) }
          },
          {
            type: 'CubeTopRight',
            shape: buildShapeObj(api),
            style: { fill: buildAlphaColor(color) }
          }
        ]
      }
    }
  }
}
