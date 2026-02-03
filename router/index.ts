import {
  createRouter,
  createWebHashHistory,
  LocationQueryRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw
} from 'vue-router'

import { getQueryObject } from '@/framework/network/utils'
import { enterFirstDynamicRoute } from '@/framework/router/utils'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { getComponent, useRouteStore } from '@/framework/store/route'

/**
 * 根路径访问模式枚举
 * - 'disabled': 禁用自动跳转，停留在根路径
 * - 'auto': 自动进入第一个动态路由页面
 * - 'showMenuOnly': 显示顶部和左侧菜单，但不自动选中左侧菜单项，显示默认内容
 */
export type RootPathMode = 'disabled' | 'auto' | 'showMenuOnly'

const tabStore = useTabStore(pinia)
const NotFound = () => import('@/framework/views/NotFound/index.vue')
// 默认使用 framework 层的 MainContent，可以通过 setMainContentComponent 方法替换
let MainContent = () => import('@/framework/views/MainContent/index.vue')
let rootPathMode: RootPathMode = 'auto'

const staticRoutes: Array<RouteRecordRaw> = [
  // 留了一个登录界面，用于管理员配置用户权限
  {
    path: '/login',
    component: () => import('@/framework/views/Login/index.vue'),
    meta: { public: true }
  },
  {
    path: '/wiki',
    component: () => import('@/framework/views/MainContent/wiki/index.vue'),
    meta: { public: true }
  },
  {
    path: '/wiki/view',
    component: () => import('@/framework/views/MainContent/wiki/view.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Root',
    component: MainContent
  },
  {
    path: '/:catchAll(.*)',
    name: 'NotFound',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes
})

export const createStaticRoutes = (path: string, component: string, metaPublic = true) => {
  router.addRoute({ path: path, name: path, component: getComponent(component), meta: { public: metaPublic } })
}

/**
 * 设置自定义的 MainContent 组件（用于业务层注入）
 * @param component - 组件的动态导入函数
 */
export const setMainContentComponent = (component: () => Promise<any>) => {
  MainContent = component
  // 更新根路由的组件
  const rootRoute = router.getRoutes().find(route => route.path === '/')
  if (rootRoute) {
    router.removeRoute('Root')
    router.addRoute({
      path: '/',
      name: 'Root',
      component: MainContent
    })
  }
}

/**
 * 设置根路径访问模式
 * @param mode - 'disabled' | 'auto' | 'showMenuOnly'
 * @deprecated 使用 setRootPathMode 代替
 */
export const setEnableEnterFirstDynamicRoute = (enable: boolean) => {
  rootPathMode = enable ? 'auto' : 'disabled'
}

/**
 * 设置根路径访问模式
 * @param mode - 'disabled' | 'auto' | 'showMenuOnly'
 */
export const setRootPathMode = (mode: RootPathMode) => {
  rootPathMode = mode
}

/**
 * 处理根路径的特殊逻辑
 * 集中化处理三种根路径模式
 */
function handleRootPath(
  navigationStore: ReturnType<typeof useNavigationStore>,
  routeStore: ReturnType<typeof useRouteStore>,
  next: NavigationGuardNext
) {
  switch (rootPathMode) {
    case 'auto':
      // 自动进入第一个路由
      navigationStore.setShowLeftNav(false)
      const leftNavPath = enterFirstDynamicRoute()
      const queryStr = routeStore.dynamicRouteMap[leftNavPath] ? routeStore.dynamicRouteMap[leftNavPath].query : null
      const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
      next({ path: `/${leftNavPath}`, query })
      break
      
    case 'showMenuOnly':
      // 显示菜单但不选中
      navigationStore.setShowLeftNav(true)
      navigationStore.setShowNav(true)
      
      const topPath = routeStore.dynamicRoute[0]?.path
      if (topPath) {
        navigationStore.setActiveTopNav(topPath)
      }
      
      // 清空左侧菜单选中和标签页
      navigationStore.clearAllTabs()
      next()
      break
      
    case 'disabled':
    default:
      navigationStore.setShowLeftNav(false)
      next()
      break
  }
}

export const enterDynamicRoute = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const navigationStore = useNavigationStore(pinia)
  const routeStore = useRouteStore(pinia)
  const routePath = to.path.replace('/', '')
  const currentPageIsFrame = routeStore.routePathIsFrameMap[routePath]
  
  // 设置导航显示状态
  navigationStore.setShowNav(!currentPageIsFrame)
  // 保持旧的tabStore兼容
  tabStore.isNeedNav = !currentPageIsFrame

  // 阻止返回的处理
  if (routeStore.getLastRoute.fullPath === to.fullPath && routeStore.isBlockReturn) {
    routeStore.blockReturnHandler()
    next(false)
    return
  }
  
  // 更新路由状态
  routeStore.setLastRoute(from)
  routeStore.setCurrentRoute(to)
  
  // 根据路径类型处理
  if (to.path === '/') {
    // 根路径集中处理
    handleRootPath(navigationStore, routeStore, next)
    return
  } else {
    // 非根路径：统一从路由同步导航状态
    navigationStore.setShowLeftNav(true)
    // 保持旧的tabStore兼容
    tabStore.isNeedLeftNav = true
    
    // 通过navigationStore统一同步状态
    navigationStore.syncFromRoute(to)
    
    next()
  }
}

export default router

