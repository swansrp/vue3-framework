<template>
  <!-- 浅色钻取内容: 不挂 dark.css, 抽屉内表格跟随 antd 默认浅色;
       深色规则全部在 PivotDrillContentDark.vue 中挂载, 本组件不引入 dark.css,
       保证浅色外壳下抽屉不残留任何深色覆盖 -->
  <div style="height: 100%;">
    <!-- 钻取目标是另一张透视报表: 递归嵌入 pivot(条件=上层格子钻取条件+目标常驻条件, 已在 pivot.vue 合并),
         异步组件打断 pivot.vue ↔ 本组件的循环引用; 其自身钻取抽屉继续往下叠 -->
    <pivot-table
      v-if="isTargetPivot"
      :key="cacheKey"
      :portal-table-config="targetTable!"
      :condition="condition.conditionList || []"
      :drill-chain="drillChain"
      :theme="theme"
    />
    <portal
      v-else-if="tableId"
      :key="cacheKey"
      :table-id="tableId"
      :advance-condition="condition"
      :action-width="0"
      hide-add
      hide-refresh
      hide-row-selection
      mode-lock
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue'

import { PortalTableVO } from '@/framework/apis/portal/table'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

const PivotTable = defineAsyncComponent(() => import('./pivot.vue'))

/**
 * 钻取抽屉内容(浅色)
 * 深色规则全部在 PivotDrillContentDark 中挂载, 本组件不引入 dark.css,
 * 保证浅色外壳下抽屉不残留任何深色覆盖
 */
const props = withDefaults(
  defineProps<{
    /** 底层明细表 portalName */
    tableId: string
    /** 钻取查询条件 */
    condition: ConditionListType
    /** 标题变化时重建表格(对应原 :key="drillTitle") */
    cacheKey: string
    /** 钻取目标表格配置(表级 drillTableCode 解析结果): 透视模式时递归嵌入, 空=明细 Portal */
    targetTable?: PortalTableVO | null
    /** 钻取链(表格编码序列): 下传给内嵌透视防环 */
    drillChain?: string[]
    /** 内嵌透视的主题: 浅色抽屉=light, 深色包裹层传 dark */
    theme?: 'dark' | 'light'
  }>(),
  {
    targetTable: null,
    drillChain: () => [],
    theme: 'light'
  }
)

const isTargetPivot = computed(() => !!props.targetTable && props.targetTable.pivotMode === '1')
</script>
