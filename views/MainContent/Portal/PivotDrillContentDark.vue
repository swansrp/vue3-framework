<template>
  <!-- dark-content-layout 包裹层: 模板内元素 teleport 后仍带 scope 属性,
       复用 dark.css 的令牌覆盖与 :deep 规则, 抽屉内 Portal 自动适配深色 -->
  <div
    class="dark-content-layout"
    style="height: 100%;"
  >
    <pivot-drill-content
      :table-id="tableId"
      :condition="condition"
      :cache-key="cacheKey"
    />
  </div>
</template>

<script lang="ts" setup>
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import PivotDrillContent from './PivotDrillContent.vue'

/**
 * 钻取抽屉深色内容包裹层
 * dark.css 以 scoped 仅挂在本组件: 深色规则只作用于抽屉内容(teleport 到 body 后仍带本组件 scope),
 * 不泄漏到 pivot 主表格; 浅色外壳直接使用 PivotDrillContent, 不经过本组件
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

<style lang="less" scoped src="@/framework/components/common/Portal/css/dark.css"></style>
