import router from "@/framework/router"
import {defineStore} from 'pinia'
import {getRouteTree} from "@/framework/apis/user/route"
import {clearNoNameNode, travelRouteTree} from "@/framework/network/utils"
import _ from "lodash"
import {MAIN_CONTENT} from "@/framework/utils/constant";
import {NavListType} from "@/framework/components/navigationFramework/navMenu/type"

export const useRouteStore = defineStore('routeStore', {
    state: () => {
        return {
            dynamicRoute: [] as Array<NavListType>,
            routePath2RouteTitlePathMap: {} as {[key: string]: string}
        }
    },
    actions: {
        getDynamicRouteAction() {
            return getRouteTree().then((res) => {
                const routeTree = res.payload
                this.dynamicRoute = _.cloneDeep(routeTree)
                travelRouteTree(routeTree)
                clearNoNameNode(routeTree)
                for (let i = 0; i < routeTree.length; ++i)
                    router.addRoute(MAIN_CONTENT, routeTree[i])
            })
        }
    },
    getters: {
        currentRoutePath() {
            return router.currentRoute.value.fullPath.slice(MAIN_CONTENT.length+2)
        },
        currentTopNav() {
            return (this.currentRoutePath as unknown as string).split('/')[0]
        },
        currentLeftNav() {
            return (this.currentRoutePath as unknown as string).split('/').slice(1).join('/')
        }
    }
})
