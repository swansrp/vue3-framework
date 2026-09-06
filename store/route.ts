import { defineStore } from 'pinia'
import { RouteLocationNormalized } from 'vue-router'

import { getRouteTree } from '@/framework/apis/nav/route'
import { NavListType } from '@/framework/components/navigationFramework/navMenu/type'
import router from '@/framework/router'
import pinia from '@/framework/store/index'
import { setField } from '@/framework/utils/common'

export const getComponent = (component: string) => {
  const modules = import.meta.glob('@/**/*.vue')
  const moduleKey = component.endsWith('.vue') ? `/src${component}` : `/src${component}/index.vue`
  const comp = modules[moduleKey]
  if (!comp) {
    // 排查菜单数据问题:component 为空时该路由无法注册,刷新/跳转必落 NotFound
    console.warn(`[RouteDebug] getComponent 未命中: component=${component} 查找键=${moduleKey}`)
  }
  return comp
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
        if (!routeTree || !routeTree.length) {
          console.warn('[RouteDebug] menu/tree 返回空树! 检查角色-菜单绑定与接口数据')
        } else {
          console.info(`[RouteDebug] menu/tree 顶层节点 ${routeTree.length} 个: `
            + routeTree.map((n: any) => `${n.title}(path=${n.path},key=${n.key},type=${n.menuType})`).join(' | '))
        }
        // this.dynamicRoute = _.cloneDeep(routeTree)
        this.dynamicRoute = res.payload
        this.travelRouteTree(routeTree)
        this.clearButtonNode(routeTree)
        
        // 扁平化注册所有路由，确保路径唯一性
        let registered = 0
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
            registered++
            console.info(`[RouteDebug] addRoute '${fullPath}' component=${route.component ? 'ok' : '缺失!'}`)
            
            // 递归处理子路由
            if (route.children && route.children.length > 0) {
              registerRoutesFlat(route.children, fullPath)
            }
          }
        }
        registerRoutesFlat(routeTree)
        console.info(`[RouteDebug] 动态路由注册完成 共 ${registered} 条`)
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
            console.warn(`[RouteDebug] 节点 key 为空(数据问题): title=${node.title} path=${node.path},已用 menuId/path 兼容`)
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
            // 目录节点(有 children)与未配组件的节点只占层级,无组件;
            // 只有配了 component 的叶子才查产物模块表,未命中才告警
            if (!node.component || (node.children && node.children.length > 0)) {
              node.component = undefined
            } else {
              node.component = getComponent(node.component)
            }
            if (node.component) {
              node.component().then((module: any) => {
                if (node.isCache === '1') {
                  this.keepAliveList.push((module.default.name || module.default.__name) as string)
                }
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
