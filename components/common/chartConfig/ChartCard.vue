<template>
  <div
    :class="{ 'chart-card-loading': loading }"
    class="chart-card"
    @mousedown="handleMouseDown"
  >
    <!-- 卡片头部 -->
    <div class="chart-card-header">
      <div class="header-title">
        <h3>{{ indicator.title || '未命名指标' }}</h3>
      </div>
      <div
        v-if="canEdit"
        class="header-actions"
      >
        <a-tooltip title="编辑">
          <EditOutlined @click="$emit('edit')" />
        </a-tooltip>
        <a-dropdown :trigger="['click']">
          <a-tooltip title="更多操作">
            <EllipsisOutlined />
          </a-tooltip>
          <template #overlay>
            <a-menu>
              <a-menu-item
                key="refresh"
                @click="refreshChart"
              >
                <ReloadOutlined />
                刷新
              </a-menu-item>
              <!-- <a-menu-item key="rename" @click="renameChart">
                <EditOutlined />
                重命名
              </a-menu-item> -->
              <a-menu-divider v-if="canDelete" />
              <a-menu-item
                v-if="canDelete"
                key="delete"
                @click="$emit('delete')"
              >
                <DeleteOutlined />
                删除
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="chart-card-content">
      <div
        v-if="loading"
        class="chart-loading"
      >
        <a-spin />
      </div>
      <div
        v-else-if="hasValidConfig && safeChartData.length > 0"
        class="chart-container"
      >
        <!-- 直接使用 UniversalChart 组件渲染图表 -->
        <UniversalChart
          v-if="isInitialized && !isDestroyed"
          ref="chartRef"
          :data="safeChartData"
          :data-metrics="indicatorConfig?.dataMetrics || []"
          :categories="chartCategories || []"
          :chart-type="chartType || 'bar'"
          :dimension-value-map="dimensionValueMap || { first: {}, second: {} }"
          :loading="chartLoading"
          :title="''"
          :subtitle="''"
          height="100%"
          @click="handleChartClick"
        />
      </div>
      <div
        v-else
        class="chart-empty"
      >
        <BarChartOutlined class="empty-icon" />
        <p>{{ hasValidConfig ? '暂无数据' : '未配置图表' }}</p>
      </div>

      <!-- 蓝色虚线框 - 拖拽放置区域 -->
      <div
        :class="{ visible: showDropZone }"
        class="drop-zone"
        @dragover.prevent="handleDragOver"
        @drop.prevent="handleDrop"
      >
        <div class="drop-zone-content">
          <div class="drop-zone-indicator"></div>
          <!--          <div class="drop-zone-text">拖拽到此处放置</div>-->
        </div>
      </div>
    </div>

    <!-- 调整大小的拖拽手柄 -->
    <div
      v-if="canResize"
      class="resize-handle right"
      @mousedown="startResize('right', $event)"
    ></div>
    <div
      v-if="canResize"
      class="resize-handle bottom"
      @mousedown="startResize('bottom', $event)"
    ></div>
    <div
      v-if="canResize"
      class="resize-handle corner"
      @mousedown="startResize('corner', $event)"
    ></div>

    <!-- 图表详情弹窗 -->
    <DashboardDetail
      v-model:open="detailModalVisible"
      :selected-bar-info="selectedBarInfo"
      :table-id="tableId"
      @close="closeDetailModal"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, defineAsyncComponent } from 'vue'

import type { DashboardItem } from './types'

import UniversalChart from '@/framework/components/common/Portal/dashboard/indicator/dashboard/UniversalChart.vue'
import type { SelectedBarInfo } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

// 异步导入DashboardDetail组件
const DashboardDetail = defineAsyncComponent(() =>
  import('@/framework/components/common/Portal/dashboard/indicator/dashboard/DashboardDetail.vue')
)
import { message } from 'ant-design-vue'
import { BarChartOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, ReloadOutlined } from '@ant-design/icons-vue'

import { advancedStatisticRequest } from '@/framework/apis'
import { getPortalConfig } from '@/framework/apis/portal/config'

interface Props {
  indicator: DashboardItem;
  loading: boolean;
  gridUnitWidth: number;
  gridUnitHeight: number;
  gridColumns: number;
  canEdit?: boolean; // 是否可以编辑
  canDelete?: boolean; // 是否可以删除
  canResize?: boolean; // 是否可以调整大小
}

interface Emits {
  (e: 'edit'): void;

  (e: 'delete'): void;

  (e: 'resize', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'resize-preview', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'card-drop', event: DragEvent): void;
}

const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<Props>(), {
  indicator: () => ({}) as DashboardItem,
  loading: false,
  gridUnitWidth: 0,
  gridUnitHeight: 120,
  gridColumns: 5,
  canEdit: true,
  canDelete: true,
  canResize: true
})

// 组件引用
const chartRef = ref()

// 组件状态管理
const isDestroyed = ref(false)

// 拖拽状态（简化版）

// 调整大小状态
const isResizing = ref(false)
const resizeDirection = ref<'right' | 'bottom' | 'corner'>('right')
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(1)
const startHeight = ref(1)
const lastXGrid = ref(1)
const lastYGrid = ref(1)

// 拖拽放置区域状态
const showDropZone = ref(false)

// 图表相关状态
const chartLoading = ref(false)
const chartData = ref<any[]>([])
const portalConfig = ref<any>(null)

// 弹窗相关状态
const detailModalVisible = ref(false)
const selectedBarInfo = ref<SelectedBarInfo | null>(null)

// 避免在组件初始化时立即触发loadChartData
let isInitialized = false

// 解析保存的指标配置
const indicatorConfig = computed(() => {
  try {
    if (!props.indicator.config || !props.indicator.config.indicator) {
      return null
    }
    const configStr = props.indicator.config.indicator
    return typeof configStr === 'string' ? JSON.parse(configStr) : configStr
  } catch (error) {
    console.error('解析指标配置失败:', error)
    return null
  }
})

// 判断是否有有效配置
const hasValidConfig = computed(() => {
  return indicatorConfig.value &&
    indicatorConfig.value.firstDimension &&
    indicatorConfig.value.dataMetrics &&
    indicatorConfig.value.dataMetrics.length > 0
})

// 获取tableId
const tableId = computed(() => {
  return props.indicator.config?.tableId || ''
})

// 安全的图表数据，确保类型正确
const safeChartData = computed(() => {
  return Array.isArray(chartData.value) ? chartData.value : []
})

// 图表类型
const chartType = computed(() => {
  const firstMetric = indicatorConfig.value?.dataMetrics?.[0]
  return firstMetric?.chartType || 'bar'
})

// 图表分类（x轴）
const chartCategories = computed(() => {
  if (!chartData.value.length) return []
  // 从数据中提取第一维度值作为分类
  return [...new Set(chartData.value.map((item: any) => item.metricLabel.split('&&')[0]))]
})

// 图表副标题
computed(() => {
  const config = indicatorConfig.value
  if (!config) return ''

  const firstDim = config.firstDimension?.groupName || '第一维度'
  const secondDim = config.secondDimension?.groupName

  return secondDim
    ? `按${firstDim}、${secondDim}和统计指标分组`
    : `按${firstDim}和统计指标分组`
})

// 维度值映射
const dimensionValueMap = computed(() => {
  const config = indicatorConfig.value
  if (!config) return { first: {}, second: {} }

  const first: Record<string, string> = {}
  const second: Record<string, string> = {}

  config.firstDimension?.indicatorItems?.forEach((item: any) => {
    first[item.itemName] = String(item.itemValue)
  })

  config.secondDimension?.indicatorItems?.forEach((item: any) => {
    second[item.itemName] = String(item.itemValue)
  })

  return { first, second }
})

// 加载Portal配置
const loadPortalConfig = async () => {
  try {
    const tableId = props.indicator.config?.tableId
    if (!tableId) {
      console.warn('缺少tableId，无法加载Portal配置')
      return
    }

    const response = await getPortalConfig(tableId)
    portalConfig.value = response.payload
    portalConfig.value.tableId = tableId
  } catch (error) {
    console.error('加载Portal配置失败:', error)
  }
}

// 将指标配置转换为API请求参数
const convertToRequestParams = (config: any) => {
  if (!config || !portalConfig.value) return null

  const metricConditions: any[] = []

  // 处理一级维度
  if (config.firstDimension?.indicatorItems) {
    // 获取可见的一级维度列表（如果有的话）
    const visibleFirstDims = config.visibleFirstDimensions || []
    // 过滤出可见的一级维度项
    const firstItems = visibleFirstDims.length > 0
      ? config.firstDimension.indicatorItems.filter((item: any) =>
        visibleFirstDims.includes(item.itemName)
      )
      : config.firstDimension.indicatorItems

    if (config.secondDimension?.indicatorItems) {
      // 获取可见的二级维度列表（如果有的话）
      const visibleSecondDims = config.visibleSecondDimensions || []
      // 过滤出可见的二级维度项
      const secondItems = visibleSecondDims.length > 0
        ? config.secondDimension.indicatorItems.filter((item: any) =>
          visibleSecondDims.includes(item.itemName)
        )
        : config.secondDimension.indicatorItems

      // 有二级维度，进行交叉组合
      firstItems.forEach((firstItem: any) => {
        secondItems.forEach((secondItem: any) => {
          metricConditions.push({
            value: `${config.firstDimension.groupValue}&&${firstItem.itemValue}&&${config.secondDimension.groupValue}&&${secondItem.itemValue}`,
            label: `${firstItem.itemName}&&${secondItem.itemName}`,
            condition: {
              andOr: '0',
              conditionList: [
                ...(firstItem.queryConditions?.conditionList || []),
                ...(secondItem.queryConditions?.conditionList || [])
              ]
            }
          })
        })
      })
    } else {
      // 只有一级维度
      firstItems.forEach((item: any) => {
        metricConditions.push({
          value: `${config.firstDimension.groupValue}&&${item.itemValue}`,
          label: item.itemName,
          condition: item.queryConditions
        })
      })
    }
  }

  // 获取可见的统计指标列表（如果有的话）
  const visibleStatisticTypes = config.visibleStatisticTypes || []
  // 过滤出可见的数据指标
  const visibleDataMetrics = visibleStatisticTypes.length > 0
    ? config.dataMetrics?.filter((metric: any) =>
      visibleStatisticTypes.includes(metric.dataName)
    )
    : config.dataMetrics

  return {
    selectColumnCondition: {},
    condition: {
      conditionList: config.filterConditions?.conditionList || [],
      andOr: config.filterConditions?.andOr || '0'
    },
    sort: null,
    metricColumn: [],
    metricCondition: metricConditions,
    statisticColumn: visibleDataMetrics?.map((metric: any) => ({
      value: metric.dataField,
      label: metric.dataName
    })) || [],
    majorCondition: ''
  }
}

// 加载图表数据
const loadChartData = async () => {
  if (!hasValidConfig.value || isDestroyed.value) {
    chartData.value = []
    return
  }

  try {
    chartLoading.value = true

    // 确保Portal配置已加载
    if (!portalConfig.value) {
      await loadPortalConfig()
    }

    if (!portalConfig.value) {
      console.warn('Portal配置未加载，跳过图表数据加载')
      return
    }

    const requestParams = convertToRequestParams(indicatorConfig.value)
    if (!requestParams) {
      console.warn('无法构建请求参数')
      return
    }

    // 调用统计API获取数据
    const response = await advancedStatisticRequest(
      portalConfig.value.url,
      new Map(Object.entries(requestParams.selectColumnCondition || {})),
      requestParams.condition,
      requestParams.sort,
      requestParams.metricColumn,
      requestParams.metricCondition,
      requestParams.statisticColumn,
      requestParams.majorCondition
    )

    if (response && response.payload && !isDestroyed.value) {
      chartData.value = response.payload
    } else {
      chartData.value = []
    }
  } catch (error) {
    console.error('加载图表数据失败:', error)
    if (!isDestroyed.value) {
      chartData.value = []
      message.error('加载图表数据失败')
    }
  } finally {
    if (!isDestroyed.value) {
      chartLoading.value = false
    }
  }
}

// 防抖函数，避免频繁请求
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  const debounced = (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }
  return debounced
}

// 防抖后的图表数据加载函数
const debouncedLoadChartData = debounce(() => {
  if (!isDestroyed.value && isInitialized) {
    loadChartData()
  }
}, 300) // 300ms 防抖延迟

// 监听配置变化
watch(
  () => props.indicator,
  () => {
    debouncedLoadChartData()
  },
  { deep: true }
)

// 刷新图表
const refreshChart = async () => {
  await loadChartData()
  message.success('图表已刷新')
}

// 强制刷新图表（不显示提示消息，用于外部调用）
const forceRefresh = async () => {
  await loadChartData()
}

// 重命名图表
// const renameChart = () => {
//   // 实现重命名逻辑
//   message.info('重命名功能待实现')
// }

// 获取维度信息的计算属性
const firstDimensionName = computed(() => {
  return indicatorConfig.value?.firstDimension?.groupName || '第一维度'
})

const secondDimensionName = computed(() => {
  return indicatorConfig.value?.secondDimension?.groupName || '第二维度'
})

// 是否存在第二维度
const hasSecondDimension = computed(() => {
  const items = indicatorConfig.value?.secondDimension?.indicatorItems
  return Array.isArray(items) && items.length > 0
})

// 图表点击事件处理
const handleChartClick = (params: any) => {
  // 根据图表类型处理点击事件
  if (chartType.value === 'bar' || chartType.value === 'line') {
    onBarClick(params)
  } else if (chartType.value === 'pie') {
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


  if (!combinedConditions) {
    console.warn('无法构建查询条件')
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
      : `${firstDimensionName.value}: ${firstDim} (${statType})`,
    color: '#1890ff' // 默认颜色
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
      console.warn('饼图点击：无法解析第二维度信息:', { pieSegmentName })
      return
    }
  } else {
    // 没有第二维度时，名称就是第一维度
    firstDim = pieSegmentName
    secondDim = ''
    if (!firstDim) {
      console.warn('饼图点击：无法解析第一维度信息:', { pieSegmentName })
      return
    }
  }

  // 获取组合条件
  const combinedConditions = hasSecondDimension.value && secondDim
    ? buildCombinedConditions(firstDim, secondDim)
    : buildFirstDimensionConditions(firstDim)

  if (!combinedConditions) {
    console.warn('饼图点击：无法构建组合条件')
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
      : `${firstDimensionName.value}: ${firstDim} (${statType})`,
    color: '#1890ff' // 默认颜色
  }

  // 显示弹窗
  detailModalVisible.value = true
}

/**
 * 构建只有第一维度的查询条件
 */
const buildFirstDimensionConditions = (firstDim: string) => {
  if (!indicatorConfig.value) {
    console.warn('indicatorConfig 未定义')
    return null
  }

  // 查找第一维度条件
  const firstDimItem = indicatorConfig.value.firstDimension?.indicatorItems.find((item: any) => item.itemName === firstDim)

  if (!firstDimItem) {
    console.warn('未找到第一维度条件:', { firstDim })
    return null
  }

  return {
    andOr: firstDimItem.queryConditions.andOr || '0',
    conditionList: [...firstDimItem.queryConditions.conditionList],
    // 附加信息：原始条件
    firstDimensionCondition: firstDimItem.queryConditions,
    secondDimensionCondition: null,
    // 附加信息：维度标识
    firstDimensionId: `${indicatorConfig.value.firstDimension!.groupValue}&&${firstDimItem.itemValue}`,
    secondDimensionId: null
  }
}

/**
 * 构建第一维度和第二维度的组合查询条件
 */
const buildCombinedConditions = (firstDim: string, secondDim: string) => {
  if (!indicatorConfig.value) {
    console.warn('indicatorConfig 未定义')
    return null
  }

  // 查找第一维度条件
  const firstDimItem = indicatorConfig.value.firstDimension?.indicatorItems.find((item: any) => item.itemName === firstDim)

  if (!firstDimItem) {
    console.warn('未找到第一维度条件:', { firstDim })
    return null
  }

  // 查找第二维度条件（如果存在第二维度）
  const secondDimItem = hasSecondDimension.value
    ? indicatorConfig.value.secondDimension?.indicatorItems.find((item: any) => item.itemName === secondDim)
    : null

  // 如果有第二维度但找不到对应条件，则报错
  if (hasSecondDimension.value && !secondDimItem) {
    console.warn('未找到第二维度条件:', { secondDim })
    return null
  }

  // 合并查询条件：如果有第二维度则合并，否则只使用第一维度
  const combinedConditionList = secondDimItem
    ? [
      ...firstDimItem.queryConditions.conditionList,
      ...secondDimItem.queryConditions.conditionList
    ]
    : [...firstDimItem.queryConditions.conditionList]

  return {
    andOr: '0', // 使用 AND 连接
    conditionList: combinedConditionList,
    // 附加信息：原始条件
    firstDimensionCondition: firstDimItem.queryConditions,
    secondDimensionCondition: secondDimItem?.queryConditions || null,
    // 附加信息：维度标识
    firstDimensionId: `${indicatorConfig.value.firstDimension!.groupValue}&&${firstDimItem.itemValue}`,
    secondDimensionId: secondDimItem ? `${indicatorConfig.value.secondDimension!.groupValue}&&${secondDimItem.itemValue}` : null
  }
}

// 关闭详情弹窗
const closeDetailModal = () => {
  detailModalVisible.value = false
  selectedBarInfo.value = null
}

// 处理鼠标按下事件（简化版）
const handleMouseDown = (event: MouseEvent) => {
  // 如果点击的是操作按钮或调整大小手柄，阻止事件传播给ChartGrid
  const target = event.target as HTMLElement
  if (target.closest('.header-actions') || target.closest('.resize-handle')) {
    event.stopPropagation()
    return
  }

  // 其他情况让事件正常传播给ChartGrid处理拖拽
}

// 开始调整大小
const startResize = (direction: 'right' | 'bottom' | 'corner', event: MouseEvent) => {
  isResizing.value = true
  resizeDirection.value = direction
  startX.value = event.clientX
  startY.value = event.clientY
  startWidth.value = props.indicator.xGrid || 1
  startHeight.value = props.indicator.yGrid || 1
  lastXGrid.value = startWidth.value
  lastYGrid.value = startHeight.value

  // 显示拖拽放置区域
  showDropZone.value = true

  // 添加全局事件监听器
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)

  event.preventDefault()
}

// 调整大小中
const onResize = (event: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = event.clientX - startX.value
  const deltaY = event.clientY - startY.value

  // 基于实际传入的网格单位计算（仅记录，不立刻提交保存）
  const unitW = props.gridUnitWidth || 1
  const unitH = props.gridUnitHeight || 120
  let newXGrid = startWidth.value
  let newYGrid = startHeight.value

  if (resizeDirection.value === 'right' || resizeDirection.value === 'corner') {
    newXGrid = Math.max(1, Math.min(props.gridColumns, startWidth.value + Math.round(deltaX / unitW)))
  }

  if (resizeDirection.value === 'bottom' || resizeDirection.value === 'corner') {
    newYGrid = Math.max(1, startHeight.value + Math.round(deltaY / unitH))
  }

  // 仅记录，最终在 stopResize 时一次性提交
  lastXGrid.value = newXGrid
  lastYGrid.value = newYGrid
  // 实时预览更新大小（不触发保存）
  emit('resize-preview', props.indicator.id, lastXGrid.value, lastYGrid.value)

  event.preventDefault()
}

// 停止调整大小
const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = 'right'

  // 隐藏拖拽放置区域
  showDropZone.value = false

  // 移除全局事件监听器
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)

  // 在鼠标松开时一次性提交保存
  emit('resize', props.indicator.id, lastXGrid.value, lastYGrid.value)
}

// 处理拖拽悬停事件
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  // 可以在这里添加视觉反馈
}

// 处理放置事件
const handleDrop = (event: DragEvent) => {
  // 隐藏拖拽放置区域
  showDropZone.value = false

  // 发送放置事件给父组件
  emit('card-drop', event)
}

// 显示拖拽放置区域的方法（可以由父组件调用）
const showDropArea = () => {
  showDropZone.value = true
}

// 隐藏拖拽放置区域的方法（可以由父组件调用）
const hideDropArea = () => {
  showDropZone.value = false
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    await loadPortalConfig()
    isInitialized = true
    await loadChartData()
  } catch (error) {
    console.error('ChartCard初始化失败:', error)
  }
})

// 组件卸载前清理
onBeforeUnmount(() => {
  isDestroyed.value = true
  chartData.value = []
  portalConfig.value = null
  // 清理防抖定时器
  debouncedLoadChartData.cancel()
})

// 暴露方法给父组件使用
defineExpose({
  showDropArea,
  hideDropArea,
  forceRefresh
})
</script>

<style lang="less" scoped>
.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #d9d9d9;
  }

  &.chart-card-loading {
    opacity: 0.7;
  }

  .chart-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    cursor: move; // 只在标题区域显示移动光标

    .header-title {
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #262626;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;

      .anticon {
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        color: #666;
        transition: all 0.3s;

        &:hover {
          background: #f0f0f0;
          color: #1890ff;
        }
      }
    }
  }

  .chart-card-content {
    padding: 0;
    height: calc(100% - 50px);
    position: relative;

    .chart-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .chart-container {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;

      // 为图表设置适合卡片的样式
      :deep(.universal-chart-container) {
        --chart-min-height: 100%;
        --chart-min-height-sm: 100%;
        height: 100%;
        flex: 1;
        min-height: 0; // 允许收缩
        margin: 0;
        padding: 0; // 移除所有内边距，让图表占满整个可用空间
        box-shadow: none; // 移除多余阴影
        border-radius: 0; // 卡片内部不需要圆角
        background: transparent; // 使用卡片背景

        .echarts-container {
          height: 100% !important;
          min-height: 100% !important;
          flex: 1;
        }

        .ant-spin-nested-loading {
          height: 100%;
          min-height: 100%;

          .ant-spin-container {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
        }

        // 隐藏标题，使用卡片标题
        .chart-title {
          display: none;
        }
      }
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #bfbfbf;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    // 拖拽放置区域
    .drop-zone {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      border: 2px dashed #1890ff;
      border-radius: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
        pointer-events: all;
      }

      .drop-zone-content {
        text-align: center;
        color: #1890ff;

        .drop-zone-indicator {
          width: 40px;
          height: 40px;
          margin: 0 auto 10px;
          border: 2px dashed #1890ff;
          border-radius: 50%;
          position: relative;

          &::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            background: #1890ff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
          }
        }

        .drop-zone-text {
          font-size: 16px;
          font-weight: 500;
        }
      }
    }
  }

  // 调整大小手柄
  .resize-handle {
    position: absolute;
    background: #1890ff;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 10;

    &.right {
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      cursor: col-resize;
    }

    &.bottom {
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      cursor: row-resize;
    }

    &.corner {
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      cursor: nwse-resize;
      background: #1890ff;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M14,18H12V16H14V18M10,22H8V20H10V22M10,18H8V16H10V18M6,22H4V20H6V22M6,18H4V16H6V18M2,22H0V20H2V22M2,18H0V16H2V18Z'/%3E%3C/svg%3E") no-repeat center;
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M14,18H12V16H14V18M10,22H8V20H10V22M10,18H8V16H10V18M6,22H4V20H6V22M6,18H4V16H6V18M2,22H0V20H2V22M2,18H0V16H2V18Z'/%3E%3C/svg%3E") no-repeat center;
    }

    // 只有当鼠标悬停在手柄上时才显示
    &:hover {
      opacity: 1;
    }
  }

}
</style>