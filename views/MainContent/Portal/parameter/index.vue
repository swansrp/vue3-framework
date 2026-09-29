<template>
  <content-layout
    :width="220"
    height="100vh"
  >
    <template #side>
      <a-list
        size="small"
        bordered
        :data-source="groupList"
        class="param-group-list"
      >
        <template #renderItem="{ item }">
          <a-list-item
            :class="{ 'activate-item': activeGroup === item.name }"
            @click="activeGroup = item.name"
          >
            <span>{{ item.name }}</span>
            <span class="group-count">{{ item.count }}</span>
          </a-list-item>
        </template>
      </a-list>
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

const loadGroups = () => queryParams([], [], 10000, 1).then(res => {
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
})

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
.param-group-list {
  margin: 10px;
  height: calc(100% - 20px);

  :deep(.ant-spin-container) {
    max-height: calc(100vh - 120px);
    overflow: auto;
    cursor: pointer;
  }

  :deep(.ant-list-item) {
    justify-content: space-between;
    padding: 4px 8px;

    &:hover {
      background-color: var(--accent-soft);
      border-right: 3px solid var(--accent);
    }
  }
}

.activate-item {
  background-color: var(--accent-soft);
  border-right: 3px solid var(--accent);
}

.group-count {
  color: var(--text-color-secondary, #888);
}
</style>
