<template>
  <div class="dataset-detail">
    <a-descriptions
      title="基本信息"
      :column="2"
      bordered
    >
      <a-descriptions-item label="Dataset ID">
        {{ dataset.tableId }}
      </a-descriptions-item>
      <a-descriptions-item label="数据源">
        {{ dataset.dataSource || 'default' }}
      </a-descriptions-item>
      <a-descriptions-item label="表数量">
        {{ dataset.datasets?.length || 0 }}
      </a-descriptions-item>
      <a-descriptions-item label="列数量">
        {{ dataset.columns?.length || 0 }}
      </a-descriptions-item>
    </a-descriptions>

    <a-divider>表配置</a-divider>
    <a-table
      :columns="tableColumns"
      :data-source="dataset.datasets"
      :pagination="false"
      row-key="datasetOrder"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'joinType'">
          <a-tag
            v-if="record.joinType"
            color="blue"
          >
            {{ formatJoinType(record.joinType) }}
          </a-tag>
          <span
            v-else
            style="color: #999"
          >主表</span>
        </template>
        <template v-else-if="column.key === 'joinCondition'">
          <div
            v-if="record.joinCondition"
            class="join-condition-cell"
          >
            <b-ace-editor
              :model-value="record.joinCondition"
              height="60px"
              lang="sql"
              theme="chrome"
              :read-only="true"
            />
          </div>
        </template>
      </template>
    </a-table>

    <a-divider>列配置</a-divider>
    <a-table
      :columns="columnColumns"
      :data-source="dataset.columns"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'isAggregate'">
          <a-tag :color="record.isAggregate === 'Y' ? 'orange' : 'default'">
            {{ record.isAggregate === 'Y' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'isVisible'">
          <a-tag :color="record.isVisible === 'Y' ? 'green' : 'red'">
            {{ record.isVisible === 'Y' ? '显示' : '隐藏' }}
          </a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">

import type { DatasetInfo } from '../types'

defineProps<{
  dataset: DatasetInfo
}>()

// JOIN类型映射
const joinTypeMap: Record<string, string> = {
  '0': '内联 (INNER)',
  '1': '左联 (LEFT)',
  '2': '右联 (RIGHT)',
  '3': '全联 (FULL)',
}

// 格式化JOIN类型显示
const formatJoinType = (joinType?: string) => {
  if (!joinType) return ''
  return joinTypeMap[joinType] || joinType
}

const tableColumns = [
  { title: '顺序', dataIndex: 'tableOrder', key: 'tableOrder', width: 80 },
  { title: '表名', dataIndex: 'tableSql', key: 'tableSql', width: 200 },
  { title: '别名', dataIndex: 'tableAlias', key: 'tableAlias', width: 100 },
  { title: 'JOIN类型', key: 'joinType', width: 120 },
  { title: 'JOIN条件', dataIndex: 'joinCondition', key: 'joinCondition' },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 150 },
]

const columnColumns = [
  { title: '顺序', dataIndex: 'displayOrder', key: 'displayOrder', width: 80 },
  { title: 'SQL表达式', dataIndex: 'columnSql', key: 'columnSql', width: 200 },
  { title: '别名', dataIndex: 'columnAlias', key: 'columnAlias', width: 150 },
  { title: '聚合', key: 'isAggregate', width: 80, align: 'center' },
  { title: '显示', key: 'isVisible', width: 80, align: 'center' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
]
</script>

<style scoped lang="less">
.dataset-detail {
  :deep(.ant-divider) {
    margin: 24px 0 16px;
  }
  
  .join-condition-cell {
    min-width: 300px;
    
    :deep(.ace_editor) {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
    }
  }
}
</style>
