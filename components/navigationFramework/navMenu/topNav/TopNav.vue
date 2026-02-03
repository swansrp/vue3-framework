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
  set: (value: string[]) => {
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

/* 顶部菜单容器样式 - 简洁水平布局 */
:global(.ant-menu.ant-menu-horizontal) {
  line-height: 50px !important;
  background: transparent !important;
  border-bottom: none !important;
  padding: 0 20px !important;
  box-shadow: none !important;
  position: relative !important;
  z-index: 10 !important;
  display: flex !important;
  gap: 4px !important;
}

/* 顶部菜单项基础样式 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu) {
  margin: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: all 0.25s ease !important;
  position: relative !important;
  height: 50px !important;
  line-height: 50px !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  padding: 0 20px !important;
  color: #303133 !important;
  font-weight: 400 !important;
  font-size: 14px !important;
}

/* 悬停效果 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item:hover),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu:hover),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-active) {
  background: transparent !important;
  color: #1890ff !important;
  border-bottom-color: rgba(24, 144, 255, 0.4) !important;
}

/* 激活状态 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item-selected),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-selected) {
  background: transparent !important;
  color: #1890ff !important;
  font-weight: 500 !important;
  border-bottom-color: #1890ff !important;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.25) !important;
}

/* 隐藏 Ant Design 默认的底部边框，避免双层蓝线 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item-selected::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu-selected::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-item::after),
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu::after) {
  display: none !important;
  border-bottom: none !important;
}

/* submenu 标题样式 */
:global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu .ant-menu-submenu-title) {
  padding: 0 !important;
  color: inherit !important;
}

/* 下拉菜单容器样式 */
:global(.ant-menu-submenu-popup) {
  background: #ffffff !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
  margin-top: 4px !important;
  overflow: hidden !important;
}

/* 下拉菜单内容容器 */
:global(.ant-menu-submenu-popup .ant-menu) {
  padding: 0 !important;
}

/* 下拉菜单项样式 */
:global(.ant-menu-submenu-popup .ant-menu-item) {
  margin: 0 !important;
  border-radius: 0 !important;
  padding: 0 20px !important;
  height: 40px !important;
  line-height: 40px !important;
  color: #303133 !important;
  transition: all 0.2s ease !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  width: 100% !important;
}

/* 下拉菜单中的submenu标题样式 */
:global(.ant-menu-submenu-popup .ant-menu-submenu .ant-menu-submenu-title) {
  margin: 0 !important;
  border-radius: 0 !important;
  padding: 0 20px !important;
  height: 40px !important;
  line-height: 40px !important;
  color: #303133 !important;
  transition: all 0.2s ease !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  width: 100% !important;
}

/* 下拉菜单项悬停 */
:global(.ant-menu-submenu-popup .ant-menu-item:hover),
:global(.ant-menu-submenu-popup .ant-menu-submenu-title:hover) {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06), rgba(64, 169, 255, 0.08)) !important;
  color: #1890ff !important;
  font-weight: 500 !important;
}

/* 下拉菜单项选中 */
:global(.ant-menu-submenu-popup .ant-menu-item-selected) {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(64, 169, 255, 0.15)) !important;
  color: #1890ff !important;
  font-weight: 500 !important;
  box-shadow: inset 3px 0 0 #1890ff !important;
}

/* 响应式 */
@media (max-width: 768px) {
  :global(.ant-menu.ant-menu-horizontal > .ant-menu-item),
  :global(.ant-menu.ant-menu-horizontal > .ant-menu-submenu) {
    padding: 0 16px !important;
    font-size: 13px !important;
  }
}
</style>