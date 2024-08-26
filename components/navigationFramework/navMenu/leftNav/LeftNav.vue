<template>
  <div>
    <a-menu
      v-if="tabStore.isNeedLeftNav"
      v-model:openKeys="keys.openKeys"
      v-model:selectedKeys="keys.selectedKeys"
      :inline-collapsed="collapsed"
      :style="{width: collapsed ? '50px' : '250px'}"
      class="left-menu"
      mode="inline"
      theme="dark"
      @select="selectLeftNav">
      <template v-for="item in navList">
        <template v-if="!item.children || item.children?.length === 0">
          <a-menu-item
            :id="item.key" :key="item.key" :path="item.name || item.path" :query="item.query"
            :title="item.title">
            <template #icon>
              <Icon :icon="item.icon" />
            </template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </template>
        <template v-else>
          <sub-nav :id="item.key" :key="item.key" :subNavList="item" />
        </template>
      </template>
    </a-menu>
    <a-button
      v-if="collapsed" style="position: absolute;left: 20px; bottom: 0; z-index: 1000" type="text"
      @click="toggleCollapsed">
      <RightOutlined style="color: rgba(255,255,255,0.7)" />
    </a-button>
    <a-button
      v-else style="position: absolute;left: 215px; bottom: 0; z-index: 1000" type="text"
      @click="toggleCollapsed">
      <LeftOutlined style="color: rgba(255,255,255,0.7)" />
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import mitt from '@/framework/utils/mitt'
import { LocationQueryRaw, useRouter } from 'vue-router'
import { NavListType } from '../type'
import { useTabStore } from '@/framework/store/nav'
import { useRouteStore } from '@/framework/store/route'
import { CHANGE_TAB, HOME, MAIN_CONTENT } from '@/framework/utils/constant'
import { genAntdMenuFirstSelectObject, getTitlePathByKey } from '@/framework/hooks/initKeysAndRouteInNav'
import SubNav from '@/framework/components/navigationFramework/navMenu/subNav/SubNav.vue'
import { getQueryObject } from '@/framework/network/utils'
import pinia from '@/framework/store'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'


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

const selectLeftNav = (obj: any, triggerIsFrame = true) => {
  // console.trace('selectLeftNav', obj, navList.value)
  // tab跳转过来走name 自动走path
  let path = obj.item.name || obj.item.path
  let selectedKey = obj.key ? obj.key : obj.item.key
  const fullPath = `/${MAIN_CONTENT}/${path}`
  const query = (obj.item.query ? getQueryObject(obj.item.query) : {}) as LocationQueryRaw
  const isFrame = routeStore.routePathIsFrameMap[path]
  if (isFrame && triggerIsFrame) {
    console.log('====== 外链 ============')
    const routeUrl = router.resolve({path: fullPath, query})
    window.open(routeUrl.href, '_blank')
  } else {
    router.push({
      path: fullPath,
      query
    }).then(() => {
      keys.selectedKeys = [selectedKey]
      const {titlePath, keyPath} = getTitlePathByKey(navList.value, selectedKey)
      keys.openKeys = keyPath
      // 选中左侧菜单后， 为面包屑提供数据
      tabStore.setTitlePath(titlePath)
      // 选中左侧菜单后，增加对应的tab信息
      // const tabName = titlePath[titlePath.length - 1]
      tabStore.addHistoryTab(obj.item, fullPath)
    })
  }
}

const getObjectByLeftNavPath = (currentNode: NavListType) => {
  selectLeftNav({item: currentNode}, false)
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
        // console.log('currentLeftNav', topNavPath, currentLeftNav)
        if (tabStore.updateLeftNav) {
          // const targetPath = `/${MAIN_CONTENT}/${tabStore.topNavPath}/${tabStore.tabActivateKey}`
          genAntdMenuFirstSelectObject(navList.value[0], selectLeftNav)
        } else {
          // console.log('getObjectByLeftNavPath', routeStore.dynamicRouteMap[[topNavPath, currentLeftNav].join('/')])
          getObjectByLeftNavPath(routeStore.dynamicRouteMap[[topNavPath, currentLeftNav].join('/')])
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
