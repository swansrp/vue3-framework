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

    const DEFAULT_PERCENT_UNIT = '%'

    // 解析单位配置函数
    const parseUnitConfig = (unitConfig?: string): { fix: number; unit: number } => {
      if (!unitConfig) {
        return { fix: 0, unit: 1 }
      }
      const parts = unitConfig.split(',')
      if (parts.length !== 2) {
        return { fix: 0, unit: 1 }
      }
      const fix = parseInt(parts[0], 10)
      const unit = parseInt(parts[1], 10)
      return { fix: isNaN(fix) ? 0 : fix, unit: isNaN(unit) ? 1 : unit }
    }

    const isPercentLineMetric = (metric?: DataMetric) => metric?.chartType === 'ptLine'
    const clampPercentValue = (value: number) => Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value))

    const formatSharePercent = (value: number) => `${value}${DEFAULT_PERCENT_UNIT}`

    const convertValueForMetric = (metric: DataMetric | undefined, rawValue: number) => {
      if (!metric) return rawValue
      if (metric.unitConfig) {
        const { unit: unitDivisor } = parseUnitConfig(metric.unitConfig)
        return rawValue / unitDivisor
      }
      return Math.round(rawValue)
    }

    const formatValueForMetric = (metric: DataMetric | undefined, value: number) => {
      if (!metric) return value.toString()
      if (isPercentLineMetric(metric)) {
        return `${value.toFixed(2)}${DEFAULT_PERCENT_UNIT}`
      }
      if (metric.unitConfig) {
        const { fix } = parseUnitConfig(metric.unitConfig)
        return Number(value).toLocaleString(undefined, { minimumFractionDigits: fix, maximumFractionDigits: fix })
      }
      return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const formatOriginalValue = (metric: DataMetric | undefined, value: number) => {
      const formatWithDigits = (digits = 0) => Number(value).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      })

      if (!metric) return formatWithDigits()

      if (metric.unitConfig) {
        const { fix } = parseUnitConfig(metric.unitConfig)
        return `${formatWithDigits(fix)}${metric.unit || ''}`
      }

      return `${formatWithDigits()}${metric.unit || ''}`
    }

    const getTooltipRawValue = (param: any): number => {
      if (param?.data && typeof param.data.rawValue === 'number') {
        return param.data.rawValue
      }
      if (typeof param?.value === 'number') {
        return param.value
      }
      return 0
    }

    const getRawValueFromDatum = (datum: any): number => {
      if (datum && typeof datum === 'object') {
        if (typeof datum.statistic === 'number') return datum.statistic
        if (typeof datum.value === 'number') return datum.value
        if (typeof datum.rawValue === 'number') return datum.rawValue
      }
      return typeof datum === 'number' ? datum : 0
    }

    // Y轴格式化函数：显示整数，不保留小数位
    const formatYAxisValue = (value: number): string => {
      return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
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

    type ProcessedLineChartData = ReturnType<typeof processChartData>

    // 生成折线图配置
    const generateLineChartOption = (processedData: ProcessedLineChartData): echarts.EChartsOption => {
      const { firstDimensionGroups, secondDimensionGroups, statisticTypes, flattenedData } = processedData

      // 使用props.categories或默认的firstDimensionGroups
      const categories = props.categories || firstDimensionGroups

      const globalRawTotalsByStatType: Record<string, number> = {}
      flattenedData.forEach(item => {
        const rawValue = getRawValueFromDatum(item.statistic)
        globalRawTotalsByStatType[item.statisticType] = (globalRawTotalsByStatType[item.statisticType] || 0) + rawValue
      })

      // 预计算：无二级维度时每个统计类型的总和；有二级维度时每个(类目,统计类型)的小计
      const totalByStatType: Record<string, number> = {}
      const totalByCategoryStat: Record<string, Record<string, number>> = {}

      if (!isNotEmpty(secondDimensionGroups)) {
        statisticTypes.forEach((statType: string) => {
          const metric = props.dataMetrics.find(m => m.dataName === statType)
          totalByStatType[statType] = categories.reduce((sum: number, category: string) => {
            const item = flattenedData.find((d: any) => d.firstDimension === category && d.statisticType === statType)
            const rawValue = item ? getRawValueFromDatum(item.statistic) : 0
            return sum + convertValueForMetric(metric, rawValue)
          }, 0)
        })
      } else {
        categories.forEach((category: string) => {
          totalByCategoryStat[category] = {}
          statisticTypes.forEach((statType: string) => {
            const metric = props.dataMetrics.find(m => m.dataName === statType)
            const subtotal = secondDimensionGroups.reduce((sum: number, secondDim: string) => {
              const item = flattenedData.find((d: any) => d.firstDimension === category && d.secondDimension === secondDim && d.statisticType === statType)
              const rawValue = item ? getRawValueFromDatum(item.statistic) : 0
              return sum + convertValueForMetric(metric, rawValue)
            }, 0)
            totalByCategoryStat[category][statType] = subtotal
          })
        })
      }

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
            const rawValue = item ? getRawValueFromDatum(item.statistic) : 0
            const baseValue = convertValueForMetric(metric, rawValue)
            const percentValue = totalByStatType[statType] > 0 ? clampPercentValue((baseValue / totalByStatType[statType]) * 100) : 0
            const value = isPercentLineMetric(metric) ? percentValue : baseValue

            const itemColor = (props.dimensionValueMap
              && metric.itemColors
              && props.dimensionValueMap.first
              && metric.itemColors[props.dimensionValueMap.first[category]])
              || metric.color
              || `hsl(${((statIndex * categories.length + categoryIndex) * 30) % 360}, 70%, 50%)`

            return {
              value,
              rawValue,
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
                return formatValueForMetric(metric, params.value)
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
              const rawValue = item ? getRawValueFromDatum(item.statistic) : 0
              const baseValue = convertValueForMetric(metric, rawValue)
              const subtotal = totalByCategoryStat[category]?.[statType] || 0
              const percentValue = subtotal > 0 ? clampPercentValue((baseValue / subtotal) * 100) : 0
              const value = isPercentLineMetric(metric) ? percentValue : baseValue
              return {
                value,
                rawValue
              }
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
                  const metric = props.dataMetrics.find(m => m.dataName === params.seriesName.split('&&')[1])
                  return formatValueForMetric(metric, params.value)
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

        const leftPercentMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'left' && isPercentLineMetric(m))
        const leftNormalMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'left' && !isPercentLineMetric(m))
        const rightPercentMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'right' && isPercentLineMetric(m))
        const rightNormalMetrics = props.dataMetrics.filter(m => m.yAxisPosition === 'right' && !isPercentLineMetric(m))

        const addPercentAxis = (position: 'left' | 'right', offset = 0) => ({
          type: 'value',
          name: `占比(${DEFAULT_PERCENT_UNIT})`,
          position,
          offset,
          min: 0,
          max: 100,
          axisLabel: {
            formatter: (value: number) => `${value}${DEFAULT_PERCENT_UNIT}`,
            fontSize: 12
          },
          splitLine: {
            show: position === 'left'
          }
        })

        if (leftPercentMetrics.length > 0) {
          yAxes.push(addPercentAxis('left', 0))
        }

        if (leftNormalMetrics.length > 0) {
          yAxes.push({
            type: 'value',
            name: leftNormalMetrics[0].dataName === '分布统计' ? '' : leftNormalMetrics[0].dataName,
            position: 'left',
            offset: leftPercentMetrics.length > 0 ? 60 : 0,
            axisLabel: {
              formatter: (value: number) => {
                const metric = leftNormalMetrics[0]
                const formatted = metric.unitConfig ? formatYAxisValue(value) : value.toString()
                return metric.unit ? `${formatted}${metric.unit}` : formatted
              },
              fontSize: 12
            },
            splitLine: {
              show: true
            }
          })
        }

        let rightOffset = 0
        if (rightPercentMetrics.length > 0) {
          yAxes.push(addPercentAxis('right', 0))
          rightOffset += 60
        }

        rightNormalMetrics.forEach((metric) => {
          yAxes.push({
            type: 'value',
            name: metric.dataName === '分布统计' ? '' : metric.dataName,
            position: 'right',
            offset: rightOffset,
            axisLabel: {
              formatter: (value: number) => formatYAxisValue(value) + (metric.unit || ''),
              fontSize: 12
            },
            splitLine: {
              show: false
            }
          })
          rightOffset += 60
        })

        if (yAxes.length === 0) {
          yAxes.push({ type: 'value' })
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
          width: '70%',
          itemGap: 15,
          itemHeight: 14,
          show: isNotEmpty(secondDimensionGroups),
          formatter: (name: string) => {
            // 将 "维度&&统计类型" 格式化为 "维度(统计类型)"
            // 如果统计类型是"分布统计"，则只显示维度名称
            if (name.includes('&&')) {
              const parts = name.split('&&')
              const statType = parts[1]
              if (statType === '分布统计') {
                return parts[0]
              }
              return `${parts[0]}(${parts[1]})`
            }
            return name
          }
        },
        tooltip: {
          trigger: 'axis',
          enterable: true,
          triggerOn: 'mousemove|click',
          confine: false,
          appendToBody: true,
          position: function (point: any, params: any, dom: any, rect: any, size: any) {
            let x = point[0]
            let y = point[1]
            const boxWidth = size.contentSize[0]
            const boxHeight = size.contentSize[1]
            if (x + boxWidth > size.viewSize[0]) {
              x = point[0] - boxWidth
            }
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
            const hasSecondDimension = isNotEmpty(secondDimensionGroups)
            if (hasSecondDimension) {
              const groupedParams = params.reduce((acc: any, param: any) => {
                const parts = param.seriesName.split('&&')
                const secondDimension = parts[0]
                const statType = parts[1]
                const rawValue = getTooltipRawValue(param)
                if (!acc[statType]) {
                  acc[statType] = { params: [], totalRaw: 0 }
                }
                acc[statType].params.push({ ...param, secondDimension, rawValue })
                acc[statType].totalRaw += rawValue
                return acc
              }, {})
              Object.keys(groupedParams).forEach(statType => {
                const metric = props.dataMetrics.find(m => m.dataName === statType)
                const entries = groupedParams[statType]
                const totalRaw = entries.totalRaw
                result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid var(--accent); background: var(--accent-soft);"><strong>${statType}</strong><br/>`
                entries.params.forEach((param: any) => {
                  const percentage = totalRaw > 0 ? ((param.rawValue / totalRaw) * 100).toFixed(1) : '0.0'
                  const formattedRaw = formatOriginalValue(metric, param.rawValue)
                  result += `${param.marker}${param.secondDimension}: ${formattedRaw} (${formatSharePercent(percentage)})<br/>`
                })
                const formattedTotal = formatOriginalValue(metric, totalRaw)
                const grandTotal = globalRawTotalsByStatType[statType] || 0
                const subtotalPercentage = grandTotal > 0 ? ((totalRaw / grandTotal) * 100).toFixed(2) : '0.00'
                result += `<span style="color: var(--text-secondary); font-size: 12px;">小计: ${formattedTotal} (${formatSharePercent(subtotalPercentage)})</span><br/>`
                const formattedGrandTotal = formatOriginalValue(metric, grandTotal)
                result += `<span style="color: var(--text-secondary); font-size: 12px; font-weight: bold;\">总计: ${formattedGrandTotal}</span></div>`
              })
            } else {
              const categoryName = params[0].axisValue
              const globalTotalsMap = statisticTypes.reduce((acc: Record<string, number>, statType: string) => {
                acc[statType] = globalRawTotalsByStatType[statType] || 0
                return acc
              }, {})
              const onlyOneStatType = statisticTypes.length === 1
              if (onlyOneStatType) {
                const statType = statisticTypes[0]
                const metric = props.dataMetrics.find(m => m.dataName === statType)
                const param = params.find((p: any) => p.seriesName === statType) || params[0]
                const rawValue = getTooltipRawValue(param)
                const totalRaw = globalTotalsMap[statType] || 0
                const percentage = totalRaw > 0 ? ((rawValue / totalRaw) * 100).toFixed(2) : '0.00'
                const formattedValue = formatOriginalValue(metric, rawValue)
                result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid var(--accent); background: var(--accent-soft);"><strong>${metric?.dataName || statType}</strong><br/>`
                result += `${param.marker}${categoryName}：${formattedValue} (${formatSharePercent(percentage)})<br/>`
                const formattedTotal = formatOriginalValue(metric, totalRaw)
                result += `<span style="color: var(--text-secondary); font-size: 12px;">总计：${formattedTotal}</span></div>`
              } else {
                params.forEach((param: any) => {
                  const statType = param.seriesName
                  const metric = props.dataMetrics.find(m => m.dataName === statType)
                  const rawValue = getTooltipRawValue(param)
                  const totalRaw = globalTotalsMap[statType] || 0
                  const percentage = totalRaw > 0 ? ((rawValue / totalRaw) * 100).toFixed(2) : '0.00'
                  const formattedValue = formatOriginalValue(metric, rawValue)
                  result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid var(--accent); background: var(--accent-soft);"><strong>${metric?.dataName || statType}</strong><br/>`
                  result += `${param.marker}${metric?.dataName || statType}：${formattedValue} (${formatSharePercent(percentage)})<br/>`
                  const formattedTotal = formatOriginalValue(metric, totalRaw)
                  result += `<span style="color: var(--text-secondary); font-size: 12px;">总计：${formattedTotal}</span></div>`
                })
              }
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
