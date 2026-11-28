import router from '@/framework/router/index'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'
import { SYSTEM_MANAGE_MENU_TITLE } from '@/framework/utils/constant'

const tabStore = useTabStore(pinia)
const navigationStore = useNavigationStore(pinia)

export const goBackTo = (targetPath: string, delay = 0, needRefresh = false) =>
  setTimeout(() => router.replace(targetPath).then(() => needRefresh && router.go(0)), delay)

/**
 * 获取第一个"顶部菜单栏可见"的顶层菜单节点
 * "系统管理"不在顶部菜单栏显示（入口在用户区齿轮下拉），默认进入时需要跳过它
 */
export const getFirstVisibleTopNav = () => {
  const routeStore = useRouteStore(pinia)
  return routeStore.dynamicRoute.find(
    n => (n.meta?.title || n.title || n.name) !== SYSTEM_MANAGE_MENU_TITLE
  ) || routeStore.dynamicRoute[0]
}

export const enterFirstDynamicRoute = () => {
  const routeStore = useRouteStore(pinia)
  console.debug('enterFirstDynamicRoute', routeStore)
  // 顶部导航节点：取第一个在顶部菜单栏可见的菜单（跳过"系统管理"）
  let node = getFirstVisibleTopNav()
  const topNavPath = node.path
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
