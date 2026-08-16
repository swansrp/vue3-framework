/**
 * 智能问数表格生成物容器
 *
 * tableId 即 portalName，先探测 sys_portal_table 成像配置：pivotMode='1' 时切透视报表
 * （pivot.vue，与报表页 table.vue 同款），否则交给现成 portal 穿透表渲染：
 * 只读模式（操作列宽度 0 / 隐藏刷新按钮 / 隐藏行选择），高度默认 420px 可由父组件覆盖。
 */
<template>
  <div
    class="chatbi-table"
    :style="{ height: tableHeight }"
  >
    <pivot-table
      v-if="pivotConfig"
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
import PivotTable from '@/framework/views/MainContent/Portal/pivot.vue'

interface Props {
  tableId: string
  // specMerge.buildTableCondition 产出；不传则无附加条件全量查询
  condition?: ConditionListType
  // 面板内默认 420px，独立路由页可传更大值或 '100%'
  height?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  condition: () => ({ conditionList: [] }) as ConditionListType,
  height: 420
})

/**
 * sys_portal_table 成像配置探测：仅 pivotMode='1' 的记录才切换透视渲染，
 * 无记录（多数 DATASET 视图未配表格）或探测失败均回落 portal 穿透表
 */
const pivotConfig = ref<PortalTableVO | null>(null)

onMounted(async () => {
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
