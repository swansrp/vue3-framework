<template>
  <div class="chart-panel">
    <!-- 维度控制面板 - Tab页形式 -->
    <div
      v-if="chartData.length > 0"
      class="dimension-controls"
    >
      <a-tabs
        v-model:active-key="activeTabKey"
        size="small"
        type="card"
      >
        <!-- 第一维度控制 -->
        <a-tab-pane
          key="first"
          :tab="firstDimensionName"
        >
          <template #tab>
            <a-tooltip
              :title="firstDimensionName"
              placement="top"
            >
              <span class="tab-title">
                <DatabaseOutlined /> {{ firstDimensionName }}
              </span>
            </a-tooltip>
          </template>
          <DimensionControl
            v-model:visible-dimensions="visibleFirstDimensions"
            v-model:all-dimensions="allFirstDimensions"
            :received-data="receivedData"
            @order-changed="handleFirstDimensionOrderChanged"
          />
        </a-tab-pane>

        <!-- 第二维度控制 -->
        <a-tab-pane
          v-if="hasSecondDimension"
          key="second"
          :tab="secondDimensionName"
        >
          <template #tab>
            <a-tooltip
              :title="secondDimensionName"
              placement="top"
            >
              <span class="tab-title">
                <AppstoreOutlined /> {{ secondDimensionName }}
              </span>
            </a-tooltip>
          </template>
          <DimensionControl
            v-model:visible-dimensions="visibleSecondDimensions"
            v-model:all-dimensions="allSecondDimensions"
            :received-data="receivedData"
            @order-changed="handleSecondDimensionOrderChanged"
          />
        </a-tab-pane>

        <!-- 统计指标控制 -->
        <a-tab-pane
          key="statistics"
          tab="统计指标"
        >
          <template #tab>
            <PieChartOutlined /> 统计指标
          </template>
          <StatisticControl
            v-model:visible-statistics="visibleStatisticTypes"
            v-model:all-statistics="allStatisticTypes"
            :received-data="receivedData"
            @order-changed="handleStatisticOrderChanged"
          />
        </a-tab-pane>
      </a-tabs>
    </div>

    <div class="chart-container">
      <!-- 同比环比展示态控件：年份数量 / 月份 / 口径（echarts UI 配置，不持久化；纯年份列仅年份数量） -->
      <div
        v-if="isComparisonMode && chartData.length > 0"
        class="comparison-controls"
      >
        <span class="comparison-label">年份数量：</span>
        <a-select
          v-model:value="comparisonYearCount"
          size="small"
          style="width: 90px"
          @change="onComparisonOptionChange"
        >
          <a-select-option
            v-for="n in comparisonYearCountOptions"
            :key="n"
            :value="n"
          >
            {{ n }} 年
          </a-select-option>
        </a-select>
        <template v-if="!isYearOnlyComparison">
          <span class="comparison-label">月份：</span>
          <a-select
            v-model:value="comparisonMonth"
            size="small"
            style="width: 90px"
            @change="onComparisonOptionChange"
          >
            <a-select-option
              v-for="m in 12"
              :key="m"
              :value="m"
            >
              {{ m }} 月
            </a-select-option>
          </a-select>
          <span class="comparison-label">口径：</span>
          <a-select
            v-model:value="comparisonScope"
            size="small"
            style="width: 100px"
            @change="onComparisonOptionChange"
          >
            <a-select-option value="ytd">
              年累计
            </a-select-option>
            <a-select-option value="single">
              单月
            </a-select-option>
          </a-select>
          <span class="comparison-label">环比：</span>
          <a-switch
            v-model:checked="comparisonShowMom"
            size="small"
            @change="onComparisonOptionChange"
          />
        </template>
      </div>
      <!-- 导出按钮 -->
      <div
        v-if="chartData.length > 0"
        class="chart-export-btn"
      >
        <a-tooltip title="导出Excel">
          <DownloadOutlined
            :class="{ 'action-icon-disabled': loading }"
            @click="handleExportExcel"
          />
        </a-tooltip>
      </div>
      <!-- 当有数据时显示图表 -->
      <UniversalChart
        v-if="chartData && chartData.length > 0 && receivedData"
        ref="chartRef"
        :categories="chartCategories"
        :chart-type="autoChartType"
        :data="filteredChartData"
        :data-metrics="renderDataMetrics"
        :dimension-value-map="dimensionValueMap"
        :loading="loading"
        :title="chartTitle"
        height="100%"
        @click="handleChartClick"
      />

      <!-- 当没有数据时显示占位符 -->
      <div
        v-else
        class="chart-placeholder"
      >
        <div class="placeholder-content">
          <BarChartOutlined class="placeholder-icon" />
          <p>配置维度后点击"生成图表"按钮</p>
        </div>
      </div>
    </div>

    <!-- 数据详情弹窗组件 -->
    <dashboard-detail-modal
      v-model:open="detailModalVisible"
      :selected-bar-info="selectedBarInfo"
      :table-id="tableId"
      @close="closeDetailModal"
    />
  </div>
</template>

<script lang="ts" setup>
import { AppstoreOutlined, BarChartOutlined, DatabaseOutlined, DownloadOutlined, PieChartOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, ref, toRefs } from 'vue'

import DimensionControl from './control/DimensionControl.vue'
import StatisticControl from './control/StatisticControl.vue'
import DashboardDetailModal from './DashboardDetail.vue'
import type { SelectedBarInfo } from '../../type/ChartTypes'

import UniversalChart from '@/framework/components/common/chart/UniversalChart.vue'
import {
  buildChartCategories,
  buildComparisonRenderMetrics,
  buildDimensionValueMap,
  buildDrillConditionFromCache,
  buildDrillConditionFromRanking,
  buildSelectedBarInfo,
  extractDimensionData,
  fetchStatisticData,
  filterChartDataByVisibility,
  getChartType,
  getDefaultComparisonOptions,
  hasValidChartConfig,
  parseBarClickParams,
  parsePieClickParams
} from '@/framework/components/common/chart/utils/chartDataHelper'
import { exportChartToExcel } from '@/framework/components/common/chart/utils/chartExport'
import {
  assignTreeStackedColors,
  buildLeafSecondDimension,
  buildParentFirstDimension,
  buildTreeStackedData,
  fetchTreeDict,
  validateTwoLevelTree
} from '@/framework/components/common/chart/utils/treeStacked'
import {
  DimensionIndicatorsFilter
} from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import type { ChartDataItem } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

// Props - 接收外部传入的维度配置数据
const props = defineProps<{
  config: any
  receivedData?: DimensionIndicatorsFilter
  indicatorName?: string
}>()
const { config, receivedData } = toRefs(props)

// 计算属性：从 config 中提取 tableId
const tableId = computed(() => {
  return config.value?.tableId || ''
})

// Emits
const emit = defineEmits<{
  chartGenerated: [data: ChartDataItem[]]
}>()

// 响应式数据
const loading = ref(false)
const chartData = ref<ChartDataItem[]>([])
const isRestoringConfig = ref(false) // 标记是否正在恢复配置

// 维度显示控制
const visibleFirstDimensions = ref<string[]>([])
const allFirstDimensions = ref<string[]>([])
const visibleSecondDimensions = ref<string[]>([])
const allSecondDimensions = ref<string[]>([])
const visibleStatisticTypes = ref<string[]>([])
const allStatisticTypes = ref<string[]>([])
const activeTabKey = ref('first') // Tab的默认激活键

// 弹窗相关
const detailModalVisible = ref(false)
const selectedBarInfo = ref<SelectedBarInfo | null>(null)

// 图表实例引用
const chartRef = ref<InstanceType<typeof UniversalChart> | null>(null)

// 缓存最近一次请求参数，供点击穿透条件复用
let lastRequestParams: any = null

// ==================== 同比环比展示态（echarts UI 配置，不持久化） ====================
const defaultComparisonOptions = getDefaultComparisonOptions()
const comparisonYearCount = ref(defaultComparisonOptions.yearCount)
const comparisonMonth = ref(defaultComparisonOptions.month)
const comparisonScope = ref<'single' | 'ytd'>(defaultComparisonOptions.scope)
const comparisonShowMom = ref(defaultComparisonOptions.showMom)
const comparisonYearCountOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10]

// 是否为同比环比模式
const isComparisonMode = computed(() => {
  return (receivedData.value?.dataMetrics || []).some((m: any) => m.chartType === 'comparisonBar')
})

// 纯年份列（dateFormat=YYYY）：无月份概念，隐藏月份/口径控件，无环比线
const isYearOnlyComparison = computed(() => {
  return receivedData.value?.dataMetrics?.[0]?.dateFormat === 'YYYY'
})

// 渲染指标：同比环比模式使用合成指标（bar + ptLine，环比线随开关），其余透传配置指标
const renderDataMetrics = computed(() => {
  if (isComparisonMode.value) return buildComparisonRenderMetrics(receivedData.value, comparisonShowMom.value)
  return receivedData.value?.dataMetrics || []
})

// 年份数量/月份变更后重新取数
const onComparisonOptionChange = async () => {
  try {
    await fetchChartData(false)
  } catch (error) {
    console.error('同比环比重新取数失败:', error)
  }
}

// ==================== 维度顺序变化处理 ====================
/**
 * 第一维度顺序变化处理
 */
const handleFirstDimensionOrderChanged = async () => {
  // 同步更新receivedData中的indicatorItems顺序
  if (receivedData.value?.firstDimension?.indicatorItems) {
    const itemsMap = new Map(
      receivedData.value.firstDimension.indicatorItems.map((item: any) => [item.itemName, item])
    )
    receivedData.value.firstDimension.indicatorItems = allFirstDimensions.value
      .map((name) => itemsMap.get(name)!)
      .filter(Boolean)
  }

  await nextTick()
  if (chartRef.value && typeof chartRef.value.refresh === 'function') {
    chartRef.value.refresh()
  }
}

/**
 * 第二维度顺序变化处理
 */
const handleSecondDimensionOrderChanged = async () => {
  // 同步更新receivedData中的indicatorItems顺序
  if (receivedData.value?.secondDimension?.indicatorItems) {
    const itemsMap = new Map(
      receivedData.value.secondDimension.indicatorItems.map((item: any) => [item.itemName, item])
    )
    receivedData.value.secondDimension.indicatorItems = allSecondDimensions.value
      .map((name) => itemsMap.get(name)!)
      .filter(Boolean)
  }

  await nextTick()
  if (chartRef.value && typeof chartRef.value.refresh === 'function') {
    chartRef.value.refresh()
  }
}

/**
 * 统计指标顺序变化处理
 */
const handleStatisticOrderChanged = async () => {
  // 同步更新receivedData中的dataMetrics顺序
  if (receivedData.value?.dataMetrics) {
    const metricsMap = new Map(
      receivedData.value.dataMetrics.map((metric: any) => [metric.dataName, metric])
    )
    receivedData.value.dataMetrics = allStatisticTypes.value
      .map((name) => metricsMap.get(name)!)
      .filter(Boolean)
  }

  await nextTick()
  if (chartRef.value && typeof chartRef.value.refresh === 'function') {
    chartRef.value.refresh()
  }
}

// 获取图表分类数据（x轴）
const chartCategories = computed(() => {
  const configuredOrder =
    receivedData.value?.firstDimension?.indicatorItems?.map((i) => i.itemName) || []
  return buildChartCategories(chartData.value, configuredOrder, visibleFirstDimensions.value)
})

// 过滤后的图表数据（取数后由控制面板过滤）
const filteredChartData = computed(() => {
  return filterChartDataByVisibility(
    chartData.value,
    visibleFirstDimensions.value,
    visibleSecondDimensions.value,
    visibleStatisticTypes.value
  )
})

// 动态获取维度信息的计算属性
const firstDimensionName = computed(() => {
  // 同比环比模式无一级维度，X 轴为统计周期
  if (isComparisonMode.value) {
    return receivedData.value?.dataMetrics?.[0]?.dateFieldLabel || '统计周期'
  }
  return receivedData.value?.firstDimension?.groupName || '第一维度'
})

const secondDimensionName = computed(() => {
  return receivedData.value?.secondDimension?.groupName || '第二维度'
})

// 是否存在可用的第二维度（仅当传入且有可选项时显示控制）
const hasSecondDimension = computed(() => {
  const items = receivedData.value?.secondDimension?.indicatorItems as any[] | undefined
  return Array.isArray(items) && items.length > 0
})

// 动态从 dataMetrics 中获取图表类型
const autoChartType = computed(() => getChartType(receivedData.value))

// 图表标题
const chartTitle = computed(() => {
  return props.indicatorName || '数据统计图表'
})

// 维度名称到编码的映射，保证颜色等与配置一致
const dimensionValueMap = computed(() => buildDimensionValueMap(receivedData.value))

// ==================== 函数定义 ====================

// 关闭详情弹窗
const closeDetailModal = () => {
  detailModalVisible.value = false
  selectedBarInfo.value = null
}

// 图表点击事件处理
const handleChartClick = (params: any) => {
  // 根据图表类型处理点击事件
  if (autoChartType.value === 'comparisonBar') {
    onComparisonBarClick(params)
  } else if (autoChartType.value === 'rankingBar') {
    onRankingBarClick(params)
  } else if (autoChartType.value === 'bar' || autoChartType.value === 'line' || autoChartType.value === 'ptLine') {
    onBarClick(params)
  } else if (autoChartType.value === 'pie') {
    onPieClick(params)
  }
}

// 点击同比环比柱子/折线事件处理（X 轴分类 'YYYY-MM' 与请求桶 label 一致，直接按 conditionLabel 匹配）
const onComparisonBarClick = (params: any) => {
  const periodLabel = params.name // X 轴周期标签 'YYYY-MM'
  const combinedConditions = buildDrillConditionFromCache(lastRequestParams, periodLabel, '')
  if (!combinedConditions) {
    console.warn('无法构建同比环比穿透条件')
    return
  }

  const groupName = receivedData.value?.dataMetrics?.[0]?.dateFieldLabel || '统计周期'
  const statType = params.seriesName

  selectedBarInfo.value = buildSelectedBarInfo(
    periodLabel, null, groupName, null,
    statType, [periodLabel], combinedConditions, false
  )

  detailModalVisible.value = true
}

// 点击排行榜柱子事件处理
const onRankingBarClick = (params: any) => {
  const displayName = params.name // X 轴分组显示名
  // 从归一化数据中反查该显示名对应的原始分组值（字典码 / 'NULL'）
  const item = chartData.value.find((d: any) => d.metricLabel === displayName)
  const rawMetric = item ? (item as any).metric : displayName
  const groupByField = receivedData.value?.dataMetrics?.[0]?.groupByField || ''

  const combinedConditions = buildDrillConditionFromRanking(lastRequestParams, groupByField, rawMetric)
  if (!combinedConditions) {
    console.warn('无法构建排行榜穿透条件')
    return
  }

  const groupName = receivedData.value?.dataMetrics?.[0]?.groupByLabel || '分组'
  const statType = params.seriesName

  selectedBarInfo.value = buildSelectedBarInfo(
    displayName, null, groupName, null,
    statType, [displayName], combinedConditions, false
  )

  detailModalVisible.value = true
}

// 点击柱状图/折线图事件处理
const onBarClick = (params: any) => {
  const { firstDim, secondDim, statType } = parseBarClickParams(params, hasSecondDimension.value)

  // 从缓存的请求体构建穿透条件
  const combinedConditions = buildDrillConditionFromCache(lastRequestParams, firstDim, secondDim)
  if (!combinedConditions) {
    console.warn('无法构建查询条件')
    return
  }

  const statisticData = hasSecondDimension.value && secondDim ? [secondDim] : [firstDim]

  selectedBarInfo.value = buildSelectedBarInfo(
    firstDim, secondDim, firstDimensionName.value, secondDimensionName.value,
    statType, statisticData, combinedConditions, hasSecondDimension.value
  )

  detailModalVisible.value = true
}

// 点击饼图事件处理
const onPieClick = (params: any) => {
  const { firstDim, secondDim, statType } = parsePieClickParams(params, hasSecondDimension.value)

  if (!firstDim || (hasSecondDimension.value && !secondDim)) {
    console.warn('饼图点击：无法解析维度信息:', { pieSegmentName: params.name })
    return
  }

  const combinedConditions = buildDrillConditionFromCache(lastRequestParams, firstDim, secondDim)
  if (!combinedConditions) {
    console.warn('饼图点击：无法构建组合条件')
    return
  }

  const statisticData = hasSecondDimension.value && secondDim ? [secondDim] : [firstDim]

  selectedBarInfo.value = buildSelectedBarInfo(
    firstDim, secondDim, firstDimensionName.value, secondDimensionName.value,
    statType, statisticData, combinedConditions, hasSecondDimension.value
  )

  detailModalVisible.value = true
}

/**
 * 更新维度数据
 * 从图表数据中提取维度列表和统计类型，并按需恢复可见性配置
 */
const updateDimensionData = (data: ChartDataItem[], restoreVisibility = false) => {
  const configFirst = receivedData.value?.firstDimension?.indicatorItems?.map((i) => i.itemName) || []
  const configSecond = receivedData.value?.secondDimension?.indicatorItems?.map((i) => i.itemName) || []

  const { firstDimensions, secondDimensions, statisticTypes } =
    extractDimensionData(data, configFirst, configSecond)

  allFirstDimensions.value = [...firstDimensions]
  allSecondDimensions.value = [...secondDimensions]
  allStatisticTypes.value = [...statisticTypes]

  if (restoreVisibility && receivedData.value) {
    // 从配置中恢复可见性状态
    const restoreList = (saved: string[] | undefined, all: string[]): string[] => {
      if (saved && Array.isArray(saved)) {
        const filtered = saved.filter(item => all.includes(item))
        return filtered.length > 0 ? filtered : [...all]
      }
      return [...all]
    }

    visibleFirstDimensions.value = restoreList(receivedData.value.visibleFirstDimensions, firstDimensions)
    visibleSecondDimensions.value = restoreList(receivedData.value.visibleSecondDimensions, secondDimensions)

    // 统计指标：保留配置中的可见项 + 新增项
    if (receivedData.value.visibleStatisticTypes && Array.isArray(receivedData.value.visibleStatisticTypes)) {
      const existing = receivedData.value.visibleStatisticTypes.filter(item => statisticTypes.includes(item))
      const newTypes = statisticTypes.filter(item => !receivedData.value!.visibleStatisticTypes!.includes(item))
      visibleStatisticTypes.value = [...existing, ...newTypes]
      if (visibleStatisticTypes.value.length === 0 && statisticTypes.length > 0) {
        visibleStatisticTypes.value = (secondDimensions.length === 0 && !isComparisonMode.value) ? [statisticTypes[0]] : [...statisticTypes]
      }
    } else {
      if (statisticTypes.length > 0) {
        visibleStatisticTypes.value = (secondDimensions.length === 0 && !isComparisonMode.value) ? [statisticTypes[0]] : [...statisticTypes]
      } else {
        visibleStatisticTypes.value = []
      }
    }
  } else {
    // 默认全部可见
    visibleFirstDimensions.value = [...firstDimensions]
    visibleSecondDimensions.value = [...secondDimensions]
    if (statisticTypes.length > 0) {
      // 同比环比模式默认展示全部系列（统计值/同比/环比）
      visibleStatisticTypes.value = (secondDimensions.length === 0 && !isComparisonMode.value) ? [statisticTypes[0]] : [...statisticTypes]
    } else {
      visibleStatisticTypes.value = []
    }
  }
}

/**
 * 获取图表数据
 * 校验 → 树形回写 → 构建请求参数 → 调用 API → 更新维度数据
 * @param shouldRestoreVisibility 是否应该恢复可见性配置（用于编辑回显）
 */
const fetchChartData = async (shouldRestoreVisibility = false) => {
  if (!receivedData.value) {
    message.error('数据配置不完整，请重新配置维度信息')
    throw new Error('数据配置不完整，请重新配置维度信息')
  }

  // 配置校验
  if (!hasValidChartConfig(receivedData.value)) {
    message.error('图表配置不完整，请检查维度和数据指标配置')
    throw new Error('图表配置不完整')
  }

  // 标记正在恢复配置
  if (shouldRestoreVisibility) {
    isRestoringConfig.value = true
  }

  loading.value = true

  try {
    // 预清理，避免上一次筛选残留对本次过滤造成影响
    chartData.value = []
    visibleFirstDimensions.value = []
    visibleSecondDimensions.value = []
    visibleStatisticTypes.value = []

    // ===== 树形堆叠：校验 + 回写（仅配置弹窗需要） =====
    const isTreeStacked = !!receivedData.value.treeDimension &&
      !!receivedData.value.dataMetrics?.some((m: any) => m.chartType === 'treeStackedBar')
    if (isTreeStacked && receivedData.value.treeDimension) {
      const treeDimension = receivedData.value.treeDimension
      // 校验是否为可用的 2 层树
      const tree = await fetchTreeDict(treeDimension.dictName)
      const validation = validateTwoLevelTree(tree)
      if (!validation.valid) {
        throw new Error(validation.message || '树形字典不可用于树形堆叠')
      }
      // 拍平树结构获取父子分组（复用已缓存的树结构）
      const { parentGroups } = await buildTreeStackedData(treeDimension)
      // 用父节点重写一级维度，保证 X 轴分类与可见性控制都以父节点为准
      receivedData.value.firstDimension = buildParentFirstDimension(treeDimension, parentGroups)
      // 用全部叶子节点合成二级维度，驱动叶子可见性控制与颜色映射
      receivedData.value.secondDimension = buildLeafSecondDimension(treeDimension, parentGroups)
      // 为每个叶子节点分配确定性颜色
      assignTreeStackedColors(receivedData.value.dataMetrics || [], parentGroups)
    }

    // ===== 构建请求参数并获取数据 =====
    // 配置弹窗不传 visibility，取数后由控制面板过滤；
    // 同比环比模式例外：年份数量/月份/口径为展示态取数参数，需随请求下发
    const comparisonVisibility = isComparisonMode.value
      ? { comparison: { yearCount: comparisonYearCount.value, month: comparisonMonth.value, scope: comparisonScope.value, showMom: comparisonShowMom.value } }
      : undefined
    const { requestParams, response: result } =
      await fetchStatisticData(config.value.url, receivedData.value, comparisonVisibility)
    // 缓存请求参数，供点击穿透复用
    lastRequestParams = requestParams

    if (result && result.payload) {
      chartData.value = result.payload
      updateDimensionData(result.payload, shouldRestoreVisibility)
      emit('chartGenerated', result.payload)
    } else {
      message.warning('暂无数据，请检查筛选条件或数据源')
      chartData.value = []
      throw new Error('API返回数据为空或格式不正确')
    }
  } catch (error: any) {
    message.error(`获取图表数据失败: ${error?.message || '未知错误'}`)
    chartData.value = []
    throw error
  } finally {
    loading.value = false
    if (shouldRestoreVisibility) {
      setTimeout(() => {
        isRestoringConfig.value = false
      }, 100)
    }
  }
}

/**
 * 强制重新计算布局（主要用于弹窗初始化后的布局调整）
 */
const forceRecalculateLayout = async () => {
  await nextTick()
  if (chartRef.value && typeof chartRef.value.refresh === 'function') {
    // 强制刷新图表
    chartRef.value.refresh()
  }
  // 如果有ECharts实例，强制resize
  if (chartRef.value && typeof chartRef.value.getInstance === 'function') {
    const chartInstance = chartRef.value.getInstance()
    if (chartInstance) {
      setTimeout(() => {
        try {
          chartInstance.resize()
        } catch (error) {
          // 忽略resize错误
        }
      }, 50)
    }
  }
}

// 获取当前的统计指标可见性配置
const getVisibilityConfig = () => {
  return {
    visibleStatisticTypes: [...visibleStatisticTypes.value],
    visibleFirstDimensions: [...visibleFirstDimensions.value],
    visibleSecondDimensions: [...visibleSecondDimensions.value]
  }
}

// ==================== 导出 Excel ====================
const handleExportExcel = () =>
  exportChartToExcel(filteredChartData.value, receivedData.value as any, chartTitle.value, loading.value)

// 暴露方法供父组件调用
defineExpose({
  generateChart: fetchChartData,
  clearChart: () => {
    chartData.value = []
    visibleFirstDimensions.value = []
    visibleSecondDimensions.value = []
    visibleStatisticTypes.value = []
    allFirstDimensions.value = []
    allSecondDimensions.value = []
    allStatisticTypes.value = []
    loading.value = false
  },
  forceRecalculateLayout,
  getVisibilityConfig
})
</script>

<style lang="less" scoped src="../../styles/talentReview.less"></style>

<style lang="less" scoped>
// 同比环比展示态控件（年份数量/月份）
.comparison-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px 0;

  .comparison-label {
    font-size: 12px;
    color: var(--text-secondary);

    &:not(:first-child) {
      margin-left: 12px;
    }
  }
}
</style>
