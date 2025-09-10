<template>
  <div class="universal-chart-container">
    <a-spin :spinning="loading" tip="正在加载图表数据...">
      <div ref="chartRef" class="echarts-container" :style="{ height: height, width: width }"></div>
    </a-spin>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, nextTick, onBeforeUnmount, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { DataMetric, ChartDataItem } from '../universalChart/ChartTypes'

export default defineComponent({
  name: 'UniversalChart',
  props: {
    data: {
      type: Array as () => ChartDataItem[],
      required: true
    },
    dataMetrics: {
      type: Array as () => DataMetric[],
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '数据统计图表'
    },
    subtitle: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: '400px'
    },
    width: {
      type: String,
      default: '100%'
    },
    categories: {
      type: Array as () => string[],
      default: () => []
    },
    chartType: {
      type: String as () => 'bar' | 'line' | 'pie',
      default: 'bar'
    }
  },
  emits: ['click'],
  setup(props, { emit }) {

    // 响应式数据
    const chartRef = ref<HTMLElement>()
    let chartInstance: echarts.ECharts | null = null

    // 直接按照传入的chartType参数选择图表类型
    const finalChartType = computed(() => {
      // 检查dataMetrics中是否有数据，如果有且只有一个指标且chartType为pie，则使用饼图
      if (props.dataMetrics && props.dataMetrics.length === 1 && props.dataMetrics[0].chartType === 'pie') {
        return 'pie'
      }
      // 否则使用传入的chartType
      return props.chartType || 'bar'
    })

    // 根据统计类型获取单位的通用函数
    const getUnitByStatType = (statType: string): string => {
      const metric = props.dataMetrics.find(m => m.dataName === statType)
      return metric?.unit || '个'
    }

    // 处理数据为 ECharts 格式
    const processChartData = (data: ChartDataItem[]) => {
      if (!data || data.length === 0) {
        return {
          firstDimensionGroups: [],
          secondDimensionGroups: [],
          statisticTypes: [],
          flattenedData: []
        }
      }

      console.log('原始数据:', data)

      // 展开嵌套数据结构，将children中的数据提取出来
      const flattenedData: Array<{
        metricLabel: string
        statistic: number
        statisticType: string
        firstDimension: string
        secondDimension: string
      }> = []

      data.forEach(item => {
        // 处理分隔符，支持&&和@两种格式
        const parts = item.metricLabel.includes('&&')
          ? item.metricLabel.split('&&')
          : item.metricLabel.split('@')

        const firstDim = parts[0] || ''  // 第一维度
        const secondDim = parts[1] || '' // 第二维度

        // 处理children中的细分统计
        if (item.children && item.children.length > 0) {
          item.children.forEach(child => {
            const statisticType = child.metric

            flattenedData.push({
              metricLabel: `${firstDim}&&${secondDim}&&${statisticType}`,
              statistic: child.statistic,
              statisticType: statisticType,
              firstDimension: firstDim,
              secondDimension: secondDim
            })
          })
        } else {
          // 如果没有children，直接使用当前项的数据
          flattenedData.push({
            metricLabel: item.metricLabel,
            statistic: item.statistic,
            statisticType: item.metric,
            firstDimension: firstDim,
            secondDimension: secondDim
          })
        }
      })

      console.log('展开后的数据:', flattenedData)

      // 提取维度分组，保持原始顺序
      const firstDimensionGroups = [...new Set(flattenedData.map(item => item.firstDimension))]
      const secondDimensionGroups = [...new Set(flattenedData.map(item => item.secondDimension))]
      const statisticTypes = [...new Set(flattenedData.map(item => item.statisticType))]

      return {
        firstDimensionGroups,
        secondDimensionGroups,
        statisticTypes,
        flattenedData
      }
    }

    // 生成柱状图配置
    const generateBarChartOption = (processedData: any): echarts.EChartsOption => {
      const { firstDimensionGroups, secondDimensionGroups, statisticTypes, flattenedData } = processedData

      // 使用props.categories或默认的firstDimensionGroups
      const categories = props.categories || firstDimensionGroups

      const series: any[] = []

      // 生成系列数据
      secondDimensionGroups.forEach((secondDim: string) => {
        statisticTypes.forEach((statType: string) => {
          const metric = props.dataMetrics.find(m => m.dataName === statType)
          if (!metric) return

          const seriesData = categories.map((category: string) => {
            const item = flattenedData.find((d: any) =>
              d.firstDimension === category &&
              d.secondDimension === secondDim &&
              d.statisticType === statType
            )
            return item ? item.statistic : 0
          })

          // 根据指标配置决定使用哪个y轴
          const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

          // 查找第二维度的索引，用于获取itemColors中的颜色
          const secondDimIndex = secondDimensionGroups.indexOf(secondDim)
          const itemValue = (secondDimIndex + 1).toString().padStart(2, '0') // 生成 01, 02, 03, 04 格式

          // 根据metric的itemColors获取颜色，优先使用itemColors配置
          const itemColor = metric.itemColors?.[itemValue] ||
            metric.color ||
            `hsl(${(series.length * 60) % 360}, 70%, 50%)`

          // 堆叠配置：相同stackGroup且相同y轴的系列才堆叠
          const stackKey = metric.stackGroup ? `${metric.stackGroup}-${metric.yAxisPosition}-${secondDim}` : undefined

          series.push({
            name: `${secondDim}&&${statType}`,
            type: 'bar',
            yAxisIndex,
            stack: stackKey,
            data: seriesData,
            itemStyle: {
              color: itemColor
            },
            label: {
              show: true,
              position: 'inside', // 所有标签都在柱子内部显示
              formatter: (params: any) => {
                return `${params.value}`
              },
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowBlur: 2
            },
            emphasis: {
              focus: 'series'
            },
            animationDelay: (idx: number) => idx * 50
          })
        })
      })

      // 动态生成y轴配置
      const generateYAxes = () => {
        const yAxes: any[] = []

        // 左y轴配置
        const leftMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'left')
        if (leftMetrics.length > 0) {
          yAxes.push({
            type: 'value',
            name: leftMetrics[0].dataName,
            position: 'left',
            axisLabel: {
              formatter: `{value}${leftMetrics[0].unit}`,
              fontSize: 12
            },
            splitLine: {
              show: true
            }
          })
        }

        // 右y轴配置
        const rightMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'right')
        if (rightMetrics.length > 0) {
          // 按stackGroup分组处理右y轴指标
          const stackGroups = new Map<string, any[]>()
          rightMetrics.forEach(metric => {
            if (metric.stackGroup) {
              if (!stackGroups.has(metric.stackGroup)) {
                stackGroups.set(metric.stackGroup, [])
              }
              stackGroups.get(metric.stackGroup)!.push(metric)
            }
          })

          const processedStackGroups = new Set<string>()
          const nonStackedMetrics: any[] = []

          rightMetrics.forEach(metric => {
            if (metric.stackGroup && !processedStackGroups.has(metric.stackGroup)) {
              const sameStackMetrics = stackGroups.get(metric.stackGroup)
              if (sameStackMetrics && sameStackMetrics.length > 1) {
                // 多个相同stackGroup的指标，合并显示
                const units = [...new Set(sameStackMetrics.map((m: any) => m.unit))]
                const combinedUnit = units.length === 1 ? units[0] : units.join('/')
                const namesText = sameStackMetrics.map((m: any) => m.dataName).join('/')

                yAxes.push({
                  type: 'value',
                  name: namesText,
                  position: 'right',
                  axisLabel: {
                    formatter: `{value}${combinedUnit}`,
                    fontSize: 12
                  },
                  splitLine: {
                    show: false
                  }
                })
                processedStackGroups.add(metric.stackGroup)
              } else {
                nonStackedMetrics.push(metric)
              }
            } else if (!metric.stackGroup) {
              nonStackedMetrics.push(metric)
            }
          })

          // 处理没有堆叠或单独的指标
          if (nonStackedMetrics.length > 0) {
            nonStackedMetrics.forEach((metric: any) => {
              yAxes.push({
                type: 'value',
                name: metric.dataName,
                position: 'right',
                offset: (yAxes.filter((axis: any) => axis.position === 'right').length) * 60,
                axisLabel: {
                  formatter: `{value}${metric.unit}`,
                  fontSize: 12
                },
                splitLine: {
                  show: false
                }
              })
            })
          }
        }

        return yAxes
      }

      return {
        title: {
          text: props.title,
          subtext: props.subtitle,
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          top: '10%',
          left: 'center',
          width: '80%'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params: any) => {
            let result = `<strong>${params[0].axisValue}</strong><br/>`

            // 按统计类型分组
            const groupedParams = params.reduce((acc: any, param: any) => {
              const parts = param.seriesName.split('&&')
              const secondDimension = parts[0]
              const statType = parts[1]

              if (!acc[statType]) {
                acc[statType] = []
              }
              acc[statType].push({ ...param, secondDimension })
              return acc
            }, {})

            // 为每个统计类型显示数据
            Object.keys(groupedParams).forEach(statType => {
              result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid #1890ff; background: #f0f9ff;"><strong>${statType}</strong><br/>`

              const typeParams = groupedParams[statType]
              const total = typeParams.reduce((sum: number, p: any) => sum + p.value, 0)

              typeParams.forEach((param: any) => {
                const percentage = total > 0 ? ((param.value / total) * 100).toFixed(1) : '0.0'
                const unit = getUnitByStatType(statType)
                result += `${param.marker}${param.secondDimension}: ${param.value}${unit} (${percentage}%)<br/>`
              })

              result += `<span style="color: #666; font-size: 12px;">小计: ${total}${getUnitByStatType(statType)}</span></div>`
            })

            return result
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '3%',
          top: '120px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: {
            fontSize: 12,
            interval: 0,
            rotate: categories.length > 6 ? 45 : 0
          }
        },
        yAxis: generateYAxes(),
        series: series as echarts.SeriesOption[],
        animationEasing: 'elasticOut',
        animationDelayUpdate: (idx: number) => idx * 5
      }
    }

    // 生成折线图配置
    const generateLineChartOption = (processedData: any): echarts.EChartsOption => {
      const { firstDimensionGroups, secondDimensionGroups, statisticTypes, flattenedData } = processedData

      // 使用props.categories或默认的firstDimensionGroups
      const categories = props.categories || firstDimensionGroups

      const series: any[] = []

      // 生成系列数据
      secondDimensionGroups.forEach((secondDim: string) => {
        statisticTypes.forEach((statType: string) => {
          const metric = props.dataMetrics.find(m => m.dataName === statType)
          if (!metric) return

          const seriesData = categories.map((category: string) => {
            const item = flattenedData.find((d: any) =>
              d.firstDimension === category &&
              d.secondDimension === secondDim &&
              d.statisticType === statType
            )
            return item ? item.statistic : 0
          })

          const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

          // 查找第二维度的itemValue来获取正确的颜色
          const secondDimItem = props.dataMetrics.find(m => m.dataName === statType)
          const itemValue = secondDimensionGroups.indexOf(secondDim).toString().padStart(2, '0')

          // 根据itemColors获取颜色，如果没有则使用默认color或生成颜色
          const itemColor = secondDimItem?.itemColors?.[itemValue] ||
            secondDimItem?.itemColors?.[`0${secondDimensionGroups.indexOf(secondDim) + 1}`] ||
            secondDimItem?.color ||
            `hsl(${(series.length * 60) % 360}, 70%, 50%)`

          series.push({
            name: `${secondDim}&&${statType}`,
            type: 'line',
            yAxisIndex,
            data: seriesData,
            lineStyle: {
              color: itemColor,
              width: 2
            },
            itemStyle: {
              color: itemColor
            },
            symbol: 'circle',
            symbolSize: 6,
            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.value}`
              },
              fontSize: 10,
              color: itemColor
            },
            emphasis: {
              focus: 'series'
            },
            animationDelay: (idx: number) => idx * 50
          })
        })
      })

      // 动态生成y轴配置(与柱状图相同的逻辑)
      const generateYAxes = () => {
        const yAxes: any[] = []

        // 左y轴配置
        const leftMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'left')
        if (leftMetrics.length > 0) {
          yAxes.push({
            type: 'value',
            name: leftMetrics[0].dataName,
            position: 'left',
            axisLabel: {
              formatter: `{value}${leftMetrics[0].unit}`,
              fontSize: 12
            },
            splitLine: {
              show: true
            }
          })
        }

        // 右y轴配置
        const rightMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'right')
        if (rightMetrics.length > 0) {
          rightMetrics.forEach((metric, index) => {
            yAxes.push({
              type: 'value',
              name: metric.dataName,
              position: 'right',
              alignTicks: true,
              offset: index * 60,
              axisLabel: {
                formatter: `{value}${metric.unit}`,
                fontSize: 12
              },
              splitLine: {
                show: false
              }
            })
          })
        }

        return yAxes
      }

      return {
        title: {
          text: props.title,
          subtext: props.subtitle,
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          top: '10%',
          left: 'center',
          width: '80%'
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            let result = `<strong>${params[0].axisValue}</strong><br/>`

            // 按统计类型分组
            const groupedParams = params.reduce((acc: any, param: any) => {
              const parts = param.seriesName.split('&&')
              const secondDimension = parts[0]
              const statType = parts[1]

              if (!acc[statType]) {
                acc[statType] = []
              }
              acc[statType].push({ ...param, secondDimension })
              return acc
            }, {})

            // 为每个统计类型显示数据
            Object.keys(groupedParams).forEach(statType => {
              result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid #1890ff; background: #f0f9ff;"><strong>${statType}</strong><br/>`

              const typeParams = groupedParams[statType]
              const total = typeParams.reduce((sum: number, p: any) => sum + p.value, 0)

              typeParams.forEach((param: any) => {
                const percentage = total > 0 ? ((param.value / total) * 100).toFixed(1) : '0.0'
                const unit = getUnitByStatType(statType)
                result += `${param.marker}${param.secondDimension}: ${param.value}${unit} (${percentage}%)<br/>`
              })

              result += `<span style="color: #666; font-size: 12px;">小计: ${total}${getUnitByStatType(statType)}</span></div>`
            })

            return result
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '3%',
          top: '120px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            fontSize: 12,
            interval: 0,
            rotate: categories.length > 6 ? 45 : 0
          }
        },
        yAxis: generateYAxes(),
        series: series as echarts.SeriesOption[]
      }
    }

    // 生成饼图配置
    const generatePieChartOption = (processedData: any): echarts.EChartsOption => {
      const { flattenedData } = processedData

      // 饼图通常显示单一指标的原始数据分布
      const pieMetric = props.dataMetrics[0] // 获取第一个指标作为饼图数据

      if (!pieMetric) {
        return { series: [] }
      }

      // 根据数据结构处理饼图数据 - 饼图应该显示所有维度组合的数据
      let pieData: Array<{ name: string; value: number; itemStyle?: { color: string }; firstDimension?: string; secondDimension?: string }>

      if (flattenedData.length > 0) {
        // 使用所有维度组合数据，而不是只按第一维度聚合
        pieData = flattenedData
          .filter((item: any) => item.statisticType === pieMetric.dataName)
          .map((item: any, index: number) => {
            // 生成itemValue格式 01, 02, 03, 04
            const itemValue = (index + 1).toString().padStart(2, '0')

            return {
              name: `${item.firstDimension}&&${item.secondDimension}`, // 使用完整的维度标签
              value: item.statistic,
              firstDimension: item.firstDimension,
              secondDimension: item.secondDimension,
              itemStyle: {
                color: pieMetric.itemColors?.[itemValue] ||
                  `hsl(${(index * 60) % 360}, 70%, 50%)`
              }
            }
          })
      } else {
        // 如果没有展开数据，直接使用原始数据
        pieData = props.data.map((item, index) => {
          // 生成itemValue格式 01, 02, 03, 04
          const itemValue = (index + 1).toString().padStart(2, '0')
          const parts = item.metricLabel.split('&&')

          return {
            name: item.metricLabel,
            value: item.statistic,
            firstDimension: parts[0] || '',
            secondDimension: parts[1] || '',
            itemStyle: {
              color: pieMetric.itemColors?.[itemValue] ||
                `hsl(${(index * 60) % 360}, 70%, 50%)`
            }
          }
        })
      }

      // 按值排序
      pieData.sort((a, b) => b.value - a.value)

      return {
        title: {
          text: props.title,
          subtext: props.subtitle,
          left: 'center',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            // 使用与柱状图相同的悬浮框格式
            const unit = pieMetric.unit || ''
            const parts = params.name.split('&&')
            const firstDim = parts[0] || ''
            const secondDim = parts[1] || ''

            let result = `<strong>${firstDim}</strong><br/>`
            result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid #1890ff; background: #f0f9ff;"><strong>${pieMetric.dataName}</strong><br/>`
            result += `${params.marker}${secondDim}: ${params.value}${unit} (${params.percent}%)<br/>`
            result += `<span style="color: #666; font-size: 12px;">数值: ${params.value}${unit}</span></div>`

            return result
          }
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          formatter: (name: string) => {
            const item = pieData.find(d => d.name === name)
            const unit = pieMetric.unit || ''
            const parts = name.split('&&')
            const firstDim = parts[0] || ''
            const secondDim = parts[1] || ''
            // 显示格式：第一维度 第二维度&&指标名称: 数值单位
            const displayName = `${firstDim} ${secondDim}&&${pieMetric.dataName}`
            return `${displayName}: ${item?.value || 0}${unit}`
          }
        },
        series: [
          {
            name: pieMetric.dataName,
            type: 'pie',
            radius: ['30%', '70%'],
            center: ['60%', '50%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: (params: any) => {
                const parts = params.name.split('&&')
                const firstDim = parts[0] || ''
                const secondDim = parts[1] || ''
                // 显示格式：第一维度 第二维度&&指标名称: 百分比
                return `${firstDim} ${secondDim}&&${pieMetric.dataName}: ${params.percent}%`
              },
              fontSize: 10 // 缩小字体以适应更长的标签
            },
            labelLine: {
              show: true
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: () => Math.random() * 200
          }
        ] as echarts.SeriesOption[]
      }
    }

    // 生成图表配置
    const generateChartOption = (processedData: any): echarts.EChartsOption => {
      // 根据智能选择的图表类型生成相应配置
      switch (finalChartType.value) {
        case 'pie':
          return generatePieChartOption(processedData)
        case 'line':
          return generateLineChartOption(processedData)
        case 'bar':
        default:
          return generateBarChartOption(processedData)
      }
    }

    // 初始化 ECharts
    const initChart = async () => {
      if (!chartRef.value) return

      // 等待DOM元素渲染完成
      await nextTick()

      if (chartInstance) {
        chartInstance.dispose()
      }

      chartInstance = echarts.init(chartRef.value)

      // 添加点击事件监听
      chartInstance.on('click', (params: any) => {
        emit('click', params)
      })

      // 监听窗口大小变化
      const resizeHandler = () => {
        chartInstance?.resize()
      }
      window.addEventListener('resize', resizeHandler)

        // 保存事件监听器以便清理
        ; (chartInstance as any)._resizeHandler = resizeHandler

      updateChart()
    }

    // 更新图表
    const updateChart = () => {
      if (!chartInstance) return

      if (!props.data || props.data.length === 0) {
        // 显示空数据提示
        chartInstance.setOption({
          title: {
            text: props.title,
            subtext: '暂无数据',
            left: 'center',
            textStyle: {
              fontSize: 18,
              color: '#999'
            }
          },
          series: []
        }, true)
        return
      }

      const processedData = processChartData(props.data)
      const option = generateChartOption(processedData)

      console.log('生成的图表配置:', option)
      console.log('使用的图表类型:', finalChartType.value)

      chartInstance.setOption(option, true)
    }

    // 监听数据变化
    watch(
      () => [props.data, props.dataMetrics, props.title, props.subtitle],
      () => {
        if (chartInstance) {
          updateChart()
        }
      },
      { deep: true }
    )

    // 监听尺寸变化
    watch(
      () => [props.height, props.width],
      async () => {
        if (chartInstance) {
          await nextTick()
          chartInstance.resize()
        }
      }
    )

    // 生命周期钩子
    onMounted(async () => {
      await initChart()
    })

    onBeforeUnmount(() => {
      if (chartInstance) {
        // 清理事件监听器
        const resizeHandler = (chartInstance as any)._resizeHandler
        if (resizeHandler) {
          window.removeEventListener('resize', resizeHandler)
        }

        chartInstance.dispose()
        chartInstance = null
      }
    })

    // 暴露方法供父组件调用
    return {
      chartRef,
      finalChartType,
      refresh: updateChart,
      getInstance: () => chartInstance,
      getChartType: () => finalChartType.value
    }
  }
})
</script>

<style lang="less" scoped>
@import '../styles/UniversalChart.less';
</style>
