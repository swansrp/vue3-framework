<template>
  <div class="crumb-search">
    <a-breadcrumb
      class="bread-crumb"
      separator=">"
    >
      <a-breadcrumb-item
        v-for="item in breadCrumbData"
        :key="item"
      >
        {{ item }}
      </a-breadcrumb-item>
    </a-breadcrumb>
    <!--定义插槽，用于存放搜索框-->
    <slot />
  </div>
</template>

<script lang="ts" setup>
import pinia from '@/framework/store'
import { useTabStore } from '@/framework/store/nav'
import { useRouteStore } from '@/framework/store/route'

const store = useTabStore(pinia)
const routeStore = useRouteStore(pinia)

// 用于在刷新页面后，面包屑的初始化
const currentRoutePath = routeStore.currentRoutePath
const titlePath = routeStore.routePath2RouteTitlePathMap[currentRoutePath as keyof typeof routeStore.routePath2RouteTitlePathMap]
let breadCrumbData = ref(titlePath ? titlePath.split('/') : [])

watch(() => store.titlePath, () => breadCrumbData.value =  store.titlePath || ['>'])

</script>

<style scoped>
.crumb-search {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
  box-sizing: border-box;
  padding: 3px 0 3px 15px;
}

.bread-crumb {
  width: 520px;
}
</style>
