<template>
  <div class="hr-indicator-dashboard">
    <!-- 左侧指标树面板 -->
    <indicator-tree-panel
      :collapsed="leftPanelCollapsed"
      :indicator-tree-data="indicatorTreeData"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
    />

    <!-- 中间配置面板 -->
    <config-panel
      v-model:first-dimension="firstDimension"
      v-model:second-dimension="secondDimension"
      v-model:filter-dimensions="filterDimensions"
      v-model:data-metrics="dataMetrics"
      v-model:selected-filter-items-array="selectedFilterItemsArray"
      :available-data-types="availableDataTypes"
      :left-panel-collapsed="leftPanelCollapsed"
      :convert-unit="convertUnit"
      @toggle-left-panel="toggleLeftPanel"
      @generate-chart="generateChart"
      @clear-chart="clearChart"
      @reset-config="$emit('reset-config')"
    />

    <!-- 右侧展示区域 -->
    <ChartDisplayArea
      ref="chartDisplayAreaRef"
      :config="config"
      :received-data="dimensionIndicatorsFilter"
      :indicator-name="indicatorName"
      class="chart-display-area"
    />
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { onMounted, provide, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import ConfigPanel from './indicator/config/ConfigPanel.vue'
import ChartDisplayArea from './indicator/dashboard/ChartDisplayArea.vue'
import IndicatorTreePanel from './indicator/tree/IndicatorTreePanel.vue'

import { getIndicatorConfig } from '@/framework/apis/portal'
import { getPortalConfig } from '@/framework/apis/portal/config'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import {
  ConditionGroup,
  DataMetric,
  DimensionIndicatorsFilter,
  IndicatorGroup as TalentIndicatorGroup
} from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

// 导入子组件



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

interface DragData {
  key: string
  title: string
  isLeaf: boolean
  items?: IndicatorItem[]
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
  unitConfig?: string // 原始单位配置，如 "2,10000"
  itemColors?: Record<string, string>
}

interface DataTypeOption {
  dataName: string
  dataField: string
  unit?: string
  unitConfig?: string // 原始单位配置，如 "2,10000"
}

const props = withDefaults(
  defineProps<{
    tableId?: any
    indicatorName?: string
  }>(),
  {}
)
const tableId = ref(props.tableId)

// 左侧面板控制
const leftPanelCollapsed = ref(false)

// 模拟人事指标数据
const indicatorTreeData = ref<IndicatorGroup[]>([])

// 维度配置
const firstDimension = ref<IndicatorGroup | null>(null)
const secondDimension = ref<IndicatorGroup | null>(null)
const filterDimensions = ref<(IndicatorGroup | null)[]>([null])
const selectedFilterItemsArray = ref<string[][]>([[]])

// 数据配置
const dataMetrics = ref<DataMetricUI[]>([
  {
    id: 'default_001',
    dataName: '分布统计',
    dataField: '',
    chartType: 'bar',
    color: '#1890ff',
    yAxisPosition: 'left',
    stackGroup: 'noStack',
    unit: '',
    itemColors: {}
  }
])

// 可选数据类型
const availableDataTypes = ref<DataTypeOption[]>([])

// 全局拖拽数据
const dragData = ref<DragData | null>(null)

// 提供拖拽数据给子组件
provide('dragData', dragData)

// ChartDisplayArea 组件引用
const chartDisplayAreaRef = ref()

// 维度指标过滤器数据
const dimensionIndicatorsFilter = ref<DimensionIndicatorsFilter | undefined>(undefined)
// 当 restoreConfig 在基础数据尚未加载完成时，暂存配置以便稍后渲染
const pendingSavedConfig = ref<any | null>(null)
// 保存上一次的配置快照，用于比较配置是否变化
const lastConfigSnapshot = ref<{
  firstDimension: IndicatorGroup | null,
  secondDimension: IndicatorGroup | null,
  filterDimensions: (IndicatorGroup | null)[],
  selectedFilterItemsArray: string[][],
  dataMetrics: DataMetricUI[]
} | null>(null)

// 事件处理
const toggleLeftPanel = (status?: boolean) => {
  if (status === undefined) {
    leftPanelCollapsed.value = !leftPanelCollapsed.value
  } else {
    leftPanelCollapsed.value = status
  }
}

const onDragStart = (data: DragData) => {
  dragData.value = data
}

const onDragEnd = () => {
  dragData.value = null
}

// 解析树节点上携带的条件为框架的 ConditionGroup
const parseConditionGroup = (raw: any): ConditionGroup => {
  if (!raw) return { conditionList: [], andOr: '0' }
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    const andOr = (obj.andOr === '1' ? '1' : '0') as '0' | '1'
    const conditionList = Array.isArray(obj.conditionList) ? obj.conditionList : []
    return { conditionList, andOr }
  } catch (e) {
    console.warn('解析条件失败，使用空条件', raw, e)
    return { conditionList: [], andOr: '0' }
  }
}

// 转换函数：将IndicatorGroup转换为TalentIndicatorGroup
const convertToTalentIndicatorGroup = (group: IndicatorGroup | null): TalentIndicatorGroup | null => {
  if (!group) return null

  return {
    groupName: group.title,
    groupValue: String(group.key), // 确保是字符串类型
    indicatorItems: group.items?.map(item => ({
      itemName: item.title,
      itemValue: String(item.key), // 确保是字符串类型
      // 来自指标树节点的原始条件（可能是字符串/对象），统一解析为 ConditionGroup
      queryConditions: parseConditionGroup(item.condition)
    })) || []
  }
}

// 解析单位配置函数：解析格式如"2,10000"的配置
const parseUnitConfig = (unitConfig: string): { fix: number; unit: number; displayUnit: string } => {
  if (!unitConfig || typeof unitConfig !== 'string') {
    return { fix: 2, unit: 1, displayUnit: '元' }
  }

  const parts = unitConfig.split(',')
  if (parts.length !== 2) {
    return { fix: 2, unit: 1, displayUnit: '元' }
  }

  const fix = parseInt(parts[0], 10) || 2
  const unit = parseInt(parts[1], 10) || 1

  // 根据单位数值生成显示单位
  const unitMap: Record<number, string> = {
    1: '元',
    10: '十元',
    100: '百元',
    1000: '千元',
    10000: '万元',
    100000: '十万元',
    1000000: '百万元',
    10000000: '千万元',
    100000000: '亿元'
  }

  return { fix, unit, displayUnit: unitMap[unit] || '元' }
}

// 转换单位配置为中文单位显示
const convertUnit = (unitConfig: string): string => {
  const { displayUnit } = parseUnitConfig(unitConfig)
  return displayUnit
}

// 转换函数：将DataMetricUI转换为DataMetric
const convertToDataMetric = (metric: DataMetricUI): DataMetric => {
  // 处理金额字段的单位配置
  let unitConfig: string | undefined
  const matchingType = availableDataTypes.value.find(type => type.dataField === metric.dataField)
  if (matchingType && matchingType.unitConfig) {
    unitConfig = matchingType.unitConfig
  }

  const { fix, unit: unitDivisor } = unitConfig ? parseUnitConfig(unitConfig) : { fix: 0, unit: 1 }

  return {
    dataName: metric.dataName,
    dataField: metric.dataField,
    chartType: metric.chartType,
    color: metric.color,
    yAxisPosition: metric.yAxisPosition,
    stackGroup: metric.chartType === 'ptLine' ? 'noStack' : metric.stackGroup,
    unit: metric.unit,
    unitConfig: metric.chartType === 'ptLine' ? undefined : unitConfig,
    formatConfig: metric.chartType === 'ptLine' ? undefined : { fix, unitDivisor },
    itemColors: metric.itemColors || {} as Record<string, string>
  }
}

// 转换函数：将selectedFilterItems转换为ConditionGroup
const convertToConditionGroup = (filterItemsArray: string[][], filterDimensions: (IndicatorGroup | null)[]): ConditionGroup => {
  // 如果没有筛选维度或没有选中的筛选项，返回空条件
  if (!filterDimensions || filterDimensions.length === 0 || filterItemsArray.length === 0) {
    return {
      conditionList: [],
      andOr: '0'
    }
  }

  // 根据选中的筛选项，构建条件组
  const allConditionGroups: ConditionListType[] = []

  // 遍历所有筛选维度
  filterDimensions.forEach((filterDimension, index) => {
    if (!filterDimension || !filterItemsArray[index] || filterItemsArray[index].length === 0) {
      return
    }

    const filterItems = filterItemsArray[index]
    const itemConditionGroups: ConditionListType[] = []

    filterItems.forEach(itemKey => {
      const filterItem = filterDimension.items?.find(item => item.key === itemKey)

      if (filterItem && filterItem.condition) {
        try {
          // 解析筛选项的条件
          const itemConditions = parseConditionGroup(filterItem.condition)

          // 将每个筛选项作为一个独立的条件组
          if (itemConditions.conditionList && itemConditions.conditionList.length > 0) {
            // 如果只有一个条件，直接使用
            if (itemConditions.conditionList.length === 1) {
              itemConditionGroups.push(itemConditions.conditionList[0])
            } else {
              // 如果有多个条件，作为一个子条件组
              const subConditionGroup: ConditionListType = {
                property: null,
                value: null,
                relation: null,
                conditionList: itemConditions.conditionList,
                andOr: itemConditions.andOr // 保持原有的逻辑关系
              }
              itemConditionGroups.push(subConditionGroup)
            }
          }
        } catch (error) {
          console.warn('解析筛选项条件失败:', {
            itemKey,
            condition: filterItem.condition,
            error
          })
        }
      } else {
        console.warn('未找到筛选项或筛选项无条件:', {
          itemKey,
          filterItem
        })
      }
    })

    // 如果当前筛选维度有选中项，将这些项作为一个条件组（使用OR连接）
    if (itemConditionGroups.length > 0) {
      const dimensionConditionGroup: ConditionListType = {
        property: null,
        value: null,
        relation: null,
        conditionList: itemConditionGroups,
        andOr: '1' // 多个筛选项之间用OR连接（选择了司局级 OR 处级）
      }
      allConditionGroups.push(dimensionConditionGroup)
    }
  })

  const result = {
    conditionList: allConditionGroups,
    andOr: '0' as '0' | '1' // 多个筛选维度之间用AND连接
  }

  return result
}

// 比较两个配置是否相同
const compareConfigs = (
  config1: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimensions: (IndicatorGroup | null)[],
    selectedFilterItemsArray: string[][],
    dataMetrics: DataMetricUI[]
  },
  config2: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimensions: (IndicatorGroup | null)[],
    selectedFilterItemsArray: string[][],
    dataMetrics: DataMetricUI[]
  }
): boolean => {
  // 比较一级维度
  if (config1.firstDimension?.key !== config2.firstDimension?.key ||
    config1.firstDimension?.title !== config2.firstDimension?.title) {
    return false
  }
  // 比较一级维度的items数组长度
  if ((config1.firstDimension?.items?.length || 0) !== (config2.firstDimension?.items?.length || 0)) {
    return false
  }

  // 比较二级维度
  if (config1.secondDimension?.key !== config2.secondDimension?.key ||
    config1.secondDimension?.title !== config2.secondDimension?.title) {
    return false
  }
  // 比较二级维度的items数组长度
  if ((config1.secondDimension?.items?.length || 0) !== (config2.secondDimension?.items?.length || 0)) {
    return false
  }

  // 比较筛选维度数组
  if (config1.filterDimensions.length !== config2.filterDimensions.length) {
    return false
  }
  for (let i = 0; i < config1.filterDimensions.length; i++) {
    const dim1 = config1.filterDimensions[i]
    const dim2 = config2.filterDimensions[i]
    if (dim1?.key !== dim2?.key || dim1?.title !== dim2?.title) {
      return false
    }
  }

  // 比较选中的筛选项数组
  if (config1.selectedFilterItemsArray.length !== config2.selectedFilterItemsArray.length) {
    return false
  }
  for (let i = 0; i < config1.selectedFilterItemsArray.length; i++) {
    const arr1 = config1.selectedFilterItemsArray[i].sort()
    const arr2 = config2.selectedFilterItemsArray[i].sort()
    if (JSON.stringify(arr1) !== JSON.stringify(arr2)) {
      return false
    }
  }

  // 比较数据指标数组
  if (config1.dataMetrics.length !== config2.dataMetrics.length) {
    return false
  }
  for (let i = 0; i < config1.dataMetrics.length; i++) {
    const m1 = config1.dataMetrics[i]
    const m2 = config2.dataMetrics[i]
    if (m1.dataField !== m2.dataField ||
      m1.chartType !== m2.chartType ||
      m1.color !== m2.color ||
      m1.yAxisPosition !== m2.yAxisPosition ||
      m1.stackGroup !== m2.stackGroup ||
      m1.unit !== m2.unit ||
      JSON.stringify(m1.itemColors || {}) !== JSON.stringify(m2.itemColors || {})) {
      return false
    }
  }

  return true
}

// 比较配置的各个部分，返回哪些部分发生了变化
const compareConfigParts = (
  config1: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimensions: (IndicatorGroup | null)[],
    selectedFilterItemsArray: string[][],
    dataMetrics: DataMetricUI[]
  },
  config2: {
    firstDimension: IndicatorGroup | null,
    secondDimension: IndicatorGroup | null,
    filterDimensions: (IndicatorGroup | null)[],
    selectedFilterItemsArray: string[][],
    dataMetrics: DataMetricUI[]
  }
): {
  firstDimensionChanged: boolean
  secondDimensionChanged: boolean
  dataMetricsChanged: boolean
} => {
  // 比较一级维度
  const firstDimensionChanged = config1.firstDimension?.key !== config2.firstDimension?.key ||
    config1.firstDimension?.title !== config2.firstDimension?.title ||
    (config1.firstDimension?.items?.length || 0) !== (config2.firstDimension?.items?.length || 0)

  // 比较二级维度
  const secondDimensionChanged = config1.secondDimension?.key !== config2.secondDimension?.key ||
    config1.secondDimension?.title !== config2.secondDimension?.title ||
    (config1.secondDimension?.items?.length || 0) !== (config2.secondDimension?.items?.length || 0)

  // 比较数据指标数组
  let dataMetricsChanged = false
  if (config1.dataMetrics.length !== config2.dataMetrics.length) {
    dataMetricsChanged = true
  } else {
    for (let i = 0; i < config1.dataMetrics.length; i++) {
      const m1 = config1.dataMetrics[i]
      const m2 = config2.dataMetrics[i]
      if (m1.dataField !== m2.dataField ||
        m1.chartType !== m2.chartType ||
        m1.color !== m2.color ||
        m1.yAxisPosition !== m2.yAxisPosition ||
        m1.stackGroup !== m2.stackGroup ||
        m1.unit !== m2.unit ||
        JSON.stringify(m1.itemColors || {}) !== JSON.stringify(m2.itemColors || {})) {
        dataMetricsChanged = true
        break
      }
    }
  }

  return {
    firstDimensionChanged,
    secondDimensionChanged,
    dataMetricsChanged
  }
}

const generateChart = async (chartData?: {
  firstDimension: IndicatorGroup | null,
  secondDimension: IndicatorGroup | null,
  filterDimensions: (IndicatorGroup | null)[],
  selectedFilterItemsArray: string[][],
  dataMetrics: DataMetricUI[]
}) => {

  // 如果传递了chartData，使用其中的数据
  const firstDim = chartData?.firstDimension || firstDimension.value
  const secondDim = chartData?.secondDimension || secondDimension.value
  const filterDims = chartData?.filterDimensions || filterDimensions.value || []
  const selectedFilterItems = chartData?.selectedFilterItemsArray || selectedFilterItemsArray.value
  const dataMetricsData = chartData?.dataMetrics || dataMetrics.value

  if (!firstDim) {
    message.error('请先选择一级维度（横坐标）')
    return
  }

  if (dataMetricsData.length === 0) {
    message.error('请至少添加一个数据配置')
    return
  }

  // 校验规则1: 存在二级维度时，不能选择饼图
  if (secondDim) {
    // 有二级维度时，不能选择饼图
    const pieChartMetrics = dataMetricsData.filter(metric => metric.chartType === 'pie')
    if (pieChartMetrics.length > 0) {
      message.error('存在二级维度时，不能选择饼图')
      return
    }
  }

  // 校验规则2: 当柱状图数据选择的堆叠组一致时，必须确保选择的坐标轴位置也一致
  // 注意：折线图不支持堆叠，所以只检查柱状图
  const stackGroups = new Map<string, string>() // stackGroup -> yAxisPosition
  for (const metric of dataMetricsData) {
    // 只对柱状图进行堆叠组验证（折线图不支持堆叠）
    if (metric.chartType === 'bar' && metric.stackGroup && metric.stackGroup !== 'noStack') {
      if (stackGroups.has(metric.stackGroup)) {
        // 如果已经有这个堆叠组，检查坐标轴位置是否一致
        if (stackGroups.get(metric.stackGroup) !== metric.yAxisPosition) {
          message.error(`堆叠组 "${metric.stackGroup}" 的柱状图数据必须使用相同的坐标轴位置`)
          return
        }
      } else {
        // 记录这个堆叠组的坐标轴位置
        stackGroups.set(metric.stackGroup, metric.yAxisPosition)
      }
    }
  }

  // 转换为DimensionIndicatorsFilter类型并输出
  const firstDimensionConverted = convertToTalentIndicatorGroup(firstDim)
  const secondDimensionConverted = convertToTalentIndicatorGroup(secondDim)

  if (!firstDimensionConverted) {
    message.error('一级维度转换失败，请检查数据格式')
    return
  }

  const filterData: DimensionIndicatorsFilter = {
    firstDimension: firstDimensionConverted,
    secondDimension: secondDimensionConverted, // 二级维度可以为null
    filterConditions: convertToConditionGroup(selectedFilterItems, filterDims),
    dataMetrics: dataMetricsData.map(convertToDataMetric)
  }

  // 更新维度指标过滤器数据
  dimensionIndicatorsFilter.value = filterData

  // 构建当前配置的快照
  const currentConfig = {
    firstDimension: firstDim,
    secondDimension: secondDim,
    filterDimensions: filterDims,
    selectedFilterItemsArray: selectedFilterItems,
    dataMetrics: dataMetricsData
  }

  // 保存是否是首次点击的状态（在保存快照之前）
  const isFirstClick = lastConfigSnapshot.value === null

  // 比较当前配置和上一次配置是否相同
  const configUnchanged = lastConfigSnapshot.value !== null &&
    compareConfigs(currentConfig, lastConfigSnapshot.value)

  // 保存当前配置作为下一次比较的基准
  lastConfigSnapshot.value = {
    firstDimension: firstDim ? {
      key: firstDim.key,
      title: firstDim.title,
      items: firstDim.items?.map((item: any) => ({ ...item })) || []
    } : null,
    secondDimension: secondDim ? {
      key: secondDim.key,
      title: secondDim.title,
      items: secondDim.items?.map((item: any) => ({ ...item })) || []
    } : null,
    filterDimensions: (Array.isArray(filterDims) ? filterDims : []).map(dim => dim ? {
      key: dim.key,
      title: dim.title,
      items: dim.items?.map((item: any) => ({ ...item })) || []
    } : null),
    selectedFilterItemsArray: selectedFilterItems.map(arr => [...arr]),
    dataMetrics: dataMetricsData.map(metric => ({ ...metric }))
  }

  // 等待下一个tick，确保props已经传递给子组件
  await nextTick()

  // 决定可见性配置的处理方式
  let shouldRestoreVisibility = configUnchanged
  let partialVisibilityConfig: {
    visibleFirstDimensions?: string[]
    visibleSecondDimensions?: string[]
    visibleStatisticTypes?: string[]
  } | null = null

  // 如果配置没有变化，完全保持可见性配置
  if (configUnchanged && chartDisplayAreaRef.value && chartDisplayAreaRef.value.getVisibilityConfig) {
    const visibilityConfig = chartDisplayAreaRef.value.getVisibilityConfig()
    partialVisibilityConfig = {
      visibleFirstDimensions: visibilityConfig.visibleFirstDimensions,
      visibleSecondDimensions: visibilityConfig.visibleSecondDimensions,
      visibleStatisticTypes: visibilityConfig.visibleStatisticTypes
    }
  }
  // 如果配置有变化，根据变化的部分决定可见性配置
  else if (!configUnchanged && lastConfigSnapshot.value !== null) {
    // 比较配置的各个部分
    const configChanges = compareConfigParts(currentConfig, lastConfigSnapshot.value)

    // 获取当前的可见性配置
    const currentVisibilityConfig = chartDisplayAreaRef.value && chartDisplayAreaRef.value.getVisibilityConfig
      ? chartDisplayAreaRef.value.getVisibilityConfig()
      : {
        visibleFirstDimensions: [],
        visibleSecondDimensions: [],
        visibleStatisticTypes: []
      }

    // 或者从 dimensionIndicatorsFilter 中获取
    const savedVisibilityConfig = dimensionIndicatorsFilter.value ? {
      visibleFirstDimensions: dimensionIndicatorsFilter.value.visibleFirstDimensions || [],
      visibleSecondDimensions: dimensionIndicatorsFilter.value.visibleSecondDimensions || [],
      visibleStatisticTypes: dimensionIndicatorsFilter.value.visibleStatisticTypes || []
    } : {
      visibleFirstDimensions: [],
      visibleSecondDimensions: [],
      visibleStatisticTypes: []
    }

    // 使用当前的可见性配置（优先使用图表组件的，如果没有则使用保存的）
    const existingVisibility = currentVisibilityConfig.visibleFirstDimensions.length > 0 ||
      currentVisibilityConfig.visibleSecondDimensions.length > 0 ||
      currentVisibilityConfig.visibleStatisticTypes.length > 0
      ? currentVisibilityConfig
      : savedVisibilityConfig

    // 根据变化的部分决定可见性配置
    // 如果第一维度改变，第一维度的可见性重置为全选（设为undefined）；否则保持原有
    // 如果第二维度改变，第二维度的可见性重置为全选（设为undefined）；否则保持原有
    // 如果数据指标改变，统计指标的可见性重置为全选（设为undefined）；否则保持原有
    partialVisibilityConfig = {
      visibleFirstDimensions: configChanges.firstDimensionChanged
        ? undefined
        : (existingVisibility.visibleFirstDimensions.length > 0 ? existingVisibility.visibleFirstDimensions : undefined),
      visibleSecondDimensions: configChanges.secondDimensionChanged
        ? undefined
        : (existingVisibility.visibleSecondDimensions.length > 0 ? existingVisibility.visibleSecondDimensions : undefined),
      visibleStatisticTypes: configChanges.dataMetricsChanged
        ? undefined
        : (existingVisibility.visibleStatisticTypes.length > 0 ? existingVisibility.visibleStatisticTypes : undefined)
    }

    // 如果有任何部分需要保持可见性配置，或者有任何部分需要重置（undefined），都需要 shouldRestoreVisibility = true
    // 这样 updateDimensionData 才能正确处理 undefined 的情况（重置为全选）
    shouldRestoreVisibility = true
  }
  // 首次点击且已有可见性配置，保持可见性配置
  else if (!configUnchanged && isFirstClick && chartDisplayAreaRef.value && chartDisplayAreaRef.value.getVisibilityConfig) {
    const visibilityConfig = chartDisplayAreaRef.value.getVisibilityConfig()
    const hasExistingVisibility = (
      (dimensionIndicatorsFilter.value?.visibleFirstDimensions?.length || 0) > 0 ||
      (dimensionIndicatorsFilter.value?.visibleSecondDimensions?.length || 0) > 0 ||
      (dimensionIndicatorsFilter.value?.visibleStatisticTypes?.length || 0) > 0 ||
      visibilityConfig.visibleFirstDimensions.length > 0 ||
      visibilityConfig.visibleSecondDimensions.length > 0 ||
      visibilityConfig.visibleStatisticTypes.length > 0
    )
    if (hasExistingVisibility) {
      shouldRestoreVisibility = true
      partialVisibilityConfig = {
        visibleFirstDimensions: visibilityConfig.visibleFirstDimensions,
        visibleSecondDimensions: visibilityConfig.visibleSecondDimensions,
        visibleStatisticTypes: visibilityConfig.visibleStatisticTypes
      }
    }
  }

  // 保存可见性配置
  if (partialVisibilityConfig) {
    dimensionIndicatorsFilter.value = {
      ...filterData,
      visibleStatisticTypes: partialVisibilityConfig.visibleStatisticTypes,
      visibleFirstDimensions: partialVisibilityConfig.visibleFirstDimensions,
      visibleSecondDimensions: partialVisibilityConfig.visibleSecondDimensions
    }
  }

  // 调用子组件生成图表
  if (chartDisplayAreaRef.value) {
    try {
      await chartDisplayAreaRef.value.generateChart(shouldRestoreVisibility)
      message.success('图表生成成功')
    } catch (error) {
      console.error('图表生成失败:', error)
      // 显示具体的错误信息
      if (error instanceof Error) {
        message.error(`图表生成失败: ${error.message || '未知错误'}`)
      } else {
        message.error('图表生成失败，请检查数据配置或网络连接')
      }
    }
  } else {
    message.error('图表组件未找到')
  }
}

// 清除图表方法
const clearChart = () => {
  if (chartDisplayAreaRef.value) {
    try {
      chartDisplayAreaRef.value.clearChart()
    } catch (error) {
      console.error('清除图表失败:', error)
    }
  }
}

const { currentRoute } = useRouter()
const route = currentRoute.value
const config = ref({} as any)
// 组件挂载时加载数据
onMounted(async () => {

  if (isEmpty(tableId.value)) {
    tableId.value = route.query ? (route.query.tableId ? route.query.tableId : undefined) : undefined
  }
  try {

    await getIndicatorConfig(tableId.value).then(resp => indicatorTreeData.value = resp.payload)
    availableDataTypes.value.push({
      dataName: '分布统计',
      dataField: '',
      unit: ''
    })
    const resp: any = await getPortalConfig(tableId.value)
    config.value = resp.payload
    // 确保 config 中包含正确的 tableId
    config.value.tableId = tableId.value
    config.value.columns.forEach((column: any) => {
      if (column.show === '0') return
      if (column.fieldType === FIELD_TYPE.MONEY) {

        // 只要是金额字段且有 reference 配置，就设置格式化配置
        if (column.reference && column.reference.trim() !== '') {
          const rawUnitConfig = column.reference // 使用完整的reference，格式可能是 "2,10000"、"2,1000"、"2,100" 等

          const convertedUnit = convertUnit(rawUnitConfig)

          availableDataTypes.value.push({
            dataName: column.displayName,
            dataField: column.property,
            unit: convertedUnit,
            unitConfig: rawUnitConfig // 保存原始单位配置用于格式化
          })
        } else {
          // 对于没有reference配置的金额字段，不设置 unitConfig，表示不需要特殊格式化
          availableDataTypes.value.push({
            dataName: column.displayName,
            dataField: column.property,
            unit: '', // 不设置默认单位，让用户手动输入
            unitConfig: undefined // 不设置 unitConfig，表示不需要特殊格式化
          })
        }
      }
      if (column.fieldType === FIELD_TYPE.NUMBER) {
        availableDataTypes.value.push({
          dataName: column.displayName,
          dataField: column.property,
          unit: '' // 明确设置为空字符串
        })
      }
    })


  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败，请稍后重试')
  }

  window.addEventListener('dragend', () => {
    dragData.value = null
  })

  // 如果在加载期间已经接收到恢复配置，且此时基础配置已就绪，则生成图表
  if (pendingSavedConfig.value && config.value?.url && indicatorTreeData.value?.length) {
    try {
      // 基于已加载的指标树重建筛选维度与选中项
      tryReconstructFilterFromConditions(pendingSavedConfig.value)
      // 同步给展示区
      dimensionIndicatorsFilter.value = pendingSavedConfig.value
      await nextTick()
      if (chartDisplayAreaRef.value) {
        // 恢复配置时，传入true参数表示需要恢复可见性配置
        await chartDisplayAreaRef.value.generateChart(true)
      }
    } catch (e) {
      console.warn('加载完成后自动生成图表失败:', e)
    } finally {
      pendingSavedConfig.value = null
    }
  }
})

// 从指标树中查找匹配的分组
const findGroupInTree = (key: string | number | undefined, title: string | undefined): IndicatorGroup | null => {
  const stack: IndicatorGroup[] = [...(indicatorTreeData.value || [])]
  while (stack.length) {
    const node = stack.shift() as IndicatorGroup
    if ((key !== undefined && String(node.key) === String(key)) || (title && node.title === title)) {
      return node
    }
    if (node.children && node.children.length) stack.push(...node.children)
  }
  return null
}

// 将保存的分组还原为面板可识别结构
const mapSavedGroupToUi = (savedGroup: any): IndicatorGroup | null => {
  if (!savedGroup) return null
  const matched = findGroupInTree(savedGroup.groupValue, savedGroup.groupName)
  if (matched) {
    // 使用树中的结构，保证 keys 等一致
    return {
      key: matched.key,
      title: matched.title,
      items: (matched.items || []).map((it: any) => ({ ...it }))
    }
  }

  // 兜底：根据保存的数据构造
  try {
    return {
      key: savedGroup.groupValue,
      title: savedGroup.groupName,
      items: (savedGroup.indicatorItems || []).map((it: any) => ({
        key: it.itemValue,
        title: it.itemName,
        condition: JSON.stringify(it.queryConditions || { andOr: '0', conditionList: [] })
      }))
    }
  } catch (e) {
    console.warn('回显分组构造失败:', e)
    return null
  }
}

// 基于 filterConditions 在整棵指标树中推断筛选维度与选中项
const tryReconstructFilterFromConditions = (savedConfig: any) => {
  filterDimensions.value = [null]
  selectedFilterItemsArray.value = [[]]

  const filter = savedConfig?.filterConditions
  if (!filter || !Array.isArray(filter.conditionList) || filter.conditionList.length === 0) {
    return
  }

  // 展开嵌套的条件组，提取所有实际条件
  const flattenConditions = (condList: any[]): any[] => {
    const result: any[] = []
    condList.forEach((cond: any) => {
      if (cond.conditionList && Array.isArray(cond.conditionList) && cond.conditionList.length > 0) {
        // 如果是条件组（有子条件列表），递归展开
        result.push(...flattenConditions(cond.conditionList))
      } else if (cond.property) {
        // 如果是实际条件（有 property），直接添加
        result.push(cond)
      }
    })
    return result
  }

  // 为每个顶层条件组分别匹配筛选维度
  const topLevelConditionGroups = filter.conditionList.filter((cond: any) =>
    cond.conditionList && Array.isArray(cond.conditionList) && cond.conditionList.length > 0
  )

  if (topLevelConditionGroups.length === 0) {
    return
  }

  // 存储所有匹配结果
  const allMatchedDimensions: (IndicatorGroup | null)[] = []
  const allMatchedItemKeys: string[][] = []

  // 对每个顶层条件组进行匹配
  topLevelConditionGroups.forEach((topLevelGroup: any) => {
    // 展开当前条件组的所有条件
    const groupConditions = flattenConditions(topLevelGroup.conditionList)

    if (groupConditions.length === 0) {
      allMatchedDimensions.push(null)
      allMatchedItemKeys.push([])
      return
    }

    // 扫描整棵指标树，找出与当前条件组匹配的分组和项
    let bestMatchGroup: IndicatorGroup | null = null
    let bestMatchItemKeys: string[] = []

    const groupsStack: IndicatorGroup[] = [...(indicatorTreeData.value || [])]
    while (groupsStack.length) {
      const grp = groupsStack.shift() as IndicatorGroup
      if (grp.children && grp.children.length) groupsStack.push(...grp.children)

      const items = grp.items || []
      if (!items.length) continue

      const matchedKeys: string[] = []
      items.forEach((it: any) => {
        const itemCond = parseConditionGroup(it.condition)
        if (!itemCond || !Array.isArray(itemCond.conditionList)) return

        // 展开项的条件
        const itemConditions = flattenConditions(itemCond.conditionList)

        // 检查项的任一条件是否在 groupConditions 中
        const hasMatch = itemConditions.some((itemC: any) => {
          return groupConditions.some((filterC: any) => {
            // 比较核心字段：property, relation, value
            return itemC.property === filterC.property &&
              String(itemC.relation) === String(filterC.relation) &&
              JSON.stringify(itemC.value) === JSON.stringify(filterC.value)
          })
        })

        if (hasMatch) {
          matchedKeys.push(String(it.key))
        }
      })

      if (matchedKeys.length > bestMatchItemKeys.length) {
        bestMatchGroup = {
          key: grp.key,
          title: grp.title,
          items: (grp.items || []).map((x: any) => ({ ...x }))
        }
        bestMatchItemKeys = matchedKeys
      }
    }

    // 保存当前条件组的匹配结果
    allMatchedDimensions.push(bestMatchGroup)
    allMatchedItemKeys.push(bestMatchItemKeys)
  })

  // 过滤掉没有匹配到的维度，如果全部都匹配到了，则设置结果
  const hasAnyMatch = allMatchedDimensions.some((dim, idx) =>
    dim !== null && allMatchedItemKeys[idx] && allMatchedItemKeys[idx].length > 0
  )

  if (hasAnyMatch) {
    filterDimensions.value = allMatchedDimensions
    selectedFilterItemsArray.value = allMatchedItemKeys
  }
}

// 恢复配置方法（编辑时回显到配置面板）
const restoreConfig = async (savedConfig: any) => {
  try {

    if (!savedConfig || !savedConfig.firstDimension) {
      console.warn('无效的配置数据')
      return
    }

    // 回显维度
    firstDimension.value = mapSavedGroupToUi(savedConfig.firstDimension)
    secondDimension.value = mapSavedGroupToUi(savedConfig.secondDimension)

    // 回显数据配置
    if (Array.isArray(savedConfig.dataMetrics)) {
      dataMetrics.value = savedConfig.dataMetrics.map((m: any, idx: number) => ({
        id: `metric_${Date.now()}_${idx}`,
        dataName: m.dataName,
        dataField: m.dataField,
        chartType: m.chartType || 'bar',
        color: m.color || '#1890ff',
        yAxisPosition: m.yAxisPosition || 'left',
        stackGroup: m.stackGroup || 'noStack',
        unit: m.unit || '',
        unitConfig: m.unitConfig,
        itemColors: m.itemColors || {}
      }))
    }

    // 优先从显式保存的筛选维度恢复（如果存在）
    if (savedConfig.filterDimensions && Array.isArray(savedConfig.filterDimensions) && savedConfig.filterDimensions.length > 0) {
      // 显式保存了 filterDimensions，使用保存的值
      filterDimensions.value = savedConfig.filterDimensions.map((dim: any) => mapSavedGroupToUi(dim))

      // 恢复选中的筛选项
      if (savedConfig.selectedFilterItemsArray && Array.isArray(savedConfig.selectedFilterItemsArray)) {
        selectedFilterItemsArray.value = savedConfig.selectedFilterItemsArray
      } else if (savedConfig.selectedFilterItems) {
        // 兼容旧格式
        selectedFilterItemsArray.value = [savedConfig.selectedFilterItems || []]
      }
    } else if (savedConfig.filterDimension) {
      // 兼容旧格式：单个 filterDimension
      const filterDim = mapSavedGroupToUi(savedConfig.filterDimension)
      filterDimensions.value = [filterDim]
      selectedFilterItemsArray.value = [savedConfig.selectedFilterItems || []]
    } else {
      // 没有显式保存筛选维度，根据 filterConditions 推断
      tryReconstructFilterFromConditions(savedConfig)
    }

    // 同步给图表展示，并记录待生成
    dimensionIndicatorsFilter.value = savedConfig
    pendingSavedConfig.value = savedConfig

    // 若基础配置已就绪，立即生成图表；否则等待 onMounted 末尾的自动触发
    if (config.value?.url && indicatorTreeData.value?.length && chartDisplayAreaRef.value) {
      await nextTick()
      try {
        await chartDisplayAreaRef.value.generateChart(true)
      } catch (error) {
        console.error('生成图表失败:', error)
      } finally {
        pendingSavedConfig.value = null
      }
    }
  } catch (error) {
    console.error('恢复配置失败:', error)
    throw error
  }
}

// 强制重新计算布局
const forceRecalculateLayout = async () => {
  await nextTick()
  if (chartDisplayAreaRef.value && typeof chartDisplayAreaRef.value.forceRecalculateLayout === 'function') {
    chartDisplayAreaRef.value.forceRecalculateLayout()
  }
}

// 获取完整配置（包含统计指标可见性配置）
const getFullConfig = () => {
  // 获取实时的可见性配置
  let visibilityConfig = {
    visibleStatisticTypes: [] as string[],
    visibleFirstDimensions: [] as string[],
    visibleSecondDimensions: [] as string[]
  }

  if (chartDisplayAreaRef.value && chartDisplayAreaRef.value.getVisibilityConfig) {
    visibilityConfig = chartDisplayAreaRef.value.getVisibilityConfig()
  }

  // 优先使用已经生成的dimensionIndicatorsFilter（包含用户拖拽后的排序）
  // 如果存在，说明已经生成过图表，使用它以保留拖拽排序
  if (dimensionIndicatorsFilter.value && dimensionIndicatorsFilter.value.firstDimension) {
    // 使用已有的配置，但更新筛选条件和数据指标（这些可能在图表生成后被修改）
    return {
      ...dimensionIndicatorsFilter.value,
      filterConditions: convertToConditionGroup(selectedFilterItemsArray.value, filterDimensions.value),
      dataMetrics: dataMetrics.value.map(convertToDataMetric),
      visibleStatisticTypes: visibilityConfig.visibleStatisticTypes,
      visibleFirstDimensions: visibilityConfig.visibleFirstDimensions,
      visibleSecondDimensions: visibilityConfig.visibleSecondDimensions
    }
  }

  // 如果还没有生成图表，则从配置面板构建配置
  const firstDimensionConverted = convertToTalentIndicatorGroup(firstDimension.value)
  const secondDimensionConverted = convertToTalentIndicatorGroup(secondDimension.value)

  if (!firstDimensionConverted) {
    console.warn('一级维度为空，无法生成完整配置')
    return null
  }

  const currentConfig: DimensionIndicatorsFilter = {
    firstDimension: firstDimensionConverted,
    secondDimension: secondDimensionConverted, // 二级维度可以为null
    filterConditions: convertToConditionGroup(selectedFilterItemsArray.value, filterDimensions.value),
    dataMetrics: dataMetrics.value.map(convertToDataMetric)
  }

  // 合并配置
  return {
    ...currentConfig,
    visibleStatisticTypes: visibilityConfig.visibleStatisticTypes,
    visibleFirstDimensions: visibilityConfig.visibleFirstDimensions,
    visibleSecondDimensions: visibilityConfig.visibleSecondDimensions
  }
}

// 暴露方法和数据给父组件
defineExpose({
  dimensionIndicatorsFilter,
  firstDimension,
  secondDimension,
  filterDimensions,
  selectedFilterItemsArray,
  dataMetrics,
  clearChart,
  generateChart,
  restoreConfig,
  forceRecalculateLayout,
  getFullConfig
})
</script>

<style lang="less" src="./styles/dashboard.less"></style>