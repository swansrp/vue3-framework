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
    router.push('/');
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
  padding: 4px 20px 0 20px;
  box-sizing: border-box;
  background: transparent;
  border-bottom: none;
  user-select: none;
  display: flex;
  align-items: center;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}

/* 去掉pane面板，以只保留顶部选择tab */
.history-tags .card-container > .ant-tabs-card .ant-tabs-content > .ant-tabs-tabpane {
  display: none;
}

/* Tab容器样式优化 */
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
}

/* Tab项基础样式 - 轻量扁平设计 */
.history-tags .ant-tabs-tab {
  margin: 0 1px !important;
  border: none !important;
  border-radius: 4px 4px 0 0 !important;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.05) 0%, 
    rgba(255, 255, 255, 0.02) 100%);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1),
              0 1px 2px rgba(0, 0, 0, 0.05);
  backdrop-filter: none;
  transition: all 0.2s ease;
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  border-bottom: 2px solid transparent !important;
}

/* Tab悬停效果 - 轻微提亮 */
.history-tags .ant-tabs-tab:hover {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.06) 0%, 
    rgba(64, 169, 255, 0.08) 100%);
  box-shadow: inset 0 -1px 0 rgba(24, 144, 255, 0.15),
              0 2px 6px rgba(0, 0, 0, 0.08),
              0 0 12px rgba(24, 144, 255, 0.1);
  transform: none;
  border-color: transparent !important;
}

/* Tab按钮内容样式 */
.history-tags .ant-tabs-tab .ant-tabs-tab-btn {
  color: #606266;
  font-weight: 400;
  font-size: 12px;
  padding: 0 2px;
  transition: color 0.2s ease;
  line-height: 1.3;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Tab悬停时文字颜色 */
.history-tags .ant-tabs-tab:hover .ant-tabs-tab-btn {
  color: #1890ff;
}

/* 激活状态的Tab样式 - 简洁蓝色 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08) 0%, 
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.08) 100%);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08),
              inset 0 1px 2px rgba(0, 0, 0, 0.06),
              0 0 8px rgba(24, 144, 255, 0.25),
              0 0 16px rgba(24, 144, 255, 0.15),
              0 0 24px rgba(24, 144, 255, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border: none !important;
  border-bottom: 2px solid rgba(24, 144, 255, 0.4) !important;
  position: relative;
  transform: translateY(-1px);
  z-index: 10;
}

/* 移除底部指示线 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active::after {
  display: none;
}

/* 激活状态的Tab文字和关闭按钮颜色 */
.history-tags .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn,
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-remove {
  color: #1890ff;
  font-weight: 400;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 关闭按钮样式优化 - 圆形设计 */
.history-tags .ant-tabs-tab-remove {
  margin-left: 4px;
  color: #bfbfbf;
  transition: all 0.2s ease;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  background: transparent;
}

/* 关闭按钮悬停效果 */
.history-tags .ant-tabs-tab-remove:hover {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
  transform: scale(1.15);
}

/* 激活状态Tab的关闭按钮 */
.history-tags .ant-tabs-tab-active .ant-tabs-tab-remove {
  color: rgba(255, 255, 255, 0.85);
}

/* 激活状态Tab的关闭按钮悬停效果 */
.history-tags .ant-tabs-tab-active .ant-tabs-tab-remove:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
}

/* Tab内容区域样式 */
.history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
  padding: 0 8px;
  min-width: 45px;
  text-align: center;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 去掉tab组件自带的边框 */
.history-tags .ant-tabs-top > .ant-tabs-nav::before {
  display: none;
}

/* Tab内容区域对齐优化 */
.history-tags .ant-tabs-nav-wrap {
  padding: 0;
}

/* 响应式设计 - 在较小屏幕上调整样式 */
@media (max-width: 768px) {
  .history-tags {
    height: 34px;
    padding: 2px 4px;
  }
  
  .history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
    padding: 3px 6px;
    min-width: 50px;
    font-size: 12px;
    height: 26px;
  }
}

/* 滚动条美化（如果Tab过多需要滚动） */
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

/* 优化Tab之间的间距 */
.history-tags .ant-tabs-nav-list {
  gap: 0;
}
</style>
