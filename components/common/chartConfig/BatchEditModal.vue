<template>
  <a-modal
    v-model:open="visible"
    title="批量编辑图表配置"
    :width="720"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleClose"
  >
    <div class="batch-edit-modal">
      <!-- 步骤说明 -->
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          从左侧树勾选的指标中选择一个作为模板，将其维度或筛选条件应用到其他指标。
        </template>
      </a-alert>

      <!-- 选择模板指标 -->
      <div class="section">
        <div class="section-title">
          <span class="step-badge">1</span>
          选择模板指标（从中复制配置）
        </div>
        <a-select
          v-model:value="sourceIndicatorId"
          placeholder="请选择一个指标作为模板"
          style="width: 100%"
          :options="indicatorOptions"
          show-search
          :filter-option="filterOption"
        />
        <!-- 模板指标配置预览 -->
        <div
          v-if="sourceConfig"
          class="config-preview"
        >
          <div class="preview-item">
            <span class="preview-label">图表类型：</span>
            <a-tag :color="sourceChartType === 'standard' ? 'blue' : sourceChartType === 'metricsPie' ? 'purple' : 'cyan'">
              {{ sourceChartType === 'standard' ? '标准图表' : sourceChartType === 'metricsPie' ? '指标饼图' : '树形堆叠图' }}
            </a-tag>
          </div>
          <div
            v-if="sourceChartType === 'standard'"
            class="preview-item"
          >
            <span class="preview-label">维度一：</span>
            <a-tag color="blue">
              {{ sourceConfig.firstDimension?.groupName || '未配置' }}
            </a-tag>
            <span
              v-if="sourceConfig.firstDimension?.indicatorItems"
              class="preview-count"
            >{{ sourceConfig.firstDimension.indicatorItems.length }} 项</span>
          </div>
          <div
            v-if="sourceChartType === 'standard'"
            class="preview-item"
          >
            <span class="preview-label">维度二：</span>
            <a-tag :color="sourceConfig.secondDimension ? 'green' : 'default'">
              {{ sourceConfig.secondDimension?.groupName || '无' }}
            </a-tag>
            <span
              v-if="sourceConfig.secondDimension?.indicatorItems"
              class="preview-count"
            >{{ sourceConfig.secondDimension.indicatorItems.length }} 项</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">筛选条件：</span>
            <a-tag :color="hasFilterConditions ? 'orange' : 'default'">
              {{ hasFilterConditions ? '已配置' : '无' }}
            </a-tag>
          </div>
        </div>
      </div>

      <!-- 选择要应用的部分 -->
      <div class="section">
        <div class="section-title">
          <span class="step-badge">2</span>
          选择要应用的部分
        </div>
        <a-checkbox-group v-model:value="applyParts">
          <div class="parts-list">
            <a-checkbox
              v-if="sourceChartType === 'standard'"
              value="firstDimension"
            >
              <span class="part-label">维度一（横坐标）</span>
              <span class="part-desc">替换所有选中指标的一级维度</span>
            </a-checkbox>
            <a-checkbox
              v-if="sourceChartType === 'standard'"
              value="secondDimension"
            >
              <span class="part-label">维度二（数据集）</span>
              <span class="part-desc">替换所有选中指标的二级维度</span>
            </a-checkbox>
            <a-checkbox value="filterConditions">
              <span class="part-label">筛选条件</span>
              <span class="part-desc">替换所有选中指标的筛选条件</span>
            </a-checkbox>
          </div>
        </a-checkbox-group>
        <div
          v-if="sourceChartType !== 'standard' && sourceIndicatorId"
          class="type-hint"
        >
          <a-alert
            type="warning"
            show-icon
            :message="sourceChartType === 'metricsPie' ? '指标饼图没有维度配置，仅支持批量替换筛选条件' : '树形堆叠图没有标准维度配置，仅支持批量替换筛选条件'"
            style="margin-top: 8px"
          />
        </div>
      </div>

      <!-- 选择目标指标 -->
      <div class="section">
        <div class="section-title">
          <span class="step-badge">3</span>
          确认目标指标（将配置应用到以下指标）
        </div>
        <div class="target-charts">
          <a-checkbox
            :checked="isAllTargetSelected"
            :indeterminate="isIndeterminate"
            @change="handleSelectAllTargets"
          >
            全选
          </a-checkbox>
          <a-divider style="margin: 8px 0" />
          <a-checkbox-group
            v-model:value="targetIndicatorIds"
            style="width: 100%"
          >
            <div class="target-list">
              <a-checkbox
                v-for="node in targetIndicatorOptions"
                :key="node.id"
                :value="node.id"
              >
                {{ node.title }}
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <a-button @click="handleClose">
          取消
        </a-button>
        <a-button
          type="primary"
          :loading="applying"
          :disabled="!canApply"
          @click="handleApply"
        >
          应用到 {{ targetIndicatorIds.length }} 个指标
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import { updateCommonStatistic, updatePersonalStatistic } from './api'
import type { IndicatorNode } from './types'

interface Props {
  open: boolean
  selectedIndicators: IndicatorNode[]
  isCommonIndicator?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'applied'): void
}

const props = withDefaults(defineProps<Props>(), {
  isCommonIndicator: false
})
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

// 模板指标ID
const sourceIndicatorId = ref<string | undefined>(undefined)
// 要应用的部分
const applyParts = ref<string[]>(['firstDimension'])
// 目标指标ID列表
const targetIndicatorIds = ref<string[]>([])
// 应用中的loading
const applying = ref(false)

// 解析指标的indicator配置
const parseConfig = (node: IndicatorNode): any | null => {
  try {
    if (!node.indicator) return null
    return typeof node.indicator === 'string' ? JSON.parse(node.indicator) : node.indicator
  } catch {
    return null
  }
}

// 检测图表类型
const getChartType = (config: any): string => {
  if (!config) return 'unknown'
  if (Array.isArray(config.dataMetrics) && config.dataMetrics.some((m: any) => m.chartType === 'metricsPie')) {
    return 'metricsPie'
  }
  if ((Array.isArray(config.dataMetrics) && config.dataMetrics.some((m: any) => m.chartType === 'treeStackedBar')) || config.treeDimension) {
    return 'treeStackedBar'
  }
  return 'standard'
}

// 指标选项（用于下拉选择）
const indicatorOptions = computed(() => {
  return props.selectedIndicators
    .filter(node => !node.children || node.children.length === 0) // 只显示叶子节点
    .map(node => ({
      value: node.id,
      label: node.title || '未命名指标'
    }))
})

// 目标指标选项（排除模板指标）
const targetIndicatorOptions = computed(() => {
  return props.selectedIndicators
    .filter(node => (!node.children || node.children.length === 0) && node.id !== sourceIndicatorId.value)
})

// 全选/半选状态
const isAllTargetSelected = computed(() => {
  return targetIndicatorOptions.value.length > 0 &&
    targetIndicatorIds.value.length === targetIndicatorOptions.value.length
})
const isIndeterminate = computed(() => {
  return targetIndicatorIds.value.length > 0 &&
    targetIndicatorIds.value.length < targetIndicatorOptions.value.length
})

// 模板指标的配置
const sourceConfig = computed(() => {
  if (!sourceIndicatorId.value) return null
  const node = props.selectedIndicators.find(n => n.id === sourceIndicatorId.value)
  if (!node) return null
  return parseConfig(node)
})

// 模板图表类型
const sourceChartType = computed(() => getChartType(sourceConfig.value))

// 是否有筛选条件
const hasFilterConditions = computed(() => {
  if (!sourceConfig.value?.filterConditions) return false
  const fc = sourceConfig.value.filterConditions
  return fc.conditionList && fc.conditionList.length > 0
})

// 是否可以应用
const canApply = computed(() => {
  return sourceIndicatorId.value && applyParts.value.length > 0 && targetIndicatorIds.value.length > 0
})

// 搜索过滤
const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 全选目标
const handleSelectAllTargets = (e: any) => {
  if (e.target.checked) {
    targetIndicatorIds.value = targetIndicatorOptions.value.map(n => n.id)
  } else {
    targetIndicatorIds.value = []
  }
}

// 监听弹窗打开，初始化状态
watch(() => props.open, (newVal) => {
  if (newVal) {
    sourceIndicatorId.value = undefined
    applyParts.value = ['firstDimension']
    // 默认选中所有叶子指标作为目标
    targetIndicatorIds.value = props.selectedIndicators
      .filter(node => !node.children || node.children.length === 0)
      .map(n => n.id)
  }
})

// 监听模板指标变化，从目标中排除
watch(sourceIndicatorId, (newVal) => {
  if (newVal) {
    targetIndicatorIds.value = targetIndicatorIds.value.filter(id => id !== newVal)
  }
})

// 应用批量编辑
const handleApply = async () => {
  if (!sourceConfig.value) {
    message.error('模板指标配置无效')
    return
  }

  applying.value = true
  try {
    let successCount = 0
    let failCount = 0

    for (const indicatorId of targetIndicatorIds.value) {
      const node = props.selectedIndicators.find(n => n.id === indicatorId)
      if (!node) continue

      // 解析目标指标的当前配置
      const targetConfig = parseConfig(node)
      if (!targetConfig) {
        failCount++
        continue
      }

      // 应用选中的部分
      const updatedConfig = { ...targetConfig }
      if (applyParts.value.includes('firstDimension') && sourceConfig.value.firstDimension) {
        updatedConfig.firstDimension = JSON.parse(JSON.stringify(sourceConfig.value.firstDimension))
      }
      if (applyParts.value.includes('secondDimension')) {
        updatedConfig.secondDimension = sourceConfig.value.secondDimension
          ? JSON.parse(JSON.stringify(sourceConfig.value.secondDimension))
          : null
      }
      if (applyParts.value.includes('filterConditions') && sourceConfig.value.filterConditions) {
        updatedConfig.filterConditions = JSON.parse(JSON.stringify(sourceConfig.value.filterConditions))
      }

      // 调用API更新指标配置
      try {
        const updateData = {
          id: node.id,
          indicator: JSON.stringify(updatedConfig)
        }
        if (props.isCommonIndicator) {
          await updateCommonStatistic(updateData)
        } else {
          await updatePersonalStatistic(updateData)
        }
        successCount++
      } catch (err) {
        console.error(`更新指标 ${node.title} 失败:`, err)
        failCount++
      }
    }

    if (failCount === 0) {
      message.success(`批量编辑完成，成功更新 ${successCount} 个指标`)
    } else {
      message.warning(`批量编辑完成：${successCount} 个成功，${failCount} 个失败`)
    }

    emit('applied')
    handleClose()
  } catch (error) {
    console.error('批量编辑失败:', error)
    message.error('批量编辑失败，请重试')
  } finally {
    applying.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
}
</script>

<style lang="less" scoped>
.batch-edit-modal {
  .section {
    margin-bottom: 20px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;

      .step-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #1890ff;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
      }
    }
  }

  .config-preview {
    margin-top: 12px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #f0f0f0;

    .preview-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .preview-label {
        font-size: 13px;
        color: #595959;
        min-width: 70px;
      }

      .preview-count {
        font-size: 12px;
        color: #8c8c8c;
      }
    }
  }

  .parts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .ant-checkbox-wrapper {
      display: flex;
      align-items: flex-start;

      .part-label {
        font-weight: 500;
        color: #262626;
      }

      .part-desc {
        font-size: 12px;
        color: #8c8c8c;
        margin-left: 8px;
      }
    }
  }

  .target-charts {
    max-height: 200px;
    overflow-y: auto;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #f0f0f0;

    .target-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}
</style>
