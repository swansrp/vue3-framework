/**
 * 智能问数图表生成物容器
 *
 * 把 specMerge 产出的 DashboardItem[] 交给现成 ChartGrid 渲染：
 * 只读模式（禁编辑/删除/缩放/拖拽），Portal 配置按 tableId 拉取并模块级缓存，
 * 供 ChartCard 内置的穿透明细弹窗复用。
 */
<template>
  <div class="chatbi-chart">
    <ChartGrid
      :indicators="layoutCharts"
      :loading="loading"
      :grid-columns="gridColumns"
      :can-edit-common-indicators="false"
      :can-edit-personal-indicators="false"
      :can-delete-common-indicators="false"
      :can-delete-personal-indicators="false"
      :can-resize-common-indicators="false"
      :can-resize-personal-indicators="false"
      :can-drag="false"
      :portal-config="portalConfig"
      auto-fit-width
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

import { getPortalConfig } from '@/framework/apis/portal/config'
import ChartGrid from '@/framework/components/common/chartConfig/ChartGrid.vue'
import type { DashboardItem } from '@/framework/components/common/chartConfig/types'

interface Props {
  charts: DashboardItem[]
  tableId?: string
  loading?: boolean
  // 面板窄容器默认 4 列（默认卡片 xGrid=4 即整行宽），全宽路由页可传 12
  gridColumns?: number
  // 外部直传的 Portal 配置（smart-query 场景由 /plan 推导，无 sys_portal_table 记录可拉）；
  // 传了就跳过按 tableId 拉取
  portalConfig?: any
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  gridColumns: 4,
  portalConfig: undefined
})

// Portal 配置模块级缓存：多个消息的图表共享，同 tableId 只拉一次
const portalConfigCache = new Map<string, any>()

const portalConfig = ref<any>(null)

// 外部直传优先（smart-query：plan 产物自带 url/columns，无 tableId 可拉）
watch(() => props.portalConfig, cfg => {
  if (cfg) portalConfig.value = cfg
}, { immediate: true })

// specMerge 产出的图表坐标均为占位值 (1,1)，而 ChartGrid 按 xPosition/yPosition 做 CSS Grid 绝对定位，
// 多图会全部叠在同一格；这里按 gridColumns 做 first-fit 紧凑布局（先填满行再换行），保证互不重叠。
// 顺序追加新图时已有图的坐标不变（first-fit 稳定），流式渲染不跳动。
const layoutCharts = computed<DashboardItem[]>(() => {
  const cols = props.gridColumns
  const occupied = new Set<string>()
  const result: DashboardItem[] = []
  // 问数场景可读性优先：卡片默认占格多为小卡（甚至未配置尺寸），照搬会太挤；
  // 统一按数量定宽——宽页面（≥8 列）单图整行、多图每行两个，窄面板逐行堆叠；高度随宽度保持比例
  const perRow = props.charts.length === 1 || cols < 8 ? 1 : 2
  const w = Math.ceil(cols / perRow)
  // 半行图略加高：卡片头部/图例占固定像素，画布过矮会挤压坐标轴
  const h = Math.max(perRow === 2 ? 4 : 3, Math.round(w / 2.5))
  for (const chart of props.charts) {
    // 搜索上界取已占区域的下一行：该行必然全空，一定能放置成功
    const nextRow = result.reduce((m, it) => Math.max(m, (it.yPosition || 1) + (it.yGrid || 1)), 1)
    let placed = false
    for (let y = 1; y <= nextRow && !placed; y++) {
      for (let x = 1; x <= cols - w + 1; x++) {
        let free = true
        for (let cx = x; cx < x + w && free; cx++) {
          for (let cy = y; cy < y + h; cy++) {
            if (occupied.has(`${cx},${cy}`)) {
              free = false
              break
            }
          }
        }
        if (!free) continue
        result.push({ ...chart, xPosition: x, yPosition: y, xGrid: w, yGrid: h })
        for (let cx = x; cx < x + w; cx++) {
          for (let cy = y; cy < y + h; cy++) occupied.add(`${cx},${cy}`)
        }
        placed = true
        break
      }
    }
    if (!placed) result.push({ ...chart, xPosition: 1, yPosition: nextRow, xGrid: w, yGrid: h })
  }
  return result
})

const loadPortalConfig = async (tableId?: string) => {
  if (!tableId || props.portalConfig) return
  const cached = portalConfigCache.get(tableId)
  if (cached) {
    portalConfig.value = cached
    return
  }
  try {
    const resp = await getPortalConfig(tableId)
    if (resp?.payload) {
      const config = { ...resp.payload, tableId }
      portalConfigCache.set(tableId, config)
      portalConfig.value = config
    }
  } catch (e) {
    console.error('chatbi 加载 Portal 配置失败:', e)
  }
}

watch(() => props.tableId, loadPortalConfig, { immediate: true })
</script>

<style scoped lang="less">
.chatbi-chart {
  width: 100%;

  // 问数场景由外层控制空态展示，屏蔽 ChartGrid 自带的空态占位
  :deep(.chart-grid-container) {
    .empty-state {
      display: none;
    }
  }
}
</style>
