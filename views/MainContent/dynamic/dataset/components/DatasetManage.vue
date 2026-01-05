<template>
  <div class="dataset-manage">
    <div class="toolbar">
      <a-space size="middle">
        <a-tooltip title="新建Dataset">
          <a-button
            type="primary"
            @click="handleAdd"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新建
          </a-button>
        </a-tooltip>
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索Dataset名称或备注"
          allow-clear
          style="width: 300px"
          @search="handleSearch"
        />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      :row-selection="{
        type: 'radio',
        selectedRowKeys: selectedRowKeys,
        onChange: handleSelectChange,
      }"
      row-key="tableId"
      :custom-row="(record) => ({
        onClick: (event) => handleRowClick(record, event)
      })"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'datasetName'">
          <a
            style="color: #1890ff; cursor: pointer;"
            @click="handleClickDatasetName(record)"
          >
            {{ record.datasetName }}
          </a>
        </template>
        <template v-else-if="column.key === 'columnCount'">
          <a-tag color="blue">
            {{ getColumnCount(record) }} 列
          </a-tag>
        </template>
        <template v-else-if="column.key === 'tableCount'">
          <a-tag color="green">
            {{ getTableCount(record) }} 表
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleColumnConfig(record)"
            >
              列配置
            </a-button>
            <a-popconfirm
              title="确定删除该Dataset配置吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record)"
            >
              <a-button
                type="link"
                danger
                size="small"
              >
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Dataset SQL整合弹窗 -->
    <DatasetSqlModal
      v-model:open="datasetSqlModalVisible"
      :dataset-info="currentDataset"
      @ok="handleSqlSubmit"
    />

    <!-- 列配置抽屉 -->
    <a-drawer
      v-model:open="columnDrawerVisible"
      title="列配置"
      width="80%"
      :destroy-on-close="true"
    >
      <ColumnConfig
        v-if="currentDataset"
        :dataset="currentDataset"
        @refresh="loadData"
      />
    </a-drawer>

    <!-- 配置详情抽屉 -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      title="Dataset配置详情"
      width="60%"
      :destroy-on-close="true"
    >
      <DatasetDetail
        v-if="currentDataset"
        :dataset="currentDataset"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

import type { DatasetInfo } from '../types'
import ColumnConfig from './ColumnConfig.vue'
import DatasetDetail from './DatasetDetail.vue'
import DatasetSqlModal from './DatasetSqlModal.vue'

import { getConfig } from '@/framework/views/MainContent/dynamic/apis/datasetConfigController'
import { sysDatasetColumnGeneralSelect } from '@/framework/views/MainContent/dynamic/apis/sysDatasetColumnPortalController'
import { sysDatasetGeneralSelect, sysDatasetDeleteItem } from '@/framework/views/MainContent/dynamic/apis/sysDatasetPortalController'
import { sysDatasetTableGeneralSelect } from '@/framework/views/MainContent/dynamic/apis/sysDatasetTablePortalController'

const emit = defineEmits<{
  (e: 'select', dataset: DatasetInfo | null): void
}>()

const columns = [
  { title: 'Dataset 名称', dataIndex: 'datasetName', key: 'datasetName', width: 250 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 200, ellipsis: true },
  { title: '数据源', dataIndex: 'dataSource', key: 'dataSource', width: 120 },
  { title: '表数量', key: 'tableCount', width: 100, align: 'center' },
  { title: '列数量', key: 'columnCount', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 200, fixed: 'right', align: 'center' },
]

const dataSource = ref<DatasetInfo[]>([])
const loading = ref(false)
const datasetSqlModalVisible = ref(false)
const columnDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const currentDataset = ref<DatasetInfo | null>(null)
const searchText = ref('')
const selectedRowKeys = ref<string[]>([])

const loadData = async () => {
  loading.value = true
  try {
    // 查询sys_dataset表
    const res = await sysDatasetGeneralSelect({
      conditionList: searchText.value ? [
        {
          andOr: '1',  // OR条件
          conditionList: [
            {
              field: 'datasetName',
              filterType: 'LIKE',
              value: [searchText.value]
            },
            {
              field: 'remark',
              filterType: 'LIKE',
              value: [searchText.value]
            }
          ]
        }
      ] : []
    }, false, false)
    
    if (res.status?.code === 0) {
      const datasets = res.payload || []
      // 为每个dataset加载tables和columns配置
      dataSource.value = await Promise.all(
        datasets.map(async (ds: any) => {
          try {
            // 加载tables配置
            const tablesRes = await sysDatasetTableGeneralSelect({
              conditionList: [{
                field: 'datasetId',
                filterType: 'EQUAL',
                value: [ds.id]
              }]
            }, false, false)
            
            // 加载columns配置
            const columnsRes = await sysDatasetColumnGeneralSelect({
              conditionList: [{
                field: 'datasetId',
                filterType: 'EQUAL',
                value: [ds.id]
              }]
            }, false, false)
            
            return {
              id: ds.id,
              tableId: ds.datasetName || `dataset_${ds.id}`,
              datasetName: ds.datasetName,
              dataSource: ds.dataSource,
              remark: ds.remark,
              datasets: (tablesRes.payload || []).map((t: any) => ({
                id: t.id,
                datasetId: t.datasetId,
                tableOrder: t.tableOrder,
                tableSql: t.tableSql,
                tableAlias: t.tableAlias,
                joinType: t.joinType,
                joinCondition: t.joinCondition,
                remark: t.remark,
                dataSource: t.dataSource
              })),
              columns: (columnsRes.payload || []).map((c: any) => ({
                id: c.id,
                datasetId: c.datasetId,
                columnSql: c.columnSql,
                columnAlias: c.columnAlias,
                isAggregate: c.isAggregate,
                displayOrder: c.displayOrder,
                isVisible: c.isVisible,
                remark: c.remark
              }))
            }
          } catch (err) {
            console.error('加载dataset配置失败:', err)
            return {
              id: ds.id,
              tableId: ds.datasetName || `dataset_${ds.id}`,
              datasetName: ds.datasetName,
              dataSource: ds.dataSource,
              remark: ds.remark,
              datasets: [],
              columns: []
            }
          }
        })
      )
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  loadData()
}

const handleAdd = () => {
  currentDataset.value = null
  datasetSqlModalVisible.value = true
}

const handleSqlSubmit = async () => {
  try {
    datasetSqlModalVisible.value = false
    // 重新拉取数据更新结果
    await loadData()
  } catch (error) {
    console.error('刷新数据失败:', error)
    message.error('刷新数据失败')
  }
}

const handleColumnConfig = (record: DatasetInfo) => {
  currentDataset.value = record
  columnDrawerVisible.value = true
}

const handleClickDatasetName = async (record: DatasetInfo) => {
  // 使用getConfig获取完整配置
  try {
    const res = await getConfig({ datasetId: record.id! }, false, false)
    if (res.status?.code === 0) {
      currentDataset.value = {
        id: record.id,
        tableId: record.tableId,
        datasetName: record.datasetName,
        remark: record.remark,
        dataSource: record.dataSource,
        datasets: (res.payload?.tables || []).map((t: any) => ({
          id: t.id,
          datasetId: t.datasetId,
          tableOrder: t.tableOrder,
          tableSql: t.tableSql,
          tableAlias: t.tableAlias,
          joinType: t.joinType,
          joinCondition: t.joinCondition,
          remark: t.remark,
          dataSource: t.dataSource
        })),
        columns: (res.payload?.columns || []).map((c: any) => ({
          id: c.id,
          datasetId: c.datasetId,
          columnSql: c.columnSql,
          columnAlias: c.columnAlias,
          isAggregate: c.isAggregate,
          displayOrder: c.displayOrder,
          isVisible: c.isVisible,
          remark: c.remark
        }))
      }
      datasetSqlModalVisible.value = true
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    message.error('加载配置失败')
  }
}

const handleDelete = async (record: DatasetInfo) => {
  try {
    // 直接使用id删除dataset记录（会级联删除tables和columns）
    await sysDatasetDeleteItem({
      id: record.id
    }, false, false)
    
    message.success('删除成功')
    // 如果删除的是当前选中的，清空选中状态
    if (selectedRowKeys.value.includes(record.tableId)) {
      selectedRowKeys.value = []
      emit('select', null)
    }
    loadData()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

const handleSelectChange = (selectedKeys: string[]) => {
  selectedRowKeys.value = selectedKeys
  if (selectedKeys.length > 0) {
    const selected = dataSource.value.find(item => item.tableId === selectedKeys[0])
    emit('select', selected || null)
  } else {
    emit('select', null)
  }
}

// 点击行任意位置选中
const handleRowClick = (record: DatasetInfo, event: MouseEvent) => {
  // 如果点击的是按钮或链接，不触发选中
  const target = event.target as HTMLElement
  if (target.closest('button') || target.closest('a') || target.closest('.ant-checkbox-wrapper')) {
    return
  }
  
  // 切换选中状态
  if (selectedRowKeys.value.includes(record.tableId)) {
    selectedRowKeys.value = []
    emit('select', null)
  } else {
    selectedRowKeys.value = [record.tableId]
    emit('select', record)
  }
}

const getColumnCount = (record: any) => {
  const id = record?.id
  if (!id) return (record?.columns || []).length || 0
  return (record?.columns || []).filter((c: any) => String(c.datasetId) === String(id)).length
}

const getTableCount = (record: any) => {
  const id = record?.id
  if (!id) return (record?.datasets || []).length || 0
  return (record?.datasets || []).filter((t: any) => String(t.datasetId) === String(id)).length
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.dataset-manage {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    margin-bottom: 16px;
  }
}
</style>
