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
        <router-view v-slot="{ Component }">
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

import { useRouteStore } from '@/framework/store/route'
import { useThemeStore } from '@/framework/store/theme'

const themeStore = useThemeStore()

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
