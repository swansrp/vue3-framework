import { MetricStatisticType, NameValue } from '../type'
import { colorList } from '../utils'
import icon from './assets/imgs/double-metric-icon.svg'

export interface DoubleMetricDataType {
  innerData: Array<NameValue>,
  outerData: Array<NameValue>
}

export const processDoubleMetricData = (data: Array<MetricStatisticType>): DoubleMetricDataType => {
  const innerData = [] as Array<any>
  const outerData = [] as Array<any>
  data.forEach((item: MetricStatisticType) => {
    innerData.push({ name: item.metricLabel, value: item.statistic })
    let index = Math.floor(Math.random() * 9 % 9)
    item.children.forEach(child => {
      outerData.push({
        name: child.metricLabel,
        value: child.statistic,
        itemStyle: { color: colorList[index++] },
        parentName: item.metricLabel
      })
    })
  })
  innerData.forEach((item, index: number) => index < 10 && (item.itemStyle = { color: colorList[index] }))
  return { innerData, outerData }
}

export const getEchartsDoubleMetricOption = ({ innerData, outerData }: DoubleMetricDataType) => {
  const legendData = innerData.map((item: any) => item.name)
  const legendSelected: Record<string, boolean> = {}
  innerData.forEach(item => {
    legendSelected[item.name] = true
  })
  outerData = outerData.filter((item: any) => item.value)
  return {
    graphic: {
      elements: [{
        type: 'image',
        style: {
          image: icon,
          width: 40,
          height: 40
        },
        left: 'center',
        top: 'center'
      }]
    },
    tooltip: {
      trigger: 'item',
      formatter({ data: { value, name, parentName }, marker }: any) {
        if (parentName) return `${ marker }${ parentName }<br/>${ name }: ${ value }`
        else return `${ marker }${ name }: ${ value }`
      }
    },
    legend: {
      top: 10,
      right: 0,
      orient: 'vertical',
      icon: 'rect',
      itemHeight: 6,
      itemWidth: 12,
      textStyle: {
        fontSize: '12px',
        color: '#00042D',
        fontFamily: 'Noto Sans SC'
      },
      data: legendData,
      selected: legendSelected
    },
    series: [
      {
        name: '生产状态',
        type: 'pie',
        radius: ['30%', '52%'],
        label: { show: false },
        data: innerData,
        itemStyle: {
          borderColor: '#00042D',
          borderWidth: 3
        },
        startAngle: 180,
        zlevel: 1,
        emphasis: { scale: false }
      }, {
        name: '',
        type: 'pie',
        radius: ['52%', '72%'],
        label: {
          show: true,
          color: 'inherit',
          formatter: '{bd|{b}}\n{hr|}\n{bd|{d}%}',
          rich: {
            hr: {
              backgroundColor: 'inherit',
              borderRadius: 100,
              padding: [-5, 3, 0, -10]
            },
            bd: {
              color: '#333',
              align: 'center',
              padding: [0, 5, -4, 5],
              fontSize: 12,
              fontFamily: 'Noto Sans SC'
            }
          }
        },
        itemStyle: {
          borderColor: '#00042D',
          borderWidth: 3
        },
        labelLine: {
          lineStyle: {
            width: 1.5
          }
        },
        startAngle: 180,
        data: outerData,
        zlevel: 2
      }
    ]
  }
}
