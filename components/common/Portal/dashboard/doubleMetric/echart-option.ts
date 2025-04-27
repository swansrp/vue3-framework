import icon from './assets/imgs/prodution-icon.svg'
import { colorList, NameValue } from '../type'


export interface DoubleMetricDataType {
  innerData: Array<NameValue>,
  outerData: Array<NameValue>
}

export const processDoubleMetricData = (data: any, innerDictMap: any, outerDictMap: any): DoubleMetricDataType => {
  const innerData = [] as Array<any>
  const outerData = [] as Array<any>
  const innerMap = new Map<String, { name: string, value: number, subData: Array<any> }>()
  data.forEach((item: any) => {
    const innerDictValue = item.metric.split(',')[0]
    const outerDictValue = item.metric.split(',')[1]
    const innerDictLabel = innerDictValue==='NULL' ? '未知' : innerDictMap.get(String(innerDictValue))
    const outerDictLabel = outerDictValue==='NULL' ? '未知' : outerDictMap?.get(String(outerDictValue))
    const inner = innerMap.get(innerDictValue)
    if (isEmpty(inner)) {
      innerMap.set(innerDictValue, {
        name: innerDictLabel,
        value: item.statistic,
        subData: outerDictLabel ? [{ name: outerDictLabel, value: item.statistic }] : []
      })
    } else {
      inner && (inner.value += item.statistic)
      outerDictLabel && inner?.subData.push({ name: outerDictLabel, value: item.statistic })
    }
  })
  innerMap.forEach((item: any) => {
    innerData.push({name: item.name, value: item.value})
    item.subData.forEach((subItem: any) => {
      subItem.parentName = item.name
      subItem.itemStyle = { color: colorList[Math.floor(Math.random() * 9 % 9)] }
    })
    outerData.push(...item.subData)
  })
  innerData.forEach((item, index: number) => index < 10 && (item.itemStyle = { color: colorList[index] }))
  return { innerData, outerData }
}

export const getEchartsDoubleMetricOption = ({ innerData, outerData }: DoubleMetricDataType) => {
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
      trigger: 'item' ,
      formatter({data: {value, name, parentName}, marker}:any){
        if (parentName) return `${marker}${parentName}<br/>${name}: ${value}`
        else return `${marker}${name}: ${value}`
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
        color: '#C6D1DB',
        fontFamily: 'Noto Sans SC'
      },
      data: ['签订成功', '签订中', '跟踪中'],
      selected: {'签订成功': true, '签订中': true, '跟踪中': true}
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
          borderWidth : 3
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
              padding: [-5, 3, 0, -10],
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
          borderWidth : 3
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
