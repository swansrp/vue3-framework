<template>
  <!--  添加antd vue 对中文的支持，如表单等 + 深色主题自动切换 -->
  <a-config-provider
    :locale="zhCN"
    :theme="antTheme"
  >
    <navigation-framework>
      <!-- header-extra 插槽供业务层注入自定义内容 -->
      <template
        v-if="$slots['header-extra']"
        #header-extra
      >
        <slot name="header-extra"></slot>
      </template>
      <template #router-view>
        <!-- 根路径且注册了默认内容组件时, 显示业务层默认内容(不占路由) -->
        <component
          :is="defaultContentComp"
          v-if="isRootView && defaultContentComp"
        />
        <router-view
          v-else
          v-slot="{ Component }"
        >
          <keep-alive :include="routeStore.getKeepAliveList()">
            <Component
              :is="Component"
              :key="$route.fullPath"
            />
          </keep-alive>
        </router-view>
      </template>
    </navigation-framework>
  </a-config-provider>
</template>
<script lang="ts" setup>
// 添加antd vue 组件的中文化
import zhCN from 'ant-design-vue/es/locale/zh_CN'
// 添加antd vue dataPicker组件的中文化
import 'dayjs/locale/zh-cn'
// 配置周选择器的相关配置，
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'

import NavigationFramework from '@/framework/components/navigationFramework/index.vue'

import { theme } from 'ant-design-vue'

import { getDefaultContentComponent } from '@/framework/router'
import { useRouteStore } from '@/framework/store/route'
import { useThemeStore } from '@/framework/store/theme'

const themeStore = useThemeStore()

// 当前是否停留在根路径(Root 无子路由匹配), 此时内容区显示业务层注册的默认内容
const route = useRoute()
const isRootView = computed(() => route.path === '/' || route.name === 'Root')
// 默认内容组件(在 main.ts 挂载前注册): 动态导入函数需包 defineAsyncComponent 才能用于 <component :is>
const registeredContent = getDefaultContentComponent()
const defaultContentComp = registeredContent ? defineAsyncComponent(registeredContent) : null

// Ant Design 主题配置 - 随系统 data-theme 自动切换
const antTheme = computed(() => ({
  algorithm: themeStore.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
}))

const routeStore = useRouteStore()
dayjs.extend(updateLocale)
dayjs.updateLocale('zh-cn', {
  weekStart: 1, // 每周周日为每周的第一天
  yearStart: 1  // 每年的1月1日所在的周为当年的第一周
})

</script>

<style scoped>

</style>
