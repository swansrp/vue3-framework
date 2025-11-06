<template>
  <div class="universal-chart-container">
    <BarChart
      v-if="finalChartType === 'bar'"
      ref="chartComponentRef"
      :data="data"
      :data-metrics="dataMetrics"
      :loading="loading"
      :title="title"
      :height="height"
      :width="width"
      :categories="categories"
      :dimension-value-map="dimensionValueMap"
      @click="handleChartClick"
    />
    <LineChart
      v-else-if="finalChartType === 'line'"
      ref="chartComponentRef"
      :data="data"
      :data-metrics="dataMetrics"
      :loading="loading"
      :title="title"
      :height="height"
      :width="width"
      :categories="categories"
      :dimension-value-map="dimensionValueMap"
      @click="handleChartClick"
    />
    <PieChart
      v-else-if="finalChartType === 'pie'"
      ref="chartComponentRef"
      :data="data"
      :data-metrics="dataMetrics"
      :loading="loading"
      :title="title"
      :height="height"
      :width="width"
      :categories="categories"
      :dimension-value-map="dimensionValueMap"
      @click="handleChartClick"
    />
    <MixedChart
      v-else-if="finalChartType === 'mixed'"
      ref="chartComponentRef"
      :data="data"
      :data-metrics="dataMetrics"
      :loading="loading"
      :title="title"
      :height="height"
      :width="width"
      :categories="categories"
      :dimension-value-map="dimensionValueMap"
      @click="handleChartClick"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'


import BarChart from './charts/BarChart.vue'
import LineChart from './charts/LineChart.vue'
import MixedChart from './charts/MixedChart.vue'
import PieChart from './charts/PieChart.vue'

import type { ChartDataItem, DataMetric } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

export default defineComponent({
  name: 'UniversalChart',
  components: {
    BarChart,
    LineChart,
    PieChart,
    MixedChart
  },
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
    chartType: {
      type: String as () => 'bar' | 'line' | 'pie',
      default: 'bar'
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
    const chartComponentRef = ref<any>()

    // 直接按照传入的chartType参数选择图表类型
    const finalChartType = computed(() => {
      // 检查dataMetrics中是否有数据，如果有且只有一个指标且chartType为pie，则使用饼图
      if (props.dataMetrics && props.dataMetrics.length === 1 && props.dataMetrics[0].chartType === 'pie') {
        return 'pie'
      }

      // 检查是否有混合图表类型（柱状图 + 折线图）
      const hasBar = props.dataMetrics.some(m => m.chartType === 'bar')
      const hasLine = props.dataMetrics.some(m => m.chartType === 'line')

      if (hasBar && hasLine) {
        return 'mixed' // 混合图表类型
      }

      // 否则使用传入的chartType
      return props.chartType || 'bar'
    })

    // 处理图表点击事件
    const handleChartClick = (params: any) => {
      emit('click', params)
    }

    // 暴露方法供父组件调用
    const refresh = () => {
      if (chartComponentRef.value && chartComponentRef.value.refresh) {
        chartComponentRef.value.refresh()
      }
    }

    const getInstance = () => {
      if (chartComponentRef.value && chartComponentRef.value.getInstance) {
        return chartComponentRef.value.getInstance()
      }
      return null
    }

    const getChartType = () => {
      return finalChartType.value
    }

    // 暴露方法供父组件调用
    return {
      chartComponentRef,
      finalChartType,
      handleChartClick,
      refresh,
      getInstance,
      getChartType
    }
  }
})
</script>

<style lang="less" scoped>
@import '../../styles/universalChart.less';
</style>
