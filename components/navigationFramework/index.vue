<template>
  <top-header class="top" />
  <div class="content" v-if="needLeftNav">
    <left-nav class="left-nav" />
    <div class="content-body">
      <history-tab />
      <crumb-search />
      <slot name="router-view"></slot>
    </div>
  </div>
  <div v-else>
    <slot name="content"></slot>
  </div>
</template>

<script lang="ts" setup>

import _ from 'lodash'
import CrumbSearch from "@/framework/components/navigationFramework/crumbSearch/CrumbSearch.vue";
import LeftNav from "@/framework/components/navigationFramework/navMenu/leftNav/LeftNav.vue";
import HistoryTab from "@/framework/components/navigationFramework/historyTab/HistoryTab.vue";
import TopHeader from "./topHeader/TopHeader.vue"
import { useWindowStore } from '@/framework/store/window'
import {useSlots} from "vue"



const slots = useSlots()
// 根据插槽判断是否需要左侧导航及面包屑导航等
const needLeftNav = !slots.content

const store = useWindowStore()
const getWindowHeight = () => store.updateWindowHeight(window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight)

onMounted(() => {
  // 初始化store中的windowHeight
  getWindowHeight()
  // 使用lodash的防抖函数，防止store.windowHeight的频繁改动
  window.onresize = _.debounce(() => {
    getWindowHeight()
  }, 200)
})
</script>

<style scoped>
.top, .bottom {
  flex: 0 0 auto;
}
.content {
  flex: 1 0 auto;
  width: 100%;
  display: flex;
}
.left-nav {
  flex: 0 0 auto;
}

.content-body {
  flex: 1 0 auto;
  height: 100%;
}
</style>
