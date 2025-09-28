import router from '@/framework/router'
import { defineStore } from 'pinia'
import { getRouteTree } from '@/framework/apis/nav/route'
import { MAIN_CONTENT, HOME } from '@/framework/utils/constant'
import { NavListType } from '@/framework/components/navigationFramework/navMenu/type'
import pinia from '@/framework/store/index'
import { setField } from '@/framework/utils/common'
import { RouteLocationNormalized } from 'vue-router'
export const getComponent = (component: string) => {
  const modules = import.meta.glob('@/**/*.vue')
  if (component.endsWith('.vue')) {
    return modules[`/src${component}`]
  } else {
    return modules[`/src${component}/index.vue`]
  }

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
        // this.dynamicRoute = _.cloneDeep(routeTree)
        this.dynamicRoute = res.payload
        this.travelRouteTree(routeTree)
        this.clearButtonNode(routeTree)
        
        // 扁平化注册所有路由，保持完整路径结构
        const registerRoutesFlat = (routes: any[], pathPrefix = '') => {
          for (let i = 0; i < routes.length; ++i) {
            const route = routes[i]
            const fullPath = pathPrefix ? `${pathPrefix}/${route.path}` : route.path
            
            // 创建新的路由对象，使用完整路径
            const flatRoute = {
              ...route,
              path: fullPath,
              children: undefined // 移除children，因为我们要扁平化
            }
            
            router.addRoute('Root', flatRoute)
            
            // 如果有子路由，递归处理但不嵌套
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
          // antd menu key 是 string类型
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
            node.component = getComponent(node.component)
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
      routeStore.routePath2RouteTitlePathMap['Home'] = '首页'
      routeStore.routePathIsFrameMap['Home'] = false
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
    isButtonEnable(buttonPath: string): boolean {
      const findButton = this.buttonMap.get(this.currentRoutePath)?.indexOf(buttonPath)
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
      this.currentRoute = route
    },
  }, getters: {
    currentRouteNode(state) {
      const path = router.currentRoute.value.fullPath.slice(1).split('?')[0]
      return state.dynamicRouteMap[path]
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
