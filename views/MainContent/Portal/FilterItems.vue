<script lang="ts" setup>
import { computed } from 'vue'

import { PortalTableFilterVO } from '@/framework/apis/portal/table'

/**
 * Portal 表格左侧筛选项模板(table.vue 与 pivot.vue 共用)
 * 自包含 a-descriptions 容器: a-descriptions 只能识别直接子级的 descriptions-item,
 * 因此本组件必须作为 #side 插槽的完整内容直接使用, 外层不能再包 a-descriptions
 * filterValues / treeOptionsCache 为引用对象，内部直接修改即可触发外部响应
 */
const props = defineProps<{
  filterConfigList: PortalTableFilterVO[]
  filterValues: Record<string, any>
  treeOptionsCache: Record<string, any[]>
  getSelectOptions: (dictCode: string | undefined) => Array<{ label: string, value: string }>
  loadDictOptions: (dictCode: string | undefined) => Promise<void>
  getTreeOptions: (dictCode: string | undefined) => Promise<any[]>
}>()

// 模板内通过局部引用修改对象内容(与父组件共享同一对象引用)
const filterValues = computed(() => props.filterValues)
const treeOptionsCache = computed(() => props.treeOptionsCache)
</script>

<template>
  <div class="desc-wrapper">
    <a-descriptions
      :column="1"
      class="scrollable-descriptions"
      layout="vertical"
    >
      <a-descriptions-item
        v-for="filter in filterConfigList"
        :key="filter.id"
        :label="filter.label"
      >
        <!-- 输入框类型 -->
        <template v-if="filter.filterType === 'input'">
          <a-input
            v-model:value="filterValues[filter.code!]"
            :allow-clear="filter.allowClear === '1'"
            :placeholder="filter.placeholder || '请输入' + filter.label"
            style="width: 95%; background-color: rgb(21,76,121);"
          />
        </template>

        <!-- 下拉选择类型 -->
        <template v-else-if="filter.filterType === 'select'">
          <a-select
            :key="`select-${filter.id}-${filter.dictCode}`"
            v-model:value="filterValues[filter.code!]"
            :allow-clear="filter.allowClear === '1'"
            :mode="filter.multiple === '1' ? 'multiple' : undefined"
            :placeholder="filter.placeholder || '请选择' + filter.label"
            style="width: 95%"
            @focus="() => loadDictOptions(filter.dictCode)"
          >
            <a-select-option
              v-for="option in getSelectOptions(filter.dictCode)"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </template>

        <!-- 日期范围选择类型 -->
        <template v-else-if="filter.filterType === 'dateRange'">
          <a-range-picker
            v-model:value="(filterValues[filter.code!]) as any"
            :allow-clear="filter.allowClear === '1'"
            :placeholder="[filter.placeholder || '开始日期', filter.placeholder || '结束日期']"
            style="width: 95%"
            value-format="YYYY-MM-DD"
            @change="(dates: any) => {
              if (dates && dates.length === 2) {
                // $1 对应开始日期，$2 对应结束日期
                filterValues[filter.code!] = dates
              }
            }"
          />
        </template>

        <!-- 树形下拉列表类型 -->
        <template v-else-if="filter.filterType === 'treeSelect'">
          <a-tree-select
            v-model:value="filterValues[filter.code!]"
            :allow-clear="filter.allowClear === '1'"
            :placeholder="filter.placeholder || '请选择' + filter.label"
            :tree-data="treeOptionsCache[filter.dictCode!] || []"
            style="width: 95%"
            tree-node-filter-prop="label"
            :show-search="true"
            @focus="() => getTreeOptions(filter.dictCode)"
          >
            <template #title="{ label }">
              {{ label }}
            </template>
          </a-tree-select>
        </template>

        <!-- 数字输入类型 -->
        <template v-else-if="filter.filterType === 'number'">
          <a-input-number
            v-model:value="filterValues[filter.code!]"
            :allow-clear="filter.allowClear === '1'"
            :placeholder="filter.placeholder || '请输入' + filter.label"
            style="width: 95%"
          />
        </template>

        <!-- 日期选择类型 -->
        <template v-else-if="filter.filterType === 'date' || filter.filterType === 'week' || filter.filterType === 'month' || filter.filterType === 'year'">
          <a-date-picker
            v-model:value="filterValues[filter.code!]"
            :allow-clear="filter.allowClear === '1'"
            :placeholder="filter.placeholder || '请选择' + filter.label"
            style="width: 95%"
            :picker="filter.filterType as any"
            value-format="YYYY-MM-DD"
          />
        </template>
      </a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<style lang="less" scoped>
.desc-wrapper {
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: transparent;
  color: white;
}

.scrollable-descriptions {
  flex: 1;
  overflow-y: auto;
  background: transparent;
}

:deep(.ant-descriptions-row) {
  display: flex;
  flex: 1;
}

:deep(.ant-descriptions-item) {
  flex: 1;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

// item 为 flex 后, 内部容器默认收缩为内容宽( select 会塌缩), 补宽度链让控件的 95% 生效
:deep(.ant-descriptions-item-container) {
  flex: 1;
  width: 100%;
}

:deep(.ant-descriptions-item-content) {
  display: block;
  width: 100%;
}
</style>
