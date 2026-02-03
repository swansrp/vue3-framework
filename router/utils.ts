import router from '@/framework/router/index'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useRouteStore } from '@/framework/store/route'

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
    if (node.children && node.children.length > 0) {
      leftNavPath = [leftNavPath, node.children[0].path].join('/')
      node = node.children[0]
    }
    else {
      break
    }
  }
  tabStore.topNavPath = topNavPath
  // 通知TopNav组件，更新topNavPath以及顶部导航的高亮
  tabStore.updateTopNav += 1
  tabStore.tabActivateKey = node.key || ''
  // 用于LeftNav判断是否为指定的路由路径
  tabStore.updateLeftNav = true
  return [topNavPath, leftNavPath.substring(1, leftNavPath.length)].join('/')
}

/**
 * 仅选中第一个顶部导航菜单，显示对应的左侧菜单，但不自动选中左侧菜单项
 * 用于 showMenuOnly 模式
 */
export const selectFirstTopNavOnly = () => {
  console.log('[DEBUG] selectFirstTopNavOnly 开始执行')
  const routeStore = useRouteStore(pinia)
  if (!routeStore.dynamicRoute || routeStore.dynamicRoute.length === 0) {
    console.warn('[DEBUG] selectFirstTopNavOnly: 没有可用的动态路由')
    return
  }
  
  const topNavPath = routeStore.dynamicRoute[0].path
  console.log('[DEBUG] selectFirstTopNavOnly 设置顶部导航:', topNavPath)
  tabStore.topNavPath = topNavPath
  // 通知TopNav组件更新高亮状态
  tabStore.updateTopNav += 1
  // 清空左侧菜单的选中状态
  tabStore.tabActivateKey = ''
  // 通知左侧菜单更新，但不选中任何项
  tabStore.updateLeftNav = true
  console.log('[DEBUG] selectFirstTopNavOnly 完成', {
    topNavPath,
    tabActivateKey: tabStore.tabActivateKey,
    updateLeftNav: tabStore.updateLeftNav
  })
}
