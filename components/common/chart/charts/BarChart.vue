<template>
  <div
    class="bar-chart-container"
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

import { buildFullAxisTooltipHtml, buildHighlightRowsHtml, buildHighlightTooltipHtml, hasStackedSeries } from '../utils/tooltipCommon'
import type { HighlightTooltipItem } from '../utils/tooltipCommon'
import { getEffectiveUnit } from '../utils/unitFormat'

import type { ChartDataItem, DataMetric } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'

export default defineComponent({
  name: 'BarChart',
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
      return getEffectiveUnit(metric)
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

    // 生成柱状图配置
    const generateBarChartOption = (processedData: any): echarts.EChartsOption => {
      const { firstDimensionGroups, secondDimensionGroups, statisticTypes, flattenedData } = processedData

      // 使用props.categories或默认的firstDimensionGroups（空数组时回退，避免渲染空图）
      const categories = props.categories?.length ? props.categories : firstDimensionGroups

      const series: any[] = []

      // 当secondDimensionGroups为空时，只使用categories和statisticTypes生成系列
      if (isEmpty(secondDimensionGroups)) {
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

          // 根据指标配置决定使用哪个y轴
          const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

          // 新的堆叠策略
          let stackKey: string | undefined = undefined
          if (metric.stackGroup) {
            if (metric.stackGroup === 'noStack') {
              // 不堆叠：每个系列独立显示
              stackKey = undefined
            } else if (metric.stackGroup === 'selfStack') {
              // 自堆叠：同一指标的不同维度在同一stack中
              stackKey = `${metric.dataField}__y${yAxisIndex}`
            } else {
              // stack组：相同stack组的指标堆叠
              stackKey = `${metric.stackGroup}__y${yAxisIndex}`
            }
          }

          series.push({
            name: statType,
            type: 'bar',
            yAxisIndex,
            stack: stackKey,
            data: seriesData,
            label: {
              show: true,
              position: 'inside',
              formatter: (params: any) => {
                // 在无二级维度时，seriesName就是statType，直接匹配
                const metric = props.dataMetrics.find(m => m.dataName === params.seriesName)

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
              color: '#fff',
              fontWeight: 'bold',
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowBlur: 2
            },
            emphasis: {
              focus: 'series',
              // 扩大强调区域
              itemStyle: {
                borderWidth: 2,
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
              // 该「类目×二级维度」组合无数据时返回 null（如树形堆叠中不属于当前父节点的子节点）：
              // null 不参与堆叠、不出现在 tooltip，保证每根柱子只堆叠自己的子节点；
              // 真实为 0 的数据（有记录但计数为0）仍会保留为 0 正常展示
              if (!item) return null
              // 对数据值进行单位转换
              const originalValue = item.statistic
              const { unit: unitDivisor } = metric.unitConfig ? parseUnitConfig(metric.unitConfig) : { unit: 1 }
              // 对于非金额指标，确保结果为整数；对于金额指标，保持精度
              return metric.unitConfig ? originalValue / unitDivisor : Math.round(originalValue)
            })

            // 根据指标配置决定使用哪个y轴
            const yAxisIndex = metric.yAxisPosition === 'right' ? 1 : 0

            // 使用传入的映射优先获取第二维度的编码，保证与配置一致
            const mappedCode = props.dimensionValueMap?.second?.[secondDim]
            // 回退：按位置生成 01/02...
            const fallbackCode = (secondDimensionGroups.indexOf(secondDim) + 1).toString().padStart(2, '0')
            const itemValueCode = mappedCode || fallbackCode
            // 根据metric的itemColors获取颜色，优先使用itemColors配置
            const itemColor = metric.itemColors?.[itemValueCode] ||
              metric.color ||
              `hsl(${(series.length * 60) % 360}, 70%, 50%)`

            // 新的堆叠策略
            let stackKey: string | undefined = undefined
            if (metric.stackGroup) {
              if (metric.stackGroup === 'noStack') {
                // 不堆叠：每个系列独立显示，第二维度并排
                stackKey = undefined
              } else if (metric.stackGroup === 'selfStack') {
                // 自堆叠：同一指标的不同第二维度在同一stack中
                stackKey = `${metric.dataField}__y${yAxisIndex}`
              } else {
                // stack组：相同stack组和相同第二维度的指标堆叠，不同第二维度并排
                stackKey = `${metric.stackGroup}__${secondDim}__y${yAxisIndex}`
              }
            }

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
                  // 有二级维度时，seriesName格式是 "二级维度&&统计类型"，所以统计类型是split('&&')[1]
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
                color: '#fff',
                fontWeight: 'bold',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowBlur: 2
              },
              emphasis: {
                focus: 'series',
                // 扩大强调区域
                itemStyle: {
                  borderWidth: 2,
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

      // ===== 堆叠柱状图顶部总计标签 =====
      // 按 stack 分组，为每个堆叠组追加一个透明柱系列，在顶部显示该柱的合计值
      const stackGroupsMap = new Map<string, any[]>()
      series.forEach(s => {
        if (s.stack) {
          if (!stackGroupsMap.has(s.stack)) stackGroupsMap.set(s.stack, [])
          stackGroupsMap.get(s.stack)!.push(s)
        }
      })
      stackGroupsMap.forEach((groupSeries, stackKey) => {
        if (groupSeries.length < 2) return // 单系列不堆叠，无需总计
        // 计算每个类目的合计
        const totals = categories.map((_: string, catIdx: number) => {
          let sum = 0
          let hasValue = false
          groupSeries.forEach(s => {
            const val = s.data[catIdx]
            const num = typeof val === 'object' ? val?.value : val
            if (num != null && num !== 0) {
              sum += Number(num)
              hasValue = true
            }
          })
          return hasValue ? sum : null
        })
        // 从该堆叠组的第一个系列推断指标配置（用于格式化总计数字）
        const firstName = groupSeries[0].name || ''
        const metricName = firstName.includes('&&') ? firstName.split('&&')[1] : firstName
        const stackMetric = props.dataMetrics.find(m => m.dataName === metricName)
        const yAxisIdx = groupSeries[0].yAxisIndex || 0

        series.push({
          name: `__stack_total__${stackKey}`,
          type: 'bar',
          stack: stackKey,
          yAxisIndex: yAxisIdx,
          data: totals.map((v: number | null) => v == null ? null : { value: 0 }), // 透明占位，不增加高度
          itemStyle: { color: 'transparent' },
          emphasis: { disabled: true },
          tooltip: { show: false },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const total = totals[params.dataIndex]
              if (total == null) return ''
              if (stackMetric?.unitConfig) {
                const { fix } = parseUnitConfig(stackMetric.unitConfig)
                return Number(total).toLocaleString(undefined, {
                  minimumFractionDigits: fix,
                  maximumFractionDigits: fix
                })
              }
              return Number(total).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            },
            fontSize: 11,
            fontWeight: 'bold',
            color: '#333'
          },
          silent: true // 不响应鼠标事件
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
            name: leftMetrics[0].dataName === '分布统计' ? '' : leftMetrics[0].dataName,
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
                const effectiveUnit = getEffectiveUnit(leftMetrics[0])
                return effectiveUnit ? `${formatted}${effectiveUnit}` : formatted
              },
              fontSize: 12
            },
            splitLine: {
              show: true
            }
          })
        } else {
          // 兜底：没有任何指标配置在左轴时（如回显配置缺少 yAxisPosition），
          // 保证默认左轴存在，避免 series 引用 yAxisIndex 0 时 echarts 崩溃
          yAxes.push({
            type: 'value',
            position: 'left',
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
                const units = [...new Set(sameStackMetrics.map((m: any) => getEffectiveUnit(m)))]
                const combinedUnit = units.length === 1 ? units[0] : units.join('/')
                const namesText = sameStackMetrics.map((m: any) => m.dataName).join('/')

                yAxes.push({
                  type: 'value',
                  name: namesText === '分布统计' ? '' : namesText,
                  position: 'right',
                  axisLabel: {
                    formatter: (value: number) => {
                      // 对于合并的指标，使用第一个指标的unitConfig
                      const firstMetric = sameStackMetrics?.[0]
                      const formatted = (() => {
                        if (firstMetric?.unitConfig) {
                          // Y轴显示整数，不保留小数位
                          return formatYAxisValue(value)
                        }
                        return value.toString()
                      })()
                      return `${formatted}${combinedUnit}`
                    },
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
                name: metric.dataName === '分布统计' ? '' : metric.dataName,
                position: 'right',
                offset: (yAxes.filter((axis: any) => axis.position === 'right').length) * 60,
                axisLabel: {
                  formatter: (value: number) => {
                    const formatted = (() => {
                      if (metric?.unitConfig) {
                        // Y轴显示整数，不保留小数位
                        return formatYAxisValue(value)
                      }
                      return value.toString()
                    })()
                    const effectiveUnit = getEffectiveUnit(metric)
                    return effectiveUnit ? `${formatted}${effectiveUnit}` : formatted
                  },
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

      // 堆叠图表使用 item 触发（才能识别悬停的具体段，像饼图一样高亮当前选中项）
      const isStacked = hasStackedSeries(series)

      // 图例数据：排除堆叠总计辅助系列
      const legendData = series
        .map(s => s.name)
        .filter(name => !name.startsWith('__stack_total__'))

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
          data: legendData,
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
          trigger: isStacked ? 'item' : 'axis',
          axisPointer: {
            type: 'shadow'
          },
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
            // 判断是否有第二维度
            const hasSecondDimension = isNotEmpty(secondDimensionGroups)

            // ===== 非堆叠图表：复用饼图 tooltip 样式（列出所有类目数据，高亮当前 hover 项） =====
            if (!hasStackedSeries(series)) {
              const hoveredCategory = params[0].axisValue
              return buildFullAxisTooltipHtml(
                series,
                categories,
                hoveredCategory,
                (s: any) => {
                  // 显示名称：有二级维度时格式化为 "维度(统计类型)"，否则为系列名
                  if (hasSecondDimension && s.name && s.name.includes('&&')) {
                    const parts = s.name.split('&&')
                    return parts[1] === '分布统计' ? parts[0] : `${parts[0]}(${parts[1]})`
                  }
                  return s.name
                },
                (s: any) => {
                  const statType = hasSecondDimension && s.name && s.name.includes('&&') ? s.name.split('&&')[1] : s.name
                  return getEffectiveUnit(props.dataMetrics.find(m => m.dataName === statType)) || ''
                },
                (value: number, s: any) => {
                  const statType = hasSecondDimension && s.name && s.name.includes('&&') ? s.name.split('&&')[1] : s.name
                  const metric = props.dataMetrics.find(m => m.dataName === statType)
                  if (metric?.unitConfig) {
                    const { fix } = parseUnitConfig(metric.unitConfig)
                    return Number(value).toLocaleString(undefined, { minimumFractionDigits: fix, maximumFractionDigits: fix })
                  }
                  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                },
                (datum: any) => datum?.itemStyle?.color
              )
            }

            // ===== 堆叠图表：饼图风格 tooltip（trigger: 'item'，params 为单个对象）=====
            // 列出当前柱子（类目）的所有段，并像饼图一样高亮当前悬停的段
            const hoveredCategory = params.name
            const categoryIndex = categories.indexOf(hoveredCategory)

            // 按统计类型的单位配置格式化数值
            const formatStatValue = (statType: string, value: number) => {
              const metric = props.dataMetrics.find(m => m.dataName === statType)
              if (metric?.unitConfig) {
                const { fix } = parseUnitConfig(metric.unitConfig)
                return Number(value).toLocaleString(undefined, { minimumFractionDigits: fix, maximumFractionDigits: fix })
              }
              return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            }

            // 取某系列在当前类目下的值（已单位转换），无数据返回 null
            const getSeriesValue = (s: any): number | null => {
              const rawValue = Array.isArray(s.data) ? s.data[categoryIndex] : null
              if (rawValue == null) return null
              if (typeof rawValue === 'object') return rawValue.value != null ? rawValue.value : null
              return typeof rawValue === 'number' ? rawValue : null
            }

            // 计算某统计类型在所有类目（全部柱子）下的总和
            const computeGrandTotal = (statType: string): number => {
              return series
                .filter((s: any) => s.name && s.name.endsWith(`&&${statType}`))
                .reduce((sum: number, s: any) => {
                  if (!Array.isArray(s.data)) return sum
                  return sum + s.data.reduce((ss: number, item: any) => {
                    const v = typeof item === 'object' && item?.value != null ? item.value : item
                    return ss + (typeof v === 'number' ? v : 0)
                  }, 0)
                }, 0)
            }

            if (hasSecondDimension) {
              // 有第二维度：列出当前父节点下的所有叶子节点，高亮悬停的叶子
              const nameParts = String(params.seriesName).split('&&')
              const hoveredLeaf = nameParts[0]
              const hoveredStatType = nameParts[1]

              // 按统计类型收集当前父节点下有数据的叶子（无数据的 null 段自动跳过）
              const seriesByStatType: Record<string, any[]> = {}
              series.forEach((s: any) => {
                if (!s.name || !s.name.includes('&&')) return
                const parts = String(s.name).split('&&')
                const value = getSeriesValue(s)
                if (value == null) return
                if (!seriesByStatType[parts[1]]) seriesByStatType[parts[1]] = []
                seriesByStatType[parts[1]].push({ name: parts[0], value, color: s.itemStyle?.color || s.color || '#1890ff' })
              })

              const statTypes = Object.keys(seriesByStatType)

              // 单一统计类型：标题 + 叶子列表（高亮悬停叶子）+ 总计
              if (statTypes.length === 1) {
                const statType = statTypes[0]
                const items = seriesByStatType[statType].map(d => ({
                  name: d.name,
                  value: d.value,
                  color: d.color,
                  unit: getUnitByStatType(statType) || '',
                  formattedValue: formatStatValue(statType, d.value)
                }))
                const total = items.reduce((sum, d) => sum + d.value, 0)
                const grandTotal = computeGrandTotal(statType)
                const subtotalPercentage = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(2) : '0.00'
                const unit = getUnitByStatType(statType) || ''
                const totalText = `小计：${formatStatValue(statType, total)}${unit} (${subtotalPercentage}%)<br/>总计：${formatStatValue(statType, grandTotal)}${unit}`
                return buildHighlightTooltipHtml(
                  hoveredCategory,
                  items,
                  hoveredLeaf,
                  totalText
                )
              }

              // 多统计类型：标题 + 每个统计类型分块
              let html = `<div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #262626;">${hoveredCategory}</div>`
              statTypes.forEach(statType => {
                const items = seriesByStatType[statType].map(d => ({
                  name: d.name,
                  value: d.value,
                  color: d.color,
                  unit: getUnitByStatType(statType) || '',
                  formattedValue: formatStatValue(statType, d.value)
                }))
                const total = items.reduce((sum, d) => sum + d.value, 0)
                const grandTotal = computeGrandTotal(statType)
                const subtotalPercentage = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(2) : '0.00'
                html += `<div style="margin: 6px 0 2px; font-weight: bold; font-size: 12px; color: var(--text-secondary);">${statType}</div>`
                html += buildHighlightRowsHtml(items, hoveredStatType === statType ? hoveredLeaf : '')
                html += `<div style="margin: 2px 0 6px; padding-top: 4px; border-top: 1px solid #eee; color: var(--text-secondary, #8c8c8c); font-size: 12px;">小计：${formatStatValue(statType, total)}${getUnitByStatType(statType) || ''} (${subtotalPercentage}%)</div>`
              })
              return html
            } else {
              // 单维度堆叠：列出各统计类型，高亮悬停的统计类型
              const hoveredStatType = String(params.seriesName)
              const items = series
                .filter((s: any) => !s.name?.startsWith('__stack_total__'))
                .map((s: any) => {
                  const value = getSeriesValue(s)
                  if (value == null || !s.name) return null
                  return {
                    name: s.name,
                    value,
                    color: s.itemStyle?.color || s.color || '#1890ff',
                    unit: getUnitByStatType(s.name) || '',
                    formattedValue: formatStatValue(s.name, value)
                  }
                })
                .filter((d): d is HighlightTooltipItem => d != null)
              const total = items.reduce((sum: number, d: any) => sum + d.value, 0)
              const firstUnit = items[0]?.unit || ''
              return buildHighlightTooltipHtml(
                hoveredCategory,
                items,
                hoveredStatType,
                `总计：${formatStatValue(items[0]?.name || '', total)}${firstUnit}`
              )
            }
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
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: {
            fontSize: 12,
            interval: 0,
            rotate: categories.length > 6 ? 45 : 0,
            // 分组名过长时截断显示（完整名称仍在坐标轴 tooltip 中展示）
            formatter: (value: string) =>
              typeof value === 'string' && value.length > 10 ? value.slice(0, 10) + '…' : value
          }
        },
        yAxis: generateYAxes(),
        series: series as echarts.SeriesOption[],
        animationEasing: 'elasticOut',
        animationDelayUpdate: (idx: number) => idx * 5
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

      // 添加图表区域点击事件监听（扩大点击范围）
      chartInstance.getZr().on('click', (event: any) => {
        // 阻止重复触发（如果已经有具体元素被点击了）
        if (event.target && event.target.type !== 'group') {
          return
        }

        if (!chartInstance) return

        // 获取点击位置对应的数据
        const pointInPixel = [event.offsetX, event.offsetY]
        const option = chartInstance.getOption() as any

        if (!option || !option.xAxis || !Array.isArray(option.xAxis) || !option.xAxis[0] ||
          !option.series || !Array.isArray(option.series)) {
          return
        }

        // 类型断言确保TypeScript类型检查
        const xAxisConfig = option.xAxis as any[]
        const seriesConfig = option.series as any[]

        // 尝试转换为grid坐标
        let pointInGrid = null
        try {
          pointInGrid = chartInstance.convertFromPixel('grid', pointInPixel)
        } catch (e) {
          // 转换失败，可能点击在非图表区域
        }

        let categoryName = null
        let xAxisIndex = -1

        if (pointInGrid && Array.isArray(pointInGrid) && pointInGrid[0] >= 0) {
          // 在图表网格内的点击
          xAxisIndex = Math.round(pointInGrid[0])
          const xAxisData = xAxisConfig[0].data
          if (Array.isArray(xAxisData) && xAxisIndex >= 0 && xAxisIndex < xAxisData.length) {
            categoryName = xAxisData[xAxisIndex]
          }
        } else {
          // 可能点击在x轴标签区域，尝试根据x坐标估算
          const gridComponent = (Array.isArray(option.grid) && option.grid[0]) ? option.grid[0] : option.grid
          const chartWidth = chartInstance!.getWidth()

          // 估算网格区域
          const gridLeft = gridComponent?.left ? (typeof gridComponent.left === 'string' ?
            chartWidth * parseFloat(gridComponent.left) / 100 : gridComponent.left) :
            chartWidth * 0.03
          const gridRight = gridComponent?.right ? (typeof gridComponent.right === 'string' ?
            chartWidth * (1 - parseFloat(gridComponent.right) / 100) : chartWidth - gridComponent.right) :
            chartWidth * 0.97

          const gridWidth = gridRight - gridLeft
          const xAxisData = xAxisConfig[0].data

          if (Array.isArray(xAxisData) && gridWidth > 0 && event.offsetX >= gridLeft && event.offsetX <= gridRight) {
            const relativeX = event.offsetX - gridLeft
            xAxisIndex = Math.floor((relativeX / gridWidth) * xAxisData.length)
            if (xAxisIndex >= 0 && xAxisIndex < xAxisData.length) {
              categoryName = xAxisData[xAxisIndex]
            }
          }
        }

        if (categoryName && seriesConfig.length > 0) {
          // 构造一个模拟的点击参数，使用第一个系列的数据
          const firstSeries = seriesConfig[0]
          const seriesData = firstSeries.data

          if (Array.isArray(seriesData) && seriesData[xAxisIndex] !== undefined) {
            const dataValue = seriesData[xAxisIndex]
            const mockParams = {
              componentType: 'series',
              seriesType: firstSeries.type,
              seriesIndex: 0,
              seriesName: firstSeries.name,
              name: categoryName,
              dataIndex: xAxisIndex,
              data: dataValue,
              value: dataValue?.value !== undefined ? dataValue.value : dataValue,
              color: (dataValue?.itemStyle?.color) || firstSeries.itemStyle?.color || firstSeries.color
            }
            emit('click', mockParams)
          }
        }
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
        const option = generateBarChartOption(processedData)

        chartInstance.setOption(option, true)
      } catch (error) {
        console.warn('更新图表失败:', error)
      }
    }

    // 监听数据变化
    watch(
      () => [props.data, props.dataMetrics, props.title, props.dimensionValueMap],
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
.bar-chart-container {
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
