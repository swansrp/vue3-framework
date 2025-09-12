import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { getComponent, useRouteStore } from '@/framework/store/route'
import { getQueryObject } from '@/framework/network/utils'
import { enterFirstDynamicRoute } from '@/framework/router/utils'
import { HOME, I_MAIN_CONTENT, MAIN_CONTENT } from '@/framework/utils/constant'
import {
  createRouter,
  createWebHashHistory,
  LocationQueryRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw
} from 'vue-router'

// 开发环境添加Mock配置
if (process.env.NODE_ENV === 'development') {
  // 导入并初始化Mock配置
  import('@/framework/views/MainContent/dashboard/mock').then(mockModule => {
    console.log('Mock配置已加载并初始化')
  }).catch(error => {
    console.error('Mock配置加载失败:', error)
  })
}

const tabStore = useTabStore(pinia)
const NotFound = () => import('@/framework/views/NotFound/index.vue')
const MainContent = () => import('@/framework/views/MainContent/index.vue')
const Home = () => import('@/framework/views/MainContent/WelcomeHome/index.vue')
const PersonalDashboard = () => import('@/framework/views/MainContent/dashboard/index.vue')
let enableEnterFirstDynamicRoute = true

const staticRoutes: Array<RouteRecordRaw> = [
  // 留了一个登录界面，用于管理员配置用户权限
  {
    path: '/login',
    component: () => import('@/framework/views/Login/index.vue'),
    meta: { public: true }
  },
  {
    path: I_MAIN_CONTENT,
    name: MAIN_CONTENT,
    component: MainContent,
    children: [
      {
        path: HOME,
        name: HOME,
        component: Home
      }
    ]
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
  router.addRoute({path: path, name: path, component: getComponent(component), meta: { public: true }})
}

// 添加个人仪表盘路由的函数
export const addDashboardRoute = (tableId: string) => {
  const path = `/dashboard/${tableId}`
  router.addRoute(MAIN_CONTENT, {
    path: path,
    name: `Dashboard-${tableId}`,
    component: PersonalDashboard,
    props: true
  })
}

export const setEnableEnterFirstDynamicRoute = (enable: boolean) => {
  enableEnterFirstDynamicRoute = enable
}

export const enterDynamicRoute = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // console.trace('enterDynamicRoute', enableEnterFirstDynamicRoute)
  // 根据是否进入Home页，判断是否需要展示左侧导航菜单
  // 当然，这样判断是不好的，没有考虑顶部导航没有左侧导航的情况
  tabStore.isNeedLeftNav = to.path !== `${I_MAIN_CONTENT}/${HOME}`
  const routeStore = useRouteStore(pinia)
  const routePath = to.path.replace(I_MAIN_CONTENT + '/', '')
  const currentPageIsFrame = routeStore.routePathIsFrameMap[routePath]
  tabStore.isNeedNav = !currentPageIsFrame

  if (routeStore.getLastRoute.fullPath === to.fullPath && routeStore.isBlockReturn) {
    routeStore.blockReturnHandler()
    next(false)
    return
  }
  routeStore.setLastRoute(from)
  routeStore.setCurrentRoute(to)
  // 设定MainContent组件的默认路由为第一个动态路由
  if (enableEnterFirstDynamicRoute && (to.path === '/' || to.path === I_MAIN_CONTENT || to.path === `${I_MAIN_CONTENT}/`)) {
    const leftNavPath = enterFirstDynamicRoute()
    const queryStr = routeStore.dynamicRouteMap[leftNavPath] ? routeStore.dynamicRouteMap[leftNavPath].query : null
    const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
    next({name: leftNavPath, query})
  } else {
    next()
  }
}

export default router