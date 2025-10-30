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
          <div class="tab-content">
            <a-checkbox-group v-model:value="visibleFirstDimensions">
              <a-checkbox
                v-for="dimension in allFirstDimensions"
                :key="dimension"
                :value="dimension"
              >
                <a-tooltip
                  :title="dimension"
                  placement="top"
                >
                  <span class="checkbox-text">{{ dimension }}</span>
                </a-tooltip>
              </a-checkbox>
            </a-checkbox-group>
            <div class="tab-actions">
              <a-button
                size="small"
                type="link"
                @click="toggleAllFirstDimensions"
              >
                全部选中
              </a-button>
              <a-button
                size="small"
                type="link"
                :disabled="isFirstDimensionInvertDisabled"
                @click="invertFirstDimensionsSelection"
              >
                反选
              </a-button>
            </div>
          </div>
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
          <div class="tab-content">
            <a-checkbox-group v-model:value="visibleSecondDimensions">
              <a-checkbox
                v-for="dimension in allSecondDimensions"
                :key="dimension"
                :value="dimension"
              >
                <a-tooltip
                  :title="dimension"
                  placement="top"
                >
                  <span class="checkbox-text">{{ dimension }}</span>
                </a-tooltip>
              </a-checkbox>
            </a-checkbox-group>
            <div class="tab-actions">
              <a-button
                size="small"
                type="link"
                @click="toggleAllSecondDimensions"
              >
                全部选中
              </a-button>
              <a-button
                size="small"
                type="link"
                :disabled="isSecondDimensionInvertDisabled"
                @click="invertSecondDimensionsSelection"
              >
                反选
              </a-button>
            </div>
          </div>
        </a-tab-pane>

        <!-- 统计指标控制 -->
        <a-tab-pane
          key="statistics"
          tab="统计指标"
        >
          <template #tab>
            <PieChartOutlined /> 统计指标
          </template>
          <div class="tab-content">
            <a-checkbox-group v-model:value="visibleStatisticTypes">
              <a-checkbox
                v-for="statType in allStatisticTypes"
                :key="statType"
                :value="statType"
              >
                <a-tooltip
                  :title="statType"
                  placement="top"
                >
                  <span class="checkbox-text">{{ statType }}</span>
                </a-tooltip>
              </a-checkbox>
            </a-checkbox-group>
            <div class="tab-actions">
              <a-button
                size="small"
                type="link"
                @click="toggleAllStatisticTypes"
              >
                全部选中
              </a-button>
              <a-button
                size="small"
                type="link"
                :disabled="isStatisticTypesInvertDisabled"
                @click="invertStatisticTypesSelection"
              >
                反选
              </a-button>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>

    <div class="chart-container">
      <!-- 当有数据时显示图表 -->
      <UniversalChart
        v-if="chartData && chartData.length > 0 && receivedData"
        ref="chartRef"
        :categories="chartCategories"
        :chart-type="autoChartType"
        :data="filteredChartData"
        :data-metrics="receivedData.dataMetrics || []"
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
import { BarChartOutlined, DatabaseOutlined, AppstoreOutlined, PieChartOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, toRefs } from 'vue'

import DashboardDetailModal from './DashboardDetail.vue'
import UniversalChart from './UniversalChart.vue'
import type { SelectedBarInfo } from '../../type/ChartTypes'

import { advancedStatisticRequest } from '@/framework/apis'
import {
  ConvertOptions,
  DimensionIndicatorsFilter,
  IndicatorGroup,
  MetricCondition,
  RequestParams
} from '@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq'
import type { ChartDataItem } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

// Props - 接收外部传入的维度配置数据
const props = defineProps<{
  config: any,
  receivedData?: DimensionIndicatorsFilter
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


// 获取图表分类数据（x轴）
const chartCategories = computed(() => {
  if (!chartData.value.length) return []
  // 以配置的第一维度顺序为准，和后端返回的数据做交集
  const dataCatsSet = new Set(chartData.value.map((item: any) => item.metricLabel.split('&&')[0]))
  const configuredOrder = receivedData.value?.firstDimension?.indicatorItems?.map(i => i.itemName) || []
  const ordered = configuredOrder.filter(name => dataCatsSet.has(name))
  const extras = Array.from(dataCatsSet).filter(name => !configuredOrder.includes(name))
  return [...ordered, ...extras]
})

// 过滤后的图表数据
const filteredChartData = computed(() => {
  if (!chartData.value.length) return []

  // 根据维度控制面板的选择过滤数据
  return chartData.value.filter((item: any) => {
    const parts = item.metricLabel.split('&&')
    const firstDim = parts[0]
    const secondDim = parts[1]

    const firstDimVisible = visibleFirstDimensions.value.length === 0 || visibleFirstDimensions.value.includes(firstDim)
    const secondDimVisible = visibleSecondDimensions.value.length === 0 || visibleSecondDimensions.value.includes(secondDim)

    // 只有当两个维度都可见时才包含该项
    return firstDimVisible && secondDimVisible
  }).map((item: any) => {
    // 创建新的对象，避免修改原始数据
    return {
      ...item,
      children: item.children.filter((child: any) => {
        const statType = child.metric
        return visibleStatisticTypes.value.length === 0 || visibleStatisticTypes.value.includes(statType)
      })
    }
  }).filter((item: any) => item.children.length > 0) // 只保留有children的项
})

// 动态获取维度信息的计算属性
const firstDimensionName = computed(() => {
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
const autoChartType = computed(() => {
  // 从 dataMetrics 中获取第一个配置的 chartType
  const firstMetric = receivedData.value?.dataMetrics?.[0]
  return firstMetric?.chartType || 'bar'
})

// 图表标题
const chartTitle = computed(() => {
  return '数据统计图表'
})

// 维度名称到编码的映射，保证颜色等与配置一致
const dimensionValueMap = computed(() => {
  const first: Record<string, string> = {}
  const second: Record<string, string> = {}
  receivedData.value?.firstDimension?.indicatorItems?.forEach(it => {
    first[it.itemName] = typeof it.itemValue === 'string' ? it.itemValue : String(it.itemValue)
  })
  receivedData.value?.secondDimension?.indicatorItems?.forEach(it => {
    second[it.itemName] = typeof it.itemValue === 'string' ? it.itemValue : String(it.itemValue)
  })
  return { first, second }
})

// 第一维度反选按钮是否应该禁用
const isFirstDimensionInvertDisabled = computed(() => {
  return visibleFirstDimensions.value.length === 0 ||
    visibleFirstDimensions.value.length === allFirstDimensions.value.length
})

// 第二维度反选按钮是否应该禁用
const isSecondDimensionInvertDisabled = computed(() => {
  return visibleSecondDimensions.value.length === 0 ||
    visibleSecondDimensions.value.length === allSecondDimensions.value.length
})

// 统计指标反选按钮是否应该禁用
const isStatisticTypesInvertDisabled = computed(() => {
  return visibleStatisticTypes.value.length === 0 ||
    visibleStatisticTypes.value.length === allStatisticTypes.value.length
})

// ==================== 函数定义 ====================
/**
 * 转换条件列表，将嵌套的条件结构转换为接口要求的扁平化结构
 * 保持条件之间的逻辑关系（AND/OR）
 * @param conditionList 嵌套的条件列表
 * @returns 转换后的条件列表
 */
const transformConditionList = (conditionList: any[]): any[] => {
  const result: any[] = []

  const traverse = (conditions: any[], parentAndOr = '0') => {
    conditions.forEach(condition => {
      // 如果是叶子节点条件（有property属性且不为null），直接添加
      if (condition.property !== undefined && condition.property !== null) {
        result.push({
          property: condition.property,
          relation: condition.relation,
          value: Array.isArray(condition.value) ? [...condition.value] : condition.value
        })
      }
      // 如果有条件列表且有逻辑关系（andOr），需要保持这个结构
      else if (condition.conditionList && Array.isArray(condition.conditionList) && condition.conditionList.length > 0) {
        // 如果是顶层的筛选维度条件组（有andOr属性），保持其结构
        if (condition.andOr !== undefined) {
          // 递归处理子条件
          const transformedSubConditions = transformConditionList(condition.conditionList)

          // 如果子条件只有一个且是叶子节点，直接添加
          if (transformedSubConditions.length === 1 &&
            transformedSubConditions[0].property !== undefined &&
            transformedSubConditions[0].property !== null) {
            result.push(transformedSubConditions[0])
          }
          // 如果有多个子条件且都是叶子节点，构建嵌套结构
          else if (transformedSubConditions.length > 0 &&
            transformedSubConditions.every(sub => sub.property !== undefined && sub.property !== null)) {
            result.push({
              property: null,
              value: null,
              relation: null,
              conditionList: transformedSubConditions,
              andOr: condition.andOr
            })
          }
          // 如果子条件中有嵌套结构，保持原有结构
          else if (transformedSubConditions.length > 0) {
            // 只有当子条件不为空时才添加
            const nonEmptyConditions = transformedSubConditions.filter(sub =>
              sub.property !== null ||
              (sub.conditionList && Array.isArray(sub.conditionList) && sub.conditionList.length > 0)
            )

            if (nonEmptyConditions.length > 0) {
              result.push({
                property: null,
                value: null,
                relation: null,
                conditionList: nonEmptyConditions,
                andOr: condition.andOr
              })
            }
          }
        }
        // 如果没有andOr属性，递归处理
        else {
          traverse(condition.conditionList, parentAndOr)
        }
      }
    })
  }

  traverse(conditionList)
  return result
}

/**
 * 构建只有第一维度的查询条件
 * @param firstDim 第一维度名称
 * @returns 组合条件对象
 */
const buildFirstDimensionConditions = (firstDim: string) => {
  if (!receivedData.value) {
    return null
  }

  // 查找第一维度条件
  const firstDimItem = receivedData.value.firstDimension?.indicatorItems.find((item: any) => item.itemName === firstDim)

  if (!firstDimItem) {
    return null
  }

  // 合并全局筛选条件和第一维度条件
  const globalConditions = receivedData.value.filterConditions?.conditionList || []
  const firstDimConditions = firstDimItem.queryConditions.conditionList || []

  // 转换条件列表，保持逻辑关系
  const transformedConditions = transformConditionList([
    ...globalConditions,
    ...firstDimConditions
  ])

  return {
    andOr: '0', // 使用 AND 连接全局条件和维度条件
    conditionList: transformedConditions,
    // 附加信息：原始条件
    firstDimensionCondition: firstDimItem.queryConditions,
    secondDimensionCondition: null,
    // 附加信息：维度标识
    firstDimensionId: `${receivedData.value.firstDimension!.groupValue}&&${firstDimItem.itemValue}`,
    secondDimensionId: null
  }
}

/**
 * 构建第一维度和第二维度的组合查询条件
 * @param firstDim 第一维度名称
 * @param secondDim 第二维度名称
 * @returns 组合条件对象
 */
const buildCombinedConditions = (firstDim: string, secondDim: string) => {
  if (!receivedData.value) {
    return null
  }

  // 查找第一维度条件
  const firstDimItem = receivedData.value.firstDimension?.indicatorItems.find((item: any) => item.itemName === firstDim)

  if (!firstDimItem) {
    return null
  }

  // 查找第二维度条件（如果存在第二维度）
  const secondDimItem = hasSecondDimension.value
    ? receivedData.value.secondDimension?.indicatorItems.find((item: any) => item.itemName === secondDim)
    : null

  // 如果有第二维度但找不到对应条件，则报错
  if (hasSecondDimension.value && !secondDimItem) {
    return null
  }

  // 合并查询条件：全局筛选条件 + 第一维度条件 + 第二维度条件
  const globalConditions = receivedData.value.filterConditions?.conditionList || []
  const firstDimConditions = firstDimItem.queryConditions.conditionList || []
  const secondDimConditions = secondDimItem
    ? secondDimItem.queryConditions.conditionList || []
    : []

  // 转换条件列表，保持逻辑关系
  const transformedConditions = transformConditionList([
    ...globalConditions,
    ...firstDimConditions,
    ...secondDimConditions
  ])

  return {
    andOr: '0', // 使用 AND 连接所有条件
    conditionList: transformedConditions,
    // 附加信息：原始条件
    firstDimensionCondition: firstDimItem.queryConditions,
    secondDimensionCondition: secondDimItem?.queryConditions || null,
    // 附加信息：维度标识
    firstDimensionId: `${receivedData.value.firstDimension!.groupValue}&&${firstDimItem.itemValue}`,
    secondDimensionId: secondDimItem ? `${receivedData.value.secondDimension!.groupValue}&&${secondDimItem.itemValue}` : null
  }
}

// 关闭详情弹窗
const closeDetailModal = () => {
  detailModalVisible.value = false
  selectedBarInfo.value = null
}

// 全选第一维度
const toggleAllFirstDimensions = () => {
  // 如果已经全选，则不做任何操作
  if (visibleFirstDimensions.value.length === allFirstDimensions.value.length) {
    return
  }
  visibleFirstDimensions.value = [...allFirstDimensions.value]
}

// 第一维度反选功能
const invertFirstDimensionsSelection = () => {
  // 直接进行反选操作，UI层面的禁用状态已经通过disabled属性控制
  const invertedSelection = allFirstDimensions.value.filter(
    dimension => !visibleFirstDimensions.value.includes(dimension)
  )
  visibleFirstDimensions.value = invertedSelection
}

// 全选第二维度
const toggleAllSecondDimensions = () => {
  // 如果已经全选，则不做任何操作
  if (visibleSecondDimensions.value.length === allSecondDimensions.value.length) {
    return
  }
  visibleSecondDimensions.value = [...allSecondDimensions.value]
}

// 第二维度反选功能
const invertSecondDimensionsSelection = () => {
  // 直接进行反选操作，UI层面的禁用状态已经通过disabled属性控制
  const invertedSelection = allSecondDimensions.value.filter(
    dimension => !visibleSecondDimensions.value.includes(dimension)
  )
  visibleSecondDimensions.value = invertedSelection
}

// 全选统计类型
const toggleAllStatisticTypes = () => {
  // 如果已经全选，则不做任何操作
  if (visibleStatisticTypes.value.length === allStatisticTypes.value.length) {
    return
  }
  visibleStatisticTypes.value = [...allStatisticTypes.value]
}

// 统计类型反选功能
const invertStatisticTypesSelection = () => {
  // 如果当前是全选状态，则不做任何操作
  if (visibleStatisticTypes.value.length === allStatisticTypes.value.length) {
    return
  }
  const invertedSelection = allStatisticTypes.value.filter(
    statType => !visibleStatisticTypes.value.includes(statType)
  )
  visibleStatisticTypes.value = invertedSelection
}

// 图表点击事件处理
const handleChartClick = (params: any) => {
  // 根据图表类型处理点击事件
  if (autoChartType.value === 'bar' || autoChartType.value === 'line') {
    onBarClick(params)
  } else if (autoChartType.value === 'pie') {
    onPieClick(params)
  }
}

// 点击柱状图/折线图事件处理
const onBarClick = (params: any) => {
  const seriesName = params.seriesName
  const firstDim = params.name // x轴的值（第一维度）

  let secondDim = ''
  let statType = ''

  // 判断是否有第二维度
  if (hasSecondDimension.value && seriesName.includes('&&')) {
    // 有第二维度：格式是 "第二维度&&统计类型"
    const parts = seriesName.split('&&')
    secondDim = parts[0] || ''
    statType = parts[1] || ''
  } else {
    // 没有第二维度：seriesName 直接就是统计类型
    statType = seriesName
    secondDim = '' // 没有第二维度时设为空
  }

  // 获取组合条件
  const combinedConditions = hasSecondDimension.value
    ? buildCombinedConditions(firstDim, secondDim)
    : buildFirstDimensionConditions(firstDim)

  // 获取用户选中的具体指标数据项
  let statisticData: string[] = []
  if (hasSecondDimension.value && secondDim) {
    // 有第二维度时，显示选中的第二维度值
    statisticData = [secondDim]
  } else {
    // 没有第二维度时，显示选中的第一维度值
    statisticData = [firstDim]
  }

  // 设置选中的柱状图信息
  selectedBarInfo.value = {
    firstDimension: firstDim,
    secondDimension: secondDim || null,
    firstDimensionName: firstDimensionName.value,
    secondDimensionName: hasSecondDimension.value ? secondDimensionName.value : null,
    statisticType: statType,
    statisticData: statisticData,
    combinedConditions: combinedConditions,
    title: hasSecondDimension.value
      ? `${firstDimensionName.value}: ${firstDim} && ${secondDimensionName.value}: ${secondDim} (${statType})`
      : `${firstDimensionName.value}: ${firstDim} (${statType})`
  }

  // 显示弹窗
  detailModalVisible.value = true
}

// 点击饼图事件处理
const onPieClick = (params: any) => {
  // 饼图的数据结构包含维度信息
  const pieSegmentName = params.name // 饼图段的名称
  let firstDim = ''
  let secondDim = ''
  let statType = params.seriesName || '总计'

  // 解析维度信息（根据是否有第二维度采用不同策略）
  if (hasSecondDimension.value && pieSegmentName.includes('&&')) {
    // 有第二维度时，格式："第一维度&&第二维度"
    const parts = pieSegmentName.split('&&')
    firstDim = parts[0] || ''
    secondDim = parts[1] || ''
    if (!firstDim || !secondDim) {
      return
    }
  } else {
    // 没有第二维度时，名称就是第一维度
    firstDim = pieSegmentName
    secondDim = ''
    if (!firstDim) {
      return
    }
  }

  // 获取组合条件
  const combinedConditions = hasSecondDimension.value && secondDim
    ? buildCombinedConditions(firstDim, secondDim)
    : buildFirstDimensionConditions(firstDim)

  if (!combinedConditions) {
    return
  }

  // 获取用户选中的具体指标数据项
  let statisticData: string[] = []
  if (hasSecondDimension.value && secondDim) {
    // 有第二维度时，显示选中的第二维度值
    statisticData = [secondDim]
  } else {
    // 没有第二维度时，显示选中的第一维度值
    statisticData = [firstDim]
  }

  // 设置选中的饼图信息
  selectedBarInfo.value = {
    firstDimension: firstDim,
    secondDimension: secondDim || null,
    firstDimensionName: firstDimensionName.value,
    secondDimensionName: hasSecondDimension.value ? secondDimensionName.value : null,
    statisticType: statType,
    statisticData: statisticData,
    combinedConditions: combinedConditions,
    title: hasSecondDimension.value && secondDim
      ? `${firstDimensionName.value}: ${firstDim} && ${secondDimensionName.value}: ${secondDim} (${statType})`
      : `${firstDimensionName.value}: ${firstDim} (${statType})`
  }

  // 显示弹窗
  detailModalVisible.value = true
}

/**
 * 更新维度数据的函数
 * @param data 图表数据
 * @param restoreVisibility 是否从配置中恢复可见性状态
 */
const updateDimensionData = (data: ChartDataItem[], restoreVisibility = false) => {
  // 以配置顺序为主，回退到数据中的顺序
  const configFirst = receivedData.value?.firstDimension?.indicatorItems?.map(i => i.itemName) || []
  const dataFirst = [...new Set(data.map((item: any) => item.metricLabel.split('&&')[0]))]
  const firstDimensionGroups = configFirst.length ? configFirst : dataFirst

  const configSecond = receivedData.value?.secondDimension?.indicatorItems?.map(i => i.itemName) || []
  const dataSecond = [...new Set(data.map((item: any) => item.metricLabel.split('&&')[1]))]
  const secondDimensionGroups = configSecond.length ? configSecond : dataSecond

  // 提取统计类型
  const statisticTypes = [...new Set(data.flatMap((item: any) => item.children.map((child: any) => child.metric)))]

  // 更新所有项列表
  allFirstDimensions.value = [...firstDimensionGroups]
  allSecondDimensions.value = [...secondDimensionGroups]
  allStatisticTypes.value = [...statisticTypes]

  // 如果需要从配置中恢复可见性状态
  if (restoreVisibility && receivedData.value) {
    // 从配置中恢复可见性状态
    if (receivedData.value.visibleFirstDimensions && Array.isArray(receivedData.value.visibleFirstDimensions)) {
      // 只保留在当前数据中存在的项
      visibleFirstDimensions.value = receivedData.value.visibleFirstDimensions.filter(
        item => firstDimensionGroups.includes(item)
      )
    } else {
      visibleFirstDimensions.value = [...firstDimensionGroups]
    }

    if (receivedData.value.visibleSecondDimensions && Array.isArray(receivedData.value.visibleSecondDimensions)) {
      visibleSecondDimensions.value = receivedData.value.visibleSecondDimensions.filter(
        item => secondDimensionGroups.includes(item)
      )
    } else {
      visibleSecondDimensions.value = [...secondDimensionGroups]
    }

    if (receivedData.value.visibleStatisticTypes && Array.isArray(receivedData.value.visibleStatisticTypes)) {
      visibleStatisticTypes.value = receivedData.value.visibleStatisticTypes.filter(
        item => statisticTypes.includes(item)
      )
    } else {
      visibleStatisticTypes.value = [...statisticTypes]
    }
  } else {
    // 默认全部可见
    visibleFirstDimensions.value = [...firstDimensionGroups]
    visibleSecondDimensions.value = [...secondDimensionGroups]
    visibleStatisticTypes.value = [...statisticTypes]
  }
}

/**
 * 获取图表数据
 * @param shouldRestoreVisibility 是否应该恢复可见性配置（用于编辑回显）
 */
const fetchChartData = async (shouldRestoreVisibility = false) => {
  if (!receivedData.value) {
    message.error('数据配置不完整，请重新配置维度信息')
    throw new Error('数据配置不完整，请重新配置维度信息')
  }

  // 检查一级维度是否存在
  if (!receivedData.value.firstDimension) {
    message.error('一级维度未配置，请先选择一级维度')
    throw new Error('一级维度未配置，请先选择一级维度')
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

    // 调用真实的API获取数据（增加防缓存标识）
    const result = await fetchTalentStatisticData(receivedData.value, {})

    if (result && result.payload) {
      chartData.value = result.payload

      // 更新维度数据，如果需要则恢复可见性配置
      updateDimensionData(result.payload, shouldRestoreVisibility)

      // 触发图表生成事件
      emit('chartGenerated', result.payload)
    } else {
      message.warning('暂无数据，请检查筛选条件或数据源')
      chartData.value = []
      throw new Error('API返回数据为空或格式不正确')
    }
  } catch (error: any) {
    message.error(`获取图表数据失败: ${error?.message || '未知错误'}`)
    chartData.value = []
    // 重新抛出错误，让调用者能够捕获
    throw error
  } finally {
    loading.value = false
    // 清除恢复配置标记
    if (shouldRestoreVisibility) {
      setTimeout(() => {
        isRestoringConfig.value = false
      }, 100)
    }
  }
}

/**
 * 将维度组转换为指标条件
 * @param dimension 维度组数据
 * @returns 指标条件数组
 */
const convertDimensionToMetricCondition = (dimension: IndicatorGroup): MetricCondition[] => {
  return dimension.indicatorItems.map(item => ({
    value: `${dimension.groupValue}&&${item.itemValue}`, // 生成唯一标识
    label: item.itemName,
    condition: item.queryConditions
  }))
}

/**
 * 将接收到的数据交叉组合两个维度的条件后转换为后端需要的格式（用于柱状图等数据可视化）
 * @param receivedData 接收到的数据
 * @param options 转换配置选项
 * @returns 请求参数
 */
const convertDataToCrossMetricConditions = (
  receivedData: DimensionIndicatorsFilter,
  options: ConvertOptions = {}
): RequestParams => {
  const metricConditions: MetricCondition[] = []

  // 检查一级维度是否存在
  if (!receivedData.firstDimension || !receivedData.firstDimension.indicatorItems || receivedData.firstDimension.indicatorItems.length === 0) {
    throw new Error('一级维度数据不完整，无法生成图表')
  }

  // 如果两个维度都存在，进行交叉组合
  if (receivedData.firstDimension && receivedData.secondDimension &&
    receivedData.secondDimension.indicatorItems && receivedData.secondDimension.indicatorItems.length > 0) {
    receivedData.firstDimension.indicatorItems.forEach(firstItem => {
      receivedData.secondDimension!.indicatorItems.forEach(secondItem => {
        // 合并两个维度的查询条件
        const combinedConditionList = [
          ...((firstItem.queryConditions?.conditionList ?? []) as any),
          ...((secondItem.queryConditions?.conditionList ?? []) as any)
        ]

        // 生成交叉组合的指标条件
        const crossMetricCondition: MetricCondition = {
          value: `${receivedData.firstDimension!.groupValue}&&${firstItem.itemValue}&&${receivedData.secondDimension!.groupValue}&&${secondItem.itemValue}`,
          label: `${firstItem.itemName}&&${secondItem.itemName}`,
          condition: {
            andOr: '0', // 两个维度的条件用 AND 连接
            conditionList: combinedConditionList
          }
        }

        metricConditions.push(crossMetricCondition)
      })
    })
  } else {
    // 如果只有一个维度（一级维度）
    if (receivedData.firstDimension) {
      const firstMetrics = convertDimensionToMetricCondition(receivedData.firstDimension)
      metricConditions.push(...firstMetrics)
    }
  }

  // 检查是否有指标条件
  if (metricConditions.length === 0) {
    throw new Error('无法生成有效的指标条件，请检查维度配置')
  }

  // 构造请求参数
  const requestParams: RequestParams = {
    selectColumnCondition: options.selectColumnCondition || {},
    condition: {
      conditionList: (receivedData.filterConditions?.conditionList ?? []) as any,
      andOr: (receivedData.filterConditions?.andOr ?? '0') as '0' | '1'
    },
    sort: options.sort ?? null,
    metricColumn: options.metricColumn || [],
    metricCondition: metricConditions,
    statisticColumn: options.statisticColumn || receivedData.dataMetrics?.map(metric => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: options.majorCondition || ''
  }

  return requestParams
}

/**
 * 请求后端的人才统计数据
 * @param receivedData 接收到的数据
 * @param options 转换配置选项
 * @returns Promise<any>
 */
const fetchTalentStatisticData = async (
  receivedData: DimensionIndicatorsFilter,
  options: ConvertOptions = {}
) => {
  try {
    // 使用交叉组合转换数据
    const requestParams = convertDataToCrossMetricConditions(receivedData, options)

    // 调用后端接口
    const response = await advancedStatisticRequest(
      config.value.url,
      new Map(Object.entries(requestParams.selectColumnCondition || {})),
      requestParams.condition,
      requestParams.sort,
      requestParams.metricColumn,
      requestParams.metricCondition,
      requestParams.statisticColumn,
      requestParams.majorCondition
    )

    return response
  } catch (error) {
    throw error
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

<style lang="less" scoped>
@import '../../styles/talentReview.less';
</style>