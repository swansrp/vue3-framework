import pinia from "@/framework/store"
import router from "@/framework/router/index"
import {useTabStore} from "@/framework/store/nav"
import {useRouteStore} from "@/framework/store/route"

const tabStore = useTabStore(pinia)

export const goBackTo = (targetPath: string, delay = 0, needRefresh = false) =>
  setTimeout(() => router.replace(targetPath).then(() => needRefresh && router.go(0)), delay)


export const enterFirstDynamicRoute = () => {
  const routeStore = useRouteStore(pinia)
  console.debug('enterFirstDynamicRoute', routeStore)
  const topNavPath = routeStore.dynamicRoute[0].path
  // 顶部导航节点
  let node = routeStore.dynamicRoute[0]
  let leftNavPath = ''
  // 查找第一个可用的路由节点
  while (node) {
    // 根据是否有children进行判断，是否为根节点
    if (node.children) node = node.children[0]
    else {
      leftNavPath = node.path
      break
    }
  }
  tabStore.topNavPath = topNavPath
  // 通知TopNav组件，更新topNavPath以及顶部导航的高亮
  tabStore.updateTopNav += 1
  tabStore.tabActivateKey = leftNavPath
  // 用于LeftNav判断是否为指定的路由路径
  tabStore.updateLeftNav = true
  return [topNavPath, leftNavPath].join('/')
}
