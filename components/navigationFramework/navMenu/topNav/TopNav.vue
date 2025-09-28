<template>
  <!--默认，顶部导航只有一级菜单，没有子菜单-->
  <a-menu
    :key="componentKey"
    v-model:selectedKeys="keys.selectedKeys"
    mode="horizontal"
    @select="selectTopNav">
    <!--顶部导航菜单只可能有一级，不会有子菜单-->
    <a-menu-item v-for="item in navList" :id="item.key.toString()" :key="item.path" :title="item.title">
      <template #icon>
        <Icon :icon="item.icon" />
      </template>
      {{ item.title }}
    </a-menu-item>
  </a-menu>
</template>

<script lang="ts" setup>
import router from "@/framework/router"
import {NavListType} from "../type"
import {useTabStore} from "@/framework/store/nav"
import {useRouteStore} from "@/framework/store/route"
import {MAIN_CONTENT} from "@/framework/utils/constant"
import pinia from "@/framework/store"

// 本组件中，使用接口返回的path字段作为a-menu组件的key
// 因为path会被用于leftNav和HistoryTab等组件，用于当前顶部导航的判断

const store = useTabStore(pinia)
const routeStore = useRouteStore(pinia)
let navList = ref([] as Array<NavListType>)
const keys = reactive({selectedKeys: [] as Array<string>})
// 组件的key，用于更新a-menu的样式，因为有的时候，虽然我每次只设置一个selectedKeys，但是有时会出现两个菜单项都选中的现象
// 所以需要使用一个key，更新组件的UI
let componentKey = ref('')

const initTopNavData = () => {
  navList.value = routeStore.dynamicRoute
  const currentTopNav = routeStore.currentTopNav
  if (currentTopNav) keys.selectedKeys = [currentTopNav]
}

const setSelectedKey = (topNavPath: string) => {
  keys.selectedKeys = [topNavPath]
  componentKey.value = topNavPath
}

const selectTopNav = (obj: any) => {
  let path = obj.key
  router.replace(`/${path}`).then(() => store.setTopNavPath(path))
}

watch(() => store.topNavPath, topNavPath => setSelectedKey(topNavPath), {immediate: true})

// 只用于功能路由守卫中，默认加载第一个动态路由的功能
// 使用store.updateTopNav标志位，强制更新topNavPath的触发
watch(() => store.updateTopNav, () => {
  // 尚未设置store.topNavPath时，使用地址栏中的地址，提取出顶部导航的TopNavPath
  if (!store.topNavPath) setSelectedKey(routeStore.currentTopNav)
  else setSelectedKey(store.topNavPath)
}, {immediate: true})

onBeforeMount(initTopNavData)

</script>
<style scoped>
* {
    user-select: none;
}

/* 顶部菜单容器样式 - 简洁菜单风格 */
:global(.ant-menu.ant-menu-horizontal) {
    line-height: 50px !important;
    background: #ffffff !important;
    border-bottom: 1px solid #e8eaed !important;
    padding: 0 20px !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
    position: relative !important;
    z-index: 10 !important;
}

/* 顶部菜单项基础样式 - 菜单风格设计 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item) {
    margin: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
    height: 50px !important;
    line-height: 50px !important;
    border: none !important;
    padding: 0 20px !important;
    color: #404040 !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    text-rendering: optimizeLegibility !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
}

/* 悬停效果 - 轻微背景变化 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item:hover) {
    background: rgba(24, 144, 255, 0.04) !important;
    color: #1890ff !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1), inset 0 -2px 0 rgba(24, 144, 255, 0.3) !important;
    border-color: transparent !important;
}

/* 激活状态 - 底部线条标识 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item-selected) {
    background: rgba(24, 144, 255, 0.06) !important;
    color: #1890ff !important;
    font-weight: 600 !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 8px rgba(24, 144, 255, 0.15), inset 0 -3px 0 #1890ff !important;
    border-color: transparent !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 激活状态底部线条 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item-selected::after) {
    content: '' !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 2px !important;
    background: #1890ff !important;
    border-radius: 0 !important;
}

/* 图标样式 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item .anticon) {
    margin-right: 8px !important;
    font-size: 16px !important;
    transition: color 0.2s ease !important;
}

/* 激活状态图标颜色 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item-selected .anticon) {
    color: #1890ff !important;
}

/* 移除默认的底部边框 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item::before) {
    display: none !important;
}

/* 菜单项之间的分隔 */
:global(.ant-menu.ant-menu-horizontal .ant-menu-item + .ant-menu-item) {
    margin-left: 0 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
    :global(.ant-menu.ant-menu-horizontal .ant-menu-item) {
        padding: 0 16px !important;
        font-size: 13px !important;
    }
}
</style>
