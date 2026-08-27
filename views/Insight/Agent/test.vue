<!--
 * Agent 模式测试页（DB 菜单 AgentTest，component 直达本文件）
 *
 * 薄包装 Admin 目录下的 SmartQueryTest（gold 问题 / semantic_query 手编 / 维护问数
 * 流式 + 调试信息）；独立菜单入口便于无抽屉环境下专注回归。
-->
<template>
  <SmartQueryTest
    :show-back="false"
    class="agent-test-page"
  />
</template>

<script lang="ts" setup>
import SmartQueryTest from '@/framework/views/Insight/Agent/Admin/SmartQueryTest.vue'
</script>

<style scoped lang="less">
.agent-test-page {
  height: 100vh;
}
</style>
