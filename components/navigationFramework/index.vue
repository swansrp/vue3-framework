<template>
  <!-- 顶栏只在 full 壳显示：nav＝嵌入态（墨枢 iframe），父系统已有 topnav＝唯一导航入口，
       子应用再挂自家顶栏＝双 topnav（2026-11-25 用户拍板）；左栏保留供应用内逐级展开 -->
  <top-header
    v-if="isNeedNav && chrome === 'full'"
    class="top"
    :left-nav-auto-hidden="!leftNavVisible"
    :minimal="isSubSystem"
    :chrome="chrome"
    :hide-topnav="fullUnifiedSidebar"
  >
    <!-- 透传 header-extra 插槽，让业务层可以注入自定义内容 -->
    <template
      v-if="$slots['header-extra']"
      #header-extra
    >
      <slot name="header-extra"></slot>
    </template>
    <!-- 透传 header-actions（齿轮左侧业务动作区，如站内信铃铛） -->
    <template
      v-if="$slots['header-actions']"
      #header-actions
    >
      <slot name="header-actions"></slot>
    </template>
  </top-header>
  <div
    v-if="needLeftNav"
    class="content"
    :style="{display: isNeedNav ? 'flex' : 'auto'}"
  >
    <left-nav
      v-if="leftNavVisible"
      class="left-nav"
      :style="{display: isNeedNav ? 'flex' : 'none'}"
    />
    <div
      class="content-body"
      :style="{ backgroundColor: isNeedNav ? 'var(--bg-base)' : 'transparent'}"
    >
      <!-- 路由页签只在 full 壳显示：nav＝嵌入态（墨枢 iframe），菜单权威源＝墨枢中央管控，
           子应用内再挂页签＝与父页签双权威错位（2026-11-25 用户拍板） -->
      <history-tab v-if="isNeedNav && !showDefaultContent && chrome === 'full'" />
      <!-- 默认内容插槽：当访问根路径且有 default-content 插槽时显示 -->
      <slot
        v-if="showDefaultContent"
        name="default-content"
      ></slot>
      <!-- 正常路由内容 -->
      <slot
        v-else
        name="router-view"
      ></slot>
    </div>
  </div>
  <div
    v-else
    class="content-else"
  >
    <slot name="content"></slot>
  </div>
</template>

<script lang="ts" setup>

import _ from 'lodash'
import { useSlots } from 'vue'

import TopHeader from './topHeader/TopHeader.vue'
import { title } from '../../../../package.json'

import HistoryTab from '@/framework/components/navigationFramework/historyTab/HistoryTab.vue'
import LeftNav from '@/framework/components/navigationFramework/navMenu/leftNav/LeftNav.vue'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'
import { useWindowStore } from '@/framework/store/window'
import { isEmbeddedChrome } from '@/framework/utils/embed'

const route = useRoute()

// chrome: 框架壳变体，缺省 full=完整壳、未传时行为零变化；
// nav=嵌入态（墨枢 iframe）：无顶栏无页签、保留左栏，菜单权威源＝墨枢中央管控
const props = withDefaults(defineProps<{ chrome?: 'full' | 'nav' }>(), { chrome: 'full' })


const slots = useSlots()
// 根据插槽判断是否需要左侧导航及面包屑导航等（此处用于 content 插槽模式）
const needLeftNav = !slots.content
// 是否显示默认内容（根路径且有 default-content 插槽）
const showDefaultContent = computed(() => {
  const result = route.path === '/' && !!slots['default-content']
  return result
})
const tabStore = useTabStore(pinia)
const { isNeedNav } = toRefs(tabStore)
const navigationStore = useNavigationStore(pinia)
const routeStore = useRouteStore(pinia)

// U124 统一侧栏（2026-11-28 用户拍板）：full 壳非嵌入态＝左栏自绘「父级组标签＋子级条目」
// 承载全部顶级模块（LeftNav.vue），横向 topnav 随之冗余 → hide-topnav 撤除；嵌入态
// （chrome=nav / 墨枢 iframe）零变化，仍走 left-switcher＋a-menu。
const fullUnifiedSidebar = computed(() => props.chrome === 'full' && !isEmbeddedChrome())

// 左侧整列自动隐藏：当前顶级导航下只剩一个叶子入口时，整列只挂一个与顶部导航重复的入口
// （点顶部导航即可直达），没有保留价值；唯一子项自身还有下级时保留整列——左侧才是它逐级
// 展开的层级。菜单未加载／尚未进入业务路由时按原样展示，避免首屏一缩一展的抖动。
// （2026-11-22 重放：U101 首版实现随 11-20 的 git stash 搁置未随版，iframe/full 两形态都缺）
// U124：统一侧栏语义下（full 非嵌入）整列恒显——侧栏自身就是全部模块的切换器，
// U101 的「与顶部导航重复」前提已随 topnav 撤除而消失；U101 语义收窄为嵌入态专用。
const leftNavVisible = computed(() => {
  if (fullUnifiedSidebar.value) return true
  if (routeStore.dynamicRoute.length === 0) return true
  if (!navigationStore.activeTopNavPath) return true
  const topNode = routeStore.dynamicRoute.find(
    node => node.path === navigationStore.activeTopNavPath
  )
  const children = topNode?.children ?? []
  if (children.length > 1) return true
  if (children.length === 1) {
    const only = children[0]
    return !!(only.children && only.children.length > 0)
  }
  return false
})
// 是否为子系统形态（极简顶部条 + 作用域左侧菜单）
const isSubSystem = computed(() => navigationStore.layoutMode === 'subSystem')
const store = useWindowStore(pinia)
const getWindowHeight = () => store.updateWindowHeight(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight)
const router = useRouter()
onMounted(() => {
  const { MODE } = import.meta.env
  let env = ''
  if (MODE === 'development') env = '测试--'
  else if (MODE === 'pre') env = '预生产--'
  document.title = env + title
  if(!isNeedNav.value && router.currentRoute.value.meta.title) {
    document.title = env + router.currentRoute.value.meta.title
  } else {
    document.title = env + title
  }
  // 初始化store中的windowHeight
  getWindowHeight()
  // 使用lodash的防抖函数，防止store.windowHeight的频繁改动
  window.onresize = _.debounce(() => {
    getWindowHeight()
  }, 200)
})
</script>

<style scoped>
.top {
  flex: 0 0 auto;
}
.content {
  display: flex;
  flex: 1 0 auto;
  min-width: 0;
  overflow: hidden;
}
.left-nav {
  flex: 0 0 auto;
}

.content-body {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: hidden;
  background: var(--bg-base);
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.02);
}

.content-else {
  flex: 1;
  background: var(--bg-base);
}
</style>
