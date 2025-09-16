<template>
  <a-modal
    v-model:open="modalVisible" width="95%" :footer="null" :body-style="{ padding: '16px', height: '90vh' }"
    :style="{ marginTop: '-75px' }" @cancel="handleClose">
    <div class="detail-container">
      <!-- 维度信息区域 -->
      <div class="dimension-info-card">
        <div class="card-header">
          <h3>
            <span class="info-icon">📊</span>
            筛选条件：
            <span class="condition-text">
              <strong>{{ selectedBarInfo?.firstDimensionName }}:</strong> {{ selectedBarInfo?.firstDimension }}
              <span v-if="selectedBarInfo?.secondDimensionName && selectedBarInfo?.secondDimension">
                ，<strong>{{ selectedBarInfo?.secondDimensionName }}:</strong> {{ selectedBarInfo?.secondDimension }}
              </span>
              <span v-if="selectedBarInfo?.statisticType">
                ，<strong>统计指标:</strong> {{ selectedBarInfo?.statisticType }}
                <span v-if="selectedBarInfo?.statisticData && selectedBarInfo?.statisticData.length > 0">
                  — {{ selectedBarInfo?.statisticData.join('、') }}
                </span>
              </span>
            </span>
          </h3>
        </div>
      </div>

      <!-- 数据表格区域 -->
      <div class="data-table-card">
        <div class="card-header">
          <h3>
            <span class="info-icon">📋</span>
            详细数据
          </h3>
        </div>
        <div class="table-container">
          <portal
            :tableId="tableId" :advance-condition="condition" :advance="false" :action-width="0" hide-refresh
            hide-row-selection />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { SelectedBarInfo } from '../../type/ChartTypes'
import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

const props = defineProps<{
  open: boolean
  selectedBarInfo: SelectedBarInfo | null
  tableId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const modalVisible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const tableId = computed(() => {
  return props.tableId || ''
})

const handleClose = () => {
  emit('close')
}
const condition = computed(() => {
  // 使用 selectedBarInfo 中的 combinedConditions，按照 ConditionListType 格式返回
  if (props.selectedBarInfo?.combinedConditions?.conditionList) {
    return {
      conditionList: props.selectedBarInfo.combinedConditions.conditionList
    } as ConditionListType
  }

  return { conditionList: [] } as ConditionListType
})
</script>

<style scoped lang="less">
.detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.dimension-info-card,
.data-table-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  }

  .card-header {
    background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;

    h3 {
      margin: 0;
      color: #262626;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;

      .info-icon {
        font-size: 18px;
      }

      .condition-text {
        font-weight: 400;
        color: #595959;
        margin-left: 8px;

        strong {
          color: #262626;
          font-weight: 600;
        }
      }
    }
  }
}

.dimension-info-card {
  flex-shrink: 0;
}

.data-table-card {
  flex: 1;
  min-height: 700px;

  .table-container {
    padding: 0;
    height: 700px;
    overflow: hidden;

    // 确保Portal组件占满空间
    :deep(.root) {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    :deep(.portal-table-space) {
      margin: 0;
      padding: 0;
      height: 100%;
    }

    // 之前分别写了三个选择器，现在合并为一个
    :deep(.ant-table-wrapper),
    :deep(.ant-table),
    :deep(.surely-table-wrapper) {
      margin: 0;
      padding: 0;
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .condition-text {
    font-size: 13px;
    margin-left: 4px;
  }
}
</style>
