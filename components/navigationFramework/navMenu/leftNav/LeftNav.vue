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
import { CHANGE_TAB, MAIN_CONTENT } from '@/framework/utils/constant'
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
  // 添加安全检查
  if (!obj) {
    console.warn('selectLeftNav: obj is undefined', obj)
    return
  }
  
  // 处理 Ant Design Menu 的 select 事件参数格式
  let menuItemData = null
  let selectedKey = null
  
  if (obj.key !== undefined) {
    // 来自菜单点击事件，obj.key 是选中的菜单项 key
    selectedKey = obj.key
    
    // 需要根据 key 从 navList 中查找对应的菜单数据
  // 递归查找菜单项目
  const findMenuItemByKey = (nodes: any[], targetKey: string): any => {
    for (const node of nodes) {
      if (node.key === targetKey || node.key == targetKey || String(node.key) === String(targetKey)) {
        return node
      }
      if (node.children && node.children.length > 0) {
        const result = findMenuItemByKey(node.children, targetKey)
        if (result) return result
      }
    }
    return null
  }
    
    menuItemData = findMenuItemByKey(navList.value, selectedKey)
    if (!menuItemData) {
      console.warn('Cannot find menu item data for key:', selectedKey)
      return
    }
  } else if (obj.item) {
    // 来自其他调用（如初始化），obj.item 直接包含菜单数据
    menuItemData = obj.item
    selectedKey = obj.item.key
  } else {
    // 来自其他调用，obj 直接是菜单数据
    menuItemData = obj
    selectedKey = obj.key
  }
  
  if (!menuItemData) {
    console.warn('selectLeftNav: menuItemData is undefined')
    return
  }
  
  // tab跳转过来走name 自动走path
  let path = menuItemData.name || menuItemData.path
  
  // 重要：对于多级菜单，需要从topNav开始，层层递归拼接所有路径上的path
  // 获取从根节点到当前节点的完整路径
  const getFullPath = (item: any, navList: any[]): string => {
    // 如果 key 为 undefined，使用回退逻辑
    if (!item.key) {
      const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
      return `/${topNavPath}/${path}`
    }
    
    // 递归查找目标节点，在向下递归过程中累积路径
    const findPathToItem = (nodes: any[], targetKey: string, currentPath: string[] = []): string[] | null => {
      for (const node of nodes) {
        // 将当前节点的path加入路径
        const newPath = [...currentPath, node.path]
        
        // 如果当前节点就是目标节点，返回完整路径
        // 处理key类型不匹配问题（数字 vs 字符串）
        if (node.key === targetKey || node.key == targetKey || String(node.key) === String(targetKey)) {
          return newPath
        }
        
        // 如果有子节点，将当前路径传递给子节点递归查找
        if (node.children && node.children.length > 0) {
          const result = findPathToItem(node.children, targetKey, newPath)
          if (result) return result
        }
      }
      return null
    }
    
    const pathArray = findPathToItem(navList, item.key)
    if (pathArray) {
      // 从topNav开始拼接完整路径
      const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
      return `/${topNavPath}/${pathArray.join('/')}`
    }
    // 如果没找到，回退到简单拼接
    const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
    return `/${topNavPath}/${path}`
  }
  
  const fullPath = getFullPath(menuItemData, navList.value)
  
  const query = (menuItemData.query ? getQueryObject(menuItemData.query) : {}) as LocationQueryRaw
  // 使用完整路径判断是否为外链
  const fullPathForFrame = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath
  const isFrame = routeStore.routePathIsFrameMap[fullPathForFrame] || routeStore.routePathIsFrameMap[path]
  if (isFrame && triggerIsFrame) {
    console.log('====== 外链 ============')
  
    // 外链菜单：在打开外链前立即设置菜单高亮状态
    keys.selectedKeys = [selectedKey]
    const {titlePath, keyPath} = getTitlePathByKey(navList.value, selectedKey)
    keys.openKeys = keyPath
    
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
    console.log('Navigation to:', fullPath)
    // 使用path进行导航，而不是name
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
      // 对于多级菜单，必须使用树形结构递归查找完整路径
      const getFullPathForWatch = (value: any): string => {
        // 使用与selectLeftNav相同的递归查找逻辑
        const findPathToItem = (nodes: any[], targetKey: string, currentPath: string[] = []): string[] | null => {
          for (const node of nodes) {
            // 将当前节点的path加入路径
            const newPath = [...currentPath, node.path]
            
            // 如果当前节点就是目标节点，返回完整路径
            // 处理key类型不匹配问题（数字 vs 字符串）
            if (node.key === targetKey || node.key == targetKey || String(node.key) === String(targetKey)) {
              return newPath
            }
            
            // 如果有子节点，将当前路径传递给子节点递归查找
            if (node.children && node.children.length > 0) {
              const result = findPathToItem(node.children, targetKey, newPath)
              if (result) return result
            }
          }
          return null
        }
        
        const pathArray = findPathToItem(navList.value, value.key)
        if (pathArray) {
          // 从topNav开始拼接完整路径
          const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
          return `/${topNavPath}/${pathArray.join('/')}`
        }
        
        // 如果没找到，回退到简单拼接
        const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
        return `/${topNavPath}/${value.name}`
      }
      
      const fullPath = getFullPathForWatch(value)
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
  // 如果没有topNavPath，说明当前在根路径，不需要展示左侧菜单
  if (!topNavPath) return
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
          if (currentNode) {
            if(isNotEmpty(query)) {
              currentNode.query = query
            }
            getObjectByLeftNavPath(currentNode)
          } else {
            console.warn('currentNode not found in dynamicRouteMap for path:', [topNavPath, currentLeftNav].join('/'))
            console.log('Available routes in dynamicRouteMap:', Object.keys(routeStore.dynamicRouteMap))
            console.log('Falling back to first menu item')
            genAntdMenuFirstSelectObject(navList.value[0], selectLeftNav)
          }
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

/* 左侧菜单项基础样式优化 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item) {
  margin: 2px 6px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  /* 未选中时的微妙阴影 */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.03) 0%, 
    rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 未选中菜单项悬停效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08) 0%, 
    rgba(255, 255, 255, 0.04) 100%) !important;
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 20px rgba(24, 144, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

/* 选中菜单项样式 - 发光效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected) {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.2) 0%, 
    rgba(24, 144, 255, 0.1) 100%) !important;
  color: #ffffff !important;
  border: 1px solid rgba(24, 144, 255, 0.4) !important;
  /* 选中时的发光效果 */
  box-shadow: 
    0 0 20px rgba(24, 144, 255, 0.3),
    0 4px 16px rgba(24, 144, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
  position: relative;
}

/* 选中菜单项的内部光晕 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    transparent 50%, 
    rgba(24, 144, 255, 0.1) 100%);
  border-radius: 5px;
  pointer-events: none;
}

/* 选中菜单项图标样式 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected .anticon) {
  color: #ffffff !important;
  filter: drop-shadow(0 0 6px rgba(24, 144, 255, 0.6));
  transform: scale(1.05);
  transition: all 0.3s ease;
}

/* 普通菜单项图标样式 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item .anticon) {
  color: rgba(255, 255, 255, 0.75);
  transition: all 0.3s ease;
  margin-right: 12px;
}

/* 悬停时图标样式 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover .anticon) {
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.02);
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
}

/* 子菜单样式优化 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  margin: 2px 6px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* 未选中时的微妙阴影 */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.03) 0%, 
    rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 子菜单悬停效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover) {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.08) 0%, 
    rgba(255, 255, 255, 0.04) 100%) !important;
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 20px rgba(24, 144, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

/* 展开的子菜单标题样式 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-open > .ant-menu-submenu-title) {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.15) 0%, 
    rgba(24, 144, 255, 0.08) 100%) !important;
  border-color: rgba(24, 144, 255, 0.3);
  box-shadow: 
    0 0 16px rgba(24, 144, 255, 0.2),
    0 2px 8px rgba(24, 144, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 子菜单箭头图标 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title .ant-menu-submenu-arrow) {
  color: rgba(255, 255, 255, 0.75);
  transition: all 0.3s ease;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover .ant-menu-submenu-arrow) {
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
}

/* 菜单文字样式 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item),
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.3px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 收起状态下的菜单项样式 */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item) {
  margin: 2px 4px;
  text-align: center;
  padding: 0 16px;
}

/* 收起状态下选中项的发光效果 */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item-selected) {
  box-shadow: 
    0 0 20px rgba(24, 144, 255, 0.4),
    0 4px 16px rgba(24, 144, 255, 0.3),
    inset 0 0 10px rgba(24, 144, 255, 0.2);
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
