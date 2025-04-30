<template>
  <div :id="'pie-3d-'+index" :style="{zIndex: 2-showNoData, opacity: 1-showNoData}" class="pie-3d"></div>
  <div :style="{zIndex: showNoData, opacity: showNoData}" class="pie-3d-no-data">暂无数据</div>
  <slot></slot>
</template>

<script lang="ts" setup>
import 'echarts-gl'
import { echartsPie, processSingleMetricData } from './echart-option'
import { disposeEcharts, getInitEchart } from "../utils"
import { MetricStatisticType } from '@/framework/components/common/Portal/dashboard/type'

const props = defineProps<{ index: any, data: Array<MetricStatisticType>, dict: any }>()
let chart: any = null
const { index, data, dict } = toRefs(props)
const showNoData = computed(() => {
  const sumValue = data.value.reduce((pre: number, cur: any) => pre + cur.statistic, 0)
  return 1 - (+!!sumValue)
})
const renderRadar = () => {
  watch(
    () => data.value,
    () => {
      if (data.value && data.value.length) {
        chart = getInitEchart('pie-3d-' + index.value)
        const _data = processSingleMetricData(data.value, dict.value)
        echartsPie(chart, _data)
      }
    },
    {
      immediate: true,
      deep: true
    })
}
onMounted(renderRadar)
onUnmounted(() => {
  if (chart) {
    chart.off("mouseover")
    disposeEcharts(chart)
  }
})
</script>

<style lang="less" scoped>
.pie-3d {
  top: 40px;
  height: calc(100% - 40px);
  width: 100%;
  position: absolute;
}

.pie-3d-no-data {
  top: 40px;
  height: calc(100% - 40px);
  width: 100%;
  float: left;
  color: #fff;
  font-size: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
}
</style>
