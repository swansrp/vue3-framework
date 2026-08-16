/**
 * 智能问数独立路由页（全宽）——framework 层页面（所有项目共享，后端依赖 insight 模块即可用）
 *
 * 访问：#/insight/chatbi?tableId=PmpProjectlifeCycleDataset
 * query 不带 tableId 时进入全局模式：先经 LLM 路由选出最相关看板再问答。
 */
<template>
  <div class="chatbi-page">
    <div class="page-header">
      <RobotOutlined class="header-icon" />
      <span class="header-title">智能问数</span>
      <span class="header-dataset">{{ tableId ? `数据集：${tableId}` : '全局问答 · 自动匹配看板' }}</span>
    </div>
    <div class="page-body">
      <ChatBiPanel
        :table-id="tableId || undefined"
        :grid-columns="12"
        :table-height="560"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { RobotOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import ChatBiPanel from '@/framework/components/common/chatbi/index.vue'

const route = useRoute()

// 指定 tableId 时锁定单看板问答；为空进入全局模式（面板内 LLM 路由选板）
const tableId = computed(() => {
  const q = route.query.tableId
  if (typeof q === 'string' && q.trim()) return q.trim()
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) return q[0].trim()
  return ''
})
</script>

<style scoped lang="less">
.chatbi-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);

  .header-icon {
    font-size: 22px;
    color: var(--accent);
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-dataset {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.page-body {
  flex: 1;
  min-height: 0;
  padding: 16px 24px 24px;
}
</style>
