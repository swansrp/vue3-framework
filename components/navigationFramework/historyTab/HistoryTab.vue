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
  console.log('changeActivateKey===', key, store.getRouterTarget(key))
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
watch(() => store.tabActivateKey,
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

watch(() => store._historyTabArray.length, () => tabs.value = store._historyTabArray)

/** 暂时删除这个监听 */
// // 监听浏览器的返回按钮
// window.addEventListener('popstate', (event) => {
//   // 路由守卫的return重定向，也会触发这个事件，但是此处只需要监听浏览器返回按钮的点击事件
//   // 所以需要使用event.state区分到底是谁触发的这个事件，路由守卫的重定向触发时，event.state会为null
//   if (!event.state) return
//   // 如果只有一个，就保持跳转到当前界面，相当于在浏览器返回上一个页面后，再跳转回来
//   // 此时我也不知道所谓的返回到上一个页面是啥，但是只要再跳回来，就相当于没有跳啦
//   if (historyPath.length === 1) {
//     const key = historyPath[0]
//     activeKey.value = key
//     changeActivateKey(key)
//   } else {
//     // 需要弹出两次，第一次弹出当前页面对应的key；第二次才是上一次的界面对应的key
//     historyPath.pop()
//     const key = historyPath.pop() as string
//     // 需要为tabs设定激活的key，这样才能使对应tab高亮
//     activeKey.value = key
//     // 更改路由、左侧及顶部导航
//     changeActivateKey(key)
//   }
// }, false)
</script>

<style>
.history-tags {
  height: 38px;
  padding: 4px 6px;
  box-sizing: border-box;
  background-color: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  user-select: none;
  display: flex;
  align-items: center;
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
}

.history-tags .ant-tabs-nav {
  margin: 0;
  height: 100%;
}

.history-tags .ant-tabs-nav-wrap {
  height: 100%;
  display: flex;
  align-items: center;
}

.history-tags .ant-tabs-nav-list {
  height: 100%;
  display: flex;
  align-items: center;
}

/* Tab项基础样式 - 简约现代风格 */
.history-tags .ant-tabs-tab {
  margin: 0 1px !important;
  border: none !important;
  border-radius: 6px !important;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease;
  position: relative;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab悬停效果 - 微妙的交互反馈 */
.history-tags .ant-tabs-tab:hover {
  background-color: #f8f9fa;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

/* Tab按钮内容样式 */
.history-tags .ant-tabs-tab .ant-tabs-tab-btn {
  color: #2d3748;
  font-weight: 500;
  font-size: 13px;
  padding: 0 6px;
  transition: color 0.15s ease;
  line-height: 1.3;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: 0.01em;
}

/* Tab悬停时文字颜色 */
.history-tags .ant-tabs-tab:hover .ant-tabs-tab-btn {
  color: #1a202c;
}

/* 激活状态的Tab样式 - 极简设计 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active {
  background-color: #ffffff;
  box-shadow: 0 6px 12px rgba(24, 144, 255, 0.2), 0 3px 6px rgba(24, 144, 255, 0.15);
  border: none !important;
  position: relative;
  transform: translateY(-2px);
}

/* 激活状态底部指示线 */
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background-color: #1890ff;
  border-radius: 1.5px;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.4);
}

/* 激活状态的Tab文字和关闭按钮颜色 */
.history-tags .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn,
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-remove {
  color: #1890ff;
  font-weight: 400;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: 0.01em;
}

/* 关闭按钮样式优化 - 精致小巧 */
.history-tags .ant-tabs-tab-remove {
  margin-left: 4px;
  color: #bfbfbf;
  transition: all 0.15s ease;
  border-radius: 3px;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
}

/* 关闭按钮悬停效果 */
.history-tags .ant-tabs-tab-remove:hover {
  color: #ff4d4f;
  background-color: #fff1f0;
}

/* 激活状态Tab的关闭按钮悬停效果 */
.history-tags .ant-tabs-tab-active .ant-tabs-tab-remove:hover {
  color: #ff4d4f;
  background-color: #fff1f0;
}

/* Tab内容区域样式 */
.history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
  padding: 4px 8px;
  min-width: 60px;
  text-align: center;
  height: 30px;
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
  gap: 2px;
}
</style>
