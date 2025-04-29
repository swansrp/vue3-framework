<template>
  <div style="height: 100%; width: 100%;" :id="'bar-3d-'+index"></div>
</template>

<script setup lang="ts">
import { getEchartsBar3dOption } from './echart-option'
import { getInitEchart, setEchartsOptionsAndResize } from "@/dashboard-framework/utils/common"
import { Bar3dDataType } from '@/framework/components/common/Portal/dashboard/type'

const props = defineProps<{ index: any, data: Bar3dDataType, isPercent?: boolean, typeName: string }>()
const { index, data, isPercent, typeName } = toRefs(props)
const showNoData = computed(() => data.value.amount.length ? 0 : 1)
const emit = defineEmits<{
  (e: 'click', categoryId: string): void
}>()
const renderRadar = () => {
  watch(() => props.data, () => {
    if (showNoData) {
      const chart = getInitEchart('bar-3d-' + index.value)
      const option = getEchartsBar3dOption(data.value, isPercent.value || false, typeName.value) as any
      setEchartsOptionsAndResize(chart, option)
      chart.off('click')
      chart.on('click', (params: any) => {
        emit('click', data.value.categoryId[params.dataIndex])
      })
    }
  })
}

onMounted(renderRadar)
</script>

<style scoped>

</style>
