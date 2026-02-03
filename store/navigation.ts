import { defineStore } from 'pinia'
import { RouteLocationNormalized } from 'vue-router'

import { TabType } from '@/framework/components/navigationFramework/historyTab/type'
import pinia from '@/framework/store'
import { useRouteStore } from '@/framework/store/route'

/**
 * 统一的导航状态管理Store
 * 负责管理TopNav、LeftNav、HistoryTab的所有状态
 * 实现单一数据源和响应式驱动
 */
export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    // 当前激活的顶部导航path
    activeTopNavPath: '',
    
    // 当前激活的左侧导航key
    activeLeftNavKey: '',
    
    // 当前展开的左侧导航keys
    openLeftNavKeys: [] as string[],
    
    // 历史标签页列表
    historyTabs: [] as TabType[],
    
    // 当前激活的标签页key
    activeTabKey: '',
    
    // 面包屑路径
    breadcrumbPath: [] as string[],
    
    // UI控制状态
    ui: {
      leftNavCollapsed: false,
      leftNavWidth: 250,
      showLeftNav: true,
      showNav: true
    }
  }),
  
  getters: {
    // 当前激活的tab对象
    activeTab: (state) => {
      return state.historyTabs.find(tab => tab.key === state.activeTabKey)
    },
    
    // 标签页key的映射
    tabKeyMap: (state) => {
      return Object.fromEntries(
        state.historyTabs.map(tab => [tab.key, tab])
      )
    },
    
    // 获取标签页的Set用于快速查找
    tabKeySet: (state) => {
      return new Set(state.historyTabs.map(tab => tab.key))
    }
  },
  
  actions: {
    // 设置顶部导航激活状态
    setActiveTopNav(path: string) {
      console.log('[NavigationStore] setActiveTopNav:', path)
      this.activeTopNavPath = path
    },
    
    // 设置左侧导航激活状态
    setActiveLeftNav(key: string, openKeys: string[] = []) {
      console.log('[NavigationStore] setActiveLeftNav:', { key, openKeys })
      this.activeLeftNavKey = key
      this.openLeftNavKeys = openKeys
    },
    
    // 设置面包屑路径
    setBreadcrumbPath(path: string[]) {
      this.breadcrumbPath = path
    },
    
    // 添加历史标签页
    addHistoryTab(tab: TabType) {
      const key = String(tab.key)
      const existingIndex = this.historyTabs.findIndex(t => t.key === key)
      
      if (existingIndex === -1) {
        this.historyTabs.push({ ...tab, key })
      } else {
        // 更新已存在的tab
        this.historyTabs[existingIndex] = { ...tab, key }
      }
      
      this.activeTabKey = key
    },
    
    // 移除历史标签页
    removeHistoryTab(key: string): string | null {
      const index = this.historyTabs.findIndex(t => t.key === key)
      if (index === -1) return null
      
      this.historyTabs.splice(index, 1)
      
      // 返回应该激活的下一个tab
      if (this.activeTabKey === key) {
        const nextIndex = index > 0 ? index - 1 : 0
        const nextKey = this.historyTabs[nextIndex]?.key || null
        return nextKey
      }
      return this.activeTabKey
    },
    
    // 从路由同步导航状态
    syncFromRoute(route: RouteLocationNormalized) {
      const routeStore = useRouteStore(pinia)
      const segments = route.path.slice(1).split('/')
      
      // 设置顶部导航
      if (segments.length >= 1 && segments[0]) {
        this.activeTopNavPath = segments[0]
      }
      
      // 使用路由路径直接查找节点,而不是依赖 currentRouteNode getter
      const routePath = route.path.slice(1).split('?')[0]
      const currentNode = routeStore.dynamicRouteMap[routePath]
      
      if (currentNode) {
        this.activeLeftNavKey = currentNode.key || ''
        
        // 计算openKeys和breadcrumb
        this.updateLeftNavKeysFromRoute(route)
        
        // 添加到历史标签
        const fullPath = route.path
        const tabData: TabType = {
          ...currentNode,
          fullPath,
          key: currentNode.key
        }
        this.addHistoryTab(tabData)
      }
    },
    
    // 从路由更新左侧菜单的展开状态和面包屑
    updateLeftNavKeysFromRoute(route: RouteLocationNormalized) {
      const routeStore = useRouteStore(pinia)
      const currentRoutePath = route.fullPath.slice(1).split('?')[0]
      const pathSegments = currentRoutePath.split('/')

      const openKeys: string[] = []
      const titlePath: string[] = []
      
      // 构建逐级递增的路径来查找父级菜单
      if (pathSegments.length > 1) {
        for (let i = 1; i < pathSegments.length; i++) {
          const partialPath = pathSegments.slice(0, i + 1).join('/')
          const routeNode = routeStore.dynamicRouteMap[partialPath]
          if (routeNode) {
            openKeys.push(routeNode.key)
            titlePath.push(routeNode.title)
          }
        }
      }
      
      this.openLeftNavKeys = openKeys
      this.breadcrumbPath = titlePath
    },
    
    // 清除所有标签页(返回首页时)
    clearAllTabs() {
      console.log('[NavigationStore] clearAllTabs')
      this.historyTabs = []
      this.activeTabKey = ''
      this.activeLeftNavKey = ''
      this.openLeftNavKeys = []
      this.breadcrumbPath = []
    },
    
    // UI控制方法
    setLeftNavCollapsed(collapsed: boolean) {
      this.ui.leftNavCollapsed = collapsed
    },
    
    setLeftNavWidth(width: number) {
      this.ui.leftNavWidth = width
    },
    
    setShowLeftNav(show: boolean) {
      this.ui.showLeftNav = show
    },
    
    setShowNav(show: boolean) {
      this.ui.showNav = show
    },
    
    // 获取路由目标(用于标签页切换)
    getRouteTarget(key: string) {
      const tab = this.tabKeyMap[key]
      if (tab) {
        return {
          path: tab.fullPath,
          query: tab.query
        }
      } else {
        return {
          path: '/'
        }
      }
    }
  }
})
