<template>
  <div class="app-scope">
    <span class="app-scope-label">应用</span>
    <a-select
      :value="appCode"
      :size="size"
      class="app-scope-select"
      @change="onSelect"
    >
      <a-select-option
        v-for="item in appOptions"
        :key="item.value"
        :value="item.value"
      >
        {{ item.label }}
      </a-select-option>
    </a-select>
  </div>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getSubsystemTable } from '@/framework/apis/admin/subsystem'

// 应用上下文切换下拉（主系统开放口集成方案B 棒6，页面目录内小组件，不动共享运行时组件）：
// 第一项「平台自身」值=空；其余来自 subsystem /query（棒5 已导出的查询函数，不新建重复 API）。
// 选中只改 route.query.appCode（同记录 replace），🔴 数据重载由页面自身 watch(route.query.appCode) 完成
// （vue-router 同记录 query 变化不触发 beforeEnter/重挂载，历史实证教训 M-11）。
const emit = defineEmits(['apps-loaded'])
defineProps<{ size?: 'small' | 'middle' | 'large' }>()

const route = useRoute()
const router = useRouter()

// 有值＝该应用作用域；无值/空＝平台自身（NULL），绝不传哨兵值
const appCode = computed(() => (typeof route.query.appCode === 'string' && route.query.appCode) || '')

interface AppOption { value: string, label: string }
const appOptions: Ref<AppOption[]> = ref([{ value: '', label: '平台自身' }])

const loadApps = () => {
  // 子系统注册表数量级小，一页大 pageSize 拉全量可接受
  getSubsystemTable({ currentPage: 1, pageSize: 500 }, undefined).then((res: any) => {
    const records: any[] = res.payload?.records || []
    const options: AppOption[] = [{ value: '', label: '平台自身' }]
    records.forEach((item) => {
      if (item.appCode) options.push({ value: item.appCode, label: item.name ? `${item.name}（${item.appCode}）` : item.appCode })
    })
    // 深链的 appCode 不在注册表（未注册/已删除）：保留当前值兜底，避免下拉无对应选项
    if (appCode.value && !options.some((option) => option.value === appCode.value)) {
      options.push({ value: appCode.value, label: appCode.value })
    }
    appOptions.value = options
    emit('apps-loaded', options)
  }).catch(() => {
    // 查询失败时保持「平台自身」单项，页面功能不受影响
  })
}

const onSelect = (value: string) => {
  // appCode 置空时移除该 query 键（undefined 不会被序列化进 URL）
  router.replace({ query: { ...route.query, appCode: value || undefined } })
}

onMounted(loadApps)
</script>

<style scoped>
.app-scope {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-scope-label {
  font-weight: bold;
  white-space: nowrap;
}

.app-scope-select {
  width: 220px;
}
</style>
