<template>
  <top-header
    v-if="isNeedNav"
    class="top"
  />
  <div
    v-if="needLeftNav"
    class="content"
    :style="{display: isNeedNav ? 'flex' : 'auto'}"
  >
    <left-nav
      class="left-nav"
      :style="{display: isNeedNav ? 'block' : 'none'}"
    />
    <div
      class="content-body"
      :style="{ backgroundColor: isNeedNav ? '#fff' : 'transparent'}"
    >
      <history-tab v-if="isNeedNav" />
      <crumb-search v-if="isNeedNav" />
      <slot name="router-view" />
    </div>
  </div>
  <div v-else>
    <slot name="content" />
  </div>
</template>

<script lang="ts" setup>

import _ from 'lodash'
import { useSlots } from 'vue'

import TopHeader from './topHeader/TopHeader.vue'
import { title } from '../../../../package.json'

import CrumbSearch from '@/framework/components/navigationFramework/crumbSearch/CrumbSearch.vue'
import HistoryTab from '@/framework/components/navigationFramework/historyTab/HistoryTab.vue'
import LeftNav from '@/framework/components/navigationFramework/navMenu/leftNav/LeftNav.vue'
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useWindowStore } from '@/framework/store/window'


const slots = useSlots()
// 根据插槽判断是否需要左侧导航及面包屑导航等
const needLeftNav = !slots.content
const tabStore = useTabStore(pinia)
const { isNeedNav } = toRefs(tabStore)
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
  flex: 1 0 auto;
  width: 100%;
}
.left-nav {
  flex: 0 0 auto;
}

.content-body {
  flex: 1 0 auto;
  height: 100%;
}
</style>
