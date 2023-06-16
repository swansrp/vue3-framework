<template>
  <!--  添加antd vue 对中文的支持，如表单等-->
  <a-config-provider :locale="zhCN">
    <navigation-framework>
      <template #router-view>
        <router-view :key="$route.path" />
      </template>
    </navigation-framework>
  </a-config-provider>
</template>
<script setup lang="ts">
// 添加antd vue 组件的中文化
import zhCN from "ant-design-vue/es/locale/zh_CN"
// 添加antd vue dataPicker组件的中文化
import 'dayjs/locale/zh-cn'
// 配置周选择器的相关配置，
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'
import NavigationFramework  from '@/framework/components/navigationFramework/index.vue'

dayjs.extend(updateLocale)
dayjs.updateLocale('zh-cn', {
  weekStart: 1, // 每周周日为每周的第一天
  yearStart: 1  // 每年的1月1日所在的周为当年的第一周
})

</script>

<style scoped>

</style>
