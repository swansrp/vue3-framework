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
            <!-- 排行榜(Top-N)专属配置：分组字段 / 统计方式 / 取前 N 名 / 排序方向 -->
            <template v-if="isRankingMode">
              <div class="data-row">
                <span class="data-label">分组字段：</span>
                <span class="data-value">
                  <a-select
                    :value="metric.groupByField || undefined"
                    size="small"
                    style="width: 160px"
                    placeholder="请选择分组字段"
                    show-search
                    option-filter-prop="children"
                    @change="(value) => onGroupByFieldChange(metric.id, value)"
                  >
                    <a-select-option
                      v-for="option in (groupByColumnOptions || [])"
                      :key="option.column"
                      :value="option.column"
                    >
                      {{ option.label }}
                    </a-select-option>
                  </a-select>
                </span>
              </div>
              <div class="data-row">
                <span class="data-label">统计方式：</span>
                <span class="data-value">
                  <a-select
                    :value="getRankingStatMethod(metric)"
                    size="small"
                    style="width: 120px"
                    @change="(value) => onRankingStatMethodChange(metric.id, value)"
                  >
                    <a-select-option value="count">
                      计数
                    </a-select-option>
                    <a-select-option value="sum">
                      求和
                    </a-select-option>
                  </a-select>
                </span>
              </div>
              <div
                v-if="getRankingStatMethod(metric) === 'sum'"
                class="data-row"
              >
                <span class="data-label">求和字段：</span>
                <span class="data-value">
                  <a-select
                    :value="metric.dataField || undefined"
                    size="small"
                    style="width: 160px"
                    placeholder="请选择求和字段"
                    @change="(value) => onRankingSumFieldChange(metric.id, value)"
                  >
                    <a-select-option
                      v-for="dataType in availableDataTypes"
                      :key="dataType.dataField"
                      :value="dataType.dataField"
                    >
                      {{ dataType.dataName }}
                    </a-select-option>
                  </a-select>
                </span>
              </div>
              <div class="data-row">
                <span class="data-label">取前 N 名：</span>
                <span class="data-value">
                  <a-input-number
                    :value="metric.topN ?? 10"
                    :min="1"
                    :max="100"
                    size="small"
                    style="width: 120px"
                    @change="(value) => updateMetricField(metric.id, 'topN', value)"
                  />
                </span>
              </div>
              <div class="data-row">
                <span class="data-label">排序方向：</span>
                <span class="data-value">
                  <a-select
                    :value="metric.sortOrder ?? 1"
                    size="small"
                    style="width: 120px"
                    @change="(value) => updateMetricField(metric.id, 'sortOrder', value)"
                  >
                    <a-select-option :value="1">
                      倒序（从大到小）
                    </a-select-option>
                    <a-select-option :value="0">
                      正序（从小到大）
                    </a-select-option>
                  </a-select>
                </span>
              </div>
            </template>
            <!-- 同比环比专属配置：日期格式 / 时间字段 / 统计方式 / 求和字段（年份数量、月份、口径为展示态控件，不在此配置）
                 多字段堆叠：仅第一条指标配置日期格式/时间字段/统计方式，追加的指标只选求和字段 -->
            <template v-if="isComparisonMode">
              <template v-if="isFirstComparisonMetric(metric)">
                <div class="data-row">
                  <span class="data-label">日期格式：</span>
                  <span class="data-value">
                    <a-select
                      :value="metric.dateFormat || 'DATETIME'"
                      size="small"
                      style="width: 160px"
                      @change="(value) => onDateFormatChange(metric.id, value)"
                    >
                      <a-select-option
                        v-for="option in dateFormatOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </a-select-option>
                    </a-select>
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">时间字段：</span>
                  <span class="data-value">
                    <a-select
                      :value="metric.dateField || undefined"
                      size="small"
                      style="width: 160px"
                      placeholder="请选择时间字段"
                      show-search
                      option-filter-prop="children"
                      @change="(value) => onDateFieldChange(metric.id, value)"
                    >
                      <a-select-option
                        v-for="option in getDateFieldOptions()"
                        :key="option.column"
                        :value="option.column"
                      >
                        {{ option.label }}
                      </a-select-option>
                    </a-select>
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">统计方式：</span>
                  <span class="data-value">
                    <a-select
                      :value="getComparisonStatMethod(metric)"
                      size="small"
                      style="width: 120px"
                      @change="(value) => onComparisonStatMethodChange(metric.id, value)"
                    >
                      <a-select-option value="count">
                        计数
                      </a-select-option>
                      <a-select-option value="sum">
                        求和
                      </a-select-option>
                    </a-select>
                  </span>
                </div>
              </template>
              <div
                v-if="!isFirstComparisonMetric(metric) || getComparisonStatMethod(metric) === 'sum'"
                class="data-row"
              >
                <span class="data-label">求和字段：</span>
                <span class="data-value">
                  <a-select
                    :value="metric.dataField || undefined"
                    size="small"
                    style="width: 160px"
                    placeholder="请选择求和字段"
                    @change="(value) => onComparisonSumFieldChange(metric.id, value)"
                  >
                    <a-select-option
                      v-for="dataType in availableDataTypes"
                      :key="dataType.dataField"
                      :value="dataType.dataField"
                    >
                      {{ dataType.dataName }}
                    </a-select-option>
                  </a-select>
                </span>
              </div>
            </template>
            <!-- 指标饼图/树形堆叠模式下隐藏图表类型/坐标轴/堆叠配置（由顶部模式切换统一控制） -->
            <div
              v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode"
              class="data-row"
            >
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
              v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode && metric.chartType !== 'pie'"
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
              v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode && metric.chartType === 'bar'"
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
                  :value="metric.unit || (isMetricUnitDisabled(metric) ? deriveDisplayUnit(metric.unitConfig) : '')"
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
                  <InfoCircleOutlined style="margin-left: 4px; color: var(--text-secondary);" />
                </a-tooltip>
              </span>
            </div>

            <!-- 二级维度值的颜色设置（排行榜/同比环比模式无维度，隐藏） -->
            <div
              v-if="!isRankingMode && !isComparisonMode && ((secondDimension && secondDimension.items && secondDimension.items.length > 0) || (firstDimension && firstDimension.items && firstDimension.items.length > 0 && !secondDimension))"
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
            v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode"
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
            v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode && editingDataMetric.chartType !== 'pie' && editingDataMetric.chartType !== 'metricsPie'"
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
            v-if="!isMetricsPieMode && !isTreeStackedMode && !isRankingMode && !isComparisonMode && editingDataMetric.chartType === 'bar'"
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
              :value="editingDataMetric.unit || (hasUnitConfig() ? deriveDisplayUnit(editingDataMetric.unitConfig) : '')"
              :placeholder="getUnitPlaceholder()"
              :disabled="hasUnitConfig()"
              allow-clear
              @change="(e: any) => { if (editingDataMetric) editingDataMetric.unit = e.target.value }"
            />
            <div
              v-if="hasUnitConfig()"
              class="unit-tip"
            >
              <small style="color: var(--text-secondary);">金额单位由系统根据计算配置自动生成</small>
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

import { deriveDisplayUnit } from '@/framework/components/common/chart/utils/unitFormat'
import { getNameHashColor } from '@/framework/utils/colorUtils'

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
  chartType: 'bar' | 'line' | 'ptLine' | 'pie' | 'metricsPie' | 'treeStackedBar' | 'rankingBar' | 'comparisonBar'
  color: string
  yAxisPosition: 'left' | 'right'
  stackGroup?: string
  unit?: string
  unitConfig?: string
  itemColors?: Record<string, string>
  // ===== 排行榜(Top-N)专属字段 =====
  groupByField?: string
  groupByLabel?: string
  topN?: number
  sortOrder?: 0 | 1
  groupByDictMap?: Record<string, string>
  // ===== 同比环比专属字段 =====
  dateField?: string
  dateFieldLabel?: string
  dateFormat?: 'DATETIME' | 'YYYY' | 'YYYY-MM' | 'YYYYMM' | 'YYYY-MM-DD' | 'YYYYMMDD'
}

// 可分组列选项（排行榜分组字段候选）
interface GroupByColumnOption {
  column: string
  label: string
  dictMap?: Record<string, string>
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
  chartMode?: string
  groupByColumnOptions?: GroupByColumnOption[]
  dateColumnOptions?: GroupByColumnOption[]
  convertUnit?: (unitConfig: string) => string
}>()

// Emits
const emit = defineEmits<{
  'update:dataMetrics': [metrics: DataMetricUI[]]
  'updateMetricField': [metricId: string, field: string, value: any]
}>()

// 折叠状态
const collapsed = ref(false)

// 配置选项（指标饼图不通过下拉框选择，由顶部模式切换统一控制）
const chartTypeOptions = ref<ChartTypeOption[]>([
  { label: '柱状图', value: 'bar' },
  { label: '折线图', value: 'line' },
  { label: '占比折线图', value: 'ptLine' },
  { label: '饼图', value: 'pie' },
  { label: '指标饼图', value: 'metricsPie' }
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

// 是否已处于指标饼图模式（当前指标的 chartType 为 metricsPie）
// 注意：模式切换由父组件 ConfigPanel 顶部控制，这里用于隐藏图表类型/坐标轴/堆叠等配置行
const isMetricsPieMode = computed(() => {
  // 只要任一指标是 metricsPie，就认为是指标饼图模式（顶层互斥设计保证全量同步）
  return props.dataMetrics.some(m => m.chartType === 'metricsPie')
})

// 树形堆叠模式：图表类型/坐标轴/堆叠由模式统一控制（强制自堆叠柱状图）
const isTreeStackedMode = computed(() => {
  return props.dataMetrics.some(m => m.chartType === 'treeStackedBar')
})

// 排行榜(Top-N)模式：隐藏图表类型/坐标轴/堆叠/颜色配置，改为显示排行专属配置
const isRankingMode = computed(() => {
  return props.dataMetrics.some(m => m.chartType === 'rankingBar')
})

// 同比环比模式：隐藏图表类型/坐标轴/堆叠/颜色配置，改为显示同比环比专属配置
const isComparisonMode = computed(() => {
  return props.dataMetrics.some(m => m.chartType === 'comparisonBar')
})

// 统计方式 UI 覆盖态：刚选「求和」时字段尚未选择、按 dataField 派生仍是计数会导致下拉回弹，
// 需按指标 id 记录用户显式选择，让「求和字段」行先出现（排行榜/同比环比共用）
const statMethodOverride = ref<Record<string, 'count' | 'sum'>>({})

// 排行榜统计方式：优先取用户显式选择，否则按 dataField 派生（空=计数，非空=求和）
const getRankingStatMethod = (metric: DataMetricUI): 'count' | 'sum' => {
  return statMethodOverride.value[metric.id] || (metric.dataField ? 'sum' : 'count')
}

// 分组字段选择变更：同步 groupByField / groupByLabel / groupByDictMap
const onGroupByFieldChange = (metricId: string, column: any) => {
  const option = (props.groupByColumnOptions || []).find(o => o.column === column)
  updateMetricField(metricId, 'groupByField', column || '')
  updateMetricField(metricId, 'groupByLabel', option?.label || column || '')
  updateMetricField(metricId, 'groupByDictMap', option?.dictMap || {})
}

// 排行榜统计方式变更：记录显式选择；count 清空 dataField/dataName
const onRankingStatMethodChange = (metricId: string, method: any) => {
  statMethodOverride.value[metricId] = method === 'sum' ? 'sum' : 'count'
  if (method === 'count') {
    updateMetricField(metricId, 'dataField', '')
    updateMetricField(metricId, 'dataName', '数量')
    updateMetricField(metricId, 'unit', '')
    updateMetricField(metricId, 'unitConfig', '')
  }
}

// 排行榜求和字段变更：同步 dataField/dataName/unit
const onRankingSumFieldChange = (metricId: string, dataField: any) => {
  const dataType = props.availableDataTypes.find(dt => dt.dataField === dataField)
  updateMetricField(metricId, 'dataField', dataField || '')
  if (dataType) {
    updateMetricField(metricId, 'dataName', dataType.dataName)
    updateMetricField(metricId, 'unitConfig', dataType.unitConfig || '')
    if (dataType.unitConfig && props.convertUnit) {
      updateMetricField(metricId, 'unit', props.convertUnit(dataType.unitConfig))
    } else {
      updateMetricField(metricId, 'unit', dataType.unit || '')
    }
  }
}

// 同比环比统计方式：优先取用户显式选择，否则按 dataField 派生（空=计数，非空=求和）
const getComparisonStatMethod = (metric: DataMetricUI): 'count' | 'sum' => {
  return statMethodOverride.value[metric.id] || (metric.dataField ? 'sum' : 'count')
}

// 是否为同比环比模式的第一条指标（日期格式/时间字段/统计方式只在第一条上配置）
const isFirstComparisonMetric = (metric: DataMetricUI): boolean => {
  return props.dataMetrics[0]?.id === metric.id
}

// 同比环比日期格式候选：决定拉数时的条件形态（区间 / 相等 / IN）
const dateFormatOptions = [
  { value: 'DATETIME', label: '日期时间列' },
  { value: 'YYYY-MM-DD', label: '日期文本(YYYY-MM-DD)' },
  { value: 'YYYYMMDD', label: '日期文本(YYYYMMDD)' },
  { value: 'YYYY-MM', label: '年月文本(YYYY-MM)' },
  { value: 'YYYYMM', label: '年月文本(YYYYMM)' },
  { value: 'YYYY', label: '纯年份(YYYY，仅同比)' }
]

// 时间字段候选：固定只取日期/日期时间类型列（dateFormat 仅决定条件形态，不放宽候选域）
const getDateFieldOptions = (): GroupByColumnOption[] => props.dateColumnOptions || []

// 日期格式变更：仅更新格式标识（候选列域固定为日期类型列，无需清空已选字段）
const onDateFormatChange = (metricId: string, format: any) => {
  updateMetricField(metricId, 'dateFormat', format || 'DATETIME')
}

// 时间字段选择变更：同步 dateField / dateFieldLabel
const onDateFieldChange = (metricId: string, column: any) => {
  const option = getDateFieldOptions().find(o => o.column === column)
  updateMetricField(metricId, 'dateField', column || '')
  updateMetricField(metricId, 'dateFieldLabel', option?.label || column || '')
}

// 同比环比统计方式变更：记录显式选择；count 清空 dataField/dataName
const onComparisonStatMethodChange = (metricId: string, method: any) => {
  statMethodOverride.value[metricId] = method === 'sum' ? 'sum' : 'count'
  if (method === 'count') {
    updateMetricField(metricId, 'dataField', '')
    updateMetricField(metricId, 'dataName', '数量')
    updateMetricField(metricId, 'unit', '')
    updateMetricField(metricId, 'unitConfig', '')
  }
}

// 同比环比求和字段变更：同步 dataField/dataName/unit
const onComparisonSumFieldChange = (metricId: string, dataField: any) => {
  const dataType = props.availableDataTypes.find(dt => dt.dataField === dataField)
  updateMetricField(metricId, 'dataField', dataField || '')
  if (dataType) {
    updateMetricField(metricId, 'dataName', dataType.dataName)
    updateMetricField(metricId, 'unitConfig', dataType.unitConfig || '')
    if (dataType.unitConfig && props.convertUnit) {
      updateMetricField(metricId, 'unit', props.convertUnit(dataType.unitConfig))
    } else {
      updateMetricField(metricId, 'unit', dataType.unit || '')
    }
  }
}

// 判断是否可以添加数据指标
const canAddDataMetric = computed(() => {
  // 树形堆叠模式只允许一个数据指标
  if (isTreeStackedMode.value) return false
  // 排行榜模式只允许一个数据指标
  if (isRankingMode.value) return false
  // 同比环比模式允许多个求和字段（同一根柱内堆叠），不阻止添加
  if (isComparisonMode.value) return true
  // 如果已经有饼图类型，不允许添加新的数据指标（饼图只能 1 个数据指标）
  // 指标饼图允许多个数据指标，不阻止添加
  return !hasPieChart.value
})

// 获取可用的图表类型选项
const availableChartTypeOptions = computed(() => {
  if (!editingDataMetric.value) return chartTypeOptions.value

  const isFirstMetric = dataFormMode.value === 'add' && props.dataMetrics.length === 0
  const isEditingFirstMetric = dataFormMode.value === 'edit' && props.dataMetrics.length === 1 && props.dataMetrics[0].id === editingDataMetric.value.id

  return chartTypeOptions.value
    // 指标饼图不通过下拉框选择
    .filter(option => option.value !== 'metricsPie')
    .map(option => {
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

// 注意：指标饼图不通过图表类型下拉框选择，而是通过数据列表底部的切换按钮控制

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
  // 如果已经是指标饼图类型，则可以修改
  if (metric.chartType === 'metricsPie') return true

  // 如果已经有其他饼图类型，则不能修改为饼图
  const otherPieCharts = props.dataMetrics.filter(m => m.id !== metric.id && m.chartType === 'pie')
  return otherPieCharts.length === 0
}

// 获取指定数据指标可用的图表类型
const getAvailableChartTypesForMetric = (metric: DataMetricUI) => {
  return chartTypeOptions.value.filter(option => {
    // 指标饼图不通过下拉框选择，由顶部模式切换统一控制
    if (option.value === 'metricsPie') return false
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
      // 指标饼图/同比环比模式下新增的数据指标需保持对应类型，避免删除任一指标后 chartMode 模式误跳回
      chartType: isComparisonMode.value ? 'comparisonBar' : (isMetricsPieMode.value ? 'metricsPie' : 'bar'),
      color: getRandomColor(),
      yAxisPosition: defaultYAxisPosition,
      stackGroup: defaultStackGroup,
      unit: '',
      unitConfig: '',
      itemColors: {},
      // 同比环比：追加的求和字段继承第一条指标的时间字段配置（拉数只读取第一条，此处保持持久化一致）
      ...(isComparisonMode.value ? {
        dateField: props.dataMetrics[0]?.dateField,
        dateFieldLabel: props.dataMetrics[0]?.dateFieldLabel,
        dateFormat: props.dataMetrics[0]?.dateFormat || 'DATETIME'
      } : {})
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
      // 如果有二级维度，优先使用二级维度项配置的颜色（sys_portal_indicator），未配置时按名称哈希兜底
      props.secondDimension.items.forEach((item) => {
        editingDataMetric.value!.itemColors![item.key] = item.color || getNameHashColor(item.title)
      })
    } else if (props.firstDimension?.items) {
      // 如果只有一级维度，使用一级维度项配置的颜色，未配置时按名称哈希兜底
      props.firstDimension.items.forEach((item) => {
        editingDataMetric.value!.itemColors![item.key] = item.color || getNameHashColor(item.title)
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

  // 首先生成维度项的全局颜色映射：优先使用指标配置的颜色，未配置时按名称哈希兜底，
  // 确保每个维度项在所有数据指标中使用相同的颜色
  const dimensionColorMap: Record<string, string> = {}
  dimensionItems.forEach((item) => {
    dimensionColorMap[item.key] = item.color || getNameHashColor(item.title)
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
      background-color: var(--bg-hover);
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
        color: var(--text-primary);
      }
    }

    .collapse-btn {
      color: var(--text-tertiary);
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        color: var(--accent);
        background-color: var(--accent-soft);
      }
    }
  }

  .data-list {
    .data-item {
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--bg-elevated);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: var(--shadow-md);
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
              background: var(--bg-hover);
              border-radius: 4px;
              border: 1px solid var(--border-subtle);
              min-width: 0; // 确保可以收缩
              width: 100%; // 确保占满网格列宽度
              box-sizing: border-box; // 包含padding和border在内

              .item-name {
                color: var(--text-secondary);
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
                border: 1px solid var(--border-subtle);
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
                background: var(--bg-hover);
                border-color: var(--border-hover);
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
