<template>
  <div class="redis-admin">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <a-space>
        <a-input-search
          v-model:value="searchPattern"
          placeholder="输入Key关键字搜索"
          style="width: 280px"
          allow-clear
          @search="handleSearch"
        />
        <a-button @click="handleRefreshAll">刷新</a-button>
        <a-popconfirm
          title="确定删除选中的Key吗？此操作不可恢复"
          @confirm="handleBatchDelete"
        >
          <a-button
            danger
            :disabled="selectedRowKeys.length === 0"
          >
            批量删除 ({{ selectedRowKeys.length }})
          </a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <!-- 主体：左树 + 右表 -->
    <div class="main-content">
      <!-- 左侧：Key 树 -->
      <div class="tree-panel">
        <div class="panel-header">
          <span class="panel-title">Key 目录</span>
          <a-button type="link" size="small" @click="handleRefreshTree">刷新树</a-button>
        </div>
        <a-spin :spinning="treeLoading" class="tree-spin">
          <a-tree
            v-if="treeData.length > 0"
            v-model:selectedKeys="selectedTreeKeys"
            v-model:expandedKeys="expandedTreeKeys"
            :tree-data="treeData"
            :field-names="{ title: 'title', key: 'key', children: 'children' }"
            :default-expand-all="false"
            :show-line="true"
            @select="onTreeSelect"
          >
            <template #title="{ title, keyCount }">
              <span class="tree-node-title">
                <span>{{ title }}</span>
                <a-badge
                  v-if="keyCount !== undefined && keyCount > 0"
                  :count="keyCount"
                  :number-style="{ backgroundColor: '#1890ff', fontSize: '11px' }"
                  :overflow-count="9999"
                  class="tree-badge"
                />
              </span>
            </template>
          </a-tree>
          <a-empty v-else description="暂无Key数据" />
        </a-spin>
      </div>

      <!-- 右侧：Key 表格 -->
      <div class="table-panel">
        <div class="panel-header">
          <span class="panel-title">Key 列表</span>
          <a-tag v-if="currentPrefix" color="blue" style="margin-left: 8px">
            前缀: {{ currentPrefix }}:*
          </a-tag>
          <a-tag v-else color="default" style="margin-left: 8px">全部</a-tag>
        </div>
        <a-table
          :columns="columns"
          :data-source="tableData"
          :pagination="pagination"
          :loading="tableLoading"
          :row-key="(record: any) => record.key"
          :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
          @change="handleTableChange"
          size="small"
          :scroll="{ x: 800, y: 'calc(100vh - 210px)' }"
        >
          <template #bodyCell="{ column, record }">
            <!-- TTL列 -->
            <template v-if="column.dataIndex === 'ttl'">
              <a-tag v-if="record.ttl === -1" color="green">永不过期</a-tag>
              <a-tag v-else-if="record.ttl === -2" color="red">已过期</a-tag>
              <span v-else>{{ formatTTL(record.ttl) }}</span>
            </template>

            <!-- 类型列 -->
            <template v-if="column.dataIndex === 'type'">
              <a-tag :color="getTypeColor(record.type)">{{ record.type }}</a-tag>
            </template>

            <!-- 操作列 -->
            <template v-if="column.dataIndex === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="handleDetail(record)">查看</a-button>
                <a-popconfirm
                  title="确定删除此Key吗？"
                  @confirm="handleDelete(record)"
                >
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
                <a-button type="link" size="small" @click="handleExpire(record)">改TTL</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- Key详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      title="Key 详情"
      width="700px"
      :footer="null"
    >
      <a-descriptions bordered :column="1" size="small" v-if="detailData">
        <a-descriptions-item label="Key">{{ detailData.key }}</a-descriptions-item>
        <a-descriptions-item label="类型">
          <a-tag :color="getTypeColor(detailData.type)">{{ detailData.type }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="TTL（秒）">
          {{ detailData.ttl === -1 ? '永不过期' : detailData.ttl === -2 ? '已过期' : detailData.ttl }}
        </a-descriptions-item>
        <a-descriptions-item label="大小">{{ detailData.size }}</a-descriptions-item>
      </a-descriptions>
      <div style="margin-top: 12px">
        <div style="margin-bottom: 8px; font-weight: bold">Value:</div>
        <pre class="value-pre">{{ formatValue(detailData?.value) }}</pre>
      </div>
    </a-modal>

    <!-- 修改TTL弹窗 -->
    <a-modal
      v-model:open="expireVisible"
      title="修改过期时间"
      width="450px"
      @ok="handleExpireConfirm"
    >
      <a-form layout="vertical">
        <a-form-item label="Key">
          <a-input :value="expireKey" disabled />
        </a-form-item>
        <a-form-item label="过期时间（秒）">
          <a-input-number
            v-model:value="expireTTL"
            style="width: 100%"
            :min="-1"
            placeholder="输入秒数，-1表示永不过期"
          />
        </a-form-item>
        <a-alert
          message="-1 表示永不过期；0 或正数表示N秒后过期"
          type="info"
          show-icon
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import {
  getRedisKeyTree,
  getRedisKeyList,
  getRedisKeyDetail,
  deleteRedisKey,
  deleteRedisKeyList,
  updateRedisKeyExpire
} from '@/framework/apis/redis'

const { currentRoute } = useRouter()
const route = currentRoute.value
const baseUrl: Ref<string | undefined> = ref(undefined)

/* ========== 树相关 ========== */
const treeLoading = ref(false)
const treeData: Ref<any[]> = ref([])
const selectedTreeKeys: Ref<string[]> = ref([])
const expandedTreeKeys: Ref<string[]> = ref([])
const currentPrefix = ref('')

// 加载树
const loadTree = async () => {
  treeLoading.value = true
  try {
    const resp: any = await getRedisKeyTree(baseUrl.value)
    treeData.value = resp.payload || resp || []
    // 默认展开第一层
    expandedTreeKeys.value = treeData.value.map((n: any) => n.key)
  } finally {
    treeLoading.value = false
  }
}

// 树节点点击
const onTreeSelect = (keys: any[], info: any) => {
  const node = info.node
  if (node) {
    currentPrefix.value = node.key || ''
  } else {
    currentPrefix.value = ''
  }
  pagination.current = 1
  loadTable()
}

// 刷新树
const handleRefreshTree = () => {
  loadTree()
}

/* ========== 表格相关 ========== */
const tableLoading = ref(false)
const searchPattern = ref('')
const tableData: Ref<any[]> = ref([])
const selectedRowKeys: Ref<string[]> = ref([])

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 50,
  total: 0,
  showTotal: (total: number) => `共 ${total} 条`,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100', '200']
})

// 表格列定义
const columns = [
  { title: 'Key', dataIndex: 'key', ellipsis: true, width: 350 },
  { title: '类型', dataIndex: 'type', width: 90 },
  { title: 'TTL', dataIndex: 'ttl', width: 130 },
  { title: '大小', dataIndex: 'size', width: 80 },
  { title: '操作', dataIndex: 'action', width: 200, fixed: 'right' as const }
]

// 加载表格
const loadTable = async () => {
  tableLoading.value = true
  try {
    const resp: any = await getRedisKeyList(
      {
        pattern: searchPattern.value,
        keyPrefix: currentPrefix.value || undefined,
        currentPage: pagination.current,
        pageSize: pagination.pageSize
      },
      baseUrl.value
    )
    const payload = resp.payload || resp
    tableData.value = payload.records || []
    pagination.total = payload.total || 0
  } finally {
    tableLoading.value = false
  }
}

// 搜索（全局搜索，忽略树选择）
const handleSearch = () => {
  currentPrefix.value = ''
  selectedTreeKeys.value = []
  pagination.current = 1
  loadTable()
}

// 全部刷新
const handleRefreshAll = () => {
  searchPattern.value = ''
  currentPrefix.value = ''
  selectedTreeKeys.value = []
  pagination.current = 1
  loadTree()
  loadTable()
}

// 分页变化
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadTable()
}

// 选择变化
const onSelectChange = (keys: any[]) => {
  selectedRowKeys.value = keys
}

/* ========== 详情弹窗 ========== */
const detailVisible = ref(false)
const detailData: Ref<any> = ref(null)

const handleDetail = async (record: any) => {
  detailVisible.value = true
  detailData.value = null
  const resp: any = await getRedisKeyDetail(record.key, baseUrl.value)
  detailData.value = resp.payload || resp
}

/* ========== 删除 ========== */
const handleDelete = async (record: any) => {
  await deleteRedisKey(record.key, baseUrl.value)
  loadTable()
  loadTree()
}

const handleBatchDelete = async () => {
  await deleteRedisKeyList(selectedRowKeys.value, baseUrl.value)
  selectedRowKeys.value = []
  loadTable()
  loadTree()
}

/* ========== 修改TTL ========== */
const expireVisible = ref(false)
const expireKey = ref('')
const expireTTL = ref<number>(-1)

const handleExpire = (record: any) => {
  expireKey.value = record.key
  expireTTL.value = record.ttl
  expireVisible.value = true
}

const handleExpireConfirm = async () => {
  await updateRedisKeyExpire(expireKey.value, expireTTL.value, baseUrl.value)
  expireVisible.value = false
  loadTable()
}

/* ========== 工具方法 ========== */
const formatTTL = (ttl: number): string => {
  if (ttl >= 86400) {
    const days = Math.floor(ttl / 86400)
    const hours = Math.floor((ttl % 86400) / 3600)
    return `${days}天${hours}小时`
  } else if (ttl >= 3600) {
    const hours = Math.floor(ttl / 3600)
    const mins = Math.floor((ttl % 3600) / 60)
    return `${hours}小时${mins}分`
  } else if (ttl >= 60) {
    return `${Math.floor(ttl / 60)}分${ttl % 60}秒`
  }
  return `${ttl}秒`
}

const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    string: 'blue',
    hash: 'purple',
    list: 'cyan',
    set: 'orange',
    zset: 'magenta'
  }
  return colorMap[type] || 'default'
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/* ========== 初始化 ========== */
onMounted(() => {
  route.query && route.query.baseUrl && (baseUrl.value = route.query.baseUrl as string)
  loadTree()
  loadTable()
})
</script>

<style lang="less" scoped>
.redis-admin {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px 12px;
  overflow: hidden;

  .toolbar {
    flex-shrink: 0;
    padding: 4px 0 8px;
  }

  .main-content {
    display: flex;
    gap: 8px;
    flex: 1;
    min-height: 0;

    .tree-panel {
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      overflow: hidden;

      .panel-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;

        .panel-title {
          font-weight: 600;
          font-size: 13px;
        }
      }

      .tree-spin {
        flex: 1;
        overflow: auto;
        padding: 4px 8px;
      }

      .tree-node-title {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        .tree-badge {
          :deep(.ant-badge-count) {
            font-size: 11px;
            height: 16px;
            line-height: 16px;
            padding: 0 4px;
          }
        }
      }
    }

    .table-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      overflow: hidden;

      .panel-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        padding: 6px 12px;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;

        .panel-title {
          font-weight: 600;
          font-size: 13px;
        }
      }

      :deep(.ant-table-wrapper),
      :deep(.ant-spin-nested-loading),
      :deep(.ant-spin-container) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      :deep(.ant-table) {
        flex: 1;
        min-height: 0;
      }

      :deep(.ant-table-container) {
        height: 100%;
      }

      :deep(.ant-pagination) {
        flex-shrink: 0;
        padding: 4px 12px;
        margin: 0 !important;
      }
    }
  }

  .value-pre {
    max-height: 400px;
    overflow: auto;
    background: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 13px;
    margin: 0;
  }
}
</style>
