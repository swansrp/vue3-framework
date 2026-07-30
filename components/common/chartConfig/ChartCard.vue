<template>
  <a-dropdown
    :trigger="['contextmenu']"
    placement="bottomLeft"
  >
    <div
      :class="{ 'chart-card-loading': loading }"
      class="chart-card"
      @mousedown="handleMouseDown"
    >
      <!-- 卡片头部 -->
      <div class="chart-card-header">
        <div class="header-title">
          <h3>{{ indicator.title || '未命名指标' }}</h3>
          <span
            v-if="indicator.subTitle"
            class="subtitle"
          >{{ indicator.subTitle }}</span>
        </div>
        <div class="header-actions">
          <a-tooltip title="导出Excel">
            <DownloadOutlined
              :class="{ 'action-icon-disabled': chartLoading }"
              @click="handleExportExcel"
            />
          </a-tooltip>
          <!-- 同比环比：年份数量/月份/口径（展示态 echarts UI 配置，不持久化；纯年份列仅年份数量） -->
          <a-dropdown
            v-if="isComparisonCard"
            :trigger="['click']"
          >
            <a-tooltip :title="comparisonTooltip">
              <CalendarOutlined class="action-icon action-icon-active" />
            </a-tooltip>
            <template #overlay>
              <div
                style="background: var(--component-background, #fff); padding: 12px; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); display: flex; flex-direction: column; gap: 8px;"
                @mousedown.stop
              >
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                  <span style="font-size: 12px;">年份数量</span>
                  <a-select
                    v-model:value="comparisonYearCount"
                    size="small"
                    style="width: 84px"
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
                </div>
                <template v-if="!isYearOnlyComparison">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <span style="font-size: 12px;">月份</span>
                    <a-select
                      v-model:value="comparisonMonth"
                      size="small"
                      style="width: 84px"
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
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <span style="font-size: 12px;">口径</span>
                    <a-select
                      v-model:value="comparisonScope"
                      size="small"
                      style="width: 84px"
                      @change="onComparisonOptionChange"
                    >
                      <a-select-option value="ytd">
                        年累计
                      </a-select-option>
                      <a-select-option value="single">
                        单月
                      </a-select-option>
                    </a-select>
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <span style="font-size: 12px;">环比</span>
                    <a-switch
                      v-model:checked="comparisonShowMom"
                      size="small"
                      @change="onComparisonOptionChange"
                    />
                  </div>
                </template>
              </div>
            </template>
          </a-dropdown>
          <!-- 隐藏为 0 的数据 -->
          <a-tooltip :title="hideZeroData ? '不隐藏为0的数据' : '隐藏为0的数据'">
            <FilterOutlined
              :class="['action-icon', { 'action-icon-active': hideZeroData }]"
              @click="hideZeroData = !hideZeroData"
            />
          </a-tooltip>
          <!-- 按数值升/降序 -->
          <a-dropdown :trigger="['click']">
            <a-tooltip :title="sortOrder === 'none' ? '默认顺序' : (sortOrder === 'asc' ? '已升序（点击切换）' : '已降序（点击切换）')">
              <SortAscendingOutlined
                v-if="sortOrder !== 'desc'"
                :class="['action-icon', { 'action-icon-active': sortOrder !== 'none' }]"
              />
              <SortDescendingOutlined
                v-else
                :class="['action-icon', { 'action-icon-active': true }]"
              />
            </a-tooltip>
            <template #overlay>
              <a-menu @click="(info: any) => handleSortMenuClick(String(info.key))">
                <a-menu-item key="none">
                  默认顺序
                </a-menu-item>
                <a-menu-item key="asc">
                  升序（从小到大）
                </a-menu-item>
                <a-menu-item key="desc">
                  降序（从大到小）
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <!-- 刷新 -->
          <a-tooltip title="刷新">
            <ReloadOutlined
              :class="['action-icon', { 'action-icon-disabled': chartLoading }]"
              @click="refreshChart"
            />
          </a-tooltip>
          <template v-if="canEdit">
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
                  <a-menu-item
                    v-if="canDrag"
                    key="moveTop"
                    @click="moveCard('top')"
                  >
                    <VerticalAlignTopOutlined />
                    移到最前
                  </a-menu-item>
                  <a-menu-item
                    v-if="canDrag"
                    key="moveBottom"
                    @click="moveCard('bottom')"
                  >
                    <VerticalAlignBottomOutlined />
                    移到最后
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
          </template>
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
            :data-metrics="renderDataMetrics"
            :categories="chartCategories || []"
            :chart-type="chartType || 'bar'"
            :dimension-value-map="dimensionValueMap || { first: {}, second: {} }"
            :loading="chartLoading"
            :title="''"
            :subtitle="''"
            :sort-order="sortOrder"
            :hide-zero-data="hideZeroData"
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

        <!-- 描述信息 -->
        <div
          v-if="indicator.description"
          ref="descriptionRef"
          class="chart-description"
        >
          <InfoCircleOutlined class="description-icon" />
          <Marquee
            v-if="descriptionWidth > 0"
            :content="indicator.description"
            :width="descriptionWidth"
            :duration="15"
            :delay="2"
            :font-size="1.2"
            class="description-text"
          />
          <span
            v-else
            class="description-text-static"
          >{{ indicator.description }}</span>
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
    <template #overlay>
      <a-menu @click="handleContextMenuClick">
        <a-menu-item
          v-if="canDrag"
          key="moveTop"
        >
          <VerticalAlignTopOutlined />
          移到最前
        </a-menu-item>
        <a-menu-item
          v-if="canDrag"
          key="moveBottom"
        >
          <VerticalAlignBottomOutlined />
          移到最后
        </a-menu-item>
        <a-menu-divider v-if="canDrag" />
        <a-menu-item key="refresh">
          <ReloadOutlined />
          刷新
        </a-menu-item>
        <a-menu-item
          v-if="canEdit"
          key="edit"
        >
          <EditOutlined />
          编辑
        </a-menu-item>
        <a-menu-item
          v-if="canDelete"
          key="delete"
        >
          <DeleteOutlined />
          删除
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, defineAsyncComponent } from 'vue'

import { debounce } from './debounce'
import type { DashboardItem } from './types'

import { getPortalConfig } from '@/framework/apis/portal/config'
import UniversalChart from '@/framework/components/common/chart/UniversalChart.vue'
import {
  buildChartCategories,
  buildComparisonRenderMetrics,
  buildDimensionValueMap,
  buildDrillConditionFromCache,
  buildDrillConditionFromRanking,
  buildSelectedBarInfo,
  COMPARISON_SERIES,
  fetchStatisticData,
  filterChartDataByVisibility,
  filterZeroData,
  getChartType,
  getDefaultComparisonOptions,
  hasValidChartConfig,
  parseBarClickParams,
  parsePieClickParams,
  sortChartData
} from '@/framework/components/common/chart/utils/chartDataHelper'
import { exportChartToExcel } from '@/framework/components/common/chart/utils/chartExport'
import { fetchTreeDict, flattenTreeToParentGroups } from '@/framework/components/common/chart/utils/treeStacked'
import Marquee from '@/framework/components/common/marquee/index.vue'
import type { SelectedBarInfo } from '@/framework/components/common/Portal/dashboard/type/ChartTypes'

// 异步导入DashboardDetail组件
const DashboardDetail = defineAsyncComponent(() =>
  import('@/framework/components/common/Portal/dashboard/indicator/dashboard/DashboardDetail.vue')
)
import { message } from 'ant-design-vue'
import { BarChartOutlined, CalendarOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EllipsisOutlined, FilterOutlined, InfoCircleOutlined, ReloadOutlined, SortAscendingOutlined, SortDescendingOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons-vue'


interface Props {
  indicator: DashboardItem;
  loading: boolean;
  gridUnitWidth: number;
  gridUnitHeight: number;
  gridColumns: number;
  canEdit?: boolean; // 是否可以编辑
  canDelete?: boolean; // 是否可以删除
  canResize?: boolean; // 是否可以调整大小
  canDrag?: boolean; // 是否可以拖动(含移到最前/移到最后)
  portalConfig?: any; // 外部传入的 Portal 配置，避免重复请求
}

interface Emits {
  (e: 'edit'): void;

  (e: 'delete'): void;

  (e: 'resize', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'resize-preview', indicatorId: string, xGrid: number, yGrid: number): void;

  (e: 'move-card', id: string, position: 'top' | 'bottom'): void;

  (e: 'card-drop', event: DragEvent): void;
}

const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<Props>(), {
  indicator: () => ({}) as DashboardItem,
  loading: false,
  gridUnitWidth: 0,
  gridUnitHeight: 120,
  gridColumns: 12,
  canEdit: true,
  canDelete: true,
  canResize: true,
  canDrag: true,
  portalConfig: undefined
})

// 组件引用
const chartRef = ref()
const descriptionRef = ref<HTMLElement>()

// 描述区域实际宽度（响应式）
const descriptionContainerWidth = ref(0)

// 计算描述文本可用宽度（减去图标和间距）
const descriptionWidth = computed(() => {
  if (descriptionContainerWidth.value === 0) return 0
  const iconWidth = 20 // 图标宽度(14px) + gap(6px)
  const padding = 32 // 左右 padding 各 16px
  return descriptionContainerWidth.value - iconWidth - padding
})

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
// 树形堆叠：实时从树结构构建的「父节点名->值」「叶子名->值」映射，用于颜色查找与维度编码
const treeParentValueMap = ref<Record<string, string>>({})
const treeLeafValueMap = ref<Record<string, string>>({})
const portalConfigs = ref<any>(null)
// 缓存最近一次 statistic 请求体，供穿透条件复用
let lastStatisticBody: any = null

// 数据展示控制开关（本地内存态，不持久化）
const hideZeroData = ref(false)
const sortOrder = ref<'none' | 'asc' | 'desc'>('none')

// 同比环比展示态配置（echarts UI 配置，不持久化，默认当前年月+年累计口径，环比默认关闭）
const defaultComparisonOptions = getDefaultComparisonOptions()
const comparisonYearCount = ref(defaultComparisonOptions.yearCount)
const comparisonMonth = ref(defaultComparisonOptions.month)
const comparisonScope = ref<'single' | 'ytd'>(defaultComparisonOptions.scope)
const comparisonShowMom = ref(defaultComparisonOptions.showMom)
const comparisonYearCountOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10]

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
const hasValidConfig = computed(() => hasValidChartConfig(indicatorConfig.value))

// 是否为同比环比卡片
const isComparisonCard = computed(() =>
  (indicatorConfig.value?.dataMetrics || []).some((m: any) => m.chartType === 'comparisonBar')
)

// 纯年份列（dateFormat=YYYY）：无月份概念，隐藏月份/口径控件，无环比线
const isYearOnlyComparison = computed(() =>
  indicatorConfig.value?.dataMetrics?.[0]?.dateFormat === 'YYYY'
)

// 同比环比设置图标悬浮提示
const comparisonTooltip = computed(() => {
  if (isYearOnlyComparison.value) return `同比环比：近${comparisonYearCount.value}年`
  const scopeLabel = comparisonScope.value === 'single' ? '单月' : '年累计'
  const momLabel = comparisonShowMom.value ? ' · 环比' : ''
  return `同比环比：近${comparisonYearCount.value}年 · ${comparisonMonth.value}月 · ${scopeLabel}${momLabel}`
})

// 渲染用数据指标：同比环比模式合成「统计值 bar + 同比/环比 ptLine」系列（环比随开关）
const renderDataMetrics = computed(() => {
  if (isComparisonCard.value) {
    return buildComparisonRenderMetrics(indicatorConfig.value, comparisonShowMom.value)
  }
  return indicatorConfig.value?.dataMetrics || []
})

// 同比环比展示态配置变更：重新取数
const onComparisonOptionChange = () => {
  loadChartData()
}

// 获取tableId
const tableId = computed(() => {
  return props.indicator.config?.tableId || ''
})

// 安全的图表数据，确保类型正确，并叠加"隐藏为0"与排序开关
const safeChartData = computed(() => {
  let result: any[] = Array.isArray(chartData.value) ? chartData.value.map(i => ({ ...i })) : []
  // 同比环比：仅按保存的统计系列可见性过滤（周期桶随展示态动态生成，不按保存的一级维度过滤）；
  // 环比为卡片级开关（不落库），开启时强制并入可见列表，避免被保存的可见性滤掉
  if (isComparisonCard.value) {
    let visibleStats: string[] = indicatorConfig.value?.visibleStatisticTypes || []
    if (comparisonShowMom.value && visibleStats.length > 0 && !visibleStats.includes(COMPARISON_SERIES.MOM)) {
      visibleStats = [...visibleStats, COMPARISON_SERIES.MOM]
    }
    result = filterChartDataByVisibility(result, [], [], visibleStats)
  }
  if (hideZeroData.value) {
    result = filterZeroData(result)
  }
  if (sortOrder.value === 'asc' || sortOrder.value === 'desc') {
    result = sortChartData(result, sortOrder.value)
  }
  return result
})

// 图表类型
const chartType = computed(() => getChartType(indicatorConfig.value))

// 图表分类（x轴）
const chartCategories = computed(() => {
  const configuredOrder =
    indicatorConfig.value?.firstDimension?.indicatorItems?.map((i: any) => i.itemName) || []
  const sortApplied = sortOrder.value === 'asc' || sortOrder.value === 'desc'
  return buildChartCategories(safeChartData.value, configuredOrder, undefined, sortApplied)
})

// 维度值映射
const dimensionValueMap = computed(() => {
  if (!indicatorConfig.value) return { first: {}, second: {} }
  const base = buildDimensionValueMap(indicatorConfig.value)
  // 树形堆叠：存储配置中一/二级维度为 null，用实时树结构补充映射，保证颜色按叶子值正确查找
  const isTreeStacked = !!indicatorConfig.value.treeDimension &&
    indicatorConfig.value.dataMetrics?.some((m: any) => m.chartType === 'treeStackedBar')
  if (isTreeStacked) {
    return {
      first: { ...base.first, ...treeParentValueMap.value },
      second: { ...base.second, ...treeLeafValueMap.value }
    }
  }
  return base
})

// 加载Portal配置
const loadPortalConfig = async () => {
  // 如果外部已传入 portalConfig，直接使用
  if (props.portalConfig) {
    portalConfigs.value = props.portalConfig
    return
  }

  // 否则自行拉取
  try {
    const tableId = props.indicator.config?.tableId
    if (!tableId) {
      console.warn('缺少tableId，无法加载Portal配置')
      return
    }

    const response = await getPortalConfig(tableId)
    portalConfigs.value = response.payload
    portalConfigs.value.tableId = tableId
  } catch (error) {
    console.error('加载Portal配置失败:', error)
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
    if (!portalConfigs.value) {
      await loadPortalConfig()
    }

    if (!portalConfigs.value) {
      console.warn('Portal配置未加载，跳过图表数据加载')
      return
    }

    // 调用共享取数逻辑（自动判断 metricsPie / treeStacked / comparison / 默认分支，
    // 并将可见性烤进请求）
    const { requestParams, response } = await fetchStatisticData(
      portalConfigs.value.url,
      indicatorConfig.value,
      isComparisonCard.value
        ? { comparison: { yearCount: comparisonYearCount.value, month: comparisonMonth.value, scope: comparisonScope.value, showMom: comparisonShowMom.value } }
        : undefined
    )

    // 树形堆叠：实时构建父节点/叶子「名->值」映射，供颜色查找与维度编码（存储配置中维度为 null）
    const cfg = indicatorConfig.value
    const isTreeStacked = !!cfg?.treeDimension &&
      cfg.dataMetrics?.some((m: any) => m.chartType === 'treeStackedBar')
    if (isTreeStacked && cfg?.treeDimension) {
      try {
        const tree = await fetchTreeDict(cfg.treeDimension.dictName)
        const parentGroups = flattenTreeToParentGroups(tree)
        const parentMap: Record<string, string> = {}
        const leafMap: Record<string, string> = {}
        parentGroups.forEach(g => {
          parentMap[g.parentLabel] = g.parentValue
          g.children.forEach(c => { leafMap[c.label] = c.value })
        })
        treeParentValueMap.value = parentMap
        treeLeafValueMap.value = leafMap
      } catch (e) {
        // 树结构拉取失败时保留旧映射，避免颜色完全失效
      }
    }

    // 缓存 statistic 请求体，供点击穿透时复用 buildDrillConditionFromCache
    const isRanking = indicatorConfig.value?.dataMetrics?.some((m: any) => m.chartType === 'rankingBar')
    lastStatisticBody = {
      ...requestParams,
      metricCondition: requestParams.metricCondition || [],
      // metricColumn 配置（用于 dictMap 反查）：
      // 排行榜直接用 requestParams.metricColumn（已含 groupByField + dictMap）；
      // 其余模式从 firstDimension 补齐
      metricColumn: isRanking
        ? requestParams.metricColumn
        : (indicatorConfig.value?.firstDimension?.indicatorItems?.map((it: any) => ({
          column: indicatorConfig.value?.firstDimension?.groupValue,
          dictMap: it.dictMap
        })) || [])
    }

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

// 防抖后的图表数据加载函数
const debouncedLoadChartData = debounce(() => {
  if (!isDestroyed.value && isInitialized) {
    loadChartData()
  }
}, 300) // 300ms 防抖延迟

// 仅监听图表配置内容(配置字符串 + tableId)变化才重新加载数据
// 坐标/尺寸(xPosition/yPosition/xGrid/yGrid)变化不触发,避免拖拽排序时图表不停 loading 导致闪烁
watch(
  [
    () => props.indicator.config?.indicator,
    () => props.indicator.config?.tableId
  ],
  () => {
    debouncedLoadChartData()
  }
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

// 移到最前/移到最后
const moveCard = (position: 'top' | 'bottom') => {
  emit('move-card', props.indicator.id, position)
}

// 排序菜单点击分发
const handleSortMenuClick = (key: string) => {
  if (key === 'none' || key === 'asc' || key === 'desc') {
    sortOrder.value = key
  }
}

// 右键菜单点击分发
const handleContextMenuClick = (info: { key: string | number }) => {
  switch (String(info.key)) {
    case 'moveTop':
      moveCard('top')
      break
    case 'moveBottom':
      moveCard('bottom')
      break
    case 'refresh':
      refreshChart()
      break
    case 'edit':
      emit('edit')
      break
    case 'delete':
      emit('delete')
      break
  }
}

// ================== 导出 Excel 逻辑 ===================
// 排序开启时传 useDataOrder=true，让导出 Excel 的列顺序与图表显示一致
// （否则 chartExport 会按 config.indicatorItems 配置顺序重排，覆盖前端排序结果）
const handleExportExcel = () =>
  exportChartToExcel(
    safeChartData.value,
    indicatorConfig.value,
    props.indicator.title || '图表数据',
    chartLoading.value,
    sortOrder.value !== 'none'
  )

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
  if (chartType.value === 'comparisonBar') {
    onComparisonBarClick(params)
  } else if (chartType.value === 'rankingBar') {
    onRankingBarClick(params)
  } else if (chartType.value === 'bar' || chartType.value === 'line' || chartType.value === 'ptLine') {
    onBarClick(params)
  } else if (chartType.value === 'pie') {
    onPieClick(params)
  } else if (chartType.value === 'metricsPie') {
    onMetricsPieClick(params)
  }
}

// 点击同比环比柱子/折线点事件处理
// 周期桶 label='YYYY-MM' 与归一化后的 metricLabel 一致，可直接按 conditionLabel 匹配穿透
const onComparisonBarClick = (params: any) => {
  const periodLabel = params.name // X 轴周期显示名（YYYY-MM）
  if (!periodLabel) return

  const combinedConditions = buildDrillConditionFromCache(lastStatisticBody, periodLabel, '')
  if (!combinedConditions) {
    console.warn('无法构建同比环比穿透条件')
    return
  }

  const groupName = indicatorConfig.value?.dataMetrics?.[0]?.dateFieldLabel || '统计周期'
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
  const item = safeChartData.value.find((d: any) => d.metricLabel === displayName)
  const rawMetric = item ? (item as any).metric : displayName
  const groupByField = indicatorConfig.value?.dataMetrics?.[0]?.groupByField || ''

  const combinedConditions = buildDrillConditionFromRanking(lastStatisticBody, groupByField, rawMetric)
  if (!combinedConditions) {
    console.warn('无法构建排行榜穿透条件')
    return
  }

  const groupName = indicatorConfig.value?.dataMetrics?.[0]?.groupByLabel || '分组'
  const statType = params.seriesName

  selectedBarInfo.value = buildSelectedBarInfo(
    displayName, null, groupName, null,
    statType, [displayName], combinedConditions, false
  )

  detailModalVisible.value = true
}

// 点击指标饼图事件处理
// 扇区=数据指标字段，点击后除全局筛选外，还需限定“该字段值 > 0”作为筛选
const onMetricsPieClick = (params: any) => {
  const clickedMetricName = params.name

  let clickedDataField: string | undefined = params?.data?.dataField
  if (!clickedDataField && clickedMetricName) {
    const matchedMetric = indicatorConfig.value?.dataMetrics?.find(
      (m: any) => m.dataName === clickedMetricName
    )
    clickedDataField = matchedMetric?.dataField
  }

  if (!clickedMetricName) {
    console.warn('指标饼图点击：无法获取扇区名称')
    return
  }

  if (!lastStatisticBody) {
    console.warn('指标饼图点击：缓存 statistic 请求体为空')
    return
  }

  // 构建穿透条件：复用全局筛选条件（空 conditionLabel = 不匹配维度条件）
  const combinedConditions = buildDrillConditionFromCache(lastStatisticBody, '', '')

  if (!combinedConditions) {
    console.warn('指标饼图点击：无法构建组合条件')
    return
  }

  // 指标饼图特有：追加“当前点击字段值 > 0”的筛选条件
  if (clickedDataField) {
    combinedConditions.conditionList.push({
      property: clickedDataField,
      relation: 3, // GREATER (大于)
      value: [0],
      conditionList: []
    } as any)
  } else {
    console.warn('指标饼图点击：未找到点击指标对应的 dataField，跳过追加筛选条件')
  }

  selectedBarInfo.value = {
    firstDimension: clickedMetricName,
    secondDimension: null,
    firstDimensionName: '数据指标',
    secondDimensionName: null,
    statisticType: clickedMetricName,
    statisticData: [clickedMetricName],
    combinedConditions: combinedConditions,
    title: `数据指标: ${clickedMetricName}`,
    color: '#1890ff'
  }

  detailModalVisible.value = true
}

// 点击柱状图/折线图事件处理
const onBarClick = (params: any) => {
  const { firstDim, secondDim, statType } = parseBarClickParams(params, hasSecondDimension.value)

  const combinedConditions = buildDrillConditionFromCache(lastStatisticBody, firstDim, secondDim)
  if (!combinedConditions) {
    console.warn('无法构建查询条件')
    return
  }

  const statisticData = hasSecondDimension.value && secondDim ? [secondDim] : [firstDim]

  selectedBarInfo.value = buildSelectedBarInfo(
    firstDim,
    secondDim,
    firstDimensionName.value,
    secondDimensionName.value,
    statType,
    statisticData,
    combinedConditions,
    hasSecondDimension.value
  )

  detailModalVisible.value = true
}

// 点击饼图事件处理
const onPieClick = (params: any) => {
  const { firstDim, secondDim, statType, pieSegmentName } = parsePieClickParams(params, hasSecondDimension.value)

  if (hasSecondDimension.value && pieSegmentName.includes('&&')) {
    if (!firstDim || !secondDim) {
      console.warn('饼图点击：无法解析第二维度信息:', { pieSegmentName })
      return
    }
  } else {
    if (!firstDim) {
      console.warn('饼图点击：无法解析第一维度信息:', { pieSegmentName })
      return
    }
  }

  const combinedConditions = buildDrillConditionFromCache(lastStatisticBody, firstDim, secondDim)
  if (!combinedConditions) {
    console.warn('饼图点击：无法构建组合条件')
    return
  }

  const statisticData = hasSecondDimension.value && secondDim ? [secondDim] : [firstDim]

  selectedBarInfo.value = buildSelectedBarInfo(
    firstDim,
    secondDim,
    firstDimensionName.value,
    secondDimensionName.value,
    statType,
    statisticData,
    combinedConditions,
    hasSecondDimension.value
  )

  detailModalVisible.value = true
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
    
    // 设置 ResizeObserver 监听描述区域宽度变化
    if (descriptionRef.value) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          descriptionContainerWidth.value = entry.contentRect.width
        }
      })
      resizeObserver.observe(descriptionRef.value)
      
      // 保存 observer 以便清理
      ;(descriptionRef.value as any)._resizeObserver = resizeObserver
    }
  } catch (error) {
    console.error('ChartCard初始化失败:', error)
  }
})

// 组件卸载前清理
onBeforeUnmount(() => {
  isDestroyed.value = true
  chartData.value = []
  portalConfigs.value = null
  // 清理防抖定时器
  debouncedLoadChartData.cancel()
  
  // 清理 ResizeObserver
  if (descriptionRef.value && (descriptionRef.value as any)._resizeObserver) {
    (descriptionRef.value as any)._resizeObserver.disconnect()
    delete (descriptionRef.value as any)._resizeObserver
  }
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
    align-items: flex-start;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    cursor: move; // 只在标题区域显示移动光标
    min-height: 50px;
    
    // 当有副标题时,设置header高度为65px
    &:has(.subtitle) {
      min-height: 65px;
      ~ .chart-card-content {
        --header-height: 65px;
      }
    }

    .header-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #262626;
        line-height: 1.4;
        word-break: break-word;
      }
      
      .subtitle {
        font-size: 12px;
        color: #8c8c8c;
        font-style: italic;
        line-height: 1.5;
        word-break: break-word;
        display: block;
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

      .action-icon-disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      // 激活态高亮（隐藏为0/排序开关启用时）
      .action-icon-active {
        color: #1890ff;
        background: #e6f7ff;
      }
    }
  }

  .chart-card-content {
    padding: 0;
    height: calc(100% - var(--header-height, 50px));
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .chart-description {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #f6f8fa;
      border-bottom: 1px solid #e8e8e8;
      flex-shrink: 0;
      height: 28px;
      overflow: hidden;

      .description-icon {
        font-size: 14px;
        color: #1890ff;
        flex-shrink: 0;
        line-height: 1;
      }

      .description-text,
      .description-text-static {
        flex: 1;
        font-size: 12px;
        color: #595959;
        line-height: 16px;
        min-width: 0;
        height: 16px;
        
        :deep(.marquee-text),
        :deep(.marquee),
        :deep(.marquee-content) {
          font-size: 12px;
          color: #595959;
          line-height: 16px;
          height: 16px;
        }
        
        :deep(.marquee) {
          height: 16px;
          line-height: 16px;
          width: 100%;
        }
      }
      
      .description-text-static {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .chart-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
    }

    .chart-container {
      flex: 1;
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