import { defineStore } from 'pinia'
import { RouteLocationNormalized } from 'vue-router'

import { getRouteTree } from '@/framework/apis/nav/route'
import { NavListType } from '@/framework/components/navigationFramework/navMenu/type'
import router from '@/framework/router'
import pinia from '@/framework/store/index'
import { setField } from '@/framework/utils/common'
import { SYSTEM_MANAGE_MENU_PATH, SYSTEM_MANAGE_MENU_TITLE } from '@/framework/utils/constant'

/**
 * 「系统管理」顶级节点判定（魔法值统一收口）：path 为主、title 兜底——历史数据里该树的
 * 标题/路径都可能被管理页改过，两键任一命中即认。
 */
const isSystemManageTop = (node: any): boolean => {
  const title = node?.meta?.title || node?.title || node?.name
  return node?.path === SYSTEM_MANAGE_MENU_PATH || title === SYSTEM_MANAGE_MENU_TITLE
}

/**
 * 嵌入壳判定（框架本地实现，🔴 不引业务侧 @/utils/embedded——framework 是 epc/InkHub 双宿主
 * 共享件，业务侧模块在别的宿主里可能根本不存在，import 会把对方构建带崩）：
 * URL 带 embedded=1（none 无壳）或 embedded=nav（nav 壳）即嵌入态；search 与 hash 双查。
 */
const isEmbeddedChrome = (): boolean => {
  if (typeof window === 'undefined') return false
  const search = window.location.search || ''
  const hash = window.location.hash || ''
  return /[?&]embedded=(?:1|nav)(?:$|[&#])/.test(search)
    || /[?&]embedded=(?:1|nav)(?:$|[&#])/.test(hash)
}

export const getComponent = (component: string) => {
  const modules = import.meta.glob('@/**/*.vue')
  if (component.endsWith('.vue')) {
    return modules[`/src${component}`]
  }
  // 兼容两类菜单 component 值: 以 /index 结尾的值直接拼 .vue(如 Portal/index → Portal/index.vue), 其余拼 /index.vue(如 Portal/dict → dict/index.vue)
  return modules[`/src${component}.vue`] || modules[`/src${component}/index.vue`]
}
export const useRouteStore = defineStore('routeStore', {
  state: () => {
    return {
      dynamicRoute: [] as Array<NavListType>,
      dynamicRouteMap: {} as { [key: string]: NavListType },
      routePath2RouteTitlePathMap: {} as { [key: string]: string },
      routePathIsFrameMap: {} as { [key: string]: boolean },
      buttonMap: new Map,
      keepAliveList: [] as Array<string>,
      _blockReturn: false,
      _blockReturnHandler: () => {},
      lastRoute: {} as RouteLocationNormalized,
      currentRoute: {} as RouteLocationNormalized,
    }
  }, actions: {
    async getDynamicRouteAction() {
      return getRouteTree().then((res) => {
        const routeTree = res.payload
        // 🔴 嵌入态（墨枢 iframe：embedded=nav/none）不暴露「系统管理」顶级（2026-11-27 U117）：
        // 该树是子系统本地的参数/字典/Agent 管理页，嵌入态既无自家 topnav（11-25 拍板撤）
        // 也无齿轮入口——首屏 auto 落地一旦命中它（rootPathMode=auto 取第一棵可见顶级），
        // 用户就卡在管理页且没有切回业务页的入口（用户原话「进去就是系统管理的页面 没法切」）。
        // 导航面用剥离后的树（dynamicRoute＝topnav/左栏/落地判定同源）；路由注册/按钮映射
        // 仍用全树（直输 URL 不 404，独立访问 full 形态行为零变化）。
        const navTree = isEmbeddedChrome() ? routeTree.filter((n: any) => !isSystemManageTop(n)) : routeTree
        // 🔴 兜底：账号权限只有系统管理一棵树时不能把导航剥成空（否则落地无目标）；
        // 此时保留原树，退回 11-25 前口径
        this.dynamicRoute = navTree.length > 0 ? navTree : routeTree
        this.travelRouteTree(routeTree)
        this.clearButtonNode(routeTree)
        
        // 扁平化注册所有路由，确保路径唯一性
        const registerRoutesFlat = (routes: any[], pathPrefix = '') => {
          for (let i = 0; i < routes.length; ++i) {
            const route = routes[i]
            const fullPath = pathPrefix ? `${pathPrefix}/${route.path}` : route.path
            
            // 创建路由对象，使用完整路径确保唯一性
            const flatRoute = {
              ...route,
              path: fullPath,
              name: fullPath.replace(/\//g, '-'), // 使用完整路径作为name，避免冲突
              meta: { title: route.title }, // 确保正确设置meta.title
              children: undefined // 移除children，扁平化处理
            }

            router.addRoute('Root', flatRoute)
            
            // 递归处理子路由
            if (route.children && route.children.length > 0) {
              registerRoutesFlat(route.children, fullPath)
            }
          }
        }
        registerRoutesFlat(routeTree)
      })
    },
    // 遍历后台所给的路由树，需要自己手动转换为vue-router可以识别的route形式
    // 需要更改name、path和component
    travelRouteTree(nodeList: any) {
      const routeStore = useRouteStore(pinia)
      const routePath2RouteTitlePathMap: { [key: string]: string } = {}
      const routePathIsFrameMap: { [key: string]: boolean } = {}
      const buttonMap = new Map()
      const _travelRouteTree = (nodeList: any, parentPathArray: Array<string> = [], parentTitlePathArray: Array<string> = []) => {
        if (!nodeList || !nodeList.length) return
        for (let i = 0, len = nodeList.length; i < len; ++i) {
          const node = nodeList[i]
          // 动态路由作为根路由的子路由，路径不应该以'/'开头
          if (node.path && node.path.startsWith('/')) {
            node.path = node.path.substring(1)
          }
          node.name = node.path
          // antd menu key 是 string类型;后端契约 key 与 menu_id 一致(ac_menu.key 列),
          // 正常数据不会为空,此分支仅为脏数据止损(空 key 曾致 toString 抛错中断整树注册)
          if (node.key === null || node.key === undefined) {
            console.warn(`菜单节点 key 为空(数据问题): title=${node.title} path=${node.path},已用 menuId/path 兼容`)
            // menuId 即 key 的本源且全树唯一;path 仅作最后兜底(单段可能重复,但好过中断注册)
            node.key = node.menuId ?? node.path
          }
          node.key = node.key.toString()
          // 页面标题
          node.meta = { title: node.title }
          // 页面中的按钮权限
          if (node.menuType === 3) {
            buttonMap.set(parentPathArray.join('/'), [...(buttonMap.get(parentPathArray.join('/')) || []), node.path])
          } else {
            parentPathArray.push(node.path)
            parentTitlePathArray.push(node.title)
            setField(routePath2RouteTitlePathMap, parentPathArray.join('/'), parentTitlePathArray.join('/'))
            setField(routePathIsFrameMap, parentPathArray.join('/'), !!+node.isFrame)
            const rawLoader = getComponent(node.component)
            if (rawLoader) {
              // keep-alive include 按组件名匹配、组件名默认取文件名，大量 index.vue 会让
              // 非缓存页撞上同名缓存页被误缓存；改为每菜单发唯一名，include 只认唯一名
              const cacheName = `menu-${node.key}`
              node.component = () => rawLoader().then((module: any) => {
                if (node.isCache === '1') {
                  this.keepAliveList.push(cacheName)
                  return { ...module, default: { ...module.default, name: cacheName } }
                }
                return module
              })
            }
            const navPath = parentPathArray.join('/')
            if (navPath !== '') {
              // 路由name保持为单个path，不是完整路径
              // node.name 已经在前面设置为 node.path，这里不要改变
              this.dynamicRouteMap[navPath] = node
            } else {
              this.dynamicRouteMap[node.path] = node
            }
            _travelRouteTree(node.children, parentPathArray, parentTitlePathArray)
            parentPathArray.pop()
            parentTitlePathArray.pop()
          }
          // this.dynamicRouteMap[node.path] = node
        }
      }
      _travelRouteTree(nodeList)
      
      routeStore.routePath2RouteTitlePathMap = routePath2RouteTitlePathMap
      routeStore.routePathIsFrameMap = routePathIsFrameMap
      routeStore.buttonMap = buttonMap

      // console.log(routeStore.dynamicRouteMap)
      // console.log(routeStore.routePath2RouteTitlePathMap)
      // console.log(routeStore.routePathIsFrameMap)
      // console.log(routeStore.buttonMap)


    },
    // 清除按钮类型节点
    clearButtonNode(nodeList: any) {
      if (!nodeList || !nodeList.length) return
      for (let i = 0; i < nodeList.length; ++i) {
        const node = nodeList[i]
        if (node.menuType === 3) {
          nodeList.splice(i, 1)
          --i
        } else this.clearButtonNode(node.children)
      }
    },
    isButtonEnable(buttonPath: string, currentRoutePath = ''): boolean {
      const findButton = this.buttonMap.get(currentRoutePath ? currentRoutePath : this.currentRoutePath)?.indexOf(buttonPath)
      return findButton !== undefined && findButton !== -1
    },
    getKeepAliveList() {
      return this.keepAliveList
    },
    blockReturn(block: boolean, handler?: () => void) {
      if (block && handler) {
        this._blockReturnHandler = handler
      } else {
        this._blockReturnHandler = () => {}
      }
      this._blockReturn = block
    },
    blockReturnHandler() {
      this._blockReturnHandler()
    },
    setLastRoute(route: RouteLocationNormalized) {
      this.lastRoute = route
    },
    setCurrentRoute(route: RouteLocationNormalized) {
      console.log('[DEBUG] routeStore setCurrentRoute', {
        path: route.path,
        fullPath: route.fullPath
      })
      this.currentRoute = route
    },
  }, getters: {
    currentRouteNode(state) {
      const path = router.currentRoute.value.fullPath.slice(1).split('?')[0]
      const node = state.dynamicRouteMap[path]
      console.log('[DEBUG] routeStore currentRouteNode getter', {
        currentPath: router.currentRoute.value.path,
        path,
        node: node ? { key: node.key, path: node.path, title: node.title } : null
      })
      return node
    },
    currentRoutePath() {
      return router.currentRoute.value.fullPath.slice(1)
    }, currentTopNav() {
      return (this.currentRoutePath as unknown as string).split('?')[0].split('/')[0]
    }, currentLeftNav() {
      return (this.currentRoutePath as unknown as string).split('?')[0].split('/').slice(1).join('/')
    },
    getLastRoute: (state) => state.lastRoute,
    getCurrentRoute: (state) => state.currentRoute,
    isBlockReturn: (state) => state._blockReturn
  }
})
