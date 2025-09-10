<template>
  <div class="chart-panel">
    <!-- 维度控制面板 -->
    <div v-if="chartData.length > 0" class="dimension-controls">
      <!-- 第一维度控制 -->
      <div class="control-item">
        <span class="control-label">显示{{ firstDimensionName }}：</span>
        <a-checkbox-group v-model:value="visibleFirstDimensions" @change="onFirstDimensionChange">
          <a-checkbox v-for="dimension in allFirstDimensions" :key="dimension" :value="dimension">
            {{ dimension }}
          </a-checkbox>
        </a-checkbox-group>
        <a-button size="small" type="link" @click="toggleAllFirstDimensions">
          全部选中
        </a-button>
        <a-button size="small" type="link" @click="invertFirstDimensionsSelection">
          反选
        </a-button>
      </div>

      <!-- 第二维度控制 -->
      <div class="control-item">
        <span class="control-label">显示{{ secondDimensionName }}：</span>
        <a-checkbox-group v-model:value="visibleSecondDimensions" @change="onSecondDimensionChange">
          <a-checkbox v-for="dimension in allSecondDimensions" :key="dimension" :value="dimension">
            {{ dimension }}
          </a-checkbox>
        </a-checkbox-group>
        <a-button size="small" type="link" @click="toggleAllSecondDimensions">
          全部选中
        </a-button>
        <a-button size="small" type="link" @click="invertSecondDimensionsSelection">
          反选
        </a-button>
      </div>

      <!-- 统计指标控制 -->
      <div class="control-item">
        <span class="control-label">显示统计指标：</span>
        <a-checkbox-group v-model:value="visibleStatisticTypes" @change="onStatisticTypeChange">
          <a-checkbox v-for="statType in allStatisticTypes" :key="statType" :value="statType">
            {{ statType }}
          </a-checkbox>
        </a-checkbox-group>
        <a-button size="small" type="link" @click="toggleAllStatisticTypes">
          全部选中
        </a-button>
        <a-button size="small" type="link" @click="invertStatisticTypesSelection">
          反选
        </a-button>
      </div>
    </div>

    <div class="chart-container">
      <!-- 当有数据时显示图表 -->
      <UniversalChart
        v-if="chartData && chartData.length > 0 && receivedData" :categories="chartCategories"
        :chartType="autoChartType" :data="filteredChartData" :dataMetrics="receivedData.dataMetrics || []"
        :dimensionValueMap="dimensionValueMap" :loading="loading" :subtitle="chartSubtitle" :title="chartTitle"
        height="100%" @click="handleChartClick" />

      <!-- 当没有数据时显示占位符 -->
      <div v-else class="chart-placeholder">
        <div class="placeholder-content">
          <BarChartOutlined class="placeholder-icon" />
          <p>配置维度后点击"生成图表"按钮</p>
        </div>
      </div>
    </div>

    <!-- 数据详情弹窗组件 -->
    <!-- <talentReviewDetail v-model:open="detailModalVisible" :selected-bar-info="selectedBarInfo"
      @close="closeDetailModal" />
  </div> -->
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { BarChartOutlined } from '@ant-design/icons-vue'
import {
  ConvertOptions,
  DimensionIndicatorsFilter,
  IndicatorGroup,
  MetricCondition,
  RequestParams
} from "@/framework/components/common/Portal/dashboard/type/AdvancedStatisticReq"
import { advancedStatisticRequest } from '@/framework/apis'
import type { SelectedBarInfo } from './talentReviewDetail.vue'
import UniversalChart from './UniversalChart.vue'
import type { ChartDataItem } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

// Props - 接收外部传入的维度配置数据
const props = defineProps<{
  config: any,
  receivedData?: DimensionIndicatorsFilter
}>()
const { config, receivedData } = toRefs(props)
// Emits
const emit = defineEmits<{
  chartGenerated: [data: ChartDataItem[]]
}>()

// 响应式数据
const loading = ref(false)
const chartData = ref<ChartDataItem[]>([])

// 维度显示控制
const visibleFirstDimensions = ref<string[]>([])
const allFirstDimensions = ref<string[]>([])
const visibleSecondDimensions = ref<string[]>([])
const allSecondDimensions = ref<string[]>([])
const visibleStatisticTypes = ref<string[]>([])
const allStatisticTypes = ref<string[]>([])

// 弹窗相关
const detailModalVisible = ref(false)
const selectedBarInfo = ref<SelectedBarInfo | null>(null)

// 计算属性
const chartTitle = computed(() => {
  return '数据分布统计'
})

const chartSubtitle = computed(() => {
  return `按${ firstDimensionName.value }、${ secondDimensionName.value }和统计类型分组`
})

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

// 动态从 dataMetrics 中获取图表类型
const autoChartType = computed(() => {
  // 从 dataMetrics 中获取第一个配置的 chartType
  const firstMetric = receivedData.value?.dataMetrics?.[0]
  return firstMetric?.chartType || 'bar'
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

// 图表点击事件处理
const handleChartClick = (params: any) => {
  console.log('图表点击事件:', params)

  // 根据图表类型处理点击事件
  if (autoChartType.value === 'bar' || autoChartType.value === 'line') {
    onBarClick(params)
  } else if (autoChartType.value === 'pie') {
    onPieClick(params)
  }
}

// 点击柱状图/折线图事件处理
const onBarClick = (params: any) => {
  console.log('点击柱状图参数:', params)

  // 获取点击的系列名称（格式："第二维度&&统计类型"）
  const seriesName = params.seriesName
  const [secondDim] = seriesName.split('&&')
  const firstDim = params.name // x轴的值（第一维度）

  // 获取组合条件
  const combinedConditions = buildCombinedConditions(firstDim, secondDim)

  // 设置选中的柱状图信息
  selectedBarInfo.value = {
    firstDimension: firstDim,
    secondDimension: secondDim,
    firstDimensionName: firstDimensionName.value,
    secondDimensionName: secondDimensionName.value,
    combinedConditions: combinedConditions,
    title: `${ firstDimensionName.value }: ${ firstDim } && ${ secondDimensionName.value }: ${ secondDim }`
  }

  // 显示弹窗
  detailModalVisible.value = true
}

// 点击饼图事件处理
const onPieClick = (params: any) => {
  console.log('点击饼图参数:', params)

  // 饼图的数据结构现在包含完整的维度信息
  const pieSegmentName = params.name // 饼图段的名称，格式："第一维度&&第二维度"

  // 解析维度信息
  const parts = pieSegmentName.split('&&')
  const firstDim = parts[0] || ''
  const secondDim = parts[1] || ''

  if (!firstDim || !secondDim) {
    console.warn('饼图点击：无法解析维度信息:', { pieSegmentName })
    return
  }

  // 获取组合条件
  const combinedConditions = buildCombinedConditions(firstDim, secondDim)

  if (!combinedConditions) {
    console.warn('饼图点击：无法构建组合条件')
    return
  }

  // 设置选中的饼图信息
  selectedBarInfo.value = {
    firstDimension: firstDim,
    secondDimension: secondDim,
    firstDimensionName: firstDimensionName.value,
    secondDimensionName: secondDimensionName.value,
    combinedConditions: combinedConditions,
    title: `${ firstDimensionName.value }: ${ firstDim } && ${ secondDimensionName.value }: ${ secondDim }`
  }

  // 显示弹窗
  detailModalVisible.value = true
}

/**
 * 构建第一维度和第二维度的组合查询条件
 */
const buildCombinedConditions = (firstDim: string, secondDim: string) => {
  if (!receivedData.value) {
    console.warn('receivedData 未定义')
    return null
  }

  // 查找第一维度条件
  const firstDimItem = receivedData.value.firstDimension?.indicatorItems.find((item: any) => item.itemName === firstDim)
  // 查找第二维度条件
  const secondDimItem = receivedData.value.secondDimension?.indicatorItems.find((item: any) => item.itemName === secondDim)

  if (!firstDimItem || !secondDimItem) {
    console.warn('未找到对应的维度条件:', { firstDim, secondDim })
    return null
  }

  // 合并两个维度的查询条件
  const combinedConditionList = [
    ...firstDimItem.queryConditions.conditionList,
    ...secondDimItem.queryConditions.conditionList
  ]

  return {
    andOr: "0", // 使用 AND 连接
    conditionList: combinedConditionList,
    // 附加信息：原始条件
    firstDimensionCondition: firstDimItem.queryConditions,
    secondDimensionCondition: secondDimItem.queryConditions,
    // 附加信息：维度标识
    firstDimensionId: `${ receivedData.value.firstDimension!.groupValue }&&${ firstDimItem.itemValue }`,
    secondDimensionId: `${ receivedData.value.secondDimension!.groupValue }&&${ secondDimItem.itemValue }`
  }
}

// 更新维度数据的函数
const updateDimensionData = (data: ChartDataItem[]) => {
  // 以配置顺序为主，回退到数据中的顺序
  const configFirst = receivedData.value?.firstDimension?.indicatorItems?.map(i => i.itemName) || []
  const dataFirst = [...new Set(data.map((item: any) => item.metricLabel.split('&&')[0]))]
  const firstDimensionGroups = configFirst.length ? configFirst : dataFirst

  const configSecond = receivedData.value?.secondDimension?.indicatorItems?.map(i => i.itemName) || []
  const dataSecond = [...new Set(data.map((item: any) => item.metricLabel.split('&&')[1]))]
  const secondDimensionGroups = configSecond.length ? configSecond : dataSecond

  // 提取统计类型
  const statisticTypes = [...new Set(data.flatMap((item: any) => item.children.map((child: any) => child.metric)))]

  // 每次重新生成图表时都刷新三组维度的“所有项”和“可见项”，避免旧选择造成过滤为空
  allFirstDimensions.value = [...firstDimensionGroups]
  visibleFirstDimensions.value = [...firstDimensionGroups]

  allSecondDimensions.value = [...secondDimensionGroups]
  visibleSecondDimensions.value = [...secondDimensionGroups]

  allStatisticTypes.value = [...statisticTypes]
  visibleStatisticTypes.value = [...statisticTypes]
}

// 关闭详情弹窗（保留以备后续使用）
// const closeDetailModal = () => {
//   detailModalVisible.value = false
//   selectedBarInfo.value = null
// }

// 第一维度控制
const onFirstDimensionChange = () => {
  console.log('第一维度改变:', visibleFirstDimensions.value)
}

const toggleAllFirstDimensions = () => {
  visibleFirstDimensions.value = [...allFirstDimensions.value]
}

// 第一维度反选功能
const invertFirstDimensionsSelection = () => {
  const invertedSelection = allFirstDimensions.value.filter(
      dimension => !visibleFirstDimensions.value.includes(dimension)
  )
  visibleFirstDimensions.value = invertedSelection
}

// 第二维度控制
const onSecondDimensionChange = () => {
  console.log('第二维度改变:', visibleSecondDimensions.value)
}

const toggleAllSecondDimensions = () => {
  visibleSecondDimensions.value = [...allSecondDimensions.value]
}

// 第二维度反选功能
const invertSecondDimensionsSelection = () => {
  const invertedSelection = allSecondDimensions.value.filter(
      dimension => !visibleSecondDimensions.value.includes(dimension)
  )
  visibleSecondDimensions.value = invertedSelection
}

// 统计类型控制
const onStatisticTypeChange = () => {
  console.log('统计类型改变:', visibleStatisticTypes.value)
}

const toggleAllStatisticTypes = () => {
  visibleStatisticTypes.value = [...allStatisticTypes.value]
}

// 统计类型反选功能
const invertStatisticTypesSelection = () => {
  const invertedSelection = allStatisticTypes.value.filter(
      statType => !visibleStatisticTypes.value.includes(statType)
  )
  visibleStatisticTypes.value = invertedSelection
}

// 获取图表数据
const fetchChartData = async () => {
  console.log('开始执行fetchChartData，当前receivedData:', receivedData.value);
  console.log('当前props.receivedData:', props.receivedData);

  if (!receivedData.value) {
    console.warn('receivedData 未定义，无法获取图表数据');
    message.error('数据配置不完整，请重新配置维度信息');
    return;
  }

  // 检查一级维度是否存在
  if (!receivedData.value.firstDimension) {
    console.warn('一级维度未配置');
    message.error('一级维度未配置，请先选择一级维度');
    return;
  }

  console.log('数据校验通过，开始加载状态');
  loading.value = true;

  try {
    console.log('开始获取图表数据，receivedData:', receivedData.value);

    // 预清理，避免上一次筛选残留对本次过滤造成影响
    chartData.value = []
    visibleFirstDimensions.value = []
    visibleSecondDimensions.value = []
    visibleStatisticTypes.value = []

    // 调用真实的API获取数据（增加防缓存标识）
    const result = await fetchTalentStatisticData(receivedData.value, {});

    console.log('API返回结果:', result);

    if (result && result.payload) {
      chartData.value = result.payload;
      console.log('成功获取图表数据:', result.payload);

      // 更新维度数据
      updateDimensionData(result.payload);

      // 触发图表生成事件
      emit('chartGenerated', result.payload);
    } else {
      console.warn('API返回数据为空或格式不正确:', result);
      message.warning('暂无数据，请检查筛选条件或数据源');
      chartData.value = [];
    }
  } catch (error: any) {
    console.error('获取图表数据失败:', error);
    message.error(`获取图表数据失败: ${ error?.message || '未知错误' }`);
    chartData.value = [];
  } finally {
    loading.value = false;
    console.log('加载状态结束');
  }
}

/**
 * 将维度组转换为指标条件
 * @param dimension 维度组数据
 * @returns MetricCondition[]
 */
const convertDimensionToMetricCondition = (dimension: IndicatorGroup): MetricCondition[] => {

  console.log('convertDimensionToMetricCondition=========', dimension)


  return dimension.indicatorItems.map(item => ({
    value: `${ dimension.groupValue }&&${ item.itemValue }`, // 生成唯一标识
    label: item.itemName,
    condition: {
      andOr: (item.queryConditions.andOr) as '0' | '1',
      conditionList: ([...item.queryConditions.conditionList]) as any
    }
  }))
}

/**
 * 将接收到的数据交叉组合两个维度的条件后转换为后端需要的格式（用于柱状图等数据可视化）
 * @param receivedData 接收到的数据
 * @param options 转换配置选项
 * @returns RequestParams
 */
const convertDataToCrossMetricConditions = (
    receivedData: DimensionIndicatorsFilter,
    options: ConvertOptions = {}
): RequestParams => {
  const metricConditions: MetricCondition[] = []

  // 检查一级维度是否存在
  if (!receivedData.firstDimension || !receivedData.firstDimension.indicatorItems || receivedData.firstDimension.indicatorItems.length === 0) {
    console.error('一级维度数据不完整:', receivedData.firstDimension);
    throw new Error('一级维度数据不完整，无法生成图表');
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
          value: `${ receivedData.firstDimension!.groupValue }&&${ firstItem.itemValue }&&${ receivedData.secondDimension!.groupValue }&&${ secondItem.itemValue }`,
          label: `${ firstItem.itemName }&&${ secondItem.itemName }`,
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
      console.log('==========firstMetrics', firstMetrics)
      metricConditions.push(...firstMetrics)
    }
  }

  // 检查是否有指标条件
  if (metricConditions.length === 0) {
    console.error('无法生成有效的指标条件');
    throw new Error('无法生成有效的指标条件，请检查维度配置');
  }

  console.log('生成的指标条件:', metricConditions);

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

    console.log('后端返回的数据:', response)

    return response
  } catch (error) {
    console.error('请求人才统计数据失败:', error)
    throw error
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
  }
})
</script>

<style lang="less" scoped>
@import '../../styles/talentReview.less';
</style>