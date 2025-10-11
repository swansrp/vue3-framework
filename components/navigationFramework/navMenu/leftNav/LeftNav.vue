<template>
  <div
    class="left-nav-container"
    :style="{width: collapsed ? '50px' : `${menuWidth}px`}"
  >
    <a-menu
      v-if="tabStore.isNeedLeftNav"
      v-model:open-keys="keys.openKeys"
      v-model:selected-keys="keys.selectedKeys"
      :inline-collapsed="collapsed"
      :style="{width: collapsed ? '50px' : `${menuWidth}px`}"
      class="left-menu"
      mode="inline"
      theme="dark"
      @select="selectLeftNav"
    >
      <template v-for="item in navList">
        <template v-if="!item.children || item.children?.length === 0">
          <a-menu-item
            :id="item.key"
            :key="item.key"
            :path="item.name || item.path"
            :query="item.query"
            :title="item.title"
          >
            <template #icon>
              <Icon :icon="item.icon" />
            </template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </template>
        <template v-else>
          <sub-nav
            :id="item.key"
            :key="item.key"
            :sub-nav-list="item"
          />
        </template>
      </template>
    </a-menu>
    
    <!-- 拖拽调整宽度的控制条 -->
    <div 
      v-if="!collapsed"
      class="resize-handle"
      :class="{hovering: isHovering}"
      @mousedown="startResize"
      @mouseover="handleHover"
      @mouseleave="handleLeave"
    >
      <div class="resize-indicator">
        <div class="dot" />
        <div class="dot" />
        <div class="dot" />
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
        <div
          class="arrow"
          :class="collapsed ? 'arrow-right' : 'arrow-left'"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { LocationQueryRaw, useRouter } from 'vue-router'

import { NavListType } from '../type'

import SubNav from '@/framework/components/navigationFramework/navMenu/subNav/SubNav.vue'
import { genAntdMenuFirstSelectObject, getTitlePathByKey } from '@/framework/hooks/initKeysAndRouteInNav'
import { getQueryObject } from '@/framework/network/utils'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useRouteStore } from '@/framework/store/route'
import { isNotEmpty } from '@/framework/utils/common'
import { CHANGE_TAB } from '@/framework/utils/constant'
import mitt from '@/framework/utils/mitt'


const router = useRouter()
const tabStore = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

let { topNavPath } = tabStore
let navList = ref([] as Array<NavListType>)
const keys = reactive({ openKeys: [] as Array<string>, selectedKeys: [] as Array<string> })
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
    const { keyPath } = getTitlePathByKey(navList.value, selectedKey)
    keys.openKeys = keyPath
    
    // 打开外链
    const urlArray = fullPath.split('http')
    if(urlArray.length > 1) {
      const routeUrl = fullPath.substring(urlArray[0].length)
      window.open(routeUrl, '_blank')
    } else {
      const routeUrl = router.resolve({ path: fullPath, query })
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
      
      // 优化：使用全局路由映射来计算菜单展开状态，避免依赖navList.value
      const getMenuKeysFromGlobalRoute = () => {
        const currentRoutePath = router.currentRoute.value.fullPath.slice(1).split('?')[0]
        const pathSegments = currentRoutePath.split('/')
        
        // 如果有多级路径，需要找到所有父级菜单的key来展开
        const openKeys: string[] = []
        const titlePath: string[] = []
        
        // 从全局路由中寻找当前路径对应的完整层级
        if (pathSegments.length > 1) {
          // 构建逐级递增的路径来查找父级菜单
          for (let i = 1; i < pathSegments.length; i++) {
            const partialPath = pathSegments.slice(0, i + 1).join('/')
            const routeNode = routeStore.dynamicRouteMap[partialPath]
            if (routeNode) {
              openKeys.push(routeNode.key)
              titlePath.push(routeNode.title)
            }
          }
        }
        
        // 如果通过全局路由没找到合适的openKeys，回退到navList查找
        if (openKeys.length === 0 && navList.value.length > 0) {
          const { titlePath: fallbackTitlePath, keyPath: fallbackKeyPath } = getTitlePathByKey(navList.value, selectedKey)
          return {
            openKeys: fallbackKeyPath,
            titlePath: fallbackTitlePath
          }
        }
        
        return {
          openKeys,
          titlePath
        }
      }
      
      const { openKeys, titlePath } = getMenuKeysFromGlobalRoute(selectedKey)
      keys.openKeys = openKeys
      
      // 选中左侧菜单后， 为面包屑提供数据
      tabStore.setTitlePath(titlePath)
      
      // 选中左侧菜单后，增加对应的tab信息
      // 对于多级菜单，必须从全局路由映射中查找完整路径
      const getFullPathForWatch = (value: any): string => {
        // 使用全局的路由映射查找完整路径，避免依赖当前navList状态
        const currentRoutePath = router.currentRoute.value.fullPath.slice(1).split('?')[0]
        
        // 如果在全局路由映射中找到了对应的节点，直接使用当前路径
        if (routeStore.dynamicRouteMap[currentRoutePath]) {
          return `/${currentRoutePath}`
        }
        
        // 如果没找到，尝试从value构建路径
        if (value.name) {
          const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
          return `/${topNavPath}/${value.name}`
        }
        
        // 最后的回退方案
        const topNavPath = routeStore.currentTopNav || tabStore.topNavPath
        return `/${topNavPath}/${value.path || ''}`
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
  selectLeftNav({ item: currentNode }, false)
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
          const query = router.currentRoute.value.fullPath.split('?')[1]
          const currentNode = routeStore.dynamicRouteMap[[topNavPath, currentLeftNav].join('/')]
          if (currentNode) {
            if(isNotEmpty(query)) {
              currentNode.query = query
            }
            getObjectByLeftNavPath(currentNode)
          } else {
            console.warn('currentNode not found in dynamicRouteMap for path:', [topNavPath, currentLeftNav].join('/'))
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

/* 左侧菜单项基础样式优化 - 统一缩小边框间距 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item) {
  margin: 2px 6px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  padding: 0 16px;
  height: 36px;
  line-height: 34px;
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

/* 选中菜单项样式 - 强化发光效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected) {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.35) 0%, 
    rgba(24, 144, 255, 0.25) 50%,
    rgba(24, 144, 255, 0.15) 100%) !important;
  color: #ffffff !important;
  border: 1px solid rgba(24, 144, 255, 0.6) !important;
  /* 增强的发光效果 */
  box-shadow: 
    0 0 25px rgba(24, 144, 255, 0.5),
    0 0 12px rgba(24, 144, 255, 0.4),
    0 6px 20px rgba(24, 144, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(24, 144, 255, 0.3);
  transform: translateY(-2px);
  position: relative;
  font-weight: 600;
}

/* 选中菜单项的内部光晕 - 增强效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.2) 0%, 
    rgba(24, 144, 255, 0.1) 30%,
    transparent 70%, 
    rgba(24, 144, 255, 0.15) 100%);
  border-radius: 5px;
  pointer-events: none;
}

/* 添加左侧高亮边框 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected::after) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, 
    rgba(24, 144, 255, 1) 0%, 
    rgba(24, 144, 255, 0.8) 50%,
    rgba(24, 144, 255, 1) 100%);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px rgba(24, 144, 255, 0.6);
  pointer-events: none;
}

/* 选中菜单项图标样式 - 增强效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected .anticon) {
  color: #ffffff !important;
  filter: drop-shadow(0 0 8px rgba(24, 144, 255, 0.8)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.4));
  transform: scale(1.1);
  transition: all 0.3s ease;
  text-shadow: 0 0 8px rgba(24, 144, 255, 0.6);
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

/* 子菜单样式优化 - 统一缩小边框间距 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  margin: 2px 6px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 16px;
  height: 36px;
  line-height: 34px;
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

/* 收起状态下的菜单项样式 - 统一缩小边框间距 */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item) {
  margin: 2px 6px;
  text-align: center;
  padding: 0 12px;
  height: 36px;
  line-height: 34px;
}

/* 额外的子菜单间距优化 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu) {
  margin: 2px 0;
}

/* 子菜单内容的间距优化 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-sub) {
  background: transparent;
  padding: 0;
}

/* 子菜单项目的样式优化 - 修复出格问题 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item) {
  height: 36px;
  line-height: 34px;
  font-size: 14px;
  border-radius: 6px;
  padding: 0 16px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.02) 0%, 
    rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

/* 子菜单项目悬停效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.06) 0%, 
    rgba(255, 255, 255, 0.03) 100%) !important;
  transform: translateY(-1px);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 12px rgba(24, 144, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

/* 子菜单选中项样式 - 增强效果 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected) {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.3) 0%, 
    rgba(24, 144, 255, 0.2) 50%,
    rgba(24, 144, 255, 0.12) 100%) !important;
  color: #ffffff !important;
  border: 1px solid rgba(24, 144, 255, 0.5) !important;
  box-shadow: 
    0 0 20px rgba(24, 144, 255, 0.4),
    0 0 10px rgba(24, 144, 255, 0.3),
    0 4px 16px rgba(24, 144, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  font-weight: 600;
  position: relative;
}

/* 子菜单选中项的左侧高亮边框 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected::after) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, 
    rgba(24, 144, 255, 1) 0%, 
    rgba(24, 144, 255, 0.8) 50%,
    rgba(24, 144, 255, 1) 100%);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.6);
  pointer-events: none;
}

/* 收起状态下选中项的强化发光效果 */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item-selected) {
  box-shadow: 
    0 0 30px rgba(24, 144, 255, 0.6),
    0 0 15px rgba(24, 144, 255, 0.5),
    0 6px 20px rgba(24, 144, 255, 0.4),
    inset 0 0 15px rgba(24, 144, 255, 0.3);
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.4) 0%, 
    rgba(24, 144, 255, 0.25) 100%) !important;
  border: 2px solid rgba(24, 144, 255, 0.7) !important;
  transform: translateY(-2px) scale(1.02);
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
  z-index: 900;
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
  width: 15px;
  height: 60px;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 999;
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
