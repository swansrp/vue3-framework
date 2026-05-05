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
        <div
          class="arrow"
          :class="collapsed ? 'arrow-right' : 'arrow-left'"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { LocationQueryRaw, useRouter } from 'vue-router'


import SubNav from '@/framework/components/navigationFramework/navMenu/subNav/SubNav.vue'
import { getTitlePathByKey } from '@/framework/hooks/initKeysAndRouteInNav'
import { getQueryObject } from '@/framework/network/utils'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'


const router = useRouter()
const navigationStore = useNavigationStore(pinia)
const tabStore = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

// 响应式计算菜单列表 - 替代 initLeftNavList
const navList = computed(() => {
  if (!navigationStore.activeTopNavPath) return []
  
  const topNode = routeStore.dynamicRoute.find(
    node => node.path === navigationStore.activeTopNavPath
  )
  return topNode?.children || []
})

// 响应式计算选中状态
const selectedKeys = computed(() => 
  navigationStore.activeLeftNavKey ? [navigationStore.activeLeftNavKey] : []
)

// 响应式计算展开状态
const openKeys = computed({
  get: () => navigationStore.openLeftNavKeys,
  set: (keys: string[]) => {
    navigationStore.openLeftNavKeys = keys
  }
})

// 将 selectedKeys 和 openKeys 绑定到 keys 对象(兼容现有模板)
// 注意: 不能直接把 computed 放入 reactive,需要用 ref 包装
const keys = {
  get selectedKeys() {
    return selectedKeys.value
  },
  set selectedKeys(value: string[]) {
    // computed 是只读的,通过 navigationStore 设置
    if (value.length > 0) {
      navigationStore.activeLeftNavKey = value[0]
    }
  },
  get openKeys() {
    return openKeys.value
  },
  set openKeys(value: string[]) {
    navigationStore.openLeftNavKeys = value
  }
}

const collapsed = ref(navigationStore.ui.leftNavCollapsed)

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
    
    // 保存宽度到 store
    tabStore.setLeftNavWidth(menuWidth.value)
    
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
  tabStore.setLeftNavCollapsed(collapsed.value)
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
    // 获取当前激活的顶部导航路径
    const topNavPath = navigationStore.activeTopNavPath || routeStore.currentTopNav
    
    // 如果没有topNavPath，说明还未初始化，返回错误
    if (!topNavPath) {
      console.error('[LeftNav] getFullPath: topNavPath is empty!')
      return `/${path}`
    }
    
    // 如果 key 为 undefined，使用回退逻辑
    if (!item.key) {
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
      return `/${topNavPath}/${pathArray.join('/')}`
    }
    // 如果没找到，回退到简单拼接
    return `/${topNavPath}/${path}`
  }
  
  const fullPath = getFullPath(menuItemData, navList.value)
  
  const query = (menuItemData.query ? getQueryObject(menuItemData.query) : {}) as LocationQueryRaw
  // 使用完整路径判断是否为外链
  const fullPathForFrame = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath
  const isFrame = routeStore.routePathIsFrameMap[fullPathForFrame] || routeStore.routePathIsFrameMap[path]
  if (isFrame && triggerIsFrame) {
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
    // 使用path进行导航，而不是name
    router.push({
      path: fullPath,
      query
    })
  }
}

// 同步collapsed状态到store
watch(collapsed, (value) => {
  navigationStore.setLeftNavCollapsed(value)
})

// 同步menuWidth到store
watch(menuWidth, (value) => {
  navigationStore.setLeftNavWidth(value)
})

onMounted(() => {
  // 初始化时同步宽度到 store
  navigationStore.setLeftNavWidth(menuWidth.value)
})


</script>

<style scoped>
* {
  user-select: none;
}

.left-nav-container {
  position: relative;
  height: 100%;
  background: var(--left-nav-bg);
  backdrop-filter: var(--left-nav-blur);
  -webkit-backdrop-filter: var(--left-nav-blur);
  border-right: var(--left-nav-border);
  transition: width var(--transition-normal);
  box-shadow: var(--shadow-nav-divider);
  z-index: 10;
}

:deep(.ant-menu) {
  height: 100%;
  background: transparent !important;
}

.left-menu {
  position: relative;
  z-index: 999;
  transition: width var(--transition-normal);
}

/* ====== 菜单项基础样式 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item) {
  margin: 4px 10px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  padding: 0 12px;
  height: 34px;
  line-height: 34px;
  color: var(--nav-text);
  position: relative;
  /* 每项底部添加微弱的水平分隔线，提升视觉层次感 */
  border-bottom: 1px solid var(--nav-item-separator);
}

/* 最后一项去除分隔线，避免多余边框 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:last-of-type) {
  border-bottom: none;
}

/* 未选中菜单项悬停 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
  transform: translateX(2px);
}

/* ====== 选中菜单项 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected) {
  background: var(--nav-selected-bg) !important;
  color: var(--nav-selected-color) !important;
  font-weight: var(--nav-selected-font-weight);
  position: relative;
  border: var(--nav-selected-border);
  box-shadow: var(--nav-selected-shadow);
  transform: var(--nav-selected-transform);
  text-shadow: var(--nav-selected-text-shadow);
}

/* 选中态左侧指示线 + 发光 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: -2px;
  bottom: -2px;
  width: var(--nav-selected-indicator-width);
  background: linear-gradient(180deg,
    rgba(64, 169, 255, 1) 0%,
    rgba(24, 144, 255, 1) 20%,
    rgba(64, 169, 255, 1) 50%,
    rgba(24, 144, 255, 1) 80%,
    rgba(64, 169, 255, 1) 100%);
  border-radius: 0 3px 3px 0;
  pointer-events: none;
  animation: var(--nav-indicator-animation);
}

/* 选中态图标颜色 + 发光 + 放大 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item-selected .anticon) {
  color: var(--nav-selected-color) !important;
  filter: drop-shadow(0 0 12px rgba(24, 144, 255, 1)) drop-shadow(0 0 6px rgba(64, 169, 255, 0.8));
  transform: scale(1.15);
  transition: all 0.15s ease;
}

/* 普通菜单项图标 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item .anticon) {
  color: var(--nav-text);
  transition: all var(--transition-fast);
  margin-right: 10px;
  font-size: 16px;
}

/* 悬停图标颜色 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item:not(.ant-menu-item-selected):hover .anticon) {
  color: var(--nav-text-hover);
  transform: scale(1.02);
}

/* ====== 子菜单标题 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  margin: 4px 10px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  padding: 0 12px;
  height: 34px;
  line-height: 34px;
  color: var(--nav-text);
  border-bottom: 1px solid var(--nav-item-separator);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-open > .ant-menu-submenu-title) {
  color: var(--nav-text-hover);
}

/* 子菜单展开箭头 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title .ant-menu-submenu-arrow) {
  color: var(--nav-text-tertiary);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title:hover .ant-menu-submenu-arrow) {
  color: var(--nav-text);
}

/* ====== 菜单文字 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-item),
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu-title) {
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.2px;
}

/* ====== 收起状态 ====== */
:deep(.ant-menu-dark.ant-menu-inline-collapsed .ant-menu-item) {
  margin: 2px 8px;
  text-align: center;
  padding: 0 12px;
  height: 34px;
  line-height: 34px;
}

/* ====== 子菜单列表 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu) {
  margin: 0;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-sub) {
  background: transparent;
  padding: 0;
  position: relative;
}

/* 子菜单左侧垂直引导线 - 增加层次感和连接感 */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-sub::before) {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--nav-line);
  pointer-events: none;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item) {
  height: 34px;
  line-height: 34px;
  font-size: 13px;
  border-radius: var(--radius-md);
  padding: 0 12px 0 28px;
  color: var(--nav-text);
  margin: 4px 8px 4px 12px;
  border-bottom: 1px solid var(--nav-item-separator);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item:last-of-type) {
  border-bottom: none;
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item:not(.ant-menu-item-selected):hover) {
  background: var(--nav-bg-hover) !important;
  color: var(--nav-text-hover) !important;
  transform: translateX(2px);
}

/* ====== 子菜单选中项 ====== */
:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected) {
  background: var(--nav-selected-bg) !important;
  color: var(--nav-selected-color) !important;
  font-weight: var(--nav-selected-font-weight);
  position: relative;
  border: var(--nav-selected-border);
  box-shadow: var(--nav-selected-shadow);
  transform: var(--nav-selected-transform);
  text-shadow: var(--nav-selected-text-shadow);
}

:deep(.ant-menu-dark.ant-menu-inline .ant-menu-submenu .ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: -2px;
  bottom: -2px;
  width: var(--nav-selected-indicator-width);
  background: linear-gradient(180deg,
    rgba(64, 169, 255, 1) 0%,
    rgba(24, 144, 255, 1) 20%,
    rgba(64, 169, 255, 1) 50%,
    rgba(24, 144, 255, 1) 80%,
    rgba(64, 169, 255, 1) 100%);
  border-radius: 0 3px 3px 0;
  pointer-events: none;
  animation: var(--nav-indicator-animation);
}

/* ====== 拖拽控制条 ====== */
.resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  z-index: 900;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.resize-handle::before {
  content: '';
  position: absolute;
  top: 0;
  right: 1px;
  width: 1px;
  height: 100%;
  background: transparent;
  transition: background var(--transition-fast);
}

.resize-handle:hover::before {
  background: var(--accent-mid);
}

.resize-indicator {
  display: none;
}

/* ====== 收起/展开按钮 ====== */
.toggle-button {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 48px;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  user-select: none;
  opacity: 0;
}

.left-nav-container:hover .toggle-button {
  opacity: 1;
}

/* 展开状态 */
.toggle-expanded {
  background: var(--nav-toggle-bg);
  border-radius: 4px 0 0 4px;
  right: 0;
}

.toggle-expanded:hover {
  background: var(--nav-toggle-bg-hover);
}

/* 收起状态 */
.toggle-collapsed {
  background: var(--nav-toggle-bg);
  border-radius: 0 4px 4px 0;
  left: 0;
}

.toggle-collapsed:hover {
  background: var(--nav-toggle-bg-hover);
}

/* 箭头图标 */
.arrow {
  width: 0;
  height: 0;
  border-style: solid;
  transition: all var(--transition-fast);
}

.arrow-left {
  border-width: 5px 6px 5px 0;
  border-color: transparent var(--nav-toggle-arrow) transparent transparent;
}

.arrow-right {
  border-width: 5px 0 5px 6px;
  border-color: transparent transparent transparent var(--nav-toggle-arrow);
}

.toggle-button:hover .arrow-left {
  border-color: transparent var(--nav-toggle-arrow-hover) transparent transparent;
}

.toggle-button:hover .arrow-right {
  border-color: transparent transparent transparent var(--nav-toggle-arrow-hover);
}

.toggle-button:active {
  transform: translateY(-50%) scale(0.95);
}
</style>
