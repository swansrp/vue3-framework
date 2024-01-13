import router from "@/framework/router"
import {defineStore} from 'pinia'
import {getRouteTree} from "@/framework/apis/nav/route"
import _ from "lodash"
import {MAIN_CONTENT} from "@/framework/utils/constant";
import {NavListType} from "@/framework/components/navigationFramework/navMenu/type"
import pinia from "@/framework/store/index";
import {setField} from "@/framework/utils/common";

export const useRouteStore = defineStore('routeStore', {
    state: () => {
        return {
            dynamicRoute: [] as Array<NavListType>,
            dynamicRouteMap: {} as { [key: string]: NavListType },
            routePath2RouteTitlePathMap: {} as { [key: string]: string },
            routePathIsFrameMap: {} as { [key: string]: boolean }
        }
    }, actions: {
         async getDynamicRouteAction() {
            return getRouteTree().then((res) => {
                const routeTree = res.payload
                this.dynamicRoute = _.cloneDeep(routeTree)
                this.travelRouteTree(routeTree)
                this.clearNoNameNode(routeTree)
                for (let i = 0; i < routeTree.length; ++i) router.addRoute(MAIN_CONTENT, routeTree[i])
                console.debug(router.getRoutes())
            })
        },
        // 遍历后台所给的路由树，需要自己手动转换为vue-router可以识别的route形式
        // 需要更改name、path和component
        travelRouteTree(nodeList: any) {
            const routeStore = useRouteStore(pinia)
            const modules = import.meta.glob('@/**/*.vue')
            const routePath2RouteTitlePathMap: { [key: string]: string } = {}
            const routePathIsFrameMap: { [key: string]: boolean } = {}
            const _travelRouteTree = (nodeList: any, parentPathArray: Array<string> = [], parentTitlePathArray: Array<string> = []) => {
                if (!nodeList || !nodeList.length) return
                for (let i = 0, len = nodeList.length; i < len; ++i) {
                    const node = nodeList[i]
                    node.name = node.path
                    const currentPathIsNotEmpty = Boolean(node.path)
                    if (currentPathIsNotEmpty) parentPathArray.push(node.path)
                    parentTitlePathArray.push(node.title)
                    setField(routePath2RouteTitlePathMap, parentPathArray.join('/'), parentTitlePathArray.join('/'))
                    setField(routePathIsFrameMap, parentPathArray.join('/'), !!+node.isFrame)
                    node.component = modules[`/src${node.component}/index.vue`]
                    this.dynamicRouteMap[node.path] = node
                    _travelRouteTree(node.children, parentPathArray, parentTitlePathArray)
                    if (currentPathIsNotEmpty) parentPathArray.pop()
                    parentTitlePathArray.pop()
                }
            }
            _travelRouteTree(nodeList)
            routeStore.routePath2RouteTitlePathMap = routePath2RouteTitlePathMap
            routeStore.routePathIsFrameMap = routePathIsFrameMap
            routeStore.routePath2RouteTitlePathMap['Home'] = '首页'
            routeStore.routePathIsFrameMap['Home'] = false
        },
        // 因为可能存在某些节点只用于展示menu的title，并不需要放在路由中，所以需要对path为空的节点进行删除
        // 否则，会产生警告
        clearNoNameNode(nodeList: any) {
            if (!nodeList || !nodeList.length) return
            for (let i = 0; i < nodeList.length; ++i) {
                const node = nodeList[i]
                if (!node.path) {
                    if (node.children) {
                        nodeList.push(...node.children)
                    }
                    nodeList.splice(i, 1)
                    --i
                } else this.clearNoNameNode(node.children)
            }
        }

    }, getters: {
        currentRoutePath() {
            return router.currentRoute.value.fullPath.slice(MAIN_CONTENT.length + 2)
        }, currentTopNav() {
            return (this.currentRoutePath as unknown as string).split('?')[0].split('/')[0]
        }, currentLeftNav() {
            return (this.currentRoutePath as unknown as string).split('?')[0].split('/').slice(1).join('/')
        }
    }
})
