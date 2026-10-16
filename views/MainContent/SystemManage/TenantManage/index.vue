<template>
  <div class="tenant-manage-space">
    <div class="toolbar">
      <a-input
        v-model:value="newTenantName"
        class="form-input"
        placeholder="租户名称（必填）"
      />
      <a-input
        v-model:value="newTenantCode"
        class="form-input"
        placeholder="租户编码（选填，建后查重）"
      />
      <a-button
        type="primary"
        @click="handleCreateTenant"
      >
        新增租户
      </a-button>
      <a-button @click="renderTenantList">
        刷新
      </a-button>
    </div>
    <a-table
      :columns="tenantColumns"
      :data-source="tenantList"
      :loading="listLoading"
      row-key="id"
      size="middle"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'operation'">
          <div class="table-operation-btns">
            <a-button
              size="small"
              type="primary"
              @click="openEditDialog(record)"
            >
              编辑
            </a-button>
            <a-button
              size="small"
              @click="openMemberDialog(record)"
            >
              成员
            </a-button>
            <a-popconfirm
              title="确定停用该租户吗？（软删，停用后不可作为成员归属目标）"
              @confirm="handleDisableTenant(record)"
            >
              <a-button
                danger
                size="small"
              >
                停用
              </a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <dialog-box
      v-model:visible="editDialogVisible"
      :width="480"
      title="编辑租户"
    >
      <a-form
        label-align="right"
        @finish="handleUpdateTenant"
      >
        <a-form-item label="租户名称">
          <a-input v-model:value="editForm.name" />
        </a-form-item>
        <a-form-item label="租户编码">
          <a-input v-model:value="editForm.code" />
        </a-form-item>
        <a-form-item>
          <a-button
            html-type="submit"
            type="primary"
          >
            提交修改
          </a-button>
        </a-form-item>
      </a-form>
    </dialog-box>

    <dialog-box
      v-model:visible="memberDialogVisible"
      :width="900"
      :title="memberDialogTitle"
    >
      <div class="member-add-row">
        <a-input
          v-model:value="newMemberUserId"
          class="form-input"
          placeholder="用户id（ac_user 主键）"
        />
        <a-checkbox v-model:checked="newMemberIsAdmin">
          设为租户管理员
        </a-checkbox>
        <a-button
          type="primary"
          @click="handleAddMember"
        >
          加成员
        </a-button>
      </div>
      <a-table
        :columns="memberColumns"
        :data-source="memberList"
        :loading="memberLoading"
        row-key="userId"
        size="small"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'isAdmin'">
            <a-switch
              :checked="!!record.isAdmin"
              @change="(checked: boolean) => handleToggleAdmin(record, checked)"
            />
          </template>
          <template v-else-if="column.dataIndex === 'operation'">
            <a-popconfirm
              title="确定移除该成员吗？（物理删关系行）"
              @confirm="handleRemoveMember(record)"
            >
              <a-button
                danger
                size="small"
              >
                移除
              </a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { Ref } from 'vue'

import {
  addMyTenantMember,
  createTenant,
  disableTenant,
  getMyTenantMembers,
  getTenantList,
  removeMyTenantMember,
  setMyTenantMemberAdmin,
  updateTenant
} from '@/framework/apis/admin/tenantManage'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'

interface TenantRow {
  id: string | number
  name: string
  code?: string
  createAt?: string
  valid?: string
}

interface MemberRow {
  userId: string | number
  customerNumber?: string
  name?: string
  userName?: string
  isAdmin: boolean
}

const tenantColumns = [
  { dataIndex: 'id', title: 'id', minWidth: 80 },
  { dataIndex: 'name', title: '租户名称', minWidth: 180 },
  { dataIndex: 'code', title: '编码', minWidth: 140 },
  { dataIndex: 'createAt', title: '创建时间', minWidth: 160 },
  { dataIndex: 'operation', title: '操作', minWidth: 220 }
]

const memberColumns = [
  { dataIndex: 'userId', title: '用户id', minWidth: 90 },
  { dataIndex: 'customerNumber', title: '工号', minWidth: 110 },
  { dataIndex: 'name', title: '姓名', minWidth: 120 },
  { dataIndex: 'isAdmin', title: '管理员', minWidth: 90 },
  { dataIndex: 'operation', title: '操作', minWidth: 100 }
]

const tenantList: Ref<TenantRow[]> = ref([])
const listLoading: Ref<boolean> = ref(false)
const newTenantName: Ref<string> = ref('')
const newTenantCode: Ref<string> = ref('')

const editDialogVisible: Ref<boolean> = ref(false)
const editForm: Ref<{ id: string | number; name: string; code: string }> = ref({ id: '', name: '', code: '' })

const memberDialogVisible: Ref<boolean> = ref(false)
const memberDialogTitle: Ref<string> = ref('成员管理')
const currentTenantId: Ref<string | number> = ref('')
const memberList: Ref<MemberRow[]> = ref([])
const memberLoading: Ref<boolean> = ref(false)
const newMemberUserId: Ref<string> = ref('')
const newMemberIsAdmin: Ref<boolean> = ref(false)

const renderTenantList = () => {
  listLoading.value = true
  return getTenantList()
      .then(res => tenantList.value = res.payload || [])
      .finally(() => listLoading.value = false)
}

const handleCreateTenant = () => {
  if (!newTenantName.value) return message.error('租户名称不能为空')
  createTenant(newTenantName.value, newTenantCode.value).then(() => {
    newTenantName.value = ''
    newTenantCode.value = ''
    renderTenantList()
  })
}

const openEditDialog = (record: TenantRow) => {
  editForm.value = { id: record.id, name: record.name, code: record.code || '' }
  editDialogVisible.value = true
}

const handleUpdateTenant = () => {
  if (!editForm.value.name) return message.error('租户名称不能为空')
  updateTenant(editForm.value.id, editForm.value.name, editForm.value.code)
      .then(() => editDialogVisible.value = false)
      .then(renderTenantList)
}

const handleDisableTenant = (record: TenantRow) =>
  disableTenant(record.id).then(renderTenantList)

const renderMemberList = () => {
  memberLoading.value = true
  return getMyTenantMembers(currentTenantId.value)
      .then(res => memberList.value = res.payload || [])
      .finally(() => memberLoading.value = false)
}

const openMemberDialog = (record: TenantRow) => {
  currentTenantId.value = record.id
  memberDialogTitle.value = `成员管理 - ${record.name}`
  memberDialogVisible.value = true
  renderMemberList()
}

const handleAddMember = () => {
  const userId = Number(newMemberUserId.value)
  if (!newMemberUserId.value || Number.isNaN(userId)) return message.error('请输入数字用户id')
  addMyTenantMember(currentTenantId.value, userId, newMemberIsAdmin.value)
      .then(() => {
        newMemberUserId.value = ''
        newMemberIsAdmin.value = false
        renderMemberList()
      })
}

const handleRemoveMember = (record: MemberRow) =>
  removeMyTenantMember(currentTenantId.value, record.userId).then(renderMemberList)

const handleToggleAdmin = (record: MemberRow, checked: boolean) =>
  setMyTenantMemberAdmin(currentTenantId.value, record.userId, checked).then(renderMemberList)

onMounted(renderTenantList)
</script>

<style scoped>
.tenant-manage-space {
  padding: 16px;
  height: calc(100vh - 96px); /* 顶部header 60px + history-tab 36px */
  overflow-y: auto;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.form-input {
  width: 220px;
}

.member-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.table-operation-btns {
  display: flex;
  gap: 8px;
}
</style>
