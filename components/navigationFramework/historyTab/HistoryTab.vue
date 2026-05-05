<template>
  <div class="history-tags">
    <a-tabs
      v-model:active-key="activeKey"
      hide-add
      size="small"
      type="editable-card"
      @change="changeActivateKey"
      @edit="removeTab"
    >
      <a-tab-pane
        v-for="item in tabs"
        :key="String(item.key || item.id)"
        :tab="item.title"
      />
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { Key } from 'ant-design-vue/es/table/interface'

import router from '@/framework/router'
import pinia from '@/framework/store'
import { useNavigationStore } from '@/framework/store/navigation'

const navigationStore = useNavigationStore(pinia)

// 响应式获取标签数据 - 从 navigationStore
const tabs = computed(() => navigationStore.historyTabs)

// activeKey 需要支持双向绑定,使用 computed 的 getter/setter
const activeKey = computed({
  get: () => navigationStore.activeTabKey,
  set: (value: string) => {
    // Ant Design Tabs 会在用户点击时设置这个值
    // 我们通过 changeActivateKey 处理
    if (value && value !== navigationStore.activeTabKey) {
      changeActivateKey(value)
    }
  }
})

// 删除tab的回调函数
const removeTab = (targetKey: Key | MouseEvent | KeyboardEvent) => {
  if (!(typeof targetKey === 'string' || typeof targetKey === 'number')) return
  
  const stringKey = String(targetKey)
  const nextKey = navigationStore.removeHistoryTab(stringKey)
  
  if (!nextKey) {
    // 所有标签已关闭，返回首页
    router.push('/')
  } else if (activeKey.value === stringKey) {
    // 关闭的是当前标签，切换到下一个
    changeActivateKey(nextKey)
  }
}

// 切换标签
const changeActivateKey = (key: Key) => {
  const targetTab = navigationStore.tabKeyMap[key]
  if (!targetTab) return
  
  // 跳转到对应路由，状态由路由守卫同步
  router.push({ 
    path: targetTab.fullPath,
    query: targetTab.query 
  })
}

</script>

<style>
.history-tags {
  height: 36px;
  padding: 4px var(--space-xl) 0 var(--space-xl);
  box-sizing: border-box;
  background: var(--history-tab-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
  display: flex;
  align-items: center;
  margin: 0;
  border-radius: 0;
  box-shadow: var(--shadow-tab);
  overflow: visible;
  position: relative;
  z-index: 5;
}

/* Tab条底部与内容区域的分隔线 */
.history-tags::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-subtle);
  z-index: 0;
}

/* 去掉pane面板 */
.history-tags .card-container > .ant-tabs-card .ant-tabs-content > .ant-tabs-tabpane {
  display: none;
}

/* Tab容器 */
.history-tags .ant-tabs {
  margin: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
}

.history-tags .ant-tabs-nav {
  margin: 0;
  height: 100%;
  overflow: visible;
}

.history-tags .ant-tabs-nav-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
}

.history-tags .ant-tabs-nav-list {
  height: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
  gap: 2px;
}

/* Tab项基础样式 */
.history-tags .ant-tabs-tab {
  margin: 0 !important;
  border: 1px solid var(--border-subtle) !important;
  border-bottom: none !important;
  border-radius: var(--radius-md) var(--radius-md) 0 0 !important;
  background: var(--bg-hover);
  padding: 0 12px !important;
  transition: all var(--transition-fast);
  position: relative;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.65;
  box-shadow: none;
}

/* Tab悬停 */
.history-tags .ant-tabs-tab:hover {
  background: var(--bg-elevated);
  opacity: 1;
  border-color: var(--border-hover) !important;
  box-shadow: var(--history-tab-shadow);
  transform: translateY(-1px);
}

/* Tab按钮文字 */
.history-tags .ant-tabs-tab .ant-tabs-tab-btn {
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 12px;
  padding: 0 2px;
  transition: color var(--transition-fast);
  line-height: 1.3;
}

/* Tab悬停文字 */
.history-tags .ant-tabs-tab:hover .ant-tabs-tab-btn {
  color: var(--text-primary);
}

/* 激活Tab */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--bg-elevated) !important;
  opacity: 1;
  position: relative;
  z-index: 10;
  box-shadow:
    var(--history-tab-active-shadow),
    0 1px 0 var(--bg-elevated);
  transform: translateY(-1px);
}

/* 激活Tab底部连接线 — 遮盖底部分隔线 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--bg-elevated);
  z-index: 2;
}

/* 激活Tab上方靛蓝指示线 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 4px;
  right: 4px;
  height: 2px;
  background: var(--accent);
  border-radius: 0 0 2px 2px;
  pointer-events: none;
  box-shadow: 0 0 6px var(--accent-glow);
}

/* 激活Tab文字 */
.history-tags .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
  color: var(--text-primary);
  font-weight: 500;
}

/* 关闭按钮 */
.history-tags .ant-tabs-tab-remove {
  margin-left: 4px;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  background: transparent;
  order: 1;
}

.history-tags .ant-tabs-tab-remove:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
  padding: 0 8px;
  min-width: 45px;
  text-align: center;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 去掉tab组件底部边框线 */
.history-tags .ant-tabs-top > .ant-tabs-nav::before {
  display: none;
}

.history-tags .ant-tabs-nav-wrap {
  padding: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .history-tags {
    height: 34px;
    padding: 2px 4px;
  }
  .history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
    padding: 3px 6px;
    min-width: 50px;
    font-size: 12px;
    height: 28px;
  }
}

/* 隐藏滚动条 */
.history-tags .ant-tabs-nav-wrap::-webkit-scrollbar {
  height: 0;
}

/* Tab文字不换行 */
.history-tags .ant-tabs-tab .ant-tabs-tab-btn {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
</style>
