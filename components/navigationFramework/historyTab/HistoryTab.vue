<template>
  <div class="history-tags">
    <a-tabs
      v-model:activeKey="activeKey"
      hide-add
      size="small"
      type="editable-card"
      @change="changeActivateKey"
      @edit="removeTab">
      <a-tab-pane :key="homePageKey" :closable="false" tab="首页" />
      <a-tab-pane v-for="item in tabs" :key="item.key" :tab="item.tabName" />
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import router from "@/framework/router"
import {TabType} from './type'
import mitt from '@/framework/utils/mitt'
import {useTabStore} from '@/framework/store/nav'
import {CHANGE_TAB, HOME} from '@/framework/utils/constant'
import {Key} from 'ant-design-vue/es/table/interface'

const store = useTabStore()
// 这个key要和路由中的path一致
const homePageKey = HOME
// 初始的tabs为空，leftNav组件会根据路由，通过修改store.tabActivateKey，更新tabs
let tabs = ref<TabType[]>([])
// 默认显示首页，这里的赋值其实不会生效，因为store.tabActivateKey会再次修改activeKey的值
// 初始化当前要激活的tab
const activeKey = ref<Key>(homePageKey)

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
    // 当所有tab都被关闭时，显示首页
    store.tabActivateKey = homePageKey
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
  router.push(store._key2HistoryHrefFullPath[key]).then(() => {
    // 修改tabStore中的相关状态
    store.changeTab(key)
    saveHistoryRoute(key)
    // 通知左侧导航的更新，左侧导航会通知顶部导航的更新
    mitt.emit(CHANGE_TAB)
  })
  store.isNeedLeftNav = key !== HOME;
}

// 用于监听左侧导航栏中的选项选中情况，以及时更新tab
watch(() => store.tabActivateKey,
    key => {
      // 如果key为空，则显示首页，immediate可能会使key为''，所以需要判断一下
      if (key) activeKey.value = key
      else activeKey.value = homePageKey
      tabs.value = store._historyTabArray
      saveHistoryRoute(activeKey.value)
    },
    { immediate: true }
)

watch(() => store._historyTabArray.length, () => tabs.value = store._historyTabArray)


// 监听浏览器的返回按钮
window.addEventListener('popstate', (event) => {
  // 路由守卫的return重定向，也会触发这个事件，但是此处只需要监听浏览器返回按钮的点击事件
  // 所以需要使用event.state区分到底是谁触发的这个事件，路由守卫的重定向触发时，event.state会为null
  if (!event.state) return
  // 如果只有一个，就保持跳转到当前界面，相当于在浏览器返回上一个页面后，再跳转回来
  // 此时我也不知道所谓的返回到上一个页面是啥，但是只要再跳回来，就相当于没有跳啦
  if (historyPath.length === 1) {
    const key = historyPath[0]
    activeKey.value = key
    changeActivateKey(key)
  }
  else {
    // 需要弹出两次，第一次弹出当前页面对应的key；第二次才是上一次的界面对应的key
    historyPath.pop()
    const key = historyPath.pop() as string
    // 需要为tabs设定激活的key，这样才能使对应tab高亮
    activeKey.value = key
    // 更改路由、左侧及顶部导航
    changeActivateKey(key)
  }
}, false)
</script>

<style>
.history-tags {
  height: 37px;
  padding-left: 5px;
  box-sizing: border-box;
  background-color: rgba(204, 204, 204, 0.3);
  user-select: none;
}

/*去掉pane面板，以只保留顶部选择tab*/
.history-tags .card-container > .ant-tabs-card .ant-tabs-content > .ant-tabs-tabpane {
  display: none;
}

/*修改tab的选项样式*/
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active {
  background: rgba(42, 80, 236, 0.9);
  border-color: rgba(42, 80, 236, 0.9);
}

.history-tags .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn,
.history-tags .ant-tabs.ant-tabs-card .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-remove {
  color: #fff;
}

.history-tags .ant-tabs-tab {
  margin: 6px 4px !important;
}

.history-tags .ant-tabs-card.ant-tabs-small > .ant-tabs-nav .ant-tabs-tab {
  padding: 1px 8px;
}

/*去掉tab组件自带的边框*/
.history-tags .ant-tabs-top > .ant-tabs-nav::before {
  display: none;
}
</style>
