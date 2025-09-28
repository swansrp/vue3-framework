<template>
  <div class="left-nav-container" :style="{width: collapsed ? '50px' : `${menuWidth}px`}">
    <a-menu
      v-if="tabStore.isNeedLeftNav"
      v-model:openKeys="keys.openKeys"
      v-model:selectedKeys="keys.selectedKeys"
      :inline-collapsed="collapsed"
      :style="{width: collapsed ? '50px' : `${menuWidth}px`}"
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
    
    <!-- 拖拽调整宽度的控制条 -->
    <div 
      v-if="!collapsed"
      class="resize-handle"
      @mousedown="startResize"
      @mouseover="handleHover"
      @mouseleave="handleLeave"
      :class="{hovering: isHovering}"
    >
      <div class="resize-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
    
    <!-- 收起/展开按钮 -->
    <div 
      class="toggle-button"
      :class="{
        'toggle-collapsed': collapsed,
        'toggle-expanded': !collapsed,
        'hovering': toggleHovering
      }"
      :style="{
        left: collapsed ? '25px' : `${menuWidth - 14}px`
      }"
      @click="toggleCollapsed"
      @mouseenter="toggleHovering = true"
      @mouseleave="toggleHovering = false"
    >
      <div class="toggle-icon">
        <div class="arrow" :class="collapsed ? 'arrow-right' : 'arrow-left'"></div>
      </div>
    </div>
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
import { isNotEmpty } from '@/framework/utils/common'


const router = useRouter()
const tabStore = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

let {topNavPath} = tabStore
let navList = ref([] as Array<NavListType>)
const keys = reactive({openKeys: [] as Array<string>, selectedKeys: [] as Array<string>})
const collapsed = ref(false)

// 拖拽相关状态
const menuWidth = ref(250)
const minWidth = 150
const maxWidth = 800
const isHovering = ref(false)
const toggleHovering = ref(false)
const isDragging = ref(false)

// 拖拽功能
const startResize = (e: MouseEvent) => {
  if (e.button !== 0) return // 只响应左键
  e.stopPropagation()
  
  isDragging.value = true
  const startX = e.clientX
  const startWidth = menuWidth.value
  
  const handleMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return
    
    const deltaX = moveEvent.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    
    requestAnimationFrame(() => {
      menuWidth.value = newWidth
    })
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // 触发resize事件通知其他组件
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
  }
  
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('mouseup', handleMouseUp)
}

const handleHover = () => {
  isHovering.value = true
}

const handleLeave = () => {
  isHovering.value = false
}
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
  let resizeEvent = new Event('resize')
  window.dispatchEvent(resizeEvent)
}
/*
const initCurrentRouteAndVar = () => {
  // console.log('initCurrentRouteAndVar')
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
*/

const selectLeftNav = (obj: any, triggerIsFrame = true) => {
  // tab跳转过来走name 自动走path
  let path = obj.item.name || obj.item.path
  const fullPath = `/${MAIN_CONTENT}/${path}`
  // console.trace('selectLeftNav', obj, navList.value, fullPath)
  const query = (obj.item.query ? getQueryObject(obj.item.query) : {}) as LocationQueryRaw
  const isFrame = routeStore.routePathIsFrameMap[path]
  if (isFrame && triggerIsFrame) {
    console.log('====== 外链 ============')
  
    // 外链菜单：在打开外链前立即设置菜单高亮状态
    const selectedKey = obj.item.key
    keys.selectedKeys = [selectedKey]
    const {titlePath, keyPath} = getTitlePathByKey(navList.value, selectedKey)
    keys.openKeys = keyPath
    // 更新面包屑数据
    tabStore.setTitlePath(titlePath)
    // 更新tab信息
    const tabData = { ...obj.item, fullPath }
    tabStore.addHistoryTab(tabData, fullPath)
    
    // 打开外链
    const urlArray = fullPath.split('http')
    if(urlArray.length > 1) {
      const routeUrl = fullPath.substring(urlArray[0].length)
      window.open(routeUrl, '_blank')
    } else {
      const routeUrl = router.resolve({path: fullPath, query})
      window.open(routeUrl.href, '_blank')
    }
  } else {
    router.push({
      path: fullPath,
      query
    })
  }
}

watch(
  () => routeStore.currentRouteNode,
  (value) => {
    if(value && isNotEmpty(value.component)) {
      const selectedKey = value.key
      keys.selectedKeys = [selectedKey]
      const {titlePath, keyPath} = getTitlePathByKey(navList.value, selectedKey)
      keys.openKeys = keyPath
      // 选中左侧菜单后， 为面包屑提供数据
      tabStore.setTitlePath(titlePath)
      // 选中左侧菜单后，增加对应的tab信息
      // const tabName = titlePath[titlePath.length - 1]
      const fullPath = `/${MAIN_CONTENT}/${value.name}`
      const tabData = { ...value, fullPath }
      tabStore.addHistoryTab(tabData, fullPath)
    }
  },{
    immediate: true
  }
)

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
          const query = router.currentRoute.value.fullPath.split('?')[1]
          const currentNode = routeStore.dynamicRouteMap[[topNavPath, currentLeftNav].join('/')]
          if(isNotEmpty(query)) {
            currentNode.query = query
          }
          getObjectByLeftNavPath(currentNode)
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
  // initCurrentRouteAndVar()
  initLeftNavList()
})


</script>

<style scoped>
* {
  user-select: none;
}

.left-nav-container {
  position: relative;
  height: 100%;
  transition: width 0.3s ease;
}

:deep(.ant-menu) {
  height: 100%;
}

.left-menu {
  box-shadow: 5px 0 5px 0 rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 999;
  transition: width 0.3s ease;
}

/* 拖拽控制条样式 */
.resize-handle {
  position: absolute;
  top: 50%;
  right: -6px;
  width: 12px;
  height: 100%;
  transform: translateY(-50%);
  cursor: ew-resize;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
  opacity: 0;
}

.resize-handle:hover,
.resize-handle.hovering {
  opacity: 1;
  background: rgba(24, 144, 255, 0.2);
  box-shadow: 0 0 16px rgba(24, 144, 255, 0.4);
}

.resize-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.resize-indicator .dot {
  width: 3px;
  height: 3px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.resize-handle:hover .dot,
.resize-handle.hovering .dot {
  background: rgba(24, 144, 255, 0.8);
  transform: scale(1.2);
}

/* 收起/展开按钮样式 */
.toggle-button {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 60px;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 1002;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  user-select: none;
}

/* 展开状态的按钮（在菜单右侧）*/
.toggle-expanded {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px 0 0 6px;
  right: 0;
}

.toggle-expanded:hover,
.toggle-expanded.hovering {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 16px rgba(24, 144, 255, 0.4);
}

/* 收起状态的按钮（在黑色背景上）*/
.toggle-collapsed {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0 6px 6px 0;
  left: 0;
}

.toggle-collapsed:hover,
.toggle-collapsed.hovering {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 0 16px rgba(24, 144, 255, 0.3);
}

/* 箭头图标 */
.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.arrow {
  width: 0;
  height: 0;
  border-style: solid;
  transition: all 0.2s ease;
}

.arrow-left {
  border-width: 6px 8px 6px 0;
  border-color: transparent rgba(255, 255, 255, 0.7) transparent transparent;
}

.arrow-right {
  border-width: 6px 0 6px 8px;
  border-color: transparent transparent transparent rgba(255, 255, 255, 0.7);
}

/* 悬停时箭头颜色加深 */
.toggle-button:hover .arrow-left,
.toggle-button.hovering .arrow-left {
  border-color: transparent rgba(24, 144, 255, 0.9) transparent transparent;
}

.toggle-button:hover .arrow-right,
.toggle-button.hovering .arrow-right {
  border-color: transparent transparent transparent rgba(24, 144, 255, 0.9);
}

/* 点击时的缩放效果 */
.toggle-button:active {
  transform: translateY(-50%) scale(0.95);
}
</style>
