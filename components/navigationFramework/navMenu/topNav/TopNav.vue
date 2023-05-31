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
import {HOME, MAIN_CONTENT} from "@/framework/utils/constant"

// 本组件中，使用接口返回的path字段作为a-menu组件的key，而不是使用接口返回的key字段作为a-menu组件的key
// 因为path会被用于leftNav和HistoryTab等组件，用于当前顶部导航的判断
// 接口返回的key，和其对应的menuId是相同的，没有实际意义

const store = useTabStore()
const routeStore = useRouteStore()
let navList = ref([] as Array<NavListType>)
const keys = reactive({selectedKeys: [] as Array<string>})
// 组件的key，用于更新a-menu的样式，因为有的时候，虽然我每次只设置一个selectedKeys，但是有时会出现两个菜单项都选中的现象
// 所以需要使用一个key，更新组件的UI
let componentKey = ref('')

const initTopNavData = () => {
  navList.value = routeStore.dynamicRoute
  const currentTopNav = routeStore.currentTopNav
  if (currentTopNav !== HOME) keys.selectedKeys = [currentTopNav]
}

const setSelectedKey = (topNavPath: string) => {
  keys.selectedKeys = [topNavPath]
  componentKey.value = topNavPath
}

const selectTopNav = (obj: any) => {
  let path = obj.key
  router.replace(`/${MAIN_CONTENT}/${path}`).then(() => store.setTopNavPath(path))
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

:deep(.ant-menu-horizontal) {
    line-height: 50px;
}
</style>
