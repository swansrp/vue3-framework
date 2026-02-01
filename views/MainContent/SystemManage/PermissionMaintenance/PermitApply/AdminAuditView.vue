<template>
  <div class="admin-audit-view">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane
        key="pending"
        tab="待审核申请"
      >
        <a-table
          :columns="columns"
          :data-source="pendingList"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </a-tag>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button
                  type="primary"
                  size="small"
                  @click="handleAudit(record, '3')"
                >
                  通过
                </a-button>
                <a-button
                  danger
                  size="small"
                  @click="handleAudit(record, '2')"
                >
                  拒绝
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane
        key="approved"
        tab="已通过权限管理"
      >
        <a-alert
          message="此处显示所有审核通过的申请,可以撤销已授予的权限"
          type="info"
          show-icon
          closable
          style="margin-bottom: 10px;"
        />
        <a-table
          :columns="approvedColumns"
          :data-source="approvedList"
          :pagination="false"
          :loading="approvedLoading"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <a-popconfirm
                title="确定要撤销此用户的权限吗?"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleRevokeUserPermission(record)"
              >
                <a-button
                  danger
                  size="small"
                >
                  撤销权限
                </a-button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      v-model:visible="auditModalVisible"
      title="审核意见"
      @ok="submitAudit"
    >
      <a-form layout="vertical">
        <a-form-item label="审批意见">
          <a-textarea
            v-model:value="auditRemark"
            placeholder="请输入审批意见"
            :rows="4"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { ref, onMounted, watch } from 'vue'

import { getPendingApplyList, auditPermitApply, revokePermission, queryApplyList } from '@/framework/apis/admin/permitApply'

const activeTab = ref('pending')
const pendingList = ref<any[]>([])
const approvedList = ref<any[]>([])
const approvedLoading = ref(false)
const auditModalVisible = ref(false)
const auditRemark = ref('')
const currentRecord = ref<any>(null)
const auditStatus = ref('')
const currentAuditor = ref('admin') // TODO: 从用户登录信息获取

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '申请人', dataIndex: 'userName', key: 'userName' },
  { title: '权限名称', dataIndex: 'menuTitle', key: 'menuTitle' },
  { title: '申请理由', dataIndex: 'reason', key: 'reason' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '申请时间', dataIndex: 'createAt', key: 'createAt', width: 180 },
  { title: '操作', key: 'action', width: 150 }
]

const approvedColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '用户ID', dataIndex: 'userId', key: 'userId' },
  { title: '权限ID', dataIndex: 'menuId', key: 'menuId' },
  { title: '申请理由', dataIndex: 'reason', key: 'reason' },
  { title: '审核人', dataIndex: 'auditBy', key: 'auditBy' },
  { title: '审核时间', dataIndex: 'auditAt', key: 'auditAt', width: 180 },
  { title: '操作', key: 'action', width: 120 }
]

const getStatusColor = (status: string) => {
  const colorMap: any = {
    '0': 'default',
    '1': 'processing',
    '2': 'error',
    '3': 'success'
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: string) => {
  const textMap: any = {
    '0': '未提交',
    '1': '待审核',
    '2': '未通过',
    '3': '已通过'
  }
  return textMap[status] || '未知'
}

const loadPendingList = () => {
  getPendingApplyList().then(res => {
    pendingList.value = res.payload || []
  })
}

const loadApprovedList = () => {
  approvedLoading.value = true
  queryApplyList().then(res => {
    // 过滤状态为3(已通过)的记录
    approvedList.value = (res.payload || []).filter((item: any) => item.status === '3')
  }).finally(() => {
    approvedLoading.value = false
  })
}

const handleAudit = (record: any, status: string) => {
  currentRecord.value = record
  auditStatus.value = status
  auditModalVisible.value = true
}

const submitAudit = () => {
  if (!currentRecord.value) return
  
  auditPermitApply(
    currentRecord.value.id,
    auditStatus.value,
    auditRemark.value || (auditStatus.value === '3' ? '审核通过' : '审核不通过'),
    currentAuditor.value
  ).then(() => {
    message.success('审核完成')
    auditModalVisible.value = false
    auditRemark.value = ''
    currentRecord.value = null
    loadPendingList()
    loadApprovedList()
  })
}

const handleRevokeUserPermission = (record: any) => {
  revokePermission(record.userId, record.menuId).then(() => {
    message.success('权限已撤销')
    loadApprovedList()
  }).catch(() => {
    message.error('撤销失败')
  })
}

onMounted(() => {
  loadPendingList()
  loadApprovedList()
})

watch(activeTab, (newTab) => {
  if (newTab === 'approved') {
    loadApprovedList()
  }
})
</script>

<style scoped>
.admin-audit-view {
  padding: 20px;
}
</style>
