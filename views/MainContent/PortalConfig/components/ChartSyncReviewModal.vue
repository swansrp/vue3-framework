<template>
  <a-modal
    v-model:open="_visible"
    :title="`同步图表配置 - ${scanResult?.tableId || ''}`"
    width="900px"
    :footer="null"
    destroy-on-close
  >
    <div class="sync-review-modal">
      <!-- 统计信息 -->
      <div class="sync-summary">
        <span v-if="!scanResult">正在扫描...</span>
        <span v-else-if="scanResult.changed === 0">
          所有 {{ scanResult.total }} 个图表的配置已是最新，无需同步。
        </span>
        <span v-else>
          共 {{ scanResult.total }} 个图表，其中 <strong>{{ scanResult.changed }}</strong> 个有变更，{{ selectedCount }}/{{ scanResult.changed }} 个已勾选
        </span>
      </div>

      <!-- 批量操作按钮 -->
      <div
        v-if="scanResult && scanResult.changed > 0"
        class="sync-actions"
      >
        <a-checkbox
          :checked="allSelected"
          :indeterminate="indeterminate"
          @change="toggleSelectAll"
        >
          全选
        </a-checkbox>
        <a-button
          size="small"
          :disabled="!scanResult || scanResult.changed === 0"
          @click="invertSelection"
        >
          反选
        </a-button>
        <a-button
          type="primary"
          :disabled="selectedIds.length === 0"
          :loading="applying"
          @click="applySelected"
        >
          应用选中 ({{ selectedCount }})
        </a-button>
      </div>

      <!-- 图表变更列表 -->
      <div
        v-if="scanResult"
        class="chart-list"
      >
        <div
          v-for="chart in scanResult.charts"
          :key="chart.id"
          class="chart-card"
          :class="{ 'has-changes': chart.hasChanges }"
        >
          <!-- 表头：checkbox + 图表名称 + 状态 -->
          <div class="chart-header">
            <a-checkbox
              v-if="chart.hasChanges"
              :checked="selectedIds.includes(chart.id)"
              @change="toggleChart(chart.id)"
            />
            <span class="chart-title">{{ chart.title }}</span>
            <span
              v-if="!chart.hasChanges"
              class="status-badge status-ok"
            >已是最新</span>
            <span
              v-else
              class="status-badge status-changed"
            >有变更</span>
            <a-button
              v-if="getChartViewData(chart.id)"
              type="link"
              size="small"
              @click="toggleExpanded(chart.id)"
            >
              {{ expandedCharts[chart.id] ? '收起' : '查看配置' }}
            </a-button>
          </div>

          <!-- 有变更：使用可交互的维度控制组件 -->
          <template v-if="chart.hasChanges && getChartState(chart.id)">
            <div class="dimension-section">
              <!-- 一级维度 -->
              <div
                v-if="chart.firstDimension && getChartState(chart.id).firstAll.length > 0"
                class="dimension-group"
              >
                <div class="dimension-title">
                  第一维度：{{ chart.firstDimension.groupName }}
                </div>
                <DimensionControl
                  v-if="getChartState(chart.id)"
                  v-model:visible-dimensions="getChartState(chart.id).firstVisible"
                  v-model:all-dimensions="getChartState(chart.id).firstAll"
                />
              </div>

              <!-- 二级维度 -->
              <div
                v-if="chart.secondDimension && getChartState(chart.id).secondAll.length > 0"
                class="dimension-group"
              >
                <div class="dimension-title">
                  第二维度：{{ chart.secondDimension.groupName }}
                </div>
                <DimensionControl
                  v-if="getChartState(chart.id)"
                  v-model:visible-dimensions="getChartState(chart.id).secondVisible"
                  v-model:all-dimensions="getChartState(chart.id).secondAll"
                />
              </div>
            </div>
          </template>

          <!-- 已是最新：展开后只读展示当前配置 -->
          <template v-if="!chart.hasChanges && expandedCharts[chart.id] && getChartViewData(chart.id)">
            <div class="dimension-section">
              <div
                v-if="getChartViewData(chart.id).firstDimension"
                class="dimension-group"
              >
                <div class="dimension-title">
                  第一维度：{{ getChartViewData(chart.id).firstDimension.groupName }}
                </div>
                <div class="dimension-tags">
                  <a-tag
                    v-for="item in getChartViewData(chart.id).firstDimension.items"
                    :key="item.label"
                    :color="item.visible ? 'blue' : undefined"
                  >
                    {{ item.label }}
                    <span
                      v-if="!item.visible"
                      class="hidden-label"
                    >(隐藏)</span>
                  </a-tag>
                </div>
              </div>

              <div
                v-if="getChartViewData(chart.id).secondDimension"
                class="dimension-group"
              >
                <div class="dimension-title">
                  第二维度：{{ getChartViewData(chart.id).secondDimension.groupName }}
                </div>
                <div class="dimension-tags">
                  <a-tag
                    v-for="item in getChartViewData(chart.id).secondDimension.items"
                    :key="item.label"
                    :color="item.visible ? 'blue' : undefined"
                  >
                    {{ item.label }}
                    <span
                      v-if="!item.visible"
                      class="hidden-label"
                    >(隐藏)</span>
                  </a-tag>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="scanResult && scanResult.total === 0"
        class="empty-state"
      >
        当前 tableId 下没有图表配置
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'

import type { ScanResult, GroupDiff } from '../utils/syncAllChartIndicators'
import { updateCommonStatistic, updatePersonalStatistic } from '@/framework/components/common/chartConfig/api'
import DimensionControl from '@/framework/components/common/Portal/dashboard/indicator/dashboard/control/DimensionControl.vue'

interface DimState {
  firstVisible: string[]
  firstAll: string[]
  secondVisible: string[]
  secondAll: string[]
  nameToValue: Record<string, string>
  /** displayName → originalName 映射，用于带标记的显示名恢复为原名 */
  displayToOriginal: Record<string, string>
}

/** 只读视图：已是最新图表展开后展示的维度数据结构 */
interface ViewDimData {
  groupName: string
  items: Array<{ label: string; visible: boolean }>
}

interface ChartViewData {
  firstDimension?: ViewDimData
  secondDimension?: ViewDimData
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    scanResult: ScanResult | null
    treeData: any[]
  }>(),
  {}
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'applied', updatedCount: number): void
}>()

const _visible = ref(props.visible)
watch(() => props.visible, (val) => { _visible.value = val })
watch(() => _visible.value, (val) => { emit('update:visible', val) })

function handleCancel() {
  _visible.value = false
}

function invertSelection() {
  if (!props.scanResult) return
  const changedIds = props.scanResult.charts
    .filter(c => c.hasChanges)
    .map(c => c.id)
  const currentSet = new Set(selectedIds.value)
  selectedIds.value = changedIds.filter(id => !currentSet.has(id))
}

// ── 展开/收起状态 ──
const expandedCharts = reactive<Record<string, boolean>>({})

function toggleExpanded(chartId: string) {
  expandedCharts[chartId] = !expandedCharts[chartId]
}

// ── 已是最新图表的只读视图数据 ──
const chartViewData = reactive<Record<string, ChartViewData>>({})

function getChartViewData(chartId: string): ChartViewData {
  if (!chartViewData[chartId]) {
    chartViewData[chartId] = {}
  }
  return chartViewData[chartId]!
}

// ── 每个图表的维度交互状态 ──
const chartDimensionStates = reactive<Record<string, DimState>>({})

function getChartState(chartId: string): DimState {
  // 确保始终返回有效对象（不存在时自动初始化）
  if (!chartDimensionStates[chartId]) {
    chartDimensionStates[chartId] = {
      firstVisible: [], firstAll: [],
      secondVisible: [], secondAll: [],
      nameToValue: {},
      displayToOriginal: {}
    }
  }
  return chartDimensionStates[chartId]!
}

// 当 scanResult 变化时初始化维度状态
watch(() => props.scanResult, (result) => {
  if (!result) {
    // 清空状态
    Object.keys(chartDimensionStates).forEach(k => delete chartDimensionStates[k])
    return
  }

  for (const chart of result.charts) {
    const nameToValue: Record<string, string> = {}
    const state: DimState = {
      firstVisible: [],
      firstAll: [],
      secondVisible: [],
      secondAll: [],
      nameToValue,
      displayToOriginal: {}
    }

    // 解析原始 indicator 获取完整的已保存项（含已删除的 value）
    let parsedIndicator: any = null
    try {
      parsedIndicator = typeof chart.indicator === 'string'
        ? JSON.parse(chart.indicator)
        : chart.indicator
    } catch { /* ignore */ }

    function initDimension(
      dimGroup: GroupDiff | undefined,
      allKey: 'firstAll' | 'secondAll',
      visibleKey: 'firstVisible' | 'secondVisible'
    ) {
      if (!dimGroup) return

      const changes = dimGroup.changes || []

      // 从原始配置 + mergedItems 构建完整的 name→value 映射
      const dimKey = allKey === 'firstAll' ? 'firstDimension' : 'secondDimension'
      const savedItems = parsedIndicator?.[dimKey]?.indicatorItems
      if (savedItems) {
        for (const item of savedItems) {
          nameToValue[item.itemName] = String(item.itemValue)
        }
      }
      for (const item of dimGroup.mergedItems) {
        nameToValue[item.itemName] = item.itemValue
      }

      // 变更类型映射：label → type
      const changeTypeMap = new Map<string, string>(
        changes.filter(c => c.type !== 'reordered').map(c => [c.label, c.type])
      )
      // 可见项集合（来自 reconcileVisibleDimensions 的计算结果）
      const visibleSet = new Set(dimGroup.visibleItems.map(i => i.itemName))

      // 显示全部 mergedItems，对有变更的项加标记
      for (const item of dimGroup.mergedItems) {
        const changeType = changeTypeMap.get(item.itemName)
        const prefix = changeType === 'added' ? '[新增] ' : changeType === 'removed' ? '[删除] ' : ''
        const displayName = prefix + item.itemName
        state.displayToOriginal[displayName] = item.itemName
        state[allKey].push(displayName)
        if (visibleSet.has(item.itemName)) {
          state[visibleKey].push(displayName)
        }
      }

      // 补充不在 mergedItems 中的已删除项（原配置有但树中已删）
      for (const change of changes) {
        if (change.type === 'removed' && !dimGroup.mergedItems.some(i => i.itemName === change.label)) {
          const displayName = '[删除] ' + change.label
          state.displayToOriginal[displayName] = change.label
          state[allKey].push(displayName)
          // 已删除项默认不勾选
        }
      }
    }

    initDimension(chart.firstDimension, 'firstAll', 'firstVisible')
    initDimension(chart.secondDimension, 'secondAll', 'secondVisible')

    chartDimensionStates[chart.id] = state

    // ── 填充只读视图数据（所有图表，含已是最新） ──
    const viewData: ChartViewData = {}
    let ind: any = null
    try {
      ind = typeof chart.indicator === 'string' ? JSON.parse(chart.indicator) : chart.indicator
    } catch { /* ignore */ }
    if (ind) {
      if (ind.firstDimension) {
        const allNames = (ind.firstDimension.indicatorItems || []).map((i: any) => i.itemName)
        const visible = new Set(ind.visibleFirstDimensions || allNames)
        viewData.firstDimension = {
          groupName: ind.firstDimension.groupName,
          items: allNames.map((name: string) => ({ label: name, visible: visible.has(name) }))
        }
      }
      if (ind.secondDimension) {
        const allNames = (ind.secondDimension.indicatorItems || []).map((i: any) => i.itemName)
        const visible = new Set(ind.visibleSecondDimensions || allNames)
        viewData.secondDimension = {
          groupName: ind.secondDimension.groupName,
          items: allNames.map((name: string) => ({ label: name, visible: visible.has(name) }))
        }
      }
    }
    chartViewData[chart.id] = viewData
  }

  // 重置选中
  selectedIds.value = result.charts
    .filter(c => c.hasChanges)
    .map(c => c.id)
})

// 选中状态
const selectedIds = ref<string[]>([])
const applying = ref(false)

const selectedCount = computed(() => selectedIds.value.length)
const allSelected = computed(() => {
  if (!props.scanResult) return false
  const changed = props.scanResult.charts.filter(c => c.hasChanges)
  return changed.length > 0 && selectedIds.value.length === changed.length
})
const indeterminate = computed(() => {
  if (!props.scanResult) return false
  const changed = props.scanResult.charts.filter(c => c.hasChanges)
  return selectedIds.value.length > 0 && selectedIds.value.length < changed.length
})

function toggleSelectAll() {
  if (!props.scanResult) return
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = props.scanResult.charts
      .filter(c => c.hasChanges)
      .map(c => c.id)
  }
}

function toggleChart(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

/** 判断 displayName 是否为已删除项标记 */
function isRemovedDisplayName(displayName: string): boolean {
  return displayName.startsWith('[删除] ')
}

/**
 * 从 displayName（可能含 [新增]/[删除] 前缀）还原 originalName */
function toOriginalName(displayName: string, state: DimState): string {
  return state.displayToOriginal[displayName] || displayName
}

/** 构建一个新的 indicator JSON，使用用户交互后的维度状态 */
function buildIndicatorFromState(
  oldIndicator: any,
  state: DimState
): string {
  const parsed = typeof oldIndicator === 'string' ? JSON.parse(oldIndicator) : { ...oldIndicator }

  // 重建第一维度
  if (state.firstAll.length > 0 && parsed.firstDimension) {
    const items = state.firstAll
      .filter(d => !isRemovedDisplayName(d))
      .map(displayName => {
      const name = toOriginalName(displayName, state)
      const value = state.nameToValue[name] || name
      // 尽量保留原始 indicatorItems 中的完整数据（如 queryConditions）
      const original = (parsed.firstDimension.indicatorItems || []).find(
        (i: any) => String(i.itemName) === name || String(i.itemValue) === value
      )
      return original ? { ...original, itemName: name, itemValue: value } : { itemName: name, itemValue: value }
    })
    parsed.firstDimension = {
      ...parsed.firstDimension,
      indicatorItems: items
    }
    parsed.visibleFirstDimensions = [...state.firstVisible]
      .filter(d => !isRemovedDisplayName(d))
      .map(d => toOriginalName(d, state))
  }

  // 重建第二维度
  if (state.secondAll.length > 0 && parsed.secondDimension) {
    const items = state.secondAll
      .filter(d => !isRemovedDisplayName(d))
      .map(displayName => {
      const name = toOriginalName(displayName, state)
      const value = state.nameToValue[name] || name
      const original = (parsed.secondDimension.indicatorItems || []).find(
        (i: any) => String(i.itemName) === name || String(i.itemValue) === value
      )
      return original ? { ...original, itemName: name, itemValue: value } : { itemName: name, itemValue: value }
    })
    parsed.secondDimension = {
      ...parsed.secondDimension,
      indicatorItems: items
    }
    parsed.visibleSecondDimensions = [...state.secondVisible]
      .filter(d => !isRemovedDisplayName(d))
      .map(d => toOriginalName(d, state))
  }

  return JSON.stringify(parsed)
}

async function applySelected() {
  const currentResult = props.scanResult
  if (!currentResult || selectedIds.value.length === 0) return

  applying.value = true
  let successCount = 0
  const errors: string[] = []

  for (const chartId of selectedIds.value) {
    const chart = currentResult.charts.find(c => c.id === chartId)
    if (!chart) continue

    const state = chartDimensionStates[chartId]
    if (!state) continue

    try {
      const newIndicator = buildIndicatorFromState(
        chart.indicator,
        state
      )

      const updateData = { id: chart.statisticId, indicator: newIndicator }
      if (chart.isCommon) {
        await updateCommonStatistic(updateData)
      } else {
        await updatePersonalStatistic(updateData)
      }
      successCount++
    } catch (e: any) {
      errors.push(`${chart.title}: ${e?.message || '保存失败'}`)
    }
  }

  applying.value = false

  if (successCount > 0) {
    message.success(`成功更新 ${successCount} 个图表配置`)
  }
  if (errors.length > 0) {
    message.warning(`${errors.length} 个图表更新失败：${errors.slice(0, 3).join('; ')}`)
  }

  emit('applied', successCount)
}
</script>

<style lang="less" scoped>
.sync-review-modal {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.sync-summary {
  padding: 12px 0;
  font-size: 14px;
}

.sync-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.chart-list {
  flex: 1;
  overflow-y: auto;
}

.chart-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 12px;
  padding: 12px;

  &.has-changes {
    border-color: #faad14;
    background-color: #fffbe6;
  }
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title {
  font-weight: 600;
  flex: 1;
}

.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;

  &.status-ok {
    background-color: #f6ffed;
    color: #52c41a;
    border: 1px solid #b7eb8f;
  }

  &.status-changed {
    background-color: #fff7e6;
    color: #fa8c16;
    border: 1px solid #ffd591;
  }
}

.dimension-section {
  margin-top: 8px;
  padding-left: 28px;
}

.dimension-group {
  margin-bottom: 16px;
}

.dimension-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.dimension-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  padding: 4px 0;
}

.hidden-label {
  color: #999;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
