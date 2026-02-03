import {
  createRouter,
  createWebHashHistory,
  LocationQueryRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw
} from 'vue-router'

import { getQueryObject } from '@/framework/network/utils'
import { enterFirstDynamicRoute, selectFirstTopNavOnly } from '@/framework/router/utils'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
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

export const enterDynamicRoute = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  console.log('[DEBUG] enterDynamicRoute 开始执行', {
    toPath: to.path,
    fromPath: from.path,
    rootPathMode,
    toFullPath: to.fullPath
  })
  
  const routeStore = useRouteStore(pinia)
  const routePath = to.path.replace('/', '')
  const currentPageIsFrame = routeStore.routePathIsFrameMap[routePath]
  tabStore.isNeedNav = !currentPageIsFrame

  if (routeStore.getLastRoute.fullPath === to.fullPath && routeStore.isBlockReturn) {
    console.log('[DEBUG] 检测到阻止返回，取消导航')
    routeStore.blockReturnHandler()
    next(false)
    return
  }
  routeStore.setLastRoute(from)
  routeStore.setCurrentRoute(to)
  
  // 根据不同模式处理根路径访问
  if (to.path === '/') {
    console.log('[DEBUG] 访问根路径，当前模式:', rootPathMode)
    switch (rootPathMode) {
      case 'auto':
        console.log('[DEBUG] auto 模式：自动进入第一个动态路由')
        // 自动进入第一个动态路由
        tabStore.isNeedLeftNav = false
        const leftNavPath = enterFirstDynamicRoute()
        const queryStr = routeStore.dynamicRouteMap[leftNavPath] ? routeStore.dynamicRouteMap[leftNavPath].query : null
        const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
        console.log('[DEBUG] 跳转到:', `/${leftNavPath}`)
        next({ path: `/${leftNavPath}`, query })
        break
      case 'showMenuOnly':
        console.log('[DEBUG] showMenuOnly 模式：显示菜单但不自动选中')
        // 显示菜单但不自动选中，显示默认内容
        tabStore.isNeedLeftNav = true
        tabStore.isNeedNav = true
        selectFirstTopNavOnly()
        console.log('[DEBUG] 停留在根路径，显示默认内容')
        next()
        break
      case 'disabled':
      default:
        console.log('[DEBUG] disabled 模式：不做任何处理')
        // 禁用模式，不做任何处理
        tabStore.isNeedLeftNav = to.path !== '/'
        next()
        break
    }
  } else {
    console.log('[DEBUG] 访问非根路径:', to.path)
    tabStore.isNeedLeftNav = true
    next()
  }
}

export default router

