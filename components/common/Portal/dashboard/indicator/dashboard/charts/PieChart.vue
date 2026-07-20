<template>
  <div
    class="pie-chart-container"
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
import { getEffectiveUnit } from '../utils/unitFormat'

export default defineComponent({
  name: 'PieChart',
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
    },
    // 是否为指标饼图模式（扇区=数据指标字段）
    isMetricsMode: {
      type: Boolean,
      default: false
    },
    // 排序模式：'none' | 'asc' | 'desc'（指标饼图扇区排序）
    sortOrder: {
      type: String as () => 'none' | 'asc' | 'desc',
      default: 'none'
    },
    // 是否隐藏值为0的数据（指标饼图扇区过滤）
    hideZeroData: {
      type: Boolean,
      default: false
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

      return {
        firstDimensionGroups,
        flattenedData
      }
    }

    // 生成饼图配置
    const generatePieChartOption = (processedData: any): echarts.EChartsOption => {
      const { firstDimensionGroups, flattenedData } = processedData

      // ===== 指标饼图模式：每个扇区=一个数据指标字段 =====
      if (props.isMetricsMode) {
        const metrics = props.dataMetrics
        if (!metrics || metrics.length === 0) {
          return { series: [] }
        }

        // 为每个数据指标生成一个扇区
        const pieData = metrics.map((metric, idx) => {
          // 在 flattenedData 中查找该指标的统计值
          // 指标饼图模式下无维度，firstDimension 为空字符串
          const item = flattenedData.find((d: any) =>
            d.statisticType === metric.dataName
          )
          const originalValue = item ? item.statistic : 0
          const { unit: unitDivisor } = metric.unitConfig ? parseUnitConfig(metric.unitConfig) : { unit: 1 }
          const convertedValue = metric.unitConfig ? originalValue / unitDivisor : Math.round(originalValue)

          // 颜色：使用黄角度算法基于索引均匀分布，确保各扇区颜色明显区分
          // （metric.color 是随机分配的，多个指标可能相同，不适用于指标饼图）
          const finalColor = `hsl(${(idx * 137.508) % 360}, 65%, 55%)`

          return {
            name: metric.dataName,
            value: convertedValue,
            itemStyle: {
              color: finalColor
            },
            // 传递原始字段，用于点击穿透
            data: { dataField: metric.dataField, dataName: metric.dataName }
          }
        })

        // 过滤值为 0 的扇区（响应用户的“隐藏为 0 ”开关）
        if (props.hideZeroData) {
          pieData.splice(0, pieData.length, ...pieData.filter(item => item.value > 0))
        }

        // 排序扇区（响应用户的升/降序开关）
        if (props.sortOrder === 'asc') {
          pieData.sort((a, b) => a.value - b.value)
        } else if (props.sortOrder === 'desc') {
          pieData.sort((a, b) => b.value - a.value)
        }

        const chartTitle = props.title

        // 计算总额（基于过滤/排序后的 pieData）
        const totalValue = pieData.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)
        const formattedCenterTotal = Number(totalValue).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })

        // 获取第一个有单位的指标作为默认单位显示（各指标可能单位不同，tooltip 中单独显示）
        return {
          title: {
            text: chartTitle,
            left: 'center',
            top: '0%',
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold'
            }
          },
          graphic: [
            {
              type: 'group',
              left: 'center',
              top: '47%',
              children: [
                {
                  type: 'text',
                  left: 'center',
                  top: -12,
                  style: {
                    text: '总额',
                    fill: '#8c8c8c',
                    fontSize: 13
                  }
                },
                {
                  type: 'text',
                  left: 'center',
                  top: 8,
                  style: {
                    text: formattedCenterTotal,
                    fill: '#262626',
                    fontSize: 16,
                    fontWeight: 'bold'
                  }
                }
              ]
            }
          ] as any,
          tooltip: {
            trigger: 'item',
            enterable: true,
            triggerOn: 'mousemove|click',
            confine: false,
            appendToBody: true,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderColor: '#ddd',
            borderWidth: 1,
            textStyle: {
              color: '#333',
              fontSize: 12
            },
            extraCssText: 'max-height: 500px; max-width: 500px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; border-radius: 6px;',
            formatter: (params: any) => {
              const idx = pieData.findIndex(d => d.name === params.name)
              const metric = metrics[idx] || metrics[0]
              const unit = getEffectiveUnit(metric)
              let result = `<strong>${params.name}</strong><br/>`
              result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid var(--accent); background: var(--accent-soft);"><strong>${params.name}</strong><br/>`
              const formattedValue = (() => {
                if (metric?.unitConfig) {
                  const { fix } = parseUnitConfig(metric.unitConfig)
                  return Number(params.value).toLocaleString(undefined, {
                    minimumFractionDigits: fix,
                    maximumFractionDigits: fix
                  })
                }
                return Number(params.value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              })()
              result += `${params.marker}${params.name}: ${formattedValue}${unit ? unit : ''} (${params.percent}%)<br/>`

              const totalValue = pieData.reduce((sum, d) => sum + (typeof d.value === 'number' ? d.value : 0), 0)
              const formattedTotal = (() => {
                if (metric?.unitConfig) {
                  const { fix } = parseUnitConfig(metric.unitConfig)
                  return Number(totalValue).toLocaleString(undefined, {
                    minimumFractionDigits: fix,
                    maximumFractionDigits: fix
                  })
                }
                return Number(totalValue).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              })()
              result += `<span style="color: var(--text-secondary); font-size: 12px;">总计：${formattedTotal}${unit ? unit : ''}</span></div>`
              return result
            }
          },
          legend: {
            type: 'scroll',
            orient: 'horizontal',
            left: 'center',
            top: '5%',
            width: '80%',
            itemGap: 15,
            itemHeight: 14,
            formatter: (name: string) => {
              const idx = pieData.findIndex(d => d.name === name)
              const metric = metrics[idx]
              if (!metric) return name
              const unit = getEffectiveUnit(metric)
              const value = pieData[idx]?.value || 0
              const formattedValue = (() => {
                if (metric?.unitConfig) {
                  const { fix } = parseUnitConfig(metric.unitConfig)
                  return Number(value).toLocaleString(undefined, {
                    minimumFractionDigits: fix,
                    maximumFractionDigits: fix
                  })
                }
                return Number(value).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              })()
              return `${name}: ${formattedValue}${unit ? unit : ''}`
            }
          },
          series: [
            {
              name: '指标占比',
              type: 'pie',
              radius: ['30%', '70%'],
              center: ['50%', '55%'],
              data: pieData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                },
                scale: true,
                scaleSize: 5
              },
              selectedMode: 'single',
              selectedOffset: 5,
              label: {
                show: false,
                formatter: (params: any) => `${params.name}: ${params.percent}%`,
                fontSize: 12
              },
              labelLine: {
                show: false
              },
              animationType: 'scale',
              animationEasing: 'elasticOut',
              animationDelay: () => Math.random() * 200
            }
          ] as echarts.SeriesOption[]
        }
      }

      // ===== 默认饼图模式：扇区=维度项 =====

      // 饼图只显示一个数据指标
      const pieMetric = props.dataMetrics[0]
      if (!pieMetric) {
        return { series: [] }
      }

      // 使用props.categories或默认的firstDimensionGroups作为饼图的维度
      const categories = props.categories || firstDimensionGroups

      // 生成饼图数据，只使用第一维度（categories）
      const pieData = categories.map((category: string, categoryIndex: number) => {
        // 查找该分类对应的数据
        const item = flattenedData.find((d: any) =>
          d.firstDimension === category &&
          d.statisticType === pieMetric.dataName
        )

        // 计算颜色 - 饼图每个扇区应该有不同的颜色
        let itemColor: string | undefined

        // 优先使用配置的颜色映射
        if (props.dimensionValueMap?.first && pieMetric.itemColors) {
          const mappedCode = props.dimensionValueMap.first[category]
          itemColor = pieMetric.itemColors[mappedCode]
        }

        // 如果没有配置颜色，使用HSL生成不同的颜色（不使用pieMetric.color，因为那是单一颜色）
        const finalColor = itemColor || `hsl(${(categoryIndex * 137) % 360}, 70%, 50%)`

        // 对数据值进行单位转换
        const originalValue = item ? item.statistic : 0
        const { unit: unitDivisor } = pieMetric.unitConfig ? parseUnitConfig(pieMetric.unitConfig) : { unit: 1 }
        // 对于非金额指标，确保结果为整数；对于金额指标，保持精度
        const convertedValue = pieMetric.unitConfig ? originalValue / unitDivisor : Math.round(originalValue)

        return {
          name: category,
          value: convertedValue,
          itemStyle: {
            color: finalColor
          }
        }
      }).filter(item => item.value > 0) // 过滤掉值为0的项

      // 按值排序
      pieData.sort((a, b) => b.value - a.value)

      // 饼图配置 - 标题处理分布统计
      const chartTitle = props.title === '分布统计' ? '' : props.title
      
      return {
        title: {
          text: chartTitle,
          left: 'center',
          top: '0%',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
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
          extraCssText: 'max-height: 500px; max-width: 500px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; border-radius: 6px;',
          formatter: (params: any) => {
            const unit = getEffectiveUnit(pieMetric)
            let result = `<strong>${params.name}</strong><br/>`
            result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid var(--accent); background: var(--accent-soft);"><strong>${pieMetric.dataName}</strong><br/>`
            // 格式化当前扇区的数值显示
            const formattedValue = (() => {
              if (pieMetric?.unitConfig) {
                const { fix } = parseUnitConfig(pieMetric.unitConfig)
                return Number(params.value).toLocaleString(undefined, {
                  minimumFractionDigits: fix,
                  maximumFractionDigits: fix
                })
              }
              return Number(params.value).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            })()
            result += `${params.marker}${params.name}: ${formattedValue}${unit ? unit : ''} (${params.percent}%)<br/>`

            // 计算总计（基于当前饼图数据）并格式化
            const totalValue = (Array.isArray(pieData) ? pieData : []).reduce((sum, d: any) => {
              const v = typeof d?.value === 'number' ? d.value : 0
              return sum + v
            }, 0)
            const formattedTotal = (() => {
              if (pieMetric?.unitConfig) {
                const { fix } = parseUnitConfig(pieMetric.unitConfig)
                return Number(totalValue).toLocaleString(undefined, {
                  minimumFractionDigits: fix,
                  maximumFractionDigits: fix
                })
              }
              return Number(totalValue).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            })()
            result += `<span style="color: var(--text-secondary); font-size: 12px;">总计：${formattedTotal}${unit ? unit : ''}</span></div>`
            return result
          }
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          left: 'center',
          top: '5%',
          width: '80%',
          itemGap: 15,
          itemHeight: 14,
          formatter: (name: string) => {
            const item = pieData.find(d => d.name === name)
            const unit = getEffectiveUnit(pieMetric)
            // 格式化图例中的数值显示
            const formattedValue = (() => {
              const value = item?.value || 0
              if (pieMetric?.unitConfig) {
                const { fix } = parseUnitConfig(pieMetric.unitConfig)
                return Number(value).toLocaleString(undefined, {
                  minimumFractionDigits: fix,
                  maximumFractionDigits: fix
                })
              }
              // 非金额指标显示为整数
              return Number(value).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            })()
            return `${name}: ${formattedValue}${unit ? unit : ''}`
          }
        },
        series: [
          {
            name: pieMetric.dataName,
            type: 'pie',
            radius: ['30%', '70%'],
            center: ['50%', '55%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              },
              // 扩大强调时的缩放，使点击区域更大
              scale: true,
              scaleSize: 5
            },
            // 增加选中区域，扩大点击范围
            selectedMode: 'single',
            selectedOffset: 5,
            label: {
              show: false,
              formatter: (params: any) => {
                return `${params.name}: ${params.percent}%`
              },
              fontSize: 12
            },
            labelLine: {
              show: false
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: () => Math.random() * 200
          }
        ] as echarts.SeriesOption[]
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
        const option = generatePieChartOption(processedData)

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
.pie-chart-container {
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
