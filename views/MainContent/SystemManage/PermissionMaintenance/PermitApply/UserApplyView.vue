<template>
  <div class="user-apply-view">
    <a-card
      title="申请权限"
      style="margin-bottom: 20px;"
    >
      <a-form layout="vertical">
        <a-form-item label="选择权限">
          <a-select
            v-model:value="selectedMenuId"
            placeholder="请选择要申请的权限"
            style="width: 100%;"
          >
            <a-select-option
              v-for="menu in availableMenus"
              :key="menu.menuId"
              :value="menu.menuId"
            >
              {{ menu.title }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="申请理由">
          <a-textarea
            v-model:value="reason"
            placeholder="请输入申请理由"
            :rows="4"
          />
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            :disabled="!selectedMenuId || !reason"
            @click="handleSubmit"
          >
            提交申请
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="我的申请记录">
      <a-table
        :columns="columns"
        :data-source="myApplyList"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { ref, onMounted } from 'vue'

import { getCompletePermissionTree } from '@/framework/apis/admin/navEdit'
import { submitPermitApply, getMyApplyList } from '@/framework/apis/admin/permitApply'

const selectedMenuId = ref<number>()
const reason = ref('')
const availableMenus = ref<any[]>([])
const myApplyList = ref<any[]>([])
const currentUserId = ref(1) // TODO: 从用户登录信息获取

const columns = [
  { title: '权限名称', dataIndex: 'menuTitle', key: 'menuTitle' },
  { title: '申请理由', dataIndex: 'reason', key: 'reason' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '审批意见', dataIndex: 'auditRemark', key: 'auditRemark' },
  { title: '审批人', dataIndex: 'auditBy', key: 'auditBy' },
  { title: '申请时间', dataIndex: 'createAt', key: 'createAt' }
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

const loadAvailableMenus = () => {
  getCompletePermissionTree().then(res => {
    const flattenTree = (nodes: any[]): any[] => {
      let result: any[] = []
      nodes.forEach(node => {
        result.push(node)
        if (node.children && node.children.length > 0) {
          result = result.concat(flattenTree(node.children))
        }
      })
      return result
    }
    availableMenus.value = flattenTree(res.payload || [])
  })
}

const loadMyApplyList = () => {
  getMyApplyList(currentUserId.value).then(res => {
    myApplyList.value = res.payload || []
  })
}

const handleSubmit = () => {
  if (!selectedMenuId.value || !reason.value) {
    message.warning('请填写完整信息')
    return
  }
  submitPermitApply(selectedMenuId.value, reason.value, currentUserId.value).then(() => {
    message.success('申请提交成功')
    selectedMenuId.value = undefined
    reason.value = ''
    loadMyApplyList()
  })
}

onMounted(() => {
  loadAvailableMenus()
  loadMyApplyList()
})
</script>

<style scoped>
.user-apply-view {
  padding: 20px;
}
</style>
