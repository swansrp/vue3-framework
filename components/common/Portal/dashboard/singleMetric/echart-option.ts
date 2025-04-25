import { setEchartsOptionsAndResize } from "../../utils"
import { NameValue } from '../type'
import { formatPercent } from '@/framework/utils/formatter'

export const processSingleMetricData = (data: any, dict: any): Array<NameValue> => {
  const result = [] as Array<NameValue>
  if(data.length) {
    data.forEach((item: any) => {
      const name = item.metric==='NULL' ? '未知' : dict.valueMap.get(String(item.metric))
      result.push({ name, value: item.statistic })
    })
  }
  return result
}
export const echartsPie = (myChart: any, data: Array<NameValue>) => {
  let hoveredIndex = -1
  const colorList = ["#FFD15C", "#0783FA", "#07D1FA", "#20E6A4"]
  data.forEach((item: any, index: number) => index < 4 && (item.itemStyle = { color: colorList[index] }))
  const series = getPie3DSeries(data)
  const option = getPie3DOption(series, data)
  setEchartsOptionsAndResize(myChart, option, true)
  myChart.on("mouseover", function (params: any) {
    // 准备重新渲染扇形所需的参数
    let isSelected
    let isHovered
    let startRatio
    let endRatio
    let k
    // 如果触发 mouseover 的扇形当前已高亮，则不做操作
    if (hoveredIndex === params.seriesIndex) return
    else {
      // 如果当前有高亮的扇形，取消其高亮状态（对 option 更新）
      if (hoveredIndex !== -1) {
        // 从 option.series 中读取重新渲染扇形所需的参数，将是否高亮设置为 false。
        isSelected = option.series[hoveredIndex].pieStatus.selected
        isHovered = false
        startRatio = option.series[hoveredIndex].pieData.startRatio
        endRatio = option.series[hoveredIndex].pieData.endRatio
        k = option.series[hoveredIndex].pieStatus.k
        // 对当前点击的扇形，执行取消高亮操作（对 option 更新）
        option.series[hoveredIndex].parametricEquation = getParametricEquation(startRatio, endRatio, isSelected, isHovered, k)
        option.series[hoveredIndex].pieStatus.hovered = isHovered
        // 将此前记录的上次选中的扇形对应的系列号 seriesIndex 清空
        hoveredIndex = -1
      }

      // 如果触发 mouseover 的扇形不是透明圆环，将其高亮（对 option 更新）
      if (params.seriesName !== "mouseoutSeries" && option.series[params.seriesIndex].pieStatus) {
        // 从 option.series 中读取重新渲染扇形所需的参数，将是否高亮设置为 true。
        isSelected = option.series[params.seriesIndex].pieStatus.selected
        isHovered = true
        startRatio = option.series[params.seriesIndex].pieData.startRatio
        endRatio = option.series[params.seriesIndex].pieData.endRatio
        k = option.series[params.seriesIndex].pieStatus.k
        // 对当前点击的扇形，执行高亮操作（对 option 更新）
        option.series[params.seriesIndex].parametricEquation = getParametricEquation(startRatio, endRatio, isSelected, isHovered, k, 28)
        option.series[params.seriesIndex].pieStatus.hovered = isHovered
        // 记录上次高亮的扇形对应的系列号 seriesIndex
        hoveredIndex = params.seriesIndex
      }
      myChart.setOption(option)
    }
  })
}

const getPie3DSeries = (pieData: Array<NameValue>) => {
  const series = [] as Array<any>
  let sumValue = 0
  let startValue = 0
  let endValue = 0
  const k = 1
  // 为每一个饼图数据，生成一个 series-surface 配置
  for (let i = 0; i < pieData.length; i++) {
    sumValue += pieData[i].value
    const seriesItem = {
      name: pieData[i].name,
      type: "surface",
      parametric: true,
      wireframe: {show: false},
      pieData: pieData[i],
      pieStatus: {selected: false, hovered: false, k: k},
      radius: "50%",
      center: ["10", "10%"],
      itemStyle: pieData[i].itemStyle
    }
    series.push(seriesItem)
  }
  // 使用上一次遍历时，计算出的数据和 sumValue，调用 getParametricEquation 函数，
  // 向每个 series-surface 传入不同的参数方程 series-surface.parametricEquation，也就是实现每一个扇形。
  for (let i = 0; i < series.length; i++) {
    endValue = startValue + series[i].pieData.value
    series[i].pieData.startRatio = startValue / sumValue
    series[i].pieData.endRatio = endValue / sumValue
    series[i].parametricEquation = getParametricEquation(series[i].pieData.startRatio, series[i].pieData.endRatio, false, false, k)
    startValue = endValue
  }
  return series
}

const getPie3DOption = (series: any, data: Array<any>) => {
  const option = {
    tooltip: {
      formatter: ({seriesIndex, seriesName, color}: any) => {
        const bfb = ((option.series[seriesIndex].pieData.endRatio - option.series[seriesIndex].pieData.startRatio) * 100).toFixed(2)
        return (`${seriesName}<br/>
            <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color}"></span>
            <span style="font-weight: bold;">${data.find((item: any) => item.name === seriesName)!.value}</span>(占比${bfb}%)`)
      }
    },
    legend: {
      bottom: 7, itemGap: 20, icon: 'rect', itemHeight: 6, itemWidth: 12, width: 320,
      textStyle: {
        fontSize: '14px',
        color: '#333333',
        fontFamily: 'Noto Sans SC',
        width: 90,
        fontWeight: 500,
        backgroundColor: 'rgba(0,0,0,0)'
      },
      formatter: (name: string) => {
        const item = data.find((item: any) => item.name === name)
        return name + ' ' + item!.value + '(' + formatPercent(item!.endRatio - item!.startRatio, 2, 1) + ')'
      }
    },
    xAxis3D: {min: -1, max: 1},
    yAxis3D: {min: -1, max: 1},
    zAxis3D: {min: -1, max: 1},
    grid3D: {
      show: false, boxHeight: 13, //圆环的高度
      left: 0, top: -40, //3d饼图的位置
      viewControl: {
        alpha: 28, //角度
        distance: 280, //调整视角到主体的距离，类似调整zoom
        rotateSensitivity: 0, //设置为0无法旋转
        zoomSensitivity: 0, //设置为0无法缩放
        panSensitivity: 0, //设置为0无法平移
        autoRotate: false //自动旋转
      }
    }, series: series
  }
  return option
}


// 生成扇形的曲面参数方程，用于 series-surface.parametricEquation
const getParametricEquation = (startRatio: number, endRatio: number, isSelected: boolean, isHovered: boolean, k: number, h = 15) => {
  const midRatio = (startRatio + endRatio) / 2
  const startRadian = startRatio * Math.PI * 2
  const endRadian = endRatio * Math.PI * 2
  const midRadian = midRatio * Math.PI * 2
  // 如果只有一个扇形，则不实现选中效果。
  if (startRatio === 0 && endRatio === 1) isSelected = false
  // 通过扇形内径/外径的值，换算出辅助参数 k（默认值 1/3）
  k = typeof k !== "undefined" ? k : 1 / 3
  // 计算选中效果分别在 x 轴、y 轴方向上的位移（未选中，则位移均为 0）
  const offsetX = isSelected ? Math.cos(midRadian) * 0.1 : 0
  const offsetY = isSelected ? Math.sin(midRadian) * 0.1 : 0
  // 计算高亮效果的放大比例（未高亮，则比例为 1）
  const hoverRate = isHovered ? 1.05 : 1
  // 返回曲面参数方程
  return {
    u: { min: -Math.PI, max: Math.PI * 3, step: Math.PI / 48 },
    v: { min: 0, max: Math.PI * 2, step: Math.PI / 48 },
    x: (u: number, v: number) => {
      if (u < startRadian) return (offsetX + Math.cos(startRadian) * (1 + Math.cos(v) * k) * hoverRate)
      if (u > endRadian) return (offsetX + Math.cos(endRadian) * (1 + Math.cos(v) * k) * hoverRate)
      return offsetX + Math.cos(u) * (1 + Math.cos(v) * k) * hoverRate
    },
    y: (u: number, v: number) => {
      if (u < startRadian) return (offsetY + Math.sin(startRadian) * (1 + Math.cos(v) * k) * hoverRate)
      if (u > endRadian) return (offsetY + Math.sin(endRadian) * (1 + Math.cos(v) * k) * hoverRate)
      return offsetY + Math.sin(u) * (1 + Math.cos(v) * k) * hoverRate
    },
    z: (u: number, v: number) => {
      if (u < -Math.PI * 0.5) return Math.sin(u)
      if (u > Math.PI * 2.5) return Math.sin(u) * h * 0.1
      return Math.sin(v) > 0 ? (+h) * 0.1 : -1
    }
  }
}


