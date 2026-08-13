<template>
  <!-- 浅色钻取内容: 不挂 dark.css, 抽屉内 Portal 跟随 antd 默认浅色;
       深色外壳见 PivotDrillContentDark.vue(包裹 dark-content-layout 并 scoped 挂载 dark.css) -->
  <div style="height: 100%;">
    <portal
      v-if="tableId"
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
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

/**
 * 钻取抽屉内容(浅色)
 * 深色规则全部在 PivotDrillContentDark 中挂载, 本组件不引入 dark.css,
 * 保证浅色外壳下抽屉不残留任何深色覆盖
 */
defineProps<{
  /** 底层明细表 portalName */
  tableId: string
  /** 钻取查询条件 */
  condition: ConditionListType
  /** 标题变化时重建表格(对应原 :key="drillTitle") */
  cacheKey: string
}>()
</script>
