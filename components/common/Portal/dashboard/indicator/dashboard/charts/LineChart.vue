<template>
  <div
    class="line-chart-container"
    :style="{ width: width, height: height }"
  >
    <a-spin
      :spinning="loading"
      tip="正在加载图表数据..."
    >
      <div
        ref="chartRef"
        class="echarts-container"
      ></div>
    </a-spin>
  </div>
</template>

<script lang="ts">
import * as echarts from 'echarts'
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ChartDataItem, DataMetric } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'
import { isNotEmpty } from '@/framework/utils/common'

export default defineComponent({
  name: 'LineChart',
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
    // 维度名称到编码的映射，用于颜色等与配置对齐
    dimensionValueMap: {
      type: Object as () => { first?: Record<string, string>; second?: Record<string, string> } | undefined,
      default: undefined
    }
  },
  emits: ['click'],
  setup(props, { emit }) {

    // 响应式数据
    const chartRef = ref<HTMLElement>()
    let chartInstance: echarts.ECharts | null = null

    // 解析单位配置函数
    const parseUnitConfig = (unitConfig?: string): { fix: number; unit: number } => {
      if (!unitConfig || typeof unitConfig !== 'string') {
        return { fix: 0, unit: 1 } // 不需要小数位，单位为1（不转换）
      }

      const parts = unitConfig.split(',')
      if (parts.length !== 2) {
        return { fix: 0, unit: 1 }
      }

      const fix = parseInt(parts[0], 10)
      const unit = parseInt(parts[1], 10)

      // 确保解析结果有效，对于金额字段应该正确解析小数位
      return {
        fix: isNaN(fix) ? 0 : fix,
        unit: isNaN(unit) ? 1 : unit
      }
    }

    // Y轴格式化函数：显示整数，不保留小数位
    const formatYAxisValue = (value: number): string => {
      return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }

    // 根据统计类型获取单位的通用函数
    const getUnitByStatType = (statType: string): string => {
      const metric = props.dataMetrics.find(m => m.dataName === statType)
      return metric?.unit || ''
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

      // 展开嵌套数据结构，将children中的数据提取出来
      const flattenedData: Array<{
        metricLabel: string
        statistic: number
        statisticType: string
        firstDimension: string
        secondDimension: string
      }> = []

      data.forEach(item => {
        // 处理分隔符
        const parts = item.metricLabel.split('&&')

        const firstDim = parts[0] || ''  // 第一维度
        const secondDim = parts[1] // 第二维度

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

      // 提取维度分组，保持原始顺序
      const firstDimensionGroups = [...new Set(flattenedData.map(item => item.firstDimension))]
      const secondDims = flattenedData.map(item => item.secondDimension).filter(item => item != null)
      const secondDimensionGroups = isNotEmpty(secondDims) ? [...new Set(secondDims)] : []
      const statisticTypes = [...new Set(flattenedData.map(item => item.statisticType))]

      return {
        firstDimensionGroups,
        secondDimensionGroups,
        statisticTypes,
        flattenedData
      }
    }

    // 生成折线图配置
    const generateLineChartOption = (processedData: any): echarts.EChartsOption => {
      const { firstDimensionGroups, secondDimensionGroups, statisticTypes, flattenedData } = processedData

      // 使用props.categories或默认的firstDimensionGroups
      const categories = props.categories || firstDimensionGroups

      const series: any[] = []

      // 当secondDimensionGroups为空时，只使用categories和statisticTypes生成系列
      if (!isNotEmpty(secondDimensionGroups)) {
        // 没有第二维度，直接按统计类型创建系列
        statisticTypes.forEach((statType: string, statIndex: number) => {
          const metric = props.dataMetrics.find(m => m.dataName === statType)
          if (!metric) return

          const seriesData = categories.map((category: string, categoryIndex: number) => {
            const item = flattenedData.find((d: any) =>
              d.firstDimension === category &&
              d.statisticType === statType
            )

            const itemColor = (props.dimensionValueMap
              && metric.itemColors
              && props.dimensionValueMap.first
              && metric.itemColors[props.dimensionValueMap.first[category]])
              || metric.color
              || `hsl(${((statIndex * categories.length + categoryIndex) * 30) % 360}, 70%, 50%)`

            // 对数据值进行单位转换
            const originalValue = item ? item.statistic : 0
            const { unit: unitDivisor } = metric.unitConfig ? parseUnitConfig(metric.unitConfig) : { unit: 1 }
            // 对于非金额指标，确保结果为整数；对于金额指标，保持精度
            const convertedValue = metric.unitConfig ? originalValue / unitDivisor : Math.round(originalValue)

            return {
              value: convertedValue,
              itemStyle: {
                color: itemColor
              }
            }
          })

          const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

          series.push({
            name: statType,
            type: 'line',
            yAxisIndex,
            data: seriesData,
            lineStyle: {
              color: metric.color || `hsl(${(statIndex * 60) % 360}, 70%, 50%)`,
              width: 2
            },
            symbol: 'circle',
            symbolSize: 6,
            label: {
              show: true,
              formatter: (params: any) => {
                const metric = props.dataMetrics.find(m => m.dataName === params.seriesName || m.dataName === params.seriesName.split('&&')[1])
                if (metric?.unitConfig) {
                  const { fix } = parseUnitConfig(metric.unitConfig)
                  return Number(params.value).toLocaleString(undefined, {
                    minimumFractionDigits: fix,
                    maximumFractionDigits: fix
                  })
                }
                // 非金额指标显示为整数
                return Number(params.value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              },
              fontSize: 10,
              color: metric.color || `hsl(${(statIndex * 60) % 360}, 70%, 50%)`
            },
            emphasis: {
              focus: 'series',
              // 扩大强调区域
              lineStyle: {
                width: 4,
                shadowBlur: 5,
                shadowColor: 'rgba(0,0,0,0.3)'
              },
              itemStyle: {
                borderWidth: 3,
                borderColor: '#fff',
                shadowBlur: 5,
                shadowColor: 'rgba(0,0,0,0.3)'
              }
            },
            // 扩大触发区域
            triggerLineEvent: true,
            animationDelay: (idx: number) => idx * 50
          })
        })
      } else {
        // 有第二维度，按原有逻辑生成系列数据
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
              // 对数据值进行单位转换
              const originalValue = item ? item.statistic : 0
              const { unit: unitDivisor } = metric.unitConfig ? parseUnitConfig(metric.unitConfig) : { unit: 1 }
              // 对于非金额指标，确保结果为整数；对于金额指标，保持精度
              return metric.unitConfig ? originalValue / unitDivisor : Math.round(originalValue)
            })

            const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

            // 使用传入映射优先获取编码
            const mappedCode = props.dimensionValueMap?.second?.[secondDim]
            const fallbackCode = (secondDimensionGroups.indexOf(secondDim) + 1).toString().padStart(2, '0')
            const itemValueCode = mappedCode || fallbackCode

            // 根据itemColors获取颜色，如果没有则使用默认color或生成颜色
            const metricCfg = props.dataMetrics.find(m => m.dataName === statType)
            const itemColor = metricCfg?.itemColors?.[itemValueCode] ||
              metricCfg?.color ||
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
                  // 有二级维度的折线图标签格式化
                  const metric = props.dataMetrics.find(m => m.dataName === params.seriesName.split('&&')[1])
                  if (metric?.unitConfig) {
                    const { fix } = parseUnitConfig(metric.unitConfig)
                    return Number(params.value).toLocaleString(undefined, {
                      minimumFractionDigits: fix,
                      maximumFractionDigits: fix
                    })
                  }
                  // 非金额指标显示为整数
                  return Number(params.value).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })
                },
                fontSize: 10,
                color: itemColor
              },
              emphasis: {
                focus: 'series',
                // 扩大强调区域
                lineStyle: {
                  width: 4,
                  shadowBlur: 5,
                  shadowColor: 'rgba(0,0,0,0.3)'
                },
                itemStyle: {
                  borderWidth: 3,
                  borderColor: '#fff',
                  shadowBlur: 5,
                  shadowColor: 'rgba(0,0,0,0.3)'
                }
              },
              // 扩大触发区域
              triggerLineEvent: true,
              animationDelay: (idx: number) => idx * 50
            })
          })
        })
      }

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
              formatter: (value: number) => {
                const formatted = (() => {
                  const metric = leftMetrics[0]
                  if (metric?.unitConfig) {
                    // Y轴显示整数，不保留小数位
                    return formatYAxisValue(value)
                  }
                  return value.toString()
                })()
                return `${formatted}${leftMetrics[0].unit || ''}`
              },
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
          left: 'center',
          top: '0%',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          top: '5%',
          left: 'center',
          width: '80%',
          itemGap: 15,
          itemHeight: 14,
          show: isNotEmpty(secondDimensionGroups),
          formatter: (name: string) => {
            // 将 "维度&&统计类型" 格式化为 "维度(统计类型)"
            if (name.includes('&&')) {
              const parts = name.split('&&')
              return `${parts[0]}(${parts[1]})`
            }
            return name
          }
        },
        tooltip: {
          trigger: 'axis',
          enterable: true,  // 允许鼠标进入tooltip
          triggerOn: 'mousemove|click',  // 鼠标移动或点击时触发
          confine: false,    // 不限制在图表容器内
          appendToBody: true, // 添加到body，扩大触发范围
          position: function (point: any, params: any, dom: any, rect: any, size: any) {
            // 动态调整tooltip位置，确保不超出屏幕边界
            let x = point[0]
            let y = point[1]
            const boxWidth = size.contentSize[0]
            const boxHeight = size.contentSize[1]

            // 水平方向调整
            if (x + boxWidth > size.viewSize[0]) {
              x = point[0] - boxWidth
            }

            // 垂直方向调整
            if (y + boxHeight > size.viewSize[1]) {
              y = point[1] - boxHeight
            }

            return [x, y]
          },
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#ddd',
          borderWidth: 1,
          textStyle: {
            color: '#333',
            fontSize: 12
          },
          extraCssText: 'max-height: 600px; max-width: 600px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; border-radius: 6px;',
          formatter: (params: any) => {
            let result = `<strong>${params[0].axisValue}</strong><br/>`

            // 判断是否有第二维度
            const hasSecondDimension = isNotEmpty(secondDimensionGroups)

            if (hasSecondDimension) {
              // 有第二维度时，按统计类型分组
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
                  const formattedValue = (() => {
                    const metric = props.dataMetrics.find(m => m.dataName === statType)
                    if (metric?.unitConfig) {
                      const { fix } = parseUnitConfig(metric.unitConfig)
                      return Number(param.value).toLocaleString(undefined, {
                        minimumFractionDigits: fix,
                        maximumFractionDigits: fix
                      })
                    }
                    // 非金额指标显示为整数
                    return Number(param.value).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })
                  })()
                  result += `${param.marker}${param.secondDimension}: ${formattedValue}${unit} (${percentage}%)<br/>`
                })

                const metric = props.dataMetrics.find(m => m.dataName === statType)
                const formattedTotal = (() => {
                  if (metric?.unitConfig) {
                    const { fix } = parseUnitConfig(metric.unitConfig)
                    return Number(total).toLocaleString(undefined, {
                      minimumFractionDigits: fix,
                      maximumFractionDigits: fix
                    })
                  }
                  // 非金额指标显示为整数
                  return Number(total).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })
                })()
                result += `<span style="color: #666; font-size: 12px;">小计: ${formattedTotal}${getUnitByStatType(statType)}</span></div>`
              })
            } else {
              // 没有第二维度时，直接显示每个系列的数据
              params.forEach((param: any) => {
                const unit = getUnitByStatType(param.seriesName)
                const metric = props.dataMetrics.find(m => m.dataName === param.seriesName)
                const formattedValue = (() => {
                  if (metric?.unitConfig) {
                    const { fix } = parseUnitConfig(metric.unitConfig)
                    return Number(param.value).toLocaleString(undefined, {
                      minimumFractionDigits: fix,
                      maximumFractionDigits: fix
                    })
                  }
                  // 非金额指标显示为整数
                  return Number(param.value).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })
                })()
                result += `${param.marker}${param.seriesName}: ${formattedValue}${unit}<br/>`
              })
            }

            return result
          }
        },
        grid: {
          left: '5%',
          right: '5%',
          bottom: '5%',
          top: '15%',
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
        if (chartInstance && chartRef.value) {
          try {
            chartInstance.resize()
          } catch (error) {
            console.warn('窗口resize时图表调整失败:', error)
          }
        }
      }
      window.addEventListener('resize', resizeHandler)

        // 保存事件监听器以便清理
        ; (chartInstance as any)._resizeHandler = resizeHandler

      updateChart()
    }

    // 更新图表
    const updateChart = () => {
      if (!chartInstance || !chartRef.value) return

      try {
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
        const option = generateLineChartOption(processedData)

        chartInstance.setOption(option, true)
      } catch (error) {
        console.warn('更新图表失败:', error)
      }
    }

    // 监听数据变化
    watch(
      () => [props.data, props.dataMetrics, props.title],
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
        if (chartInstance && chartRef.value) {
          try {
            await nextTick()
            chartInstance.resize()
          } catch (error) {
            console.warn('图表resize失败:', error)
          }
        }
      }
    )

    // 生命周期钩子
    onMounted(async () => {
      await initChart()

      // 在弹窗环境中，需要额外的延迟来确保容器完全渲染
      setTimeout(() => {
        if (chartInstance && chartRef.value) {
          try {
            chartInstance.resize()
          } catch (error) {
            console.warn('延迟resize失败:', error)
          }
        }
      }, 200)
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
      refresh: updateChart,
      getInstance: () => chartInstance
    }
  }
})
</script>

<style lang="less" scoped>
.line-chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.ant-spin-nested-loading) {
    width: 100%;
    height: 100%;
  }

  :deep(.ant-spin-container) {
    width: 100%;
    height: 100%;
  }

  .echarts-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
  }
}
</style>
