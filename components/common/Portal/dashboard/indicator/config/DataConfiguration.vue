<template>
  <div class="data-section">
    <div
      class="section-header"
      @click="toggleCollapse"
    >
      <div class="data-header">
        <h4>数据配置</h4>
        <a-button
          type="primary"
          size="small"
          :disabled="!canAddDataMetric"
          @click.stop="openDataConfig('add')"
        >
          添加数据
        </a-button>
      </div>
      <a-button
        type="text"
        size="small"
        class="collapse-btn"
      >
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </a-button>
    </div>

    <div
      v-show="!collapsed"
      class="section-content"
    >
      <div class="data-list">
        <div
          v-for="metric in dataMetrics"
          :key="metric.id"
          class="data-item"
        >
          <div class="data-item-header">
            <span class="data-name">{{ metric.dataName }}</span>
            <div class="data-actions">
              <a-button
                type="text"
                size="small"
                @click="openDataConfig('edit', metric)"
              >
                编辑
              </a-button>
              <a-button
                type="text"
                size="small"
                danger
                @click="removeDataMetric(metric.id)"
              >
                删除
              </a-button>
            </div>
          </div>

          <div class="data-item-content">
            <div class="data-row">
              <span class="data-label">图表类型：</span>
              <span class="data-value">
                <a-select
                  :value="metric.chartType"
                  size="small"
                  style="width: 120px"
                  :disabled="!canChangeChartType(metric)"
                  @change="(value) => updateMetricField(metric.id, 'chartType', value)"
                >
                  <a-select-option
                    v-for="option in getAvailableChartTypesForMetric(metric)"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            <div
              v-if="metric.chartType !== 'pie'"
              class="data-row"
            >
              <span class="data-label">坐标轴：</span>
              <span class="data-value">
                <a-select
                  :value="metric.yAxisPosition"
                  size="small"
                  style="width: 120px"
                  @change="(value) => updateMetricField(metric.id, 'yAxisPosition', value)"
                >
                  <a-select-option
                    v-for="option in axisPositionOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            <div
              v-if="metric.chartType === 'bar'"
              class="data-row"
            >
              <span class="data-label">堆叠：</span>
              <span class="data-value">
                <a-select
                  :value="metric.stackGroup"
                  size="small"
                  style="width: 120px"
                  @change="(value) => updateMetricField(metric.id, 'stackGroup', value)"
                >
                  <a-select-option
                    v-for="option in stackOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </span>
            </div>
            <div class="data-row">
              <span class="data-label">单位：</span>
              <span class="data-value">
                <a-input
                  :value="metric.unit"
                  size="small"
                  :placeholder="getMetricUnitPlaceholder(metric)"
                  :disabled="isMetricUnitDisabled(metric)"
                  style="width: 120px"
                  @change="(e) => updateMetricField(metric.id, 'unit', e.target.value)"
                />
                <a-tooltip
                  v-if="isMetricUnitDisabled(metric)"
                  :title="getUnitTooltip(metric)"
                >
                  <InfoCircleOutlined style="margin-left: 4px; color: #666;" />
                </a-tooltip>
              </span>
            </div>

            <!-- 二级维度值的颜色设置 -->
            <div
              v-if="(secondDimension && secondDimension.items && secondDimension.items.length > 0) || (firstDimension && firstDimension.items && firstDimension.items.length > 0 && !secondDimension)"
              class="data-color-config"
            >
              <div class="color-label">
                颜色配置：
              </div>
              <div class="color-items">
                <!-- 如果有二级维度，显示二级维度的项 -->
                <template v-if="secondDimension && secondDimension.items && secondDimension.items.length > 0">
                  <div
                    v-for="item in secondDimension.items"
                    :key="item.key"
                    class="color-item"
                  >
                    <a-tooltip
                      :title="item.title"
                      placement="top"
                    >
                      <span class="item-name">{{ item.title }}</span>
                    </a-tooltip>
                    <a-button
                      class="color-picker-btn"
                      :style="{ backgroundColor: getDataItemColor(metric.id, item.key) }"
                      @click="openDataItemColorPicker(metric.id, item.key)"
                    />
                  </div>
                </template>
                <!-- 如果只有一级维度，显示一级维度的项 -->
                <template
                  v-else-if="firstDimension && firstDimension.items && firstDimension.items.length > 0 && !secondDimension"
                >
                  <div
                    v-for="item in firstDimension.items"
                    :key="item.key"
                    class="color-item"
                  >
                    <a-tooltip
                      :title="item.title"
                      placement="top"
                    >
                      <span class="item-name">{{ item.title }}</span>
                    </a-tooltip>
                    <a-button
                      class="color-picker-btn"
                      :style="{ backgroundColor: getDataItemColor(metric.id, item.key) }"
                      @click="openDataItemColorPicker(metric.id, item.key)"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据配置模态框 -->
      <a-modal
        v-model:open="dataConfigVisible"
        :title="dataFormMode === 'add' ? '添加数据' : '编辑数据'"
        width="600px"
        @ok="confirmDataConfig"
        @cancel="dataConfigVisible = false"
      >
        <a-form
          v-if="editingDataMetric"
          :model="editingDataMetric"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 18 }"
        >
          <a-form-item
            label="数据类型"
            required
          >
            <a-select
              v-model:value="editingDataMetric.dataField"
              placeholder="请选择数据类型"
              @change="onDataTypeChange"
            >
              <a-select-option
                v-for="dataType in availableDataTypes"
                :key="dataType.dataField"
                :value="dataType.dataField"
                :disabled="isDataTypeUsed(dataType.dataField)"
              >
                {{ dataType.dataName }}
                <span
                  v-if="isDataTypeUsed(dataType.dataField)"
                  class="used-tag"
                >(已使用)</span>
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item
            label="图表类型"
            required
          >
            <a-select
              v-model:value="editingDataMetric.chartType"
              placeholder="请选择图表类型"
              @change="onChartTypeChange"
            >
              <a-select-option
                v-for="option in availableChartTypeOptions"
                :key="option.value"
                :value="option.value"
                :disabled="option.disabled"
              >
                {{ option.label }}
                <span
                  v-if="option.disabled"
                  class="disabled-tip"
                >({{ option.disabledReason }})</span>
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item
            v-if="editingDataMetric.chartType !== 'pie'"
            label="坐标轴位置"
          >
            <a-radio-group v-model:value="editingDataMetric.yAxisPosition">
              <a-radio value="left">
                左侧
              </a-radio>
              <a-radio value="right">
                右侧
              </a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item
            v-if="editingDataMetric.chartType === 'bar'"
            label="堆叠位置"
          >
            <a-select
              v-model:value="editingDataMetric.stackGroup"
              placeholder="请选择堆叠位置"
              allow-clear
            >
              <a-select-option
                v-for="option in stackOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
            <div class="stack-tip">
              <small>提示：</small><br />
              <small>• 不堆叠：第二维度并排显示</small><br />
              <small>• 自堆叠：该指标的第二维度堆叠显示</small><br />
              <small>• 堆叠组：相同组且相同第二维度的指标堆叠，不同第二维度并排</small>
            </div>
          </a-form-item>

          <a-form-item label="单位">
            <a-input
              v-model:value="editingDataMetric.unit"
              :placeholder="getUnitPlaceholder()"
              :disabled="hasUnitConfig()"
              allow-clear
            />
            <div
              v-if="hasUnitConfig()"
              class="unit-tip"
            >
              <small style="color: #666;">金额单位由系统根据计算配置自动生成</small>
            </div>
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 数据项颜色选择器 -->
      <ColorPicker
        v-model:visible="dataItemColorPickerVisible"
        title="选择数据项颜色"
        :initial-color="currentDataItemColor"
        :used-colors="usedColorsInCurrentMetric"
        @confirm="confirmDataItemColorChange"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DownOutlined, RightOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, computed, watch, nextTick } from 'vue'

import ColorPicker from './ColorPicker.vue'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DataMetricUI {
  id: string
  dataName: string
  dataField: string
  chartType: 'bar' | 'line' | 'ptLine' | 'pie'
  color: string
  yAxisPosition: 'left' | 'right'
  stackGroup?: string
  unit?: string
  unitConfig?: string
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
  unitConfig?: string
}

interface ChartTypeOption {
  label: string
  value: string
  disabled?: boolean
  disabledReason?: string
}

// Props
const props = defineProps<{
  dataMetrics: DataMetricUI[]
  firstDimension: IndicatorGroup | null
  secondDimension: IndicatorGroup | null
  availableDataTypes: DataTypeOption[]
  convertUnit?: (unitConfig: string) => string
}>()

// Emits
const emit = defineEmits<{
  'update:dataMetrics': [metrics: DataMetricUI[]]
  'updateMetricField': [metricId: string, field: string, value: any]
}>()

// 折叠状态
const collapsed = ref(false)

// 配置选项
const chartTypeOptions = ref<ChartTypeOption[]>([
  { label: '柱状图', value: 'bar' },
  { label: '折线图', value: 'line' },
  { label: '占比折线图', value: 'ptLine' },
  { label: '饼图', value: 'pie' }
])

const axisPositionOptions = ref<{ label: string; value: string }[]>([
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' }
])

const stackOptions = ref<{ label: string; value: string }[]>([
  { label: '不堆叠', value: 'noStack' },
  { label: '自堆叠', value: 'selfStack' },
  { label: '堆叠组1', value: 'stack1' },
  { label: '堆叠组2', value: 'stack2' },
  { label: '堆叠组3', value: 'stack3' },
  { label: '堆叠组4', value: 'stack4' },
  { label: '堆叠组5', value: 'stack5' }
])

// 数据配置相关状态
const dataConfigVisible = ref(false)
const editingDataMetric = ref<DataMetricUI | null>(null)
const dataFormMode = ref<'add' | 'edit'>('add')

// 数据项颜色配置相关状态
const dataItemColorPickerVisible = ref(false)
const currentDataItemTarget = ref<{ metricId: string; itemKey: string }>({ metricId: '', itemKey: '' })

// 计算属性
const currentDataItemColor = computed(() => {
  if (!currentDataItemTarget.value.metricId || !currentDataItemTarget.value.itemKey) {
    return '#1890ff'
  }
  // 确保获取到的是当前实际显示的颜色
  return getDataItemColor(currentDataItemTarget.value.metricId, currentDataItemTarget.value.itemKey)
})

// 获取当前数据指标中已使用的颜色列表（用于颜色重复检测）
const usedColorsInCurrentMetric = computed(() => {
  const { metricId } = currentDataItemTarget.value
  if (!metricId) return []

  const metric = props.dataMetrics.find(m => m.id === metricId)
  if (!metric || !metric.itemColors) return []

  // 收集当前指标中所有已使用的颜色
  return Object.values(metric.itemColors).filter(color => color)
})

// 判断是否有饼图类型的数据指标
const hasPieChart = computed(() => {
  return props.dataMetrics.some(metric => metric.chartType === 'pie')
})

// 判断是否可以添加数据指标
const canAddDataMetric = computed(() => {
  // 如果已经有饼图类型，不允许添加新的数据指标
  return !hasPieChart.value
})

// 获取可用的图表类型选项
const availableChartTypeOptions = computed(() => {
  if (!editingDataMetric.value) return chartTypeOptions.value

  const isFirstMetric = dataFormMode.value === 'add' && props.dataMetrics.length === 0
  const isEditingFirstMetric = dataFormMode.value === 'edit' && props.dataMetrics.length === 1 && props.dataMetrics[0].id === editingDataMetric.value.id

  return chartTypeOptions.value.map(option => {
    if (option.value === 'pie') {
      // 饼图只允许在第一个数据指标中选择
      const canSelectPie = isFirstMetric || isEditingFirstMetric
      return {
        ...option,
        disabled: !canSelectPie,
        disabledReason: canSelectPie ? '' : '饼图只能作为第一个数据指标'
      }
    }
    return { ...option, disabled: false, disabledReason: '' }
  })
})

// 默认颜色配置
const defaultColors = ref<string[]>([
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
])

const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  '#fa541c', '#8c8c8c', '#722ed1', '#eb2f96', '#52c41a',
  '#faad14', '#13c2c2', '#f5222d', '#fa8c16', '#a0d911'
]

// 单位配置解析逻辑已移至 dashboard.vue 中的 convertUnit 函数

const isPercentLineMetric = (metric?: DataMetricUI | null): boolean => metric?.chartType === 'ptLine'

// 检查当前编辑的数据是否有unitConfig
const hasUnitConfig = (): boolean => {
  if (!editingDataMetric.value) return false
  const dataType = props.availableDataTypes.find(dt => dt.dataField === editingDataMetric.value?.dataField)
  return !!(dataType?.unitConfig)
}

// 获取单位输入框的占位符
const getUnitPlaceholder = (): string => {
  if (isPercentLineMetric(editingDataMetric.value)) {
    return '请输入单位'
  }
  if (hasUnitConfig()) {
    const dataType = props.availableDataTypes.find(dt => dt.dataField === editingDataMetric.value?.dataField)
    if (dataType?.unitConfig && props.convertUnit) {
      const displayUnit = props.convertUnit(dataType.unitConfig)
      return `自动生成：${displayUnit}`
    }
  }
  return '请输入单位'
}

// 检查指定数据指标是否有unitConfig
const isMetricUnitDisabled = (metric: DataMetricUI): boolean => {
  const dataType = props.availableDataTypes.find(dt => dt.dataField === metric.dataField)
  return !!(dataType?.unitConfig)
}

// 获取数据指标单位输入框的占位符
const getMetricUnitPlaceholder = (metric: DataMetricUI): string => {
  if (isPercentLineMetric(metric)) {
    return '请输入单位'
  }
  const dataType = props.availableDataTypes.find(dt => dt.dataField === metric.dataField)
  if (dataType?.unitConfig && props.convertUnit) {
    const displayUnit = props.convertUnit(dataType.unitConfig)
    return `系统生成：${displayUnit}`
  }
  return '请输入单位'
}

// 方法
const updateMetricField = (metricId: string, field: string, value: any) => {
  emit('updateMetricField', metricId, field, value)
}

// 判断是否可以修改图表类型
const canChangeChartType = (metric: DataMetricUI): boolean => {
  // 如果已经是饼图类型，则可以修改
  if (metric.chartType === 'pie') return true

  // 如果已经有其他饼图类型，则不能修改为饼图
  const otherPieCharts = props.dataMetrics.filter(m => m.id !== metric.id && m.chartType === 'pie')
  return otherPieCharts.length === 0
}

// 获取指定数据指标可用的图表类型
const getAvailableChartTypesForMetric = (metric: DataMetricUI) => {
  return chartTypeOptions.value.filter(option => {
    if (option.value === 'pie') {
      // 饼图只允许在第一个数据指标中选择，或者当前已经是饼图
      const isFirstMetric = props.dataMetrics.length === 1 && props.dataMetrics[0].id === metric.id
      const isPieChart = metric.chartType === 'pie'
      const hasOtherPieChart = props.dataMetrics.some(m => m.id !== metric.id && m.chartType === 'pie')

      return isFirstMetric || isPieChart || !hasOtherPieChart
    }
    return true
  })
}

// 图表类型变化处理
const onChartTypeChange = (value: any) => {
  if (!editingDataMetric.value) return

  const chartType = value as string

  if (chartType === 'pie') {
    // 如果选择饼图，检查是否已经有其他饼图
    const existingPieChart = props.dataMetrics.find(m =>
      m.chartType === 'pie' && m.id !== editingDataMetric.value?.id
    )

    if (existingPieChart) {
      message.error('只能有一个饼图类型的数据指标')
      return
    }

    // 如果不是第一个数据指标，不允许选择饼图
    const isFirstMetric = dataFormMode.value === 'add' && props.dataMetrics.length === 0
    const isEditingFirstMetric = dataFormMode.value === 'edit' && props.dataMetrics.length === 1

    if (!isFirstMetric && !isEditingFirstMetric) {
      message.error('饼图只能作为第一个数据指标')
      return
    }
  }

  editingDataMetric.value.chartType = chartType as 'bar' | 'line' | 'ptLine' | 'pie'

  if (chartType === 'ptLine') {
    editingDataMetric.value.stackGroup = 'noStack'
  } else if (chartType === 'line') {
    editingDataMetric.value.stackGroup = 'noStack'
  }
}

const openDataConfig = (mode: 'add' | 'edit', metric?: DataMetricUI) => {
  dataFormMode.value = mode

  if (mode === 'add') {
    // 获取上一个数据的堆叠组
    const lastMetric = props.dataMetrics.length > 0
      ? props.dataMetrics[props.dataMetrics.length - 1]
      : null

    // 默认堆叠组为noStack
    let defaultStackGroup = 'noStack'

    // 如果上一个数据存在且有堆叠组，则选择下一个不同的堆叠组
    if (lastMetric && lastMetric.stackGroup) {
      const stackGroups = stackOptions.value.map(option => option.value)
      const lastIndex = stackGroups.indexOf(lastMetric.stackGroup)
      if (lastIndex !== -1) {
        // 循环选择下一个堆叠组
        defaultStackGroup = stackGroups[(lastIndex + 1) % stackGroups.length]
      }
    }

    // 如果已有数据配置，则默认设置坐标轴为右侧
    const defaultYAxisPosition = props.dataMetrics.length > 0 ? 'right' : 'left'

    editingDataMetric.value = {
      id: `metric_${Date.now()}`,
      dataName: '分布统计',
      dataField: '',
      chartType: 'bar',
      color: getRandomColor(),
      yAxisPosition: defaultYAxisPosition,
      stackGroup: defaultStackGroup,
      unit: '',
      unitConfig: '',
      itemColors: {}
    }
  } else if (metric) {
    editingDataMetric.value = { ...metric }
  }

  dataConfigVisible.value = true
}

const onDataTypeChange = (value: any) => {
  if (!editingDataMetric.value) return

  const dataField = value as string
  const dataType = props.availableDataTypes.find(dt => dt.dataField === dataField)
  if (dataType) {
    editingDataMetric.value.dataName = dataType.dataName
    editingDataMetric.value.dataField = dataType.dataField
    editingDataMetric.value.unitConfig = dataType.unitConfig || ''

    // 如果有unitConfig（金额数据），自动生成正确的单位
    if (dataType.unitConfig && props.convertUnit) {
      const displayUnit = props.convertUnit(dataType.unitConfig)
      editingDataMetric.value.unit = displayUnit
    } else {
      // 只在添加模式下且用户未手动输入单位时，才使用数据类型的默认单位
      if (dataFormMode.value === 'add' && !editingDataMetric.value.unit) {
        editingDataMetric.value.unit = dataType.unit || ''
      }
    }
  }
}

const isDataTypeUsed = (dataField: string): boolean => {
  return props.dataMetrics.some(metric =>
    metric.dataField === dataField &&
    metric.id !== editingDataMetric.value?.id
  )
}

const confirmDataConfig = () => {
  if (!editingDataMetric.value) return

  if (isPercentLineMetric(editingDataMetric.value)) {
    editingDataMetric.value.stackGroup = 'noStack'
  }

  // 检查是否重复选择
  if (isDataTypeUsed(editingDataMetric.value.dataField)) {
    message.warning('该数据类型已被选择，请选择其他类型')
    return
  }

  const newMetrics = [...props.dataMetrics]

  if (dataFormMode.value === 'add') {
    // 初始化维度值的颜色配置
    editingDataMetric.value.itemColors = {}

    if (props.secondDimension?.items) {
      // 如果有二级维度，使用二级维度的项
      const itemCount = props.secondDimension.items.length
      const distinctColors = generateDistinctColors(itemCount)
      props.secondDimension.items.forEach((item, index) => {
        // 为每个维度项分配不重复的颜色
        editingDataMetric.value!.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    } else if (props.firstDimension?.items) {
      // 如果只有一级维度，使用一级维度的项
      const itemCount = props.firstDimension.items.length
      const distinctColors = generateDistinctColors(itemCount)
      props.firstDimension.items.forEach((item, index) => {
        // 为每个维度项分配不重复的颜色
        editingDataMetric.value!.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    }

    newMetrics.push({ ...editingDataMetric.value })
    message.success('数据添加成功')
  } else {
    const index = newMetrics.findIndex(m => m.id === editingDataMetric.value!.id)
    if (index !== -1) {
      newMetrics[index] = { ...editingDataMetric.value }
      message.success('数据修改成功')
    }
  }
  emit('update:dataMetrics', newMetrics)

  // 添加数据后，手动触发一次颜色更新，确保所有已有的数据指标颜色一致
  if (dataFormMode.value === 'add') {
    // 使用 nextTick 确保数据更新后再执行
    nextTick(() => {
      if (props.secondDimension?.items) {
        updateDataMetricsWithDimensionColors(props.secondDimension.items)
      } else if (props.firstDimension?.items) {
        updateDataMetricsWithDimensionColors(props.firstDimension.items)
      }
    })
  }

  dataConfigVisible.value = false
  editingDataMetric.value = null
}

const removeDataMetric = (id: string) => {
  const newMetrics = props.dataMetrics.filter(m => m.id !== id)
  emit('update:dataMetrics', newMetrics)
  message.success('数据删除成功')
}

// 获取数据项颜色
const getDataItemColor = (metricId: string, itemKey: string): string => {
  const metric = props.dataMetrics.find(m => m.id === metricId)
  return metric?.itemColors?.[itemKey] || '#1890ff'
}

// 打开数据项颜色选择器
const openDataItemColorPicker = (metricId: string, itemKey: string) => {
  currentDataItemTarget.value = { metricId, itemKey }
  dataItemColorPickerVisible.value = true
}

// 确认数据项颜色更改
const confirmDataItemColorChange = (color: string) => {
  const { metricId, itemKey } = currentDataItemTarget.value
  const newMetrics = [...props.dataMetrics]
  const metricIndex = newMetrics.findIndex(m => m.id === metricId)

  if (metricIndex !== -1) {
    // 确保itemColors对象存在，但不重置已有的颜色
    if (!newMetrics[metricIndex].itemColors) {
      newMetrics[metricIndex].itemColors = {}
    }
    // 只更新当前项的颜色，保留其他项的颜色
    newMetrics[metricIndex].itemColors![itemKey] = color
    emit('update:dataMetrics', newMetrics)
  }
}

// 颜色生成函数
const getRandomColor = () => {
  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors
  // 使用时间戳和随机数结合，确保每次调用都得到不同的颜色
  const randomIndex = Math.floor((Math.random() + Date.now() * 0.001) % 1 * colors.length)
  return colors[randomIndex]
}

// HSL 转 RGB 函数
const hslToRgb = (hsl: string) => {
  // 修改正则表达式，支持小数和更灵活的格式
  const match = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/)
  if (!match) {
    return { r: 0, g: 0, b: 0 }
  }

  // 使用 parseFloat 支持小数，而不是 parseInt
  const h = parseFloat(match[1])
  const s = parseFloat(match[2])
  const l = parseFloat(match[3])

  const hNormalized = h / 360
  const sNormalized = s / 100
  const lNormalized = l / 100

  let r, g, b

  if (sNormalized === 0) {
    r = g = b = lNormalized
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      // 确保 t 在 0-1 范围内
      let adjustedT = t
      if (adjustedT < 0) adjustedT += 1
      if (adjustedT > 1) adjustedT -= 1

      // 使用更精确的计算，避免浮点数精度问题
      if (adjustedT < 1 / 6) {
        const result = p + (q - p) * 6 * adjustedT
        return Math.max(0, Math.min(1, result)) // 确保结果在 0-1 范围内
      }
      if (adjustedT < 1 / 2) {
        return q
      }
      if (adjustedT < 2 / 3) {
        const result = p + (q - p) * (2 / 3 - adjustedT) * 6
        return Math.max(0, Math.min(1, result)) // 确保结果在 0-1 范围内
      }
      return p
    }

    const q = lNormalized < 0.5 ? lNormalized * (1 + sNormalized) : lNormalized + sNormalized - lNormalized * sNormalized
    const p = 2 * lNormalized - q

    r = hue2rgb(p, q, hNormalized + 1 / 3)
    g = hue2rgb(p, q, hNormalized)
    b = hue2rgb(p, q, hNormalized - 1 / 3)
  }

  // 转换为整数 RGB 值
  const rInt = Math.round(r * 255)
  const gInt = Math.round(g * 255)
  const bInt = Math.round(b * 255)

  return {
    r: rInt,
    g: gInt,
    b: bInt
  }
}

// RGB 转 十六进制函数
const rgbToHex = (r: number, g: number, b: number): string => {
  // 确保 RGB 值在 0-255 范围内
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))

  // 转换为十六进制并确保两位数格式
  const toHex = (c: number) => {
    const hex = c.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return '#' + toHex(r) + toHex(g) + toHex(b)
}

const generateDistinctColors = (count: number): string[] => {
  if (count <= 0) return []

  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors
  const currentTime = Date.now()

  if (count === 1) {
    return [colors[0]]
  }

  // 基于当前时间计算起始偏移量
  const timeOffset = Math.floor(currentTime / 1000) % colors.length

  if (count <= colors.length) {
    // 如果需要的颜色数量小于等于预设颜色数量，均匀选取
    const step = Math.floor(colors.length / count)
    const result: string[] = []

    for (let i = 0; i < count; i++) {
      // 基于时间偏移量计算索引，确保每次生成的起始颜色不同
      const index = (timeOffset + i * step) % colors.length
      result.push(colors[index])
    }

    return result
  } else {
    // 如果需要的颜色数量大于预设颜色数量，先生成扩展的颜色数组
    const extendedColors = [...colors]

    // 使用HSL颜色空间生成更多颜色，然后转换为十六进制格式
    for (let i = colors.length; i < count * 2; i++) {
      const hue = (i * 137.508) % 360
      const saturation = 70 + (i % 3) * 10
      const lightness = 45 + (i % 4) * 10

      // 先生成HSL格式的颜色
      const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      // 将HSL转换为RGB，再转换为十六进制
      const rgbColor = hslToRgb(hslColor)
      const hexColor = rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b)

      extendedColors.push(hexColor)
    }

    // 从扩展的颜色数组中均匀选取指定数量的颜色
    const step = Math.floor(extendedColors.length / count)
    const result: string[] = []

    for (let i = 0; i < count; i++) {
      // 基于时间偏移量计算索引
      const index = (timeOffset + i * step) % extendedColors.length
      const selectedColor = extendedColors[index]

      result.push(selectedColor)
    }

    return result
  }
}

// 监听维度变化，当维度变化时更新颜色配置
watch(
  () => [props.firstDimension, props.secondDimension],
  ([newFirstDim, newSecondDim], [oldFirstDim, oldSecondDim]) => {
    // 检查第二维度是否发生变化
    const secondDimensionChanged = newSecondDim?.key !== oldSecondDim?.key
    // 检查第一维度是否发生变化
    const firstDimensionChanged = newFirstDim?.key !== oldFirstDim?.key

    // 如果第二维度发生了变化，更新所有数据指标的颜色配置（优先处理第二维度）
    if (secondDimensionChanged && newSecondDim?.items) {
      updateDataMetricsWithDimensionColors(newSecondDim.items)
    }
    // 如果只有第一维度，且第一维度发生了变化，更新所有数据指标的颜色配置
    else if (firstDimensionChanged && !newSecondDim && newFirstDim?.items) {
      updateDataMetricsWithDimensionColors(newFirstDim.items)
    }
    // 如果第二维度被移除了，切换到使用第一维度的颜色
    else if (oldSecondDim && !newSecondDim && newFirstDim?.items) {
      updateDataMetricsWithDimensionColors(newFirstDim.items)
    }
  },
  { deep: true }
)

// 更新数据指标的颜色配置以匹配维度
const updateDataMetricsWithDimensionColors = (dimensionItems: IndicatorItem[]) => {
  if (dimensionItems.length === 0) return

  const newMetrics = [...props.dataMetrics]
  let updated = false

  // 首先生成维度项的全局颜色映射，确保每个维度项在所有数据指标中使用相同的颜色
  const itemCount = dimensionItems.length
  const distinctColors = generateDistinctColors(itemCount)

  // 创建维度项到颜色的映射
  const dimensionColorMap: Record<string, string> = {}
  dimensionItems.forEach((item, itemIndex) => {
    dimensionColorMap[item.key] = distinctColors[itemIndex] || getRandomColor()
  })

  // 为每个数据指标更新颜色配置，使用全局颜色映射
  newMetrics.forEach((metric, _index) => {
    if (!metric.itemColors) {
      metric.itemColors = {}
    }

    dimensionItems.forEach((item, _itemIndex) => {
      // 为每个项分配颜色，如果已存在颜色则保留，否则使用全局颜色映射
      if (!metric.itemColors![item.key]) {
        metric.itemColors![item.key] = dimensionColorMap[item.key]
        updated = true
      }
    })
  })

  // 如果有更新，触发数据指标更新事件
  if (updated) {
    emit('update:dataMetrics', newMetrics)
  }
}

// 折叠切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 工具函数
const getUnitTooltip = (metric: DataMetricUI): string => {
  const dataType = props.availableDataTypes.find(dt => dt.dataField === metric.dataField)
  return dataType?.unitConfig ? '金额数据单位由系统自动生成，无法修改' : ''
}
</script>

<style scoped lang="less">
.data-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background-color: #f0f2f5;
    }

    .data-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      margin-right: 8px;

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #262626;
      }
    }

    .collapse-btn {
      color: #8c8c8c;
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        color: #1890ff;
        background-color: #e6f7ff;
      }
    }
  }

  .data-list {
    .data-item {
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .data-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .data-name {
          font-weight: 600;
          color: #262626;
          font-size: 13px;
        }

        .data-actions {
          display: flex;
          gap: 4px;
        }
      }

      .data-item-content {
        .data-row {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
          line-height: 20px;

          .data-label {
            color: #8c8c8c;
            min-width: 60px;
            flex-shrink: 0;
          }

          .data-value {
            color: #595959;
            display: flex;
            align-items: center;
            gap: 4px;
            flex: 1;

            .ant-tag {
              margin: 0;
              line-height: 18px;
              height: 20px;
              padding: 1px 6px;
              display: inline-flex;
              align-items: center;
            }
          }
        }

        .data-color-config {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;

          .color-label {
            font-size: 12px;
            color: #8c8c8c;
            margin-bottom: 8px;
            font-weight: 500;
          }

          .color-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 6px 8px;
            overflow: hidden; // 防止网格溢出

            .color-item {
              display: flex;
              align-items: center;
              font-size: 11px;
              padding: 4px 6px;
              background: #fafafa;
              border-radius: 4px;
              border: 1px solid #f0f0f0;
              min-width: 0; // 确保可以收缩
              width: 100%; // 确保占满网格列宽度
              box-sizing: border-box; // 包含padding和border在内

              .item-name {
                color: #595959;
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 0; // 确保可以收缩
                max-width: calc(100% - 26px); // 为颜色按钮预留空间
                cursor: default; // 鼠标悬停时显示默认指针，暗示可以查看tooltip
              }

              .color-picker-btn {
                width: 18px;
                height: 18px;
                border-radius: 2px;
                border: 1px solid #d9d9d9;
                padding: 0;
                cursor: pointer;
                margin-left: 4px;
                flex-shrink: 0; // 防止按钮被压缩

                &:hover {
                  opacity: 0.8;
                  transform: scale(1.05);
                  transition: all 0.2s ease;
                }
              }

              &:hover {
                background: #f5f5f5;
                border-color: #d9d9d9;
                transition: all 0.2s ease;
              }
            }
          }
        }
      }
    }
  }

  .stack-tip {
    margin-top: 4px;
    color: #8c8c8c;
  }

  .used-tag {
    color: #ff4d4f;
    font-size: 11px;
  }

  .disabled-tip {
    color: #ff4d4f;
    font-size: 11px;
  }

  .unit-tip {
    margin-top: 4px;
    color: #8c8c8c;
  }
}
</style>
