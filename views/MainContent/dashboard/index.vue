<template>
  <div class="personal-dashboard">
    <!-- 使用封装的TalentReviewDashboard公共组件 -->
    <talent-review-dashboard
      ref="dashboardRef"
      :table-id="tableId"
      :show-header="true"
      :title="typeof currentRoute.meta.title === 'string' ? currentRoute.meta.title : undefined"
      :show-indicator-tree="true"
      :common-indicator-permissions="commonPermissions"
      :personal-indicator-permissions="personalPermissions"
    >
      <!-- 自定义头部操作按钮 -->
      <template #header-actions>
        <a-button
          type="primary"
          @click="refreshDashboard"
        >
          <ReloadOutlined />
          刷新
        </a-button>
      </template>
    </talent-review-dashboard>
  </div>
</template>

<script lang="ts" setup>
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

import TalentReviewDashboard from '@/framework/components/common/chartConfig/index.vue'

// 权限配置
const commonPermissions = reactive({ edit: false, delete: false })
const personalPermissions = reactive({ edit: true, delete: true })

// 路由参数
const { currentRoute } = useRouter()
const route = currentRoute.value
const tableId = computed(
  () =>
    (route.query
      ? route.query.tableId
        ? route.query.tableId
        : undefined
      : undefined) as string
)

// 组件引用
const dashboardRef = ref<InstanceType<typeof TalentReviewDashboard> | null>(null)

// 刷新仪表盘
const refreshDashboard = () => {
  dashboardRef.value?.refreshDashboard()
}

// 对外暴露接口，保持与原组件的兼容性
defineExpose({
  refreshDashboard,
  loadDashboardData: () => dashboardRef.value?.loadDashboardData(),
  addDashboard: (indicatorIds: string[]) => dashboardRef.value?.addDashboard(indicatorIds),
  deleteDashboard: (indicatorIds: string[]) => dashboardRef.value?.deleteDashboard(indicatorIds),
  dashboardItems: computed(() => dashboardRef.value?.dashboardItems || []),
  loading: computed(() => dashboardRef.value?.loading || false)
})
</script>

<style lang="less" scoped>
.personal-dashboard {
  height: 100%;
  width: 100%;
}
</style>