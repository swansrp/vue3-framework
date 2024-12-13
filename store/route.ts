import router from '@/framework/router'
import { defineStore } from 'pinia'
import { getRouteTree } from '@/framework/apis/nav/route'
import { MAIN_CONTENT } from '@/framework/utils/constant'
import { NavListType } from '@/framework/components/navigationFramework/navMenu/type'
import pinia from '@/framework/store/index'
import { setField } from '@/framework/utils/common'
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
      keepAliveList: [] as Array<string>
    }
  }, actions: {
    async getDynamicRouteAction() {
      return getRouteTree().then((res) => {
        const routeTree = res.payload
        // this.dynamicRoute = _.cloneDeep(routeTree)
        this.dynamicRoute = res.payload
        this.travelRouteTree(routeTree)
        this.clearButtonNode(routeTree)
        //
        for (let i = 0; i < routeTree.length; ++i) {
          router.addRoute(MAIN_CONTENT, routeTree[i])
        }
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
          node.name = node.path
          // antd menu key 是 string类型
          node.key = node.key.toString()
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
              node.name = navPath
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
      return this.buttonMap.get(this.currentRoutePath)?.indexOf(buttonPath) !== -1
    },
    getKeepAliveList() {
      return this.keepAliveList
    }
  }, getters: {
    currentRouteNode(state) {
      return state.dynamicRouteMap[router.currentRoute.value.fullPath.slice(MAIN_CONTENT.length + 2).split('?')[0]]
    },
    currentRoutePath() {
      return router.currentRoute.value.fullPath.slice(MAIN_CONTENT.length + 2)
    }, currentTopNav() {
      return (this.currentRoutePath as unknown as string).split('?')[0].split('/')[0]
    }, currentLeftNav() {
      return (this.currentRoutePath as unknown as string).split('?')[0].split('/').slice(1).join('/')
    }

  }
})
