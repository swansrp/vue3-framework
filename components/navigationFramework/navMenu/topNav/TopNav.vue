<template>
  <!--顶部导航菜单支持多级菜单-->
  <a-menu
    v-model:selected-keys="keys.selectedKeys"
    :items="menuItems"
    mode="horizontal"
    @select="selectNav"
  />
</template>

<script lang="ts" setup>
import * as Icons from '@ant-design/icons-vue'

import { NavListType } from '../type'

import router from '@/framework/router'
import pinia from '@/framework/store'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'

const navigationStore = useNavigationStore(pinia)
const routeStore = useRouteStore(pinia)
// 本组件中，使用接口返回的path字段作为a-menu组件的key
// 因为path会被用于leftNav和HistoryTab等组件，用于当前顶部导航的判断
const iconMap: Record<string, any> = Icons

// 自动计算选中状态，响应式驱动，无需watch
const selectedKeys = computed({
  get: () => {
    // 根据旧版本逻辑：
    // - 根路径时使用 topNavPath
    // - 非根路径时使用 currentRoutePath(完整路径)
    const currentRoutePath = routeStore.currentRoutePath
    const activeTopNavPath = navigationStore.activeTopNavPath
    
    // 如果是根路径，使用 activeTopNavPath
    if (currentRoutePath === '' || currentRoutePath === '/') {
      return activeTopNavPath ? [activeTopNavPath] : []
    }
    
    // 非根路径：使用完整路径(支持子菜单高亮)
    return [currentRoutePath]
  },
  set: (_value: string[]) => {
    // Ant Design Menu 会在用户点击时尝试设置这个值
    // 我们忽略它，因为状态由路由自动计算
  }
})

// 直接使用 computed 作为 v-model 的值，不再包装
const keys = reactive({
  selectedKeys: selectedKeys
})

// 转换后的菜单项数据，用于a-menu渲染
const menuItems = computed(() => {
  return routeStore.dynamicRoute.map(item => convertToMenuItem(item))
})

/**
 * 将NavListType转换为Ant Design Vue菜单项格式
 */
const convertToMenuItem = (item: NavListType, parentPaths: string[] = []) => {
  const fullPathArray = [...parentPaths, item.path || '']
  const fullPath = fullPathArray.join('/').replace(/\/\/+/g, '/') // 用 / 拼接并去掉重复 //
  const menuItem: any = {
    key: fullPath,
    path: fullPath, // ✅ 保留完整路径以便跳转
    label: item.meta?.title || item.title || item.name || '未命名',
    title: item.meta?.title || item.title || item.name || '未命名'
  }

  const loadIcon = (name: string) => {
    try {
      const IconComp = iconMap[name]
      return IconComp ? h(IconComp) : null
    } catch (e) {
      console.warn('icon not found:', name, e)
      return null
    }
  }

  // 处理图标
  if (item.icon) {
    try {
      const IconComp = loadIcon(item.icon)
      menuItem.icon = () => (IconComp ? h(IconComp) : null)
    } catch (e) {
      console.warn(`无法解析图标: ${ item.icon }`, e)
    }
  }

  // 处理子菜单
  if (item.children && item.children.length > 0) {
    menuItem.children = item.children.map(child => convertToMenuItem(child, fullPathArray))
  }
  menuItem.onTitleClick = () => clickNav(fullPath, menuItem.children)

  return menuItem
}

const clickNav = (path: any, children: any) => {
  let child = children[0] || {}
  while (isNotEmpty(child.children)) {
    child = child.children[0]
  }
  if (path.split('/').length === 1 && isNotEmpty(child)) {
    router.push(`/${ child.path }`)
  }
}

const selectNav = (obj: any) => {
  // 添加安全检查
  if (!obj || !obj.key) {
    console.warn('selectNav: obj or obj.key is undefined', obj)
    return
  }
  
  const selectedKey = obj.key
  const fullPath = '/' + selectedKey
  
  // 使用完整路径判断是否为外链
  const fullPathForFrame = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath
  const isFrame = routeStore.routePathIsFrameMap[fullPathForFrame]
  
  if (isFrame) {
    // 外链菜单：在打开外链前设置导航状态(保持原窗口菜单高亮)
    // 设置 topNav 高亮
    navigationStore.setActiveTopNav(selectedKey.split('/')[0])
    // 设置 leftNav 高亮(如果是子菜单)
    if (selectedKey.includes('/')) {
      // 查找对应的节点
      const routePath = fullPathForFrame
      const node = routeStore.dynamicRouteMap[routePath]
      if (node && node.key) {
        navigationStore.setActiveLeftNav(node.key, [])
      }
    }
    
    // 打开外链
    const urlArray = fullPath.split('http')
    if(urlArray.length > 1) {
      const routeUrl = fullPath.substring(urlArray[0].length)
      window.open(routeUrl, '_blank')
    } else {
      const routeUrl = router.resolve({ path: fullPath })
      window.open(routeUrl.href, '_blank')
    }
  } else {
    // 普通导航：只负责跳转，状态由路由守卫同步
    router.push(fullPath)
  }
}



</script>
<style scoped>
* {
  user-select: none;
}

/* 顶部菜单容器 */
:global(.ant-menu.ant-menu-horizontal) {
  line-height: 50px !important;
  background: transparent !important;
  border-bottom: none !important;
  padding: 0 var(--space-xl) !important;
  box-shadow: none !important;
  position: relative !important;
  z-index: 10 !important;
  display: flex !important;
}

/* 顶部菜单项基础样式 — 精致药丸造型 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu) {
  margin: 9px 3px !important;
  border-radius: 16px !important;
  background: var(--topnav-item-bg) !important;
  box-shadow: none !important;
  transition: all var(--transition-fast) !important;
  position: relative !important;
  height: 32px !important;
  line-height: 32px !important;
  border: none !important;
  padding: 0 14px !important;
  color: var(--topnav-text) !important;
  font-weight: 400 !important;
  font-size: 14px !important;
}

/* 悬停效果：背景色加深 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item:hover),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu:hover),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-active) {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
}

/* 激活状态：强调色背景 + 微边框 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item-selected),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-selected) {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  font-weight: 500 !important;
  box-shadow: inset 0 0 0 1px var(--accent-mid) !important;
}

/* 隐藏 Ant Design 默认底部边框 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item-selected::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-selected::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu::after) {
  display: none !important;
  border-bottom: none !important;
}

/* submenu 标题 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu .ant-menu-submenu-title) {
  padding: 0 !important;
  color: inherit !important;
}

/* 下拉菜单容器 */
:global(.ant-menu-submenu-popup) {
  background: var(--bg-elevated) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
  border: 1px solid var(--border-subtle) !important;
  margin-top: 4px !important;
  overflow: hidden !important;
}

:global(.ant-menu-submenu-popup .ant-menu) {
  padding: 4px !important;
  background: transparent !important;
}

/* 下拉菜单项 */
:global(.ant-menu-submenu-popup .ant-menu-item) {
  margin: 2px 4px !important;
  border-radius: var(--radius-sm) !important;
  padding: 0 var(--space-lg) !important;
  height: 36px !important;
  line-height: 36px !important;
  color: var(--topnav-text) !important;
  transition: all var(--transition-fast) !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  width: 100% !important;
}

:global(.ant-menu-submenu-popup .ant-menu-submenu .ant-menu-submenu-title) {
  margin: 2px 4px !important;
  border-radius: var(--radius-sm) !important;
  padding: 0 var(--space-lg) !important;
  height: 36px !important;
  line-height: 36px !important;
  color: var(--topnav-text) !important;
  transition: all var(--transition-fast) !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  width: 100% !important;
}

:global(.ant-menu-submenu-popup .ant-menu-item:hover),
:global(.ant-menu-submenu-popup .ant-menu-submenu-title:hover) {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
}

:global(.ant-menu-submenu-popup .ant-menu-item-selected) {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  font-weight: 500 !important;
  box-shadow: inset 3px 0 0 var(--topnav-dropdown-selected-indicator) !important;
}

/* 响应式 */
@media (max-width: 768px) {
  :global(.ant-menu.ant-menu-horizontal > .ant-menu-item),
  :global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu) {
    padding: 0 var(--space-sm) !important;
    font-size: 13px !important;
  }
}
</style>