<template>
  <a-modal v-model:open="modalVisible" :title="selectedBarInfo?.title || '数据详情'" width="80%" :footer="null"
    @cancel="handleClose">
    <div class="detail-content">
      <div class="detail-info">
        <h3>维度信息</h3>
        <p><strong>{{ selectedBarInfo?.firstDimensionName }}:</strong> {{ selectedBarInfo?.firstDimension }}</p>
        <p><strong>{{ selectedBarInfo?.secondDimensionName }}:</strong> {{ selectedBarInfo?.secondDimension }}</p>
      </div>

      <div class="condition-info" v-if="selectedBarInfo?.combinedConditions">
        <h3>查询条件</h3>
        <pre>{{ JSON.stringify(selectedBarInfo.combinedConditions, null, 2) }}</pre>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

export interface SelectedBarInfo {
  firstDimension: string
  secondDimension: string
  firstDimensionName: string
  secondDimensionName: string
  combinedConditions: any
  title: string
}

const props = defineProps<{
  open: boolean
  selectedBarInfo: SelectedBarInfo | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const modalVisible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const handleClose = () => {
  emit('close')
}
</script>

<style scoped lang="less">
.detail-content {
  .detail-info {
    margin-bottom: 20px;

    h3 {
      margin-bottom: 10px;
      color: #1890ff;
    }

    p {
      margin: 5px 0;
    }
  }

  .condition-info {
    h3 {
      margin-bottom: 10px;
      color: #1890ff;
    }

    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
    }
  }
}
</style>
