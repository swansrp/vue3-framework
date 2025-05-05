<template>
  <div :id="'bar-3d-'+index" :style="{zIndex: 1-showNoData, opacity: 1-showNoData}" class="bar-3d-css"></div>
  <div :style="{zIndex: showNoData, opacity: showNoData}" class="bar-3d-no-data">暂无数据</div>
</template>

<script lang="ts" setup>
import { getEchartsBar3dOption } from './echart-option'
import { MetricStatisticType } from '@/framework/components/common/Portal/dashboard/type'
import {
  disposeEcharts,
  getInitEchart,
  setEchartsOptionsAndResize
} from '@/framework/components/common/Portal/dashboard/utils'

const props = defineProps<{ index: any, data: Array<MetricStatisticType>, isPercent?: boolean, dict: any, }>()
const { index, data, isPercent, dict } = toRefs(props)
const showNoData = computed(() => data.value.length ? 0 : 1)
let chart: any = null
const emit = defineEmits<{
  (e: 'click', categoryId: string): void
}>()
const renderRadar = () => {
  watch(
    () => props.data,
    () => {
      if (showNoData) {
        chart = getInitEchart('bar-3d-' + index.value)
        const option = getEchartsBar3dOption(data.value, isPercent.value || false, dict) as any
        setEchartsOptionsAndResize(chart, option)
      }
    },
    {
      deep: true,
      immediate: true
    })
}

onMounted(renderRadar)
onUnmounted(() => {
  if (chart) {
    chart.off('click')
    disposeEcharts(chart)
  }
})
</script>

<style lang="less" scoped>
.bar-3d-css {
  position: absolute;
  top: 40px;
  height: calc(100% - 40px);
  width: 100%;
}

.bar-3d-no-data {
  height: 100%;
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
