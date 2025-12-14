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
import { getComponent, useRouteStore } from '@/framework/store/route'


const tabStore = useTabStore(pinia)
const NotFound = () => import('@/framework/views/NotFound/index.vue')
const MainContent = () => import('@/framework/views/MainContent/index.vue')
let enableEnterFirstDynamicRoute = true

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

export const createStaticRoutes = (path: string, component: string) => {
  router.addRoute({ path: path, name: path, component: getComponent(component), meta: { public: true } })
}

export const setEnableEnterFirstDynamicRoute = (enable: boolean) => {
  enableEnterFirstDynamicRoute = enable
}

export const enterDynamicRoute = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 根据是否进入动态路由，判断是否需要展示左侧导航菜单
  tabStore.isNeedLeftNav = to.path !== '/'
  const routeStore = useRouteStore(pinia)
  const routePath = to.path.replace('/', '')
  const currentPageIsFrame = routeStore.routePathIsFrameMap[routePath]
  tabStore.isNeedNav = !currentPageIsFrame

  if (routeStore.getLastRoute.fullPath === to.fullPath && routeStore.isBlockReturn) {
    routeStore.blockReturnHandler()
    next(false)
    return
  }
  routeStore.setLastRoute(from)
  routeStore.setCurrentRoute(to)
  
  // 设定默认路由为第一个动态路由
  if (enableEnterFirstDynamicRoute && to.path === '/') {
    const leftNavPath = enterFirstDynamicRoute()
    const queryStr = routeStore.dynamicRouteMap[leftNavPath] ? routeStore.dynamicRouteMap[leftNavPath].query : null
    const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
    next({ path: `/${leftNavPath}`, query })
  } else {
    next()
  }
}

export default router

