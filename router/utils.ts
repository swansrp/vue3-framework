import router from '@/framework/router/index'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'

const tabStore = useTabStore(pinia)
const navigationStore = useNavigationStore(pinia)

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
    if (node.children && node.children.length > 0) {
      leftNavPath = [leftNavPath, node.children[0].path].join('/')
      node = node.children[0]
    }
    else {
      break
    }
  }
  
  // 使用navigationStore设置状态
  navigationStore.setActiveTopNav(topNavPath)
  
  // 兼容旧的tabStore
  tabStore.topNavPath = topNavPath
  tabStore.updateTopNav += 1
  tabStore.tabActivateKey = node.key || ''
  tabStore.updateLeftNav = true
  
  return [topNavPath, leftNavPath.substring(1, leftNavPath.length)].join('/')
}
