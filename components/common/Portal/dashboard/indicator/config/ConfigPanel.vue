<template>
  <div class="right-panel">
    <div class="config-header">
      <div class="config-header-content">
        <a-button
          class="collapse-btn"
          size="small"
          type="text"
          @click="toggleLeftPanel"
        >
          <MenuFoldOutlined v-if="!leftPanelCollapsed" />
          <MenuUnfoldOutlined v-else />
        </a-button>
        <h3>配置面板</h3>
      </div>
      <div class="action-buttons">
        <a-button
          class="reset-btn"
          size="small"
          title="重置配置"
          type="text"
          @click="resetConfiguration"
        >
          <ReloadOutlined />
        </a-button>
        <a-button
          :disabled="!canGenerateChart"
          type="primary"
          @click="generateChart"
        >
          生成图表
        </a-button>
      </div>
    </div>

    <div class="config-content">
      <!-- 图表模式切换 -->
      <div class="chart-mode-switcher">
        <span class="mode-label">图表模式：</span>
        <a-radio-group
          :value="chartMode"
          button-style="solid"
          size="small"
          @change="onChartModeChange"
        >
          <a-radio-button value="dimension">维度图表</a-radio-button>
          <a-radio-button value="metricsPie">指标饼图</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 维度选择（指标饼图模式下禁用） -->
      <div :class="{ 'section-disabled': chartMode === 'metricsPie' }">
        <DimensionSelector
          v-model:first-dimension="firstDimension"
          v-model:second-dimension="secondDimension"
          :filter-dimension="filterDimensions[0]"
        />
      </div>

      <!-- 全局筛选条件 -->
      <FilterCondition
        v-model:filter-dimensions="filterDimensions"
        v-model:selected-filter-items="selectedFilterItemsArray"
      />

      <!-- 数据配置 -->
      <DataConfiguration
        v-model:data-metrics="dataMetrics"
        :available-data-types="availableDataTypes"
        :first-dimension="firstDimension"
        :second-dimension="secondDimension"
        :convert-unit="convertUnit"
        @update-metric-field="updateMetricField"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { MenuFoldOutlined, MenuUnfoldOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import DataConfiguration from './DataConfiguration.vue'
import DimensionSelector from './DimensionSelector.vue'
import FilterCondition from './FilterCondition.vue'

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
  chartType: 'bar' | 'line' | 'ptLine' | 'pie' | 'metricsPie'
  color: string
  yAxisPosition: 'left' | 'right'
  stackGroup?: string
  unit?: string
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
}

// Props
const props = defineProps<{
  leftPanelCollapsed: boolean
  firstDimension: IndicatorGroup | null
  secondDimension: IndicatorGroup | null
  filterDimensions: (IndicatorGroup | null)[]
  selectedFilterItemsArray: string[][]
  dataMetrics: DataMetricUI[]
  availableDataTypes: DataTypeOption[]
  convertUnit?: (unitConfig: string) => string
}>()

// Emits
const emit = defineEmits<{
  'toggleLeftPanel': [status?: boolean]
  'update:firstDimension': [dimension: IndicatorGroup | null]
  'update:secondDimension': [dimension: IndicatorGroup | null]
  'update:filterDimensions': [dimensions: (IndicatorGroup | null)[]]
  'update:selectedFilterItemsArray': [items: string[][]]
  'update:dataMetrics': [metrics: DataMetricUI[]]
  'generateChart': [chartData: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimensions: (IndicatorGroup | null)[],
    selectedFilterItemsArray: string[][],
    dataMetrics: DataMetricUI[]
  } | undefined]
  'clearChart': []
  'resetConfig': []
}>()

// 本地状态
const firstDimension = ref(props.firstDimension)
const secondDimension = ref(props.secondDimension)
const filterDimensions = ref<[...(IndicatorGroup | null)[], (IndicatorGroup | null) | null]>([...(props.filterDimensions as any)] as any)
const selectedFilterItemsArray = ref<string[][]>([...props.selectedFilterItemsArray])
const dataMetrics = ref([...props.dataMetrics])

// 图表模式：'dimension'（维度图表）| 'metricsPie'（指标饼图）
// 基于 dataMetrics 推断：任一指标为 metricsPie 即为指标饼图模式
const chartMode = computed(() => {
  return dataMetrics.value.some(m => m.chartType === 'metricsPie') ? 'metricsPie' : 'dimension'
})

// 模式切换处理
const onChartModeChange = (e: any) => {
  const mode = e.target.value
  if (mode === 'metricsPie') {
    // 切到指标饼图：清空维度 + 所有指标设为 metricsPie
    firstDimension.value = null
    secondDimension.value = null
    emit('update:firstDimension', null)
    emit('update:secondDimension', null)
    dataMetrics.value.forEach(m => {
      m.chartType = 'metricsPie'
    })
  } else {
    // 切回维度图表：所有 metricsPie 恢复为 bar
    dataMetrics.value.forEach(m => {
      if (m.chartType === 'metricsPie') {
        m.chartType = 'bar'
      }
    })
  }
  emit('update:dataMetrics', dataMetrics.value)
}

// 生成按钮是否可用
const canGenerateChart = computed(() => {
  if (dataMetrics.value.length === 0) return false
  if (chartMode.value === 'metricsPie') {
    // 指标饼图模式：不需要维度，但至少 2 个数据字段
    return dataMetrics.value.length >= 2
  }
  // 维度图表模式：需要一级维度
  return !!firstDimension.value
})

// 事件处理
const toggleLeftPanel = () => {
  emit('toggleLeftPanel')
}

// 监听数据指标变化
watch(
  () => dataMetrics.value,
  () => emit('update:dataMetrics', dataMetrics.value)
)

// 监听筛选维度变化
watch(
  () => filterDimensions.value,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(props.filterDimensions)) {
      emit('update:filterDimensions', newValue)
    }
  },
  { deep: true }
)

// 监听选中的筛选项变化
watch(
  () => selectedFilterItemsArray.value,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(props.selectedFilterItemsArray)) {
      emit('update:selectedFilterItemsArray', [...newValue])
    }
  },
  { deep: true }
)

// 监听props变化，同步本地状态
// 同步数据配置（用于编辑回显时父组件更新props）
watch(
  () => props.dataMetrics,
  (newValue) => {
    // 仅在确实不同的时候更新，避免丢失本地未提交的修改
    if (JSON.stringify(newValue) !== JSON.stringify(dataMetrics.value)) {
      dataMetrics.value = [...newValue]
    }
  },
  { deep: true, immediate: true }
)

watch(
  () => props.filterDimensions,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(filterDimensions.value)) {
      filterDimensions.value = [...newValue] as any
    }
  },
  { deep: true }
)

watch(
  () => props.selectedFilterItemsArray,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(selectedFilterItemsArray.value)) {
      selectedFilterItemsArray.value = [...newValue]
    }
  },
  { deep: true }
)

// 修复维度数据的双向绑定
watch(
  () => props.firstDimension,
  (newValue) => {
    if (newValue !== firstDimension.value) {
      firstDimension.value = newValue
    }
  },
  { immediate: true }
)

// 当本地firstDimension变化时，通知父组件
watch(
  () => firstDimension.value,
  (newValue) => {
    if (newValue !== props.firstDimension) {
      emit('update:firstDimension', newValue)
    }
  }
)

watch(
  () => props.secondDimension,
  (newValue) => {
    if (newValue !== secondDimension.value) {
      secondDimension.value = newValue
    }
  },
  { immediate: true }
)

// 当本地secondDimension变化时，通知父组件
watch(
  () => secondDimension.value,
  (newValue) => {
    if (newValue !== props.secondDimension) {
      emit('update:secondDimension', newValue)
    }
  }
)

// 数据配置更新事件处理
const updateMetricField = (metricId: string, field: string, value: any) => {
  const metric = dataMetrics.value.find(m => m.id === metricId)
  if (metric) {
    (metric as any)[field] = value

    if (field === 'chartType') {
      if (value === 'pie') {
        metric.yAxisPosition = 'left'
        metric.stackGroup = 'noStack'
      } else if (value === 'line') {
        metric.stackGroup = 'noStack'
      } else if (value === 'ptLine') {
        metric.stackGroup = 'noStack'
        metric.unit = ''
      }
    }

    emit('update:dataMetrics', dataMetrics.value)
  }
}

// 生成图表事件处理
const generateChart = () => {
  // 校验数据配置
  if (dataMetrics.value.length === 0) {
    message.error('请至少添加一个数据配置')
    return
  }

  // 指标饼图模式：无维度，至少 2 个数据字段
  if (chartMode.value === 'metricsPie') {
    if (dataMetrics.value.length < 2) {
      message.error('指标饼图至少需要 2 个数据字段')
      return
    }
    emit('generateChart', {
      firstDimension: null,
      secondDimension: null,
      filterDimensions: filterDimensions.value,
      selectedFilterItemsArray: selectedFilterItemsArray.value,
      dataMetrics: dataMetrics.value
    })
    return
  }

  // 维度图表模式：校验一级维度
  if (!firstDimension.value) {
    message.error('请先选择一级维度（横坐标）')
    return
  }

  // 校验饼图特殊规则：只允许一个维度和一个数据指标
  const hasPieChart = dataMetrics.value.some(metric => metric.chartType === 'pie')
  if (hasPieChart) {
    // 校验是否有二级维度
    if (secondDimension.value) {
      message.error('饼图只支持一个维度，请取消二级维度选择')
      return
    }

    // 校验数据指标数量
    if (dataMetrics.value.length > 1) {
      message.error('饼图只支持一个数据指标，请保留一个数据配置')
      return
    }

    // 校验是否为饼图类型
    const pieMetric = dataMetrics.value[0]
    if (pieMetric.chartType !== 'pie') {
      message.error('饼图不能与其他图表类型混合使用')
      return
    }
  }

  // 柱状图和折线图可以混合使用，无需额外校验
  // 发出生成图表事件，传递完整数据
  emit('generateChart', {
    firstDimension: firstDimension.value,
    secondDimension: secondDimension.value,
    filterDimensions: filterDimensions.value,
    selectedFilterItemsArray: selectedFilterItemsArray.value,
    dataMetrics: dataMetrics.value
  })
}

// 重置配置方法
const resetConfiguration = () => {
  // 重置所有配置到初始状态
  firstDimension.value = null
  secondDimension.value = null
  filterDimensions.value = [null]
  selectedFilterItemsArray.value = [[]]

  //默认添加分布统计数据配置
  //默认的指标名字
  const defaultDataMetric: DataMetricUI = {
    id: `metric_${Date.now()}`,
    dataName: '分布统计',
    dataField: '',
    chartType: 'bar',
    color: '#1890ff',
    yAxisPosition: 'left',
    stackGroup: 'noStack',
    unit: '',
    itemColors: {}
  }

  dataMetrics.value = [defaultDataMetric]

  // 发出更新事件
  emit('update:firstDimension', firstDimension.value)
  emit('update:secondDimension', secondDimension.value)
  emit('update:filterDimensions', filterDimensions.value)
  emit('update:selectedFilterItemsArray', selectedFilterItemsArray.value)
  emit('update:dataMetrics', dataMetrics.value)
}
</script>

<style scoped lang="less">
.right-panel {
  width: 350px;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0; // 防止被压缩
  box-sizing: border-box;

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-hover);
    height: 64px;
    box-sizing: border-box;

    .config-header-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .collapse-btn {
        color: var(--text-secondary);

        &:hover {
          color: var(--accent);
        }
      }
    }

    // 这里是.config-header-content的闭合大括号

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  // 这里是.config-header的闭合大括号

  .config-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    box-sizing: border-box;
  }
}

// 图表模式切换
.chart-mode-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);

  .mode-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

// 禁用区域（指标饼图模式下的维度选择）
.section-disabled {
  pointer-events: none;
  opacity: 0.45;
}
</style>
