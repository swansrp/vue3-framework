<template>
  <div class="matrix-manage">
    <div class="toolbar">
      <a-space size="middle">
        <a-tooltip title="新建矩阵">
          <a-button
            type="primary"
            @click="handleAdd"
          >
            <template #icon>
              <PlusOutlined />
            </template>
          </a-button>
        </a-tooltip>
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索表名或表注释"
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
      :pagination="pagination"
      :row-selection="{
        type: 'radio',
        selectedRowKeys: selectedRowKeys,
        onChange: handleSelectChange,
      }"
      row-key="id"
      :custom-row="(record) => ({
        onClick: (event) => handleRowClick(record, event)
      })"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-space :size="8">
            <!-- 未创建状态：显示创建图标 -->
            <a-tooltip
              v-if="record.status === '0'"
              :title="!record.hasColumns ? '请先配置字段' : '创建表'"
            >
              <PlusOutlined
                :style="{
                  fontSize: '16px',
                  color: record.hasColumns ? '#1890ff' : '#d9d9d9',
                  cursor: record.hasColumns ? 'pointer' : 'not-allowed'
                }"
                @click="record.hasColumns && handleCreateTable(record)"
              />
            </a-tooltip>
            <!-- 待同步状态：显示红色同步图标 -->
            <a-tooltip
              v-if="record.status === '3'"
              title="立即同步"
            >
              <SyncOutlined
                :style="{
                  fontSize: '16px',
                  color: '#ff4d4f',
                  cursor: 'pointer'
                }"
                @click="handleSyncTable(record)"
              />
            </a-tooltip>
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </a-space>
        </template>
        <template v-else-if="column.key === 'tableName'">
          <a
            style="color: #1890ff; cursor: pointer;"
            @click="handleEditMatrix(record)"
          >
            {{ record.tableName }}
          </a>
        </template>
        <template v-else-if="column.key === 'tableComment'">
          <div
            class="editable-cell"
            @dblclick="handleEditComment(record)"
          >
            <template v-if="editingKey === record.id">
              <a-input
                ref="commentInputRef"
                v-model:value="editingComment"
                @blur="handleSaveComment(record)"
                @press-enter="handleSaveComment(record)"
              />
            </template>
            <template v-else>
              {{ record.tableComment }}
            </template>
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              type="link"
              size="small"
              @click="handleConfig(record)"
            >
              字段配置
            </a-button>
            <a-button
              type="link"
              size="small"
              :disabled="record.status === '0'"
              @click="handleViewHistory(record)"
            >
              变更历史
            </a-button>
            <a-popconfirm
              title="确定清空表数据吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleTruncateTable(record)"
            >
              <a-button
                type="link"
                danger
                size="small"
                :disabled="record.status === '0'"
              >
                清空数据
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确定删除该矩阵吗？"
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

    <!-- 矩阵编辑弹窗 -->
    <MatrixEditModal
      v-model:open="modalVisible"
      :title="modalTitle"
      :data="formData"
      :readonly="modalReadonly"
      @ok="handleSubmit"
      @refresh="handleRefresh"
      @cancel="handleCancel"
    />

    <!-- 字段配置抽屉 -->
    <a-drawer
      v-model:open="columnDrawerVisible"
      title="字段配置"
      width="80%"
      :destroy-on-close="true"
      @close="handleColumnDrawerClose"
    >
      <ColumnConfig
        v-if="currentMatrix"
        :matrix="currentMatrix"
      />
    </a-drawer>

    <!-- 变更历史抽屉 -->
    <a-drawer
      v-model:open="historyDrawerVisible"
      title="表结构变更历史"
      width="80%"
      :destroy-on-close="true"
    >
      <ChangeHistory
        v-if="currentMatrix"
        :matrix="currentMatrix"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined, SyncOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'


import type { MatrixInfo } from '../types'
import ChangeHistory from './ChangeHistory.vue'
import ColumnConfig from './ColumnConfig.vue'
import MatrixEditModal from './MatrixEditModal.vue'

import { sysMatrixColumnGeneralSelect } from '@/framework/views/MainContent/dynamic/apis/sysMatrixColumnPortalController'
import {
  createPhysicalTable,
  syncTableStructure,
  sysMatrixAdd,
  sysMatrixDeleteItem,
  sysMatrixGeneralQuery,
  sysMatrixUpdate,
  truncateTable,
} from '@/framework/views/MainContent/dynamic/apis/sysMatrixPortalController'
import { ConditionVO } from '@/framework/views/MainContent/dynamic/apis/types'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'

const emit = defineEmits<{
  (e: 'select', matrix: MatrixInfo | null): void
}>()

const columns = [
  { title: '状态', dataIndex: 'status', key: 'status', width: 150, align: 'center' },
  { title: '表名', dataIndex: 'tableName', key: 'tableName', width: 350, align: 'center'  },
  { title: '表注释', dataIndex: 'tableComment', key: 'tableComment', align: 'center'  },
  { title: '创建时间', dataIndex: 'createAt', key: 'createAt', width: 120 },
  { title: '操作', key: 'action', width: 280, fixed: 'right', align: 'center' },
]

const dataSource = ref<MatrixInfo[]>([])
const loading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const modalVisible = ref(false)
const modalTitle = ref('新建矩阵')
const modalReadonly = ref(false)
const formData = reactive<MatrixInfo>({
  tableName: '',
  tableComment: '',
  dataSource: 'master',
  engine: 'InnoDB',
  charset: 'utf8mb4',
  sort: 1,
})

const columnDrawerVisible = ref(false)
const historyDrawerVisible = ref(false)
const currentMatrix = ref<MatrixInfo>()
const searchText = ref('')
const editingKey = ref<string | undefined>()
const editingComment = ref('')
const commentInputRef = ref()
const selectedRowKeys = ref<string[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    }
    
    // 如果有搜索文本，添加搜索条件
    if (searchText.value) {
      params.tableNameOrComment = searchText.value
    }
    
    const res = await sysMatrixGeneralQuery(params, false, false)
    if (res.status?.code === 0) {
      const records = res.payload?.records || []
      
      // 检查每个矩阵是否有字段
      dataSource.value = await Promise.all(
        records.map(async (record: any) => {
          try {
            const conditionList = [buildCondition('matrixId', FILTER_TYPE.EQUAL, [record.id])] as ConditionVO[]
            const columnRes = await sysMatrixColumnGeneralSelect(
              {
                conditionList,
              },
              false,
              false
            )
            return {
              ...record,
              hasColumns: (columnRes.payload?.length || 0) > 0
            }
          } catch (error) {
            console.error('检查字段失败:', error)
            return {
              ...record,
              hasColumns: false
            }
          }
        })
      )
      pagination.total = res.payload?.total || 0
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

const handleSearch = () => {
  pagination.current = 1 // 搜索时重置到第一页
  loadData()
}

const handleAdd = () => {
  modalTitle.value = '新建矩阵'
  modalReadonly.value = false
  Object.assign(formData, {
    id: undefined,
    tableName: '',
    tableComment: '',
    dataSource: 'master',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    sort: 1,
  })
  modalVisible.value = true
}

const handleEditMatrix = (record: MatrixInfo) => {
  modalTitle.value = '查看矩阵'
  modalReadonly.value = true
  // 移除 biz_ 前缀用于显示
  const displayData = { ...record }
  if (displayData.tableName?.startsWith('biz_')) {
    displayData.tableName = displayData.tableName.replace(/^biz_/, '')
  }
  Object.assign(formData, displayData)
  modalVisible.value = true
}

const handleEditComment = (record: MatrixInfo) => {
  editingKey.value = record.id
  editingComment.value = record.tableComment || ''
  // 使用 nextTick 确保输入框渲染后再聚焦
  setTimeout(() => {
    commentInputRef.value?.focus()
  }, 100)
}

const handleSaveComment = async (record: MatrixInfo) => {
  if (editingComment.value === record.tableComment) {
    editingKey.value = undefined
    return
  }

  try {
    const res = await sysMatrixUpdate({}, {
      ...record,
      tableComment: editingComment.value
    } as any)
    
    if (res.status?.code === 0) {
      message.success('修改表注释成功')
      editingKey.value = undefined
      loadData()
    } else {
      editingKey.value = undefined
    }
  } catch (error) {
    console.error('修改表注释失败:', error)
    editingKey.value = undefined
  }
}

const handleSubmit = async (data: MatrixInfo) => {
  let res
  // 提交时添加 biz_ 前缀
  const submitData = {
    ...data,
    tableName: `biz_${data.tableName}`
  }
  if (data.id) {
    res = await sysMatrixUpdate({}, submitData as any)
  } else {
    res = await sysMatrixAdd(submitData as any)
  }
  if (res.status?.code === 0) {
    message.success(data.id ? '更新成功' : '创建成功')
    handleRefresh()
  }
}

const handleRefresh = () => {
  modalVisible.value = false
  loadData()
}

const handleCancel = () => {
  modalVisible.value = false
}

const handleDelete = async (record: MatrixInfo) => {
  const res = await sysMatrixDeleteItem({ id: record.id })
  if (res.status?.code === 0) {
    message.success('删除成功')
    // 如果删除的是当前选中的行，清空选中状态
    if (selectedRowKeys.value.includes(record.id!)) {
      selectedRowKeys.value = []
      emit('select', null)
    }
    loadData()
  }
}

const handleTruncateTable = async (record: MatrixInfo) => {
  const res = await truncateTable({ id: Number(record.id) })
  if (res.status?.code === 0) {
    message.success('清空表数据成功')
    loadData()
  }
}

const handleConfig = (record: MatrixInfo) => {
  currentMatrix.value = record
  columnDrawerVisible.value = true
}

const handleColumnDrawerClose = () => {
  // 关闭字段配置抽屉时刷新列表
  loadData()
}

const handleSelectChange = (selectedKeys: string[]) => {
  selectedRowKeys.value = selectedKeys
  if (selectedKeys.length > 0) {
    const selected = dataSource.value.find(item => item.id === selectedKeys[0])
    emit('select', selected || null)
  } else {
    emit('select', null)
  }
}

// 点击行任意位置选中
const handleRowClick = (record: MatrixInfo, event: MouseEvent) => {
  // 如果点击的是按钮、链接、图标或双击编辑区域，不触发选中
  const target = event.target as HTMLElement
  if (target.closest('button') || 
      target.closest('a') || 
      target.closest('.ant-checkbox-wrapper') ||
      target.closest('.anticon') ||
      target.closest('.editable-cell input')) {
    return
  }
  
  // 切换选中状态
  if (selectedRowKeys.value.includes(record.id!)) {
    selectedRowKeys.value = []
    emit('select', null)
  } else {
    selectedRowKeys.value = [record.id!]
    emit('select', record)
  }
}

// 检查矩阵是否有主键字段
const checkPrimaryKey = async (matrixId: number): Promise<boolean> => {
  try {
    const conditionList = [buildCondition('matrixId', FILTER_TYPE.EQUAL, [matrixId])] as ConditionVO[]
    const columnRes = await sysMatrixColumnGeneralSelect(
      {
        conditionList,
      },
      false,
      false
    )
    
    const columns = columnRes.payload || []
    // 检查是否有字段标记为主键
    return columns.some((col: any) => col.isPrimaryKey === '1')
  } catch (error) {
    console.error('检查主键失败:', error)
    return false
  }
}

const handleCreateTable = async (record: MatrixInfo) => {
  // 检查是否有主键
  const hasPrimaryKey = await checkPrimaryKey(Number(record.id))
  
  if (!hasPrimaryKey) {
    Modal.confirm({
      title: '确认创建表',
      content: '当前字段列表中没有主键字段，是否继续创建表？',
      okText: '继续创建',
      cancelText: '取消',
      onOk: async () => {
        await executeCreateTable(record)
      },
    })
  } else {
    await executeCreateTable(record)
  }
}

const executeCreateTable = async (record: MatrixInfo) => {
  try {
    const res = await createPhysicalTable({ id: Number(record.id) })
    if (res.status?.code === 0) {
      message.success('创建物理表成功')
      loadData()
    }
  } catch (error) {
    console.error('创建物理表失败:', error)
  }
}

const handleSyncTable = async (record: MatrixInfo) => {
  // 检查是否有主键
  const hasPrimaryKey = await checkPrimaryKey(Number(record.id))
  
  if (!hasPrimaryKey) {
    Modal.confirm({
      title: '确认同步表结构',
      content: '当前字段列表中没有主键字段，是否继续同步表结构？',
      okText: '继续同步',
      cancelText: '取消',
      onOk: async () => {
        await executeSyncTable(record)
      },
    })
  } else {
    await executeSyncTable(record)
  }
}

const executeSyncTable = async (record: MatrixInfo) => {
  try {
    const res = await syncTableStructure({ id: Number(record.id) })
    if (res.status?.code === 0) {
      message.success('同步表结构成功')
      loadData()
    }
  } catch (error) {
    console.error('同步表结构失败:', error)
  }
}

const handleViewHistory = (record: MatrixInfo) => {
  currentMatrix.value = record
  historyDrawerVisible.value = true
}

const getStatusText = (status?: string) => {
  const map: Record<string, string> = {
    '0': '未创建',
    '1': '已创建',
    '2': '已同步',
    '3': '待同步',
  }
  return map[status || '0'] || '未知'
}

const getStatusColor = (status?: string) => {
  const map: Record<string, string> = {
    '0': 'default',     // 灰色
    '1': 'blue',        // 蓝色
    '2': 'success',     // 绿色
    '3': 'warning',     // 橙色
  }
  return map[status || '0'] || 'default'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="less">
.matrix-manage {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    margin-bottom: 16px;
  }

  .editable-cell {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f0f0f0;
    }
  }
}
</style>
