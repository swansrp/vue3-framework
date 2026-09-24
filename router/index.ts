import { ref } from 'vue'
import {
  createRouter,
  createWebHashHistory,
  LocationQueryRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw
} from 'vue-router'

import { getQueryObject } from '@/framework/network/utils'
import { enterFirstDynamicRoute, getFirstVisibleTopNav } from '@/framework/router/utils'
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

// ==================== 静态路由 keep-alive ====================
// 框架自带 keep-alive 只活在 MainContent 壳内（:include 由菜单节点 isCache 收集），
// 而 createStaticRoutes 注册的顶级整页路由由根 <router-view /> 渲染、在壳外 ⇒ 菜单配缓存管不到它们。
// 接口：注册时声明 keepAliveName（须与 SFC defineOptions({ name }) 一致），
// 业务层根 App.vue 用 getStaticKeepAliveNames() 作为 <keep-alive :include> 消费（未消费则该声明无副作用）。
const staticKeepAliveNames = ref<string[]>([])
export const getStaticKeepAliveNames = () => staticKeepAliveNames.value

export const createStaticRoutes = (path: string, component: string, metaPublic = true, keepAliveName?: string) => {
  const comp = getComponent(component)
  router.addRoute({ path: path, name: path, component: comp, meta: { public: metaPublic } })
  if (keepAliveName) {
    staticKeepAliveNames.value.push(keepAliveName)
    if (import.meta.env.DEV && comp) {
      // include 按组件名匹配，不匹配则 keep-alive 静默失效——dev 下解析真实组件名比对，报错给到控制台
      comp().then((module: any) => {
        const realName = module.default?.name || module.default?.__name
        if (realName !== keepAliveName) {
          console.warn(`[router] 静态路由 ${path} 组件名(${realName})与 keepAliveName(${keepAliveName})不一致，keep-alive 不会生效；请在该 SFC 加 defineOptions({ name: '${keepAliveName}' })`)
        }
      }).catch(() => {})
    }
  }
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
 * 设置默认内容组件: 访问根路径 '/' 时, content-container 内显示该组件
 * 不占路由、不进菜单树, 各业务系统在 main.ts 中注册自己的默认内容(如工作台内容)
 * @param component - 组件的动态导入函数, 传 null 可取消注册
 */
let defaultContentComponent: (() => Promise<any>) | null = null
export const setDefaultContentComponent = (component: (() => Promise<any>) | null) => {
  defaultContentComponent = component
}

export const getDefaultContentComponent = () => defaultContentComponent

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
  if(routeStore.dynamicRoute.length === 0) {
    next()
  }
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
      
      // 顶部选中第一个"顶部菜单栏可见"的菜单（跳过"系统管理"）
      const topPath = getFirstVisibleTopNav()?.path
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
  // 归一化路径：去掉首尾斜杠，保证 /forecast 与 /forecast/ 行为一致
  const routePath = to.path.replace(/^\/+/, '').replace(/\/+$/, '')
  // 目录节点（父节点只占层级、无自身组件）
  const dirNode = routeStore.dynamicRouteMap[routePath]
  const isDirectory = !!(dirNode && dirNode.children && dirNode.children.length > 0)
  // 仅"叶子外链页"隐藏整个导航走裸页；子系统父目录不算裸页，照常显示框架
  const currentPageIsFrame = !!routeStore.routePathIsFrameMap[routePath] && !isDirectory
  
  // 子系统形态：从路由推导（无需 URL / sessionStorage）
  // 规则：当前路由第一段所属的顶层菜单 isFrame=1 → 本标签页所有子路由都以子系统形态渲染
  // （顶层 isFrame 菜单通过 window.open 新开标签，其下所有页面天然属于该子系统）
  const topSegment = routePath.split('/')[0]
  const isSubSystem = topSegment !== '' && !!routeStore.routePathIsFrameMap[topSegment]
  navigationStore.setLayoutMode(isSubSystem ? 'subSystem' : 'full')
  
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
    // 目录路径处理：父节点无自身页面（只占层级）
    // - auto 模式：自动下钻进入第一个叶子页面并选中（与根路径 auto 行为一致）
    // - 非 auto 模式：仅显示框架与左侧菜单、不选中第一个（内容区留空，等用户点击）
    if (rootPathMode === 'auto' && isDirectory && dirNode) {
      let node = dirNode
      const pathArray = [routePath]
      while (node.children && node.children.length > 0) {
        node = node.children[0]
        pathArray.push(node.path)
      }
      const leafPath = pathArray.join('/')
      const queryStr = routeStore.dynamicRouteMap[leafPath] ? routeStore.dynamicRouteMap[leafPath].query : null
      const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
      next({ path: `/${ leafPath }`, query, replace: true })
      return
    }
    
    // 非根路径：统一从路由同步导航状态
    navigationStore.setShowLeftNav(true)
    // 保持旧的tabStore兼容
    tabStore.isNeedLeftNav = true
    
    // 通过navigationStore统一同步状态
    navigationStore.syncFromRoute(to)
    
    next()
  }
}

// ==================== 登录门禁（框架统一持有，业务只声明策略） ====================
// 为什么在这里注册、而不是让各项目在 main.ts 里自己 router.beforeEach：
// vue-router 在 app.use(router)（install）时就发起首次导航，并【同步采集】那一刻已有的守卫队列——
// 晚注册的守卫不参与首屏导航，表现为"会话过期时首屏白屏：既不渲染也不跳登录页"
// （2026-09-22 实测；InkHub 与脚手架模板当初都是 install 后才注册，同错序）。
// 守卫在本模块加载（createRouter 之后）即注册 ⇒ 必然参与包括首屏在内的每一次导航，
// "注册顺序"从此不再是调用方要记住的约束。注册点放在 enterDynamicRoute 之后是刻意的：
// 模块加载即完成注册（必然早于 install），同时避免引用后置声明。
//
// opt-in：未调用 configureLoginGuard 的项目，守卫直接放行——现有项目零变化（向后兼容）。

export interface LoginGuardOptions {
  /** 同步快判是否已登录（通常读登录 store 的 hasLogin）；true 时不再探活，直接进业务路由 */
  isLoggedIn: () => boolean
  /** 探活：确认会话有效性并完成登录副作用（写 hasLogin、拉用户信息/动态路由）。必须幂等；并发导航由守卫去重 */
  probe: () => Promise<boolean>
  /** 已登录后的业务副作用（如加载空间列表）。fresh=true 表示本次刚完成新鲜探活（可借此强刷缓存） */
  onAuthenticated?: (fresh: boolean) => void
  /** 未登录去向：缺省 next(loginPath)；提供时由它接管跳转（如 SSO 整页跳转），守卫只取消当前导航 */
  loginEntry?: (to: RouteLocationNormalized) => void
  /** 登录页路径（默认 '/login'；同时用于缺省公开判定） */
  loginPath?: string
  /** 公开路由判定（缺省：to.path === loginPath 或 to.meta.public） */
  isPublic?: (to: RouteLocationNormalized) => boolean
  /** 连续探活失败上限（默认 3）：超过后直接去登录页、不再探活（防"守卫↔登录页"紧循环打接口） */
  maxFailures?: number
  /** 单次探活超时毫秒（默认 8000）：探活悬挂不能把守卫永久挂住（那也是"白屏且零请求"的成因） */
  timeoutMs?: number
}

let loginGuardOptions: LoginGuardOptions | null = null
let loginProbeInFlight: Promise<boolean> | null = null
let loginProbeFailures = 0

/** 配置登录门禁（幂等：重复调用只是更新策略，不会重复注册守卫）。
 *  建议在 app.use(router) 之前调用——守卫虽从模块加载起就存在，早配置能让首次导航即用上策略。 */
export const configureLoginGuard = (options: LoginGuardOptions) => {
  loginGuardOptions = options
}

/** 探活单飞：并发导航共用同一次调用；带超时（悬挂的探活不能卡死守卫） */
const runLoginProbe = (o: LoginGuardOptions) => {
  if (!loginProbeInFlight) {
    const timeout = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error('登录探活超时')), o.timeoutMs ?? 8000))
    loginProbeInFlight = Promise.race([Promise.resolve().then(o.probe), timeout])
      .catch(err => {
        console.warn('[router] 登录探活未通过', err)
        return false
      })
      .finally(() => { loginProbeInFlight = null })
  }
  return loginProbeInFlight
}

router.beforeEach(async (to, from, next) => {
  const o = loginGuardOptions
  if (!o) {
    next()
    return
  }
  const loginPath = o.loginPath ?? '/login'
  if (o.isPublic ? o.isPublic(to) : (to.path === loginPath || !!to.meta.public)) {
    next()
    return
  }
  if (o.isLoggedIn()) {
    loginProbeFailures = 0
    o.onAuthenticated?.(false)
    enterDynamicRoute(to, from, next)
    return
  }
  if (loginProbeFailures < (o.maxFailures ?? 3)) {
    const ok = await runLoginProbe(o)
    if (!ok) {
      loginProbeFailures += 1
    }
  }
  if (!o.isLoggedIn()) {
    if (o.loginEntry) {
      o.loginEntry(to)
      next(false)
      return
    }
    next(loginPath)
    return
  }
  loginProbeFailures = 0
  o.onAuthenticated?.(true)
  const query = { ...to.query }
  delete query.id_token        // SSO 回跳参数不带入后续地址（框架 SSO 流自己的参数）
  next({ path: to.path, query })
})

export default router

