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
          :disabled="!hasAnyConfiguration"
          class="reset-btn"
          size="small"
          title="重置配置"
          type="text"
          @click="resetConfiguration"
        >
          <ReloadOutlined />
        </a-button>
        <a-button
          :disabled="!firstDimension"
          type="primary"
          @click="generateChart"
        >
          生成图表
        </a-button>
      </div>
    </div>

    <div class="config-content">
      <!-- 维度选择 -->
      <DimensionSelector
        v-model:first-dimension="firstDimension"
        v-model:second-dimension="secondDimension"
        :filter-dimension="filterDimension"
        @dimension-changed="onDimensionChanged"
      />

      <!-- 全局筛选条件 -->
      <FilterCondition
        v-model:filter-dimension="filterDimension"
        v-model:selected-filter-items="selectedFilterItems"
      />

      <!-- 数据配置 -->
      <DataConfiguration
        v-model:data-metrics="dataMetrics"
        :available-data-types="availableDataTypes"
        :first-dimension="firstDimension"
        :second-dimension="secondDimension"
        @update-metric-field="updateMetricField"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { MenuFoldOutlined, MenuUnfoldOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import DimensionSelector from './DimensionSelector.vue'
import FilterCondition from './FilterCondition.vue'
import DataConfiguration from './DataConfiguration.vue'

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
  chartType: 'bar' | 'line' | 'pie'
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
  filterDimension: IndicatorGroup | null
  selectedFilterItems: string[]
  dataMetrics: DataMetricUI[]
  availableDataTypes: DataTypeOption[]
}>()

// Emits
const emit = defineEmits<{
  'toggleLeftPanel': [status?: boolean]
  'update:firstDimension': [dimension: IndicatorGroup | null]
  'update:secondDimension': [dimension: IndicatorGroup | null]
  'update:filterDimension': [dimension: IndicatorGroup | null]
  'update:selectedFilterItems': [items: string[]]
  'update:dataMetrics': [metrics: DataMetricUI[]]
  'generateChart': [chartData: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimension: IndicatorGroup | null,
    selectedFilterItems: string[],
    dataMetrics: DataMetricUI[]
  } | undefined]
}>()

// 本地状态
const firstDimension = ref(props.firstDimension)
const secondDimension = ref(props.secondDimension)
const filterDimension = ref(props.filterDimension)
const selectedFilterItems = ref([...props.selectedFilterItems])
const dataMetrics = ref([...props.dataMetrics])

// 计算属性 - 判断是否有任何配置
const hasAnyConfiguration = computed(() => {
  return !!(firstDimension.value ||
    secondDimension.value ||
    filterDimension.value ||
    selectedFilterItems.value.length > 0 ||
    dataMetrics.value.length > 0)
})

// 监听props变化并同步到本地状态
const syncPropsToLocal = () => {
  firstDimension.value = props.firstDimension
  secondDimension.value = props.secondDimension
  filterDimension.value = props.filterDimension
  selectedFilterItems.value = [...props.selectedFilterItems]
  dataMetrics.value = [...props.dataMetrics]
}

// 事件处理
const toggleLeftPanel = () => {
  emit('toggleLeftPanel')
}

const onDimensionChanged = () => {
  // 维度变化时需要重新初始化数据配置的颜色
  dataMetrics.value.forEach(metric => {
    metric.itemColors = {}

    if (secondDimension.value?.items) {
      // 如果有二级维度，使用二级维度的项
      const itemCount = secondDimension.value.items.length
      const distinctColors = generateDistinctColors(itemCount)

      secondDimension.value.items.forEach((item, index) => {
        metric.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    } else if (firstDimension.value?.items) {
      // 如果只有一级维度，使用一级维度的项
      const itemCount = firstDimension.value.items.length
      const distinctColors = generateDistinctColors(itemCount)

      firstDimension.value.items.forEach((item, index) => {
        metric.itemColors![item.key] = distinctColors[index] || getRandomColor()
      })
    }
  })

  // 发出更新事件
  emit('update:firstDimension', firstDimension.value)
  emit('update:secondDimension', secondDimension.value)
  emit('update:dataMetrics', dataMetrics.value)
}

const updateMetricField = (metricId: string, field: string, value: any) => {
  const metric = dataMetrics.value.find(m => m.id === metricId)
  if (metric) {
    (metric as any)[field] = value

    // 如果修改了图表类型为饼图，则重置坐标轴和堆叠设置
    if (field === 'chartType' && value === 'pie') {
      metric.yAxisPosition = 'left'
      metric.stackGroup = 'stack1'
    }
    // 如果修改了图表类型为折线图，则重置堆叠设置
    else if (field === 'chartType' && value === 'line') {
      metric.stackGroup = 'stack1'
    }

    emit('update:dataMetrics', dataMetrics.value)
    console.log('更新数据配置:', metricId, field, value)
  }
}

const generateChart = () => {
  // 校验一级维度是否选择
  if (!firstDimension.value) {
    message.error('请先选择一级维度（横坐标）')
    return
  }

  // 校验数据配置
  if (dataMetrics.value.length === 0) {
    message.error('请至少添加一个数据配置')
    return
  }

  // 打印生成图表所需的数据信息
  console.log('生成图表数据:', {
    firstDimension: firstDimension.value,
    secondDimension: secondDimension.value,
    filterDimension: filterDimension.value,
    selectedFilterItems: selectedFilterItems.value,
    dataMetrics: dataMetrics.value
  })

  // 发出生成图表事件，传递完整数据
  emit('generateChart', {
    firstDimension: firstDimension.value,
    secondDimension: secondDimension.value,
    filterDimension: filterDimension.value,
    selectedFilterItems: selectedFilterItems.value,
    dataMetrics: dataMetrics.value
  })
}

// 重置配置方法
const resetConfiguration = () => {
  // 重置所有配置到初始状态
  firstDimension.value = null
  secondDimension.value = null
  filterDimension.value = null
  selectedFilterItems.value = []

  // 默认添加分布统计数据配置
  const defaultDataMetric: DataMetricUI = {
    id: `metric_${ Date.now() }`,
    dataName: '分布统计',
    dataField: 'distribution_statistics',
    chartType: 'bar',
    color: '#1890ff',
    yAxisPosition: 'left',
    stackGroup: 'stack1',
    unit: '',
    itemColors: {}
  }

  dataMetrics.value = [defaultDataMetric]

  // 发出更新事件通知父组件
  emit('update:firstDimension', null)
  emit('update:secondDimension', null)
  emit('update:filterDimension', null)
  emit('update:selectedFilterItems', [])
  emit('update:dataMetrics', [defaultDataMetric])
  emit('toggleLeftPanel', false)

  message.success('配置已重置，默认使用分布统计')
}

// 颜色生成函数
const defaultColors = ref<string[]>([
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
])

const presetColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
  '#fa541c', '#1890ff', '#722ed1', '#eb2f96', '#52c41a',
  '#faad14', '#13c2c2', '#f5222d', '#fa8c16', '#a0d911'
]

const getRandomColor = () => {
  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors
  return colors[Math.floor(Math.random() * colors.length)]
}

const generateDistinctColors = (count: number): string[] => {
  if (count <= 0) return []

  const colors = defaultColors.value.length > 0 ? defaultColors.value : presetColors

  if (count === 1) return [colors[0]]
  if (count <= colors.length) {
    // 如果需要的颜色数量小于等于预设颜色数量，均匀选取
    const step = Math.floor(colors.length / count)
    const result: string[] = []
    for (let i = 0; i < count; i++) {
      result.push(colors[i * step])
    }
    return result
  } else {
    // 如果需要的颜色数量大于预设颜色数量，先用完所有预设颜色，再随机生成
    const result = [...colors]
    for (let i = colors.length; i < count; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }
}

// 初始化同步
syncPropsToLocal()
</script>

<style lang="less" scoped>
.right-panel {
  width: 350px;
  background: white;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;
    background: #fafafa;
    height: 64px;
    box-sizing: border-box;

    .config-header-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .collapse-btn {
        color: #666;

        &:hover {
          color: #1890ff;
        }
      }
    }

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;

      .reset-btn {
        color: #8c8c8c;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          color: #1890ff;
          background-color: #e6f7ff;
        }

        &:disabled {
          color: #d9d9d9;
          cursor: not-allowed;
        }
      }

      .ant-btn {
        &:not(.ant-btn-primary) {
          color: #595959;

          &:hover {
            border-color: #40a9ff;
            color: #40a9ff;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }

  .config-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
}
</style>