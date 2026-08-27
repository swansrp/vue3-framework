/**
 * 智能问数表格生成物容器
 *
 * tableId 即 portalName，先探测 sys_portal_table 成像配置：pivotMode='1' 时切透视报表
 * （pivot.vue，与报表页 table.vue 同款），否则交给现成 portal 穿透表渲染：
 * 只读模式（操作列宽度 0 / 隐藏刷新按钮 / 隐藏行选择），高度默认 420px 可由父组件覆盖。
 *
 * smart-query 场景（外部直传 portalConfig）：plan 推导产物无 sys_portal_table 记录，
 * 跳过透视探测，配置直传给 Portal，取数由外部 query 函数携带 queryContext 命中 /advanced/query。
 * 推导字典（portalConfig.dicts）在 setup 阶段同步注册进 dictStore：SELECT 列的
 * 单元格翻译/筛选下拉直接命中缓存，不落字典表也不发字典请求（须早于 Portal
 * 子组件 onMounted 的 initConfig，故不放 onMounted）。
 */
<template>
  <div
    class="chatbi-table"
    :style="{ height: tableHeight }"
  >
    <portal
      v-if="props.portalConfig"
      :table-id="props.portalConfig.name || props.tableId"
      :portal-config="props.portalConfig"
      :query="props.query"
      :action-width="0"
      :index-width="0"
      :page-size="20"
      :row-key-field="AUTO_UUID_ROW_KEY"
      hide-refresh
      hide-row-selection
    />
    <pivot-table
      v-else-if="pivotConfig"
      :portal-table-config="pivotConfig"
      :condition="condition.conditionList"
      theme="light"
    />
    <portal
      v-else
      :table-id="tableId"
      :advance-condition="condition"
      :action-width="0"
      hide-refresh
      hide-row-selection
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

import { getPortalTableList, PortalTableVO } from '@/framework/apis/portal/table'
import type { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { AUTO_UUID_ROW_KEY } from '@/framework/components/common/Portal/constant'
import { dictStore } from '@/framework/store/common'
import PivotTable from '@/framework/views/MainContent/Portal/pivot.vue'

interface Props {
  tableId: string
  // specMerge.buildTableCondition 产出；不传则无附加条件全量查询
  condition?: ConditionListType
  // 面板内默认 420px，独立路由页可传更大值或 '100%'
  height?: number | string
  // smart-query：plan 推导的 portalConfig 直传（跳过 sys_portal_table 透视探测）
  portalConfig?: any
  // smart-query：自定义取数函数（携带 queryContext 命中 /advanced/query），透传给 Portal
  query?: (url: string, query: any) => Promise<any>
}

const props = withDefaults(defineProps<Props>(), {
  condition: () => ({ conditionList: [] }) as ConditionListType,
  height: 420,
  portalConfig: undefined,
  query: undefined
})

/**
 * smart-query 推导字典注册：plan 产物随附码值对（dictName → [{value,label}]），
 * 按 dictStore 内部结构（data/valueMap/labelMap）直接写入缓存，
 * Portal SELECT 列翻译与筛选下拉即命中，无需后端字典表
 */
const registerDerivedDicts = () => {
  const dicts = props.portalConfig?.dicts
  if (!dicts) {
    return
  }
  // dictStore 是 pinia store 钩子，须先调用取实例
  const dict = dictStore()
  Object.keys(dicts).forEach((dictName) => {
    if (dict.map.get(dictName)) {
      return
    }
    const valueMap = new Map()
    const labelMap = new Map()
    ;(dicts[dictName] || []).forEach((item: any) => {
      valueMap.set(item.value, item.label)
      labelMap.set(item.label, item.value)
    })
    dict.map.set(dictName, { data: dicts[dictName], valueMap, labelMap })
  })
}
registerDerivedDicts()

/**
 * sys_portal_table 成像配置探测：仅 pivotMode='1' 的记录才切换透视渲染，
 * 无记录（多数 DATASET 视图未配表格）或探测失败均回落 portal 穿透表
 */
const pivotConfig = ref<PortalTableVO | null>(null)

onMounted(async () => {
  // 外部直传配置（smart-query）：无 sys_portal_table 记录，无需透视探测
  if (props.portalConfig) {
    return
  }
  try {
    // 静默探测（showErr=false）：免登录调试态接口 401 等失败不弹错，直接回落 portal 渲染
    const res = await getPortalTableList(props.tableId, false, false, false)
    const table = res.payload?.records?.[0]
    if (table?.pivotMode === '1') {
      pivotConfig.value = table
    }
  } catch {
    // 探测失败按普通穿透表渲染
  }
})

const tableHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height))
</script>

<style scoped lang="less">
.chatbi-table {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-elevated);

  // 让 portal 穿透表撑满容器（样式蓝本：DashboardDetail.vue 的 table-container）
  :deep(.root) {
    height: 100%;
    margin: 0;
    padding: 15px;
  }

  :deep(.portal-table-space) {
    margin: 0;
    padding: 5px;
    height: 100%;
  }

  :deep(.ant-table-wrapper),
  :deep(.ant-table),
  :deep(.surely-table-wrapper) {
    margin: 0;
    padding: 0;
  }
}
</style>
