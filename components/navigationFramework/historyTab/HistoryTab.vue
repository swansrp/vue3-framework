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

import { TabType } from '@/framework/components/navigationFramework/historyTab/type'
import router from '@/framework/router'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { CHANGE_TAB } from '@/framework/utils/constant'
import mitt from '@/framework/utils/mitt'

const store = useTabStore(pinia)
// 初始的tabs为空，leftNav组件会根据路由，通过修改store.tabActivateKey，更新tabs
let tabs = ref<TabType[]>([])
// 初始化当前要激活的tab
const activeKey = ref<Key>('')

const historyPath: Array<Key> = []
//保留历史页面（路由）对应的key，方便点击浏览器的“返回”按钮，返回到上一个页面使用
const saveHistoryRoute = (key: Key) => {
  // 防止两个连续的相同的路由
  if(historyPath[historyPath.length-1] !== key)  historyPath.push(key)
}

// 删除tab的回调函数
const removeTab = (targetKey: Key | MouseEvent | KeyboardEvent) => {
  if (!(typeof targetKey === 'string' || typeof targetKey === 'number')) return
  let lastIndex = 0
  // 找到要删除的前一个tab索引
  tabs.value.some((tab, index) => {
    if (tab.key === targetKey) {
      lastIndex = index - 1
      return true
    }
  })
  // 删除掉目标tab
  tabs.value = tabs.value.filter((tab) => tab.key !== targetKey)
  // 这部分代码是根据antd vue 官方写的，其实是不用理解
  if (tabs.value.length && activeKey.value === targetKey) {
    // 如果 前一个tab索引 大于等于 0，可以直接赋值
    if (lastIndex >= 0) {
      activeKey.value = tabs.value[lastIndex].key
      // 若得到的lastIndex为负数，则只展示tab中的第一个
    } else {
      activeKey.value = tabs.value[0].key
    }
  }
  // 向pinia 中写入当前激活tab的key
  if (tabs.value.length === 0) {
    // 当所有tab都被关闭时，自动切换到第一个可用的动态路由
    // 这里不再设置为首页，而是让系统自动处理
    // store.tabActivateKey = ''
  } else {
    changeActivateKey(activeKey.value)
  }
  // 向pinia中删除掉关于当前已删除tab的相关信息
  store.deleteHistoryTab(targetKey)
}

// tab切换后的回调函数
const changeActivateKey = (key: Key) => {
  // 不要更换这两句话的顺序，否则会产生bug
  // 保存用户最后选择的openKeys和tab
  router.push(store.getRouterTarget(key)).then(() => {
    // 修改tabStore中的相关状态
    store.changeTab(key)
    saveHistoryRoute(key)
    // 通知左侧导航的更新，左侧导航会通知顶部导航的更新
    mitt.emit(CHANGE_TAB)
  })
  // 所有菜单都需要展示左侧导航
  store.isNeedLeftNav = true
}

// 用于监听左侧导航栏中的选项选中情况，以及时更新tab
watch(
    () => store.tabActivateKey,
    key => {
      // 如果key不为空，则设置为当前key
      if (key) {
        activeKey.value = key
        tabs.value = store._historyTabArray
        saveHistoryRoute(activeKey.value)
      }
    },
    { immediate: true }
)

watch(
    () => store._historyTabArray.length,
    () => tabs.value = store._historyTabArray
)

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
