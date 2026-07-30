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
            <a-tag :color="sourceChartTypeTagColor">
              {{ sourceChartTypeLabel }}
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
          <div
            v-if="sourceChartType === 'treeStackedBar'"
            class="preview-item"
          >
            <span class="preview-label">树关系：</span>
            <a-tag color="cyan">
              {{ sourceConfig.treeDimension?.displayName || sourceConfig.treeDimension?.dictName || '未配置' }}
            </a-tag>
          </div>
          <div
            v-if="sourceChartType === 'rankingBar'"
            class="preview-item"
          >
            <span class="preview-label">分组字段：</span>
            <a-tag color="geekblue">
              {{ sourceConfig.dataMetrics?.[0]?.groupByLabel || sourceConfig.dataMetrics?.[0]?.groupByField || '未配置' }}
            </a-tag>
            <span class="preview-count">Top {{ sourceConfig.dataMetrics?.[0]?.topN ?? 10 }}</span>
          </div>
          <div
            v-if="sourceChartType === 'comparisonBar'"
            class="preview-item"
          >
            <span class="preview-label">时间字段：</span>
            <a-tag color="gold">
              {{ sourceConfig.dataMetrics?.[0]?.dateFieldLabel || sourceConfig.dataMetrics?.[0]?.dateField || '未配置' }}
            </a-tag>
            <span class="preview-count">{{ sourceConfig.dataMetrics?.[0]?.dataField ? '求和' : '计数' }}</span>
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
            <a-checkbox value="chartType">
              <span class="part-label">图表类型</span>
              <span class="part-desc">将目标图表转换为模板的类型（{{ sourceChartTypeLabel }}）</span>
            </a-checkbox>
            <a-checkbox
              v-if="sourceChartType === 'standard'"
              value="firstDimension"
            >
              <span class="part-label">第一维度（横坐标）</span>
              <span class="part-desc">替换所有选中指标的一级维度</span>
            </a-checkbox>
            <a-checkbox
              v-if="sourceChartType !== 'metricsPie' && sourceChartType !== 'rankingBar' && sourceChartType !== 'comparisonBar'"
              value="secondDimension"
            >
              <span class="part-label">第二维度（含树关系）</span>
              <span class="part-desc">{{ secondDimensionDesc }}</span>
            </a-checkbox>
            <a-checkbox
              v-if="sourceChartType === 'rankingBar'"
              value="rankingConfig"
            >
              <span class="part-label">排行配置</span>
              <span class="part-desc">同步模板的分组字段 / 取前 N 名 / 排序方向</span>
            </a-checkbox>
            <a-checkbox
              v-if="sourceChartType === 'comparisonBar'"
              value="comparisonConfig"
            >
              <span class="part-label">同比环比配置</span>
              <span class="part-desc">同步模板的时间字段</span>
            </a-checkbox>
            <a-checkbox value="dataMetrics">
              <span class="part-label">统计字段（数据指标）</span>
              <span class="part-desc">替换所有选中指标的数据指标配置（字段、单位、格式、颜色等）</span>
            </a-checkbox>
            <a-checkbox value="filterConditions">
              <span class="part-label">筛选条件</span>
              <span class="part-desc">替换所有选中指标的筛选条件</span>
            </a-checkbox>
          </div>
        </a-checkbox-group>
        <div
          v-if="treeTypeWithoutTree && sourceIndicatorId"
          class="type-hint"
        >
          <a-alert
            type="warning"
            show-icon
            message="模板为树形堆叠图：同步「图表类型」或「统计字段」而不勾选「第二维度（含树关系）」，会导致原本没有树关系的目标图表无法正常渲染。"
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

import { resolveChartMode } from '@/framework/components/common/chart/utils/chartDataHelper'

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

// 检测图表类型（空配置返回 unknown，其余归类为 standard/metricsPie/treeStackedBar）
const getChartType = (config: any): string => {
  if (!config) return 'unknown'
  return resolveChartMode(config)
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

// 模板图表类型中文标签
const sourceChartTypeLabel = computed(() => {
  const map: Record<string, string> = {
    standard: '标准图表',
    metricsPie: '指标饼图',
    treeStackedBar: '树形堆叠图',
    rankingBar: '排行榜(Top-N)',
    comparisonBar: '同比环比'
  }
  return map[sourceChartType.value] || '未知'
})

// 模板图表类型 Tag 颜色
const sourceChartTypeTagColor = computed(() => {
  const map: Record<string, string> = {
    standard: 'blue',
    metricsPie: 'purple',
    treeStackedBar: 'cyan',
    rankingBar: 'geekblue',
    comparisonBar: 'gold'
  }
  return map[sourceChartType.value] || 'default'
})

// 第二维度选项描述（随模板类型变化）
const secondDimensionDesc = computed(() => {
  return sourceChartType.value === 'treeStackedBar'
    ? '同步模板的树关系，并将目标图表转为树形堆叠'
    : '替换所有选中指标的二级维度'
})

// 风险提示：树形模板同步了类型/统计字段而未同步树关系
const treeTypeWithoutTree = computed(() => {
  return sourceChartType.value === 'treeStackedBar' &&
    (applyParts.value.includes('chartType') || applyParts.value.includes('dataMetrics')) &&
    !applyParts.value.includes('secondDimension')
})

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

// 监听模板图表类型变化，自动调整默认勾选项
watch(sourceChartType, (newType) => {
  if (newType === 'treeStackedBar') {
    applyParts.value = ['chartType', 'secondDimension']
  } else if (newType === 'metricsPie') {
    applyParts.value = ['filterConditions']
  } else if (newType === 'rankingBar') {
    applyParts.value = ['chartType', 'rankingConfig']
  } else if (newType === 'comparisonBar') {
    applyParts.value = ['chartType', 'comparisonConfig']
  } else {
    applyParts.value = ['firstDimension']
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

    // 深拷贝辅助；按 dataField 或索引匹配模板指标，用于同步类型相关渲染配置（itemColors 等）
    const clone = (v: any) => (v == null ? v : JSON.parse(JSON.stringify(v)))
    const templateMetrics: any[] = sourceConfig.value.dataMetrics || []
    const matchMetric = (target: any, index: number) =>
      templateMetrics.find((m: any) => m.dataField === target.dataField) || templateMetrics[index]

    for (const indicatorId of targetIndicatorIds.value) {
      const node = props.selectedIndicators.find(n => n.id === indicatorId)
      if (!node) continue

      // 解析目标指标的当前配置
      const targetConfig = parseConfig(node)
      if (!targetConfig) {
        failCount++
        continue
      }

      // 应用选中的部分（勾选项变为模板值，未勾选项保持原样）
      const updatedConfig = { ...targetConfig }
      const templateMode = sourceChartType.value

      // 1. 同步统计字段：整体替换数据指标配置（字段、单位、格式、颜色、图表类型等）及统计指标可见性
      if (applyParts.value.includes('dataMetrics')) {
        if (Array.isArray(sourceConfig.value.dataMetrics)) {
          updatedConfig.dataMetrics = clone(sourceConfig.value.dataMetrics)
        }
        updatedConfig.visibleStatisticTypes = clone(sourceConfig.value.visibleStatisticTypes) ?? []
      }

      // 2. 同步图表类型：仅转换数据指标的图表模式与类型相关渲染配置（itemColors），不改变字段本身
      if (applyParts.value.includes('chartType')) {
        if (Array.isArray(updatedConfig.dataMetrics)) {
          updatedConfig.dataMetrics = updatedConfig.dataMetrics.map((m: any, index: number) => {
            const tpl = matchMetric(m, index)
            const itemColors = tpl?.itemColors ? clone(tpl.itemColors) : {}
            if (templateMode === 'treeStackedBar') {
              return { ...m, chartType: 'treeStackedBar', stackGroup: 'selfStack', itemColors }
            }
            if (templateMode === 'metricsPie') {
              return { ...m, chartType: 'metricsPie', itemColors }
            }
            if (templateMode === 'rankingBar') {
              // 排行榜：拷贝模板首指标的图表类型与排行字段
              const tplFirst = templateMetrics[0] || {}
              return {
                ...m,
                chartType: 'rankingBar',
                stackGroup: 'noStack',
                groupByField: tplFirst.groupByField,
                groupByLabel: tplFirst.groupByLabel,
                topN: tplFirst.topN ?? 10,
                sortOrder: tplFirst.sortOrder ?? 1,
                groupByDictMap: tplFirst.groupByDictMap ? clone(tplFirst.groupByDictMap) : {},
                itemColors
              }
            }
            if (templateMode === 'comparisonBar') {
              // 同比环比：拷贝模板首指标的图表类型与时间字段（含日期格式）
              const tplFirst = templateMetrics[0] || {}
              return {
                ...m,
                chartType: 'comparisonBar',
                stackGroup: 'noStack',
                dateField: tplFirst.dateField,
                dateFieldLabel: tplFirst.dateFieldLabel,
                dateFormat: tplFirst.dateFormat || 'DATETIME',
                itemColors
              }
            }
            // 标准图表：将特殊类型还原为普通柱状图
            return (m.chartType === 'treeStackedBar' || m.chartType === 'metricsPie' || m.chartType === 'rankingBar' || m.chartType === 'comparisonBar')
              ? { ...m, chartType: 'bar', stackGroup: 'noStack', itemColors }
              : { ...m, itemColors }
          })
        }
      }

      // 3. 同步第一维度（仅标准图表模板有意义），并同步一级维度可见性
      if (applyParts.value.includes('firstDimension')) {
        updatedConfig.firstDimension = sourceConfig.value.firstDimension
          ? clone(sourceConfig.value.firstDimension)
          : null
        updatedConfig.visibleFirstDimensions = clone(sourceConfig.value.visibleFirstDimensions) ?? []
      }

      // 4. 同步第二维度（含树关系），并同步二级维度可见性
      if (applyParts.value.includes('secondDimension')) {
        if (sourceConfig.value.treeDimension) {
          // 模板为树形堆叠：同步树关系引用，并确保目标为树形堆叠类型
          updatedConfig.treeDimension = clone(sourceConfig.value.treeDimension)
          updatedConfig.secondDimension = null
          if (Array.isArray(updatedConfig.dataMetrics)) {
            updatedConfig.dataMetrics = updatedConfig.dataMetrics.map((m: any, index: number) => {
              const tpl = matchMetric(m, index)
              return {
                ...m,
                chartType: 'treeStackedBar',
                stackGroup: 'selfStack',
                itemColors: tpl?.itemColors ? clone(tpl.itemColors) : {}
              }
            })
          }
          // 树形堆叠的父节点（X轴）与叶子（堆叠段）均由树派生，同步两者可见性（默认全可见，避免残留 [null] 导致空图）
          updatedConfig.visibleFirstDimensions = clone(sourceConfig.value.visibleFirstDimensions) ?? []
          updatedConfig.visibleSecondDimensions = clone(sourceConfig.value.visibleSecondDimensions) ?? []
        } else {
          // 模板为标准图表：同步普通二级维度，清空树关系
          updatedConfig.secondDimension = sourceConfig.value.secondDimension
            ? clone(sourceConfig.value.secondDimension)
            : null
          updatedConfig.treeDimension = null
          updatedConfig.visibleSecondDimensions = clone(sourceConfig.value.visibleSecondDimensions) ?? []
        }
      }

      // 5. 同步筛选条件
      if (applyParts.value.includes('filterConditions') && sourceConfig.value.filterConditions) {
        updatedConfig.filterConditions = clone(sourceConfig.value.filterConditions)
      }

      // 5.1 同步排行配置：将模板首指标的分组字段/TopN/排序同步到目标首指标
      if (applyParts.value.includes('rankingConfig')) {
        const tplFirst = templateMetrics[0] || {}
        if (Array.isArray(updatedConfig.dataMetrics) && updatedConfig.dataMetrics.length > 0) {
          updatedConfig.dataMetrics = updatedConfig.dataMetrics.map((m: any, index: number) => index === 0 ? {
            ...m,
            chartType: 'rankingBar',
            stackGroup: 'noStack',
            groupByField: tplFirst.groupByField,
            groupByLabel: tplFirst.groupByLabel,
            topN: tplFirst.topN ?? 10,
            sortOrder: tplFirst.sortOrder ?? 1,
            groupByDictMap: tplFirst.groupByDictMap ? clone(tplFirst.groupByDictMap) : {}
          } : m)
        }
      }

      // 5.2 同步同比环比配置：将模板首指标的时间字段（含日期格式）同步到目标全部指标
      //     （多字段堆叠时拉数只读首指标，但各行统一携带，保证持久化自洽）
      if (applyParts.value.includes('comparisonConfig')) {
        const tplFirst = templateMetrics[0] || {}
        if (Array.isArray(updatedConfig.dataMetrics) && updatedConfig.dataMetrics.length > 0) {
          updatedConfig.dataMetrics = updatedConfig.dataMetrics.map((m: any) => ({
            ...m,
            chartType: 'comparisonBar',
            stackGroup: 'noStack',
            dateField: tplFirst.dateField,
            dateFieldLabel: tplFirst.dateFieldLabel,
            dateFormat: tplFirst.dateFormat || 'DATETIME'
          }))
        }
      }

      // 6. 收尾归一化：按最终图表类型清理不兼容的维度字段，保证配置内部自洽
      //    （无论类型变化由「图表类型」还是「统计字段」同步触发，均能正确归一化）
      const resultMode = updatedConfig.dataMetrics?.[0]?.chartType || 'bar'
      if (resultMode === 'treeStackedBar') {
        // 树形堆叠：一/二级维度由树结构实时派生
        updatedConfig.firstDimension = null
        updatedConfig.secondDimension = null
      } else if (resultMode === 'metricsPie') {
        // 指标饼图：无任何维度
        updatedConfig.firstDimension = null
        updatedConfig.secondDimension = null
        updatedConfig.treeDimension = null
      } else if (resultMode === 'rankingBar') {
        // 排行榜：无任何维度（分组由 groupByField 驱动）
        updatedConfig.firstDimension = null
        updatedConfig.secondDimension = null
        updatedConfig.treeDimension = null
      } else if (resultMode === 'comparisonBar') {
        // 同比环比：无任何维度（周期由 dateField 派生）
        updatedConfig.firstDimension = null
        updatedConfig.secondDimension = null
        updatedConfig.treeDimension = null
      } else {
        // 标准图表：不适用树关系
        updatedConfig.treeDimension = null
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
