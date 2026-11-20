<template>
  <content-layout
    :width="220"
    height="100vh"
    class="param-page"
  >
    <template #side>
      <div class="param-groups">
        <div class="param-groups__header">
          <span class="param-groups__title">参数分组</span>
          <span
            v-if="!loading"
            class="param-groups__meta"
          >{{ groupList.length - 1 }} 组</span>
        </div>
        <div class="param-groups__body">
          <a-spin
            v-if="loading"
            class="param-groups__loading"
            size="small"
          />
          <nav
            v-else
            class="param-groups__list"
            aria-label="参数分组"
          >
            <template
              v-for="(item, index) in groupList"
              :key="item.name"
            >
              <button
                class="param-group-item"
                :class="{ 'is-active': activeGroup === item.name }"
                type="button"
                :aria-current="activeGroup === item.name ? 'true' : undefined"
                @click="activeGroup = item.name"
              >
                <span class="param-group-item__name">{{ item.name }}</span>
                <span class="param-group-item__count">{{ item.count }}</span>
              </button>
              <span
                v-if="index === 0 && groupList.length > 1"
                class="param-groups__divider"
                aria-hidden="true"
              ></span>
            </template>
          </nav>
        </div>
      </div>
    </template>
    <template #content>
      <portal
        table-id="SysConfig"
        :advance-condition="groupCondition"
      >
        <template #right-btns>
          <a-button
            shape="circle"
            type="primary"
            @click="refreshParams()"
          >
            <template #icon>
              <cloud-sync-outlined />
            </template>
          </a-button>
        </template>
      </portal>
    </template>
  </content-layout>
</template>

<script lang="ts" setup>
import { CloudSyncOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'

import { queryParams, refreshParams } from '@/framework/apis/params'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

interface ParamGroup {
  name: string
  count: number
}

const ALL_GROUP = '全部'
const activeGroup = ref(ALL_GROUP)
const groupList = ref<ParamGroup[]>([{ name: ALL_GROUP, count: 0 }])
const loading = ref(true)

const loadGroups = () => {
  loading.value = true
  return queryParams([], [], 10000, 1).then(res => {
    const records: any[] = res.payload?.records || []
    const counts = new Map<string, number>()
    records.forEach(item => {
      const group = (item.configGroup || '').trim() || '未分组'
      counts.set(group, (counts.get(group) || 0) + 1)
    })
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .map(([name, count]) => ({ name, count }))
    groupList.value = [{ name: ALL_GROUP, count: records.length }, ...sorted]
  }).finally(() => {
    loading.value = false
  })
}

// "全部"不带条件；"未分组"无法用空串条件（后端 EQUAL 会丢弃空值），
// 用 NOT_IN 已知分组反向圈出；其余按分组精确匹配。
// 一律包成 { conditionList: [...] }：Portal 的通用查询路径直接展开 advanceCondition.conditionList
const groupCondition = computed<ConditionListType | undefined>(() => {
  if (activeGroup.value === ALL_GROUP) return undefined
  if (activeGroup.value === '未分组') {
    const known = groupList.value.map(g => g.name).filter(n => n !== ALL_GROUP && n !== '未分组')
    if (known.length === 0) return undefined
    return {
      conditionList: [{ property: 'configGroup', relation: FILTER_TYPE.NOT_IN, value: known, conditionList: [] } as ConditionListType]
    } as ConditionListType
  }
  return {
    conditionList: [
      { property: 'configGroup', relation: FILTER_TYPE.EQUAL, value: [activeGroup.value], conditionList: [] } as ConditionListType
    ]
  } as ConditionListType
})

onMounted(loadGroups)
</script>

<style scoped lang="less">
// 页面内滚动条：细、无轨道底色，悬停加深
.param-page {
  :deep(::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :deep(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :deep(::-webkit-scrollbar-thumb) {
    background: var(--border-hover);
    border-radius: 3px;
  }

  :deep(::-webkit-scrollbar-thumb:hover) {
    background: var(--text-tertiary);
  }
}

.param-groups {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.param-groups__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.param-groups__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--text-primary);
}

.param-groups__meta {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.param-groups__body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.param-groups__loading {
  margin: auto;
}

.param-groups__list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.param-group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: none;
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);

  @media (hover: hover) {
    &:hover {
      background: var(--bg-hover);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  &.is-active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
}

.param-group-item__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.param-group-item__count {
  flex: none;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: color var(--transition-fast);
}

.param-group-item.is-active .param-group-item__count {
  color: var(--accent);
  font-weight: 500;
}

.param-groups__divider {
  flex: none;
  height: 1px;
  margin: 4px 10px;
  background: var(--border-subtle);
}
</style>