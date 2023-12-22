<template>
  <div>
    <a-menu
      v-if="tabStore.isNeedLeftNav"
      v-model:openKeys="keys.openKeys"
      v-model:selectedKeys="keys.selectedKeys"
      class="left-menu"
      :style="{width: collapsed ? '50px' : '250px'}"
      mode="inline"
      theme="dark"
      :inline-collapsed="collapsed"
      @select="selectLeftNav">
      <template v-for="item in navList">
        <template v-if="!item.children">
          <a-menu-item
            :id="item.key.toString()" :key="item.path || item.title" :path="item.path" :query="item.query"
            :title="item.title">
            <template #icon>
              <Icon :icon="item.icon" />
            </template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </template>
        <template v-else>
          <sub-nav :id="item.key.toString()" :key="item.path || item.title" :subNavList="item" />
        </template>
      </template>
    </a-menu>
    <a-button v-if="collapsed" type="text" style="position: absolute;left: 20px; bottom: 0; z-index: 1000" @click="toggleCollapsed">
      <RightOutlined style="color: rgba(255,255,255,0.7)" />
    </a-button>
    <a-button v-else type="text" style="position: absolute;left: 215px; bottom: 0; z-index: 1000" @click="toggleCollapsed">
      <LeftOutlined style="color: rgba(255,255,255,0.7)" />
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import mitt from "@/framework/utils/mitt"
import {LocationQueryRaw, useRouter} from "vue-router"
import {NavListType} from "../type"
import {useTabStore} from "@/framework/store/nav"
import {useRouteStore} from "@/framework/store/route"
import 'ant-design-vue/lib/message/style/index.css'
import {CHANGE_TAB, HOME, MAIN_CONTENT} from "@/framework/utils/constant"
import {genAntdMenuFirstSelectObject, getTitlePathByKey} from "@/framework/hooks/initKeysAndRouteInNav"
import SubNav from "@/framework/components/navigationFramework/navMenu/subNav/SubNav.vue"
import {getQueryObject} from "@/framework/network/utils"
import pinia from "@/framework/store"
import {
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons-vue'


const router = useRouter()
const tabStore = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

let {topNavPath} = tabStore
let navList = ref([] as Array<NavListType>)
const keys = reactive({openKeys: [] as Array<string>, selectedKeys: [] as Array<string>})
const collapsed = ref(false)
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
  let resizeEvent = new Event('resize')
  window.dispatchEvent(resizeEvent)
}
const initCurrentRouteAndVar = () => {
  let defaultLeftNavPath = ''
  let defaultTopNavPath = ''
  // allPathArray的第一部分是 MainContent， 第二部分是 TopNavPath，第三部分及其以后才是左侧菜单导航路径
  const allPathArray = router.currentRoute.value.fullPath.split('/').filter(path => path)
  if (allPathArray.length >= 3) {
    defaultTopNavPath = allPathArray[1]
    defaultLeftNavPath = allPathArray.slice(2).join('/')
    router.push(`/${MAIN_CONTENT}/${defaultTopNavPath}/${defaultLeftNavPath}`)
  }
}

const selectLeftNav = (obj: any) => {
  let path = obj.item.path
  const fullPath = `/${MAIN_CONTENT}/${topNavPath}/${path}`
  const query = (obj.item.query ? getQueryObject(obj.item.query) : {}) as LocationQueryRaw
  router.push({
    path: fullPath,
    query
  }).then(() => {
    keys.selectedKeys = [path]
    const {titlePath, keyPath} = getTitlePathByKey(navList.value, path)
    keys.openKeys = keyPath
    // 选中左侧菜单后， 为面包屑提供数据
    tabStore.setTitlePath(titlePath)
    // 选中左侧菜单后，增加对应的tab信息
    // const tabName = titlePath[titlePath.length - 1]
    tabStore.addHistoryTab(obj.item, fullPath)
  })
}

const getObjectByLeftNavPath = (currentNode: NavListType) => {
  selectLeftNav({item: currentNode})
}


const initLeftNavList = () => {
  topNavPath = topNavPath || routeStore.currentTopNav
  const currentLeftNav = (tabStore.updateLeftNav && tabStore.tabActivateKey) ? tabStore.tabActivateKey : routeStore.currentLeftNav
  topNavPath = (tabStore.updateLeftNav && tabStore.topNavPath) ? tabStore.topNavPath : routeStore.currentTopNav
  if (topNavPath === HOME) return
  for (const node of routeStore.dynamicRoute) {
    if (node.path === topNavPath) {
      navList.value = node.children
      // navList没有内容，就没必要展示左侧导航菜单了
      if (navList.value.length === 0) {
        tabStore.isNeedLeftNav = false
        return
      }
      // 如果地址栏中的fullPath存在关于左侧导航菜单的相关路径，则根据这个路径初始化左侧菜单的选中情况
      if (currentLeftNav) {
        if (tabStore.updateLeftNav) {
          // const targetPath = `/${MAIN_CONTENT}/${tabStore.topNavPath}/${tabStore.tabActivateKey}`
          genAntdMenuFirstSelectObject(navList.value[0], selectLeftNav)
        } else {
          getObjectByLeftNavPath(routeStore.dynamicRouteMap[currentLeftNav])
        }
      }
      // 否则，默认选中第一个叶子节点
      else {
        genAntdMenuFirstSelectObject(navList.value[0], selectLeftNav)
      }
      break
    }
  }
  tabStore.updateLeftNav = false
}

// 监听来着TopNav组件的菜单项选中事件
watch(() => tabStore.topNavPath, (value) => {
  topNavPath = value
  initLeftNavList()
})

// 监听来着HistoryTab组件的tab变更事件
mitt.on(CHANGE_TAB, () => {
  topNavPath = tabStore.topNavPath
  initLeftNavList()
})

onMounted(() => {
  initCurrentRouteAndVar()
  initLeftNavList()
})


</script>

<style scoped>
* {
  user-select: none;
}

:deep(.ant-menu) {
  height: 100%;
}

.left-menu {
  box-shadow: 5px 0 5px 0 rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 999;
}
</style>
