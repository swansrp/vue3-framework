import pinia from "@/framework/store"
import {useTabStore} from "@/framework/store/nav"
import {enterFirstDynamicRoute} from "@/framework/router/utils"
import {HOME, I_MAIN_CONTENT, MAIN_CONTENT} from "@/framework/utils/constant"
import {createRouter, createWebHashHistory, LocationQueryRaw, RouteRecordRaw} from "vue-router"
import {useRouteStore} from "@/framework/store/route";
import {getQueryObject} from "@/framework/network/utils";

const tabStore = useTabStore(pinia)
const NotFound = () => import('@/framework/views/NotFound/index.vue')
const MainContent = () => import('@/framework/views/MainContent/index.vue')
const Home = () => import('@/framework/views/MainContent/WelcomeHome/index.vue')


const staticRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: I_MAIN_CONTENT
  },
  // 留了一个配置菜单的入口，防止在动态路由中无法找到配置路由的界面
  {
    path: '/menu',
    component: () => import('@/framework/views/MainContent/SystemManage/PermissionMaintenance/MenuMaintenance/index.vue')
  },
  {
    path: I_MAIN_CONTENT,
    name: MAIN_CONTENT,
    component: MainContent,
    children: [
      {
        path: HOME,
        name: HOME,
        component: Home
      },
    ]
  },
  {
    path: '/:catchAll(.*)',
    name: 'NotFound',
    component: NotFound,
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes
})


router.beforeEach((to) => {
  // 根据是否进入Home页，判断是否需要展示左侧导航菜单
  // 当然，这样判断是不好的，没有考虑顶部导航没有左侧导航的情况
  tabStore.isNeedLeftNav = to.path !== `${I_MAIN_CONTENT}/${HOME}`;
  // 设定MainContent组件的默认路由为第一个动态路由
  if (to.path === '/' || to.path === I_MAIN_CONTENT || to.path === `${I_MAIN_CONTENT}/`) {
    const leftNavPath = enterFirstDynamicRoute()
    const queryStr = useRouteStore().dynamicRouteMap[leftNavPath] ? useRouteStore().dynamicRouteMap[leftNavPath].query : null
    const query = (queryStr ? getQueryObject(queryStr) : {}) as LocationQueryRaw
    return {name: leftNavPath, query}
  }
})

export default router
