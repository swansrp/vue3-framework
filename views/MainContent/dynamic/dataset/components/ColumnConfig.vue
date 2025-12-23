<template>
  <div class="column-config">
    <div class="toolbar">
      <a-space>
        <a-button
          type="primary"
          @click="handleAdd"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          添加列
        </a-button>
        <a-button @click="loadData">
          <template #icon>
            <ReloadOutlined />
          </template>
          刷新
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :scroll="{ y: 'calc(100vh - 300px)' }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'displayOrder'">
          <a-space>
            <a-button
              type="link"
              size="small"
              :disabled="index === 0"
              @click="handleMoveUp(index)"
            >
              <UpOutlined />
            </a-button>
            <span>{{ record.displayOrder }}</span>
            <a-button
              type="link"
              size="small"
              :disabled="index === dataSource.length - 1"
              @click="handleMoveDown(index)"
            >
              <DownOutlined />
            </a-button>
          </a-space>
        </template>
        <template v-else-if="column.key === 'columnAlias'">
          {{ removeQuotes(record.columnAlias) }}
        </template>
        <template v-else-if="column.key === 'isAggregate'">
          <a-tag :color="record.isAggregate === '1' ? 'orange' : 'default'">
            {{ record.isAggregate === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'isVisible'">
          <a-tag :color="record.isVisible === '1' ? 'green' : 'default'">
            {{ record.isVisible === '1' ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleEdit(record)"
            >
              编辑
            </a-button>
            <a-popconfirm
              title="确定删除该列配置吗？"
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

    <!-- 列编辑弹窗 -->
    <ColumnEditModal
      v-model:open="modalVisible"
      :title="modalTitle"
      :column-info="currentColumn"
      :table-id="dataset.tableId"
      @ok="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { DownOutlined, PlusOutlined, ReloadOutlined, UpOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

import type { DatasetColumnInfo, DatasetInfo } from '../types'
import ColumnEditModal from './ColumnEditModal.vue'

import { 
  getColumns, 
  datasetConfigAddColumn, 
  datasetConfigUpdateColumn, 
  deleteColumn,
  datasetConfigUpdateColumnsOrder
} from '@/apis/datasetConfigController'

const props = defineProps<{
  dataset: DatasetInfo
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const columns = [
  { title: '顺序', key: 'displayOrder', width: 120, align: 'center' },
  { title: 'SQL表达式', dataIndex: 'columnSql', key: 'columnSql', width: 700 },
  { title: '别名', dataIndex: 'columnAlias', key: 'columnAlias', width: 200 },
  { title: '是否聚合', key: 'isAggregate', width: 100, align: 'center' },
  { title: '是否显示', key: 'isVisible', width: 100, align: 'center' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '操作', key: 'action', width: 150, fixed: 'right', align: 'center' },
]

const dataSource = ref<DatasetColumnInfo[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const modalTitle = ref('添加列')
const currentColumn = ref<DatasetColumnInfo | null>(null)

// 去掉别名的单引号
const removeQuotes = (alias?: string) => {
  if (!alias) return ''
  if (alias.startsWith("'") && alias.endsWith("'")) {
    return alias.slice(1, -1)
  }
  return alias
}

const loadData = async () => {
  loading.value = true
  try {
    // 使用 dataset.id 直接获取列配置
    if (props.dataset.id) {
      const res = await getColumns({ datasetId: props.dataset.id }, false, false)
      if (res.status?.code === 0) {
        dataSource.value = res.payload || []
      }
    }
  } catch (error) {
    console.error('加载列配置失败:', error)
    message.error('加载列配置失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  modalTitle.value = '添加列'
  currentColumn.value = null
  modalVisible.value = true
}

const handleEdit = (record: DatasetColumnInfo) => {
  modalTitle.value = '编辑列'
  currentColumn.value = record
  modalVisible.value = true
}

const handleSubmit = async (data: DatasetColumnInfo) => {
  try {
    // 使用 props.dataset.id 作为 datasetId
    if (props.dataset.id) {
      data.tableId = String(props.dataset.id)
      
      if (currentColumn.value?.id) {
        await datasetConfigUpdateColumn(data, true, false)
      } else {
        await datasetConfigAddColumn(data, true, false)
      }
      
      modalVisible.value = false
      loadData()
      emit('refresh')
    }
  } catch (error) {
    console.error('保存失败:', error)
  }
}

const handleDelete = async (record: DatasetColumnInfo) => {
  try {
    await deleteColumn({ id: String(record.id) }, true, false)
    loadData()
    emit('refresh')
  } catch (error) {
    console.error('删除失败:', error)
  }
}

const handleMoveUp = async (index: number) => {
  if (index === 0) return
  
  const current = dataSource.value[index]
  const prev = dataSource.value[index - 1]
  
  // 交换displayOrder
  const tempOrder = current.displayOrder
  current.displayOrder = prev.displayOrder
  prev.displayOrder = tempOrder
  
  // 更新顺序
  await updateOrder()
}

const handleMoveDown = async (index: number) => {
  if (index === dataSource.value.length - 1) return
  
  const current = dataSource.value[index]
  const next = dataSource.value[index + 1]
  
  // 交换displayOrder
  const tempOrder = current.displayOrder
  current.displayOrder = next.displayOrder
  next.displayOrder = tempOrder
  
  // 更新顺序
  await updateOrder()
}

const updateOrder = async () => {
  try {
    const orderData = dataSource.value.map((col, idx) => ({
      id: String(col.id!),
      showOrder: idx + 1
    }))
    
    await datasetConfigUpdateColumnsOrder(orderData, true, false)
    
    // 重新排序本地数据
    dataSource.value.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  } catch (error) {
    console.error('更新顺序失败:', error)
    loadData() // 失败时重新加载数据
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.column-config {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    margin-bottom: 16px;
  }
}
</style>
