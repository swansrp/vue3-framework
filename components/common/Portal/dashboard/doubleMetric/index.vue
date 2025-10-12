<template>
  <div
    :id="'double-circular-'+index"
    class="double-circular-css"
    :style="{zIndex: 1-showNoData, opacity: 1-showNoData}"
  ></div>
  <div
    :style="{zIndex: showNoData, opacity: showNoData}"
    class="double-circular-no-data"
  >
    暂无数据
  </div>
</template>

<script lang="ts" setup>
import { MetricStatisticType, NameValue } from '../type'
import { DoubleMetricDataType, getEchartsDoubleMetricOption, processDoubleMetricData } from './echart-option'
import { disposeEcharts, getInitEchart, setEchartsOptionsAndResize } from '../utils'

const props = defineProps<{ index: any, data: Array<MetricStatisticType> }>()
const { index, data } = toRefs(props)
const showNoData = computed(() => data.value.length ? 0 : 1)
const _data = ref({} as DoubleMetricDataType)
let chart: any = null
const renderRadar = () => {
  watch(
      () => props.data,
      () => {
        const chart = getInitEchart('double-circular-' + index.value)
        if (data.value.length) {
          _data.value = processDoubleMetricData(data.value)
          const option = getEchartsDoubleMetricOption(_data.value)
          setEchartsOptionsAndResize(chart, option as any)
        } else chart.clear()
        //解决重复触发
        chart.off('legendselectchanged')
        chart.on('legendselectchanged', (e: any) => {
          // 获取echarts的当前选择的内环label，格式为{'xxx'：true, 'yyy': false}
          const { selected: selectedLabelList } = e
          // 用于存储内环的label索引
          const selectedLabelNameList: string[] = []
          // 初始化一个空的数据对象
          const selectData: DoubleMetricDataType = { innerData: [], outerData: [] }
          // 将echarts的当前选择的内环label转为一个set，set中仅含有label
          const selectedLabelSet = new Set(Object.entries(selectedLabelList).filter((item: any) => item[1]).map((item: any) => item[0]))
          // 使用selectedLabelSet为selectedLabelIndexList 进行赋值
          _data.value.innerData.forEach((item: NameValue) => selectedLabelSet.has(item.name) && selectedLabelNameList.push(item.name))
          // 通过selectedLabelSet，从原始的data.value中筛选出当前选择的label的内环数据
          selectData.innerData = _data.value.innerData.filter((item: NameValue) => selectedLabelSet.has(item.name))
          // selectedLabelNameList，为selectData.outerData进行赋值
          selectedLabelNameList.forEach((name: string) => {
            _data.value.outerData.forEach((item: NameValue) => {
              if(item.parentName === name) {
                selectData.outerData.push(item)
              }
            })
          })
          console.log(selectedLabelNameList, selectData)
          // 重要！没有这一步的话，新的双环图将缺少未选择的label的legend
          selectData.innerData = _data.value.innerData
          const option = getEchartsDoubleMetricOption(selectData)
          // 重绘图之前，取消未选择内环label的legend高亮
          Object.keys(option.legend.selected).forEach((key: string) => !selectedLabelSet.has(key) && (option.legend.selected[key as keyof typeof option.legend.selected] = false))
          // 重新绘图，更新双环图
          setEchartsOptionsAndResize(chart, option as any)
      })
    },
    {
      deep: true,
      immediate: true
    }
  )
}
onMounted(renderRadar)
onUnmounted(() => {
  if (chart) {
    chart.off('legendselectchanged')
    disposeEcharts(chart)
  }
})
</script>

<style scoped>
.double-circular-css {
  position: absolute;
  top: 40px;
  height: calc(100% - 40px);
  width: 100%;
}

.double-circular-no-data {
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
