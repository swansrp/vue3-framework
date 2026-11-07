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
            <a-button
              size="small"
              @click="openAppGrantDialog(record)"
            >
              应用授权
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

    <!-- 应用授权（方案B 棒3）：勾选=开通/取消=停开，每行可配到期时间（空=长期有效）；
         打开时才拉数据（启用中 app 清单 + 该租户已开通行回显），保存按初始态 diff 出 bind/unbind -->
    <dialog-box
      v-model:visible="appGrantDialogVisible"
      :width="720"
      :title="appGrantDialogTitle"
    >
      <div class="app-grant-hint">
        勾选=为该租户开通应用，取消勾选=取消开通；到期时间留空=长期有效；仅列出启用中的应用
      </div>
      <a-table
        :columns="appGrantColumns"
        :data-source="appGrantRows"
        :loading="appGrantLoading"
        row-key="appCode"
        size="small"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'checked'">
            <a-checkbox v-model:checked="record.checked" />
          </template>
          <template v-else-if="column.dataIndex === 'expireAt'">
            <div class="app-grant-expire-cell">
              <a-date-picker
                v-model:value="record.expireAt"
                :disabled="!record.checked"
                allow-clear
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="长期有效"
                style="width: 100%;"
              />
              <!-- 已过期提示（review 棒3 M-3）：勾中但到期时间已过=当前实际不开通（core 谓词 fail-closed），改期保存即复活 -->
              <a-tag
                v-if="record.checked && isAppGrantExpired(record.expireAt)"
                color="red"
                class="app-grant-expired-tag"
              >
                已过期
              </a-tag>
            </div>
          </template>
        </template>
      </a-table>
      <div class="app-grant-actions">
        <a-button
          type="primary"
          :loading="appGrantSaving"
          :disabled="appGrantLoading"
          @click="handleSaveAppGrant"
        >
          保存授权
        </a-button>
      </div>
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
import {
  bindTenantApp,
  getTenantAppList,
  unbindTenantApp
} from '@/framework/apis/admin/tenantApp'
import { getSubsystemTable } from '@/framework/apis/admin/subsystem'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import dayjs from 'dayjs'

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

// 应用授权弹窗行：checked/expireAt 为编辑态，initial* 为打开时快照（保存按二者 diff）
interface AppGrantRow {
  appCode: string
  appName: string
  checked: boolean
  expireAt: string | null
  initialChecked: boolean
  initialExpireAt: string | null
}

// 两个数据源的行投影（只取本弹窗用到的列）
interface SubsystemRow {
  appCode: string
  name?: string
  status?: string
}

interface TenantAppRow {
  appCode: string
  status?: string
  valid?: string
  expireAt?: string | null
}

const tenantColumns = [
  { dataIndex: 'id', title: 'id', minWidth: 80 },
  { dataIndex: 'name', title: '租户名称', minWidth: 180 },
  { dataIndex: 'code', title: '编码', minWidth: 140 },
  { dataIndex: 'createAt', title: '创建时间', minWidth: 160 },
  { dataIndex: 'operation', title: '操作', minWidth: 300 }
]

const memberColumns = [
  { dataIndex: 'userId', title: '用户id', minWidth: 90 },
  { dataIndex: 'customerNumber', title: '工号', minWidth: 110 },
  { dataIndex: 'name', title: '姓名', minWidth: 120 },
  { dataIndex: 'isAdmin', title: '管理员', minWidth: 90 },
  { dataIndex: 'operation', title: '操作', minWidth: 100 }
]

const appGrantColumns = [
  { dataIndex: 'appCode', title: '应用编码', minWidth: 140 },
  { dataIndex: 'appName', title: '应用名称', minWidth: 160 },
  { dataIndex: 'checked', title: '开通', minWidth: 70 },
  { dataIndex: 'expireAt', title: '到期时间（空=长期有效）', minWidth: 220 }
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

const appGrantDialogVisible: Ref<boolean> = ref(false)
// 到期时间已过=当前实际不开通（core 谓词 fail-closed）：value-format 定长串，字典序即时间序
const isAppGrantExpired = (expireAt: string | null) =>
  !!expireAt && expireAt < dayjs().format('YYYY-MM-DD HH:mm:ss')
const appGrantDialogTitle: Ref<string> = ref('应用授权')
const appGrantTenantId: Ref<string | number> = ref('')
const appGrantRows: Ref<AppGrantRow[]> = ref([])
const appGrantLoading: Ref<boolean> = ref(false)
const appGrantSaving: Ref<boolean> = ref(false)

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

// ==================== 应用授权（/web/admin/tenant-app/*，弹窗打开时才拉数据） ====================

const loadAppGrant = () => {
  // 租户快照守卫（review 棒3 I-1）：关 A 开 B 时 A 的迟到响应不得覆盖 B 的回显——
  // 不校验则 B 弹窗显示 A 的勾选态、保存把 A 的 diff 提交到 B
  const tenantIdSnapshot = appGrantTenantId.value
  appGrantLoading.value = true
  return Promise.all([
    // 启用中 app 清单（status '1'=启用，照 SubsystemMaintenance 页口径）；domain 不带=走本服务默认域
    getSubsystemTable({ currentPage: 1, pageSize: 500 }, undefined),
    // 已开通行（query 不过滤 valid，软删历史行也在——按 activatedFor 口径取 valid='1' 且 status='ENABLED' 判开通中）
    getTenantAppList(tenantIdSnapshot)
  ]).then(([appsRes, boundRes]) => {
    if (appGrantTenantId.value !== tenantIdSnapshot) return
    const apps = (((appsRes.payload || {}).records || []) as SubsystemRow[]).filter(row => row.status === '1')
    const boundByCode = new Map<string, TenantAppRow>()
    (((boundRes.payload || {}).records || []) as TenantAppRow[]).forEach(row => {
      if (row.valid === '1' && row.status === 'ENABLED') boundByCode.set(row.appCode, row)
    })
    appGrantRows.value = apps.map(app => {
      const bound = boundByCode.get(app.appCode)
      return {
        appCode: app.appCode,
        appName: app.name || '',
        checked: !!bound,
        expireAt: bound?.expireAt ?? null,
        initialChecked: !!bound,
        initialExpireAt: bound?.expireAt ?? null
      }
    })
    // 迟到腿不熄别人的灯（review 第2轮 M-1）：关 A 开 B 时 A 的 finally 不得清 B 的 loading
  }).finally(() => {
    if (appGrantTenantId.value === tenantIdSnapshot) appGrantLoading.value = false
  })
}

const openAppGrantDialog = (record: TenantRow) => {
  appGrantTenantId.value = record.id
  appGrantDialogTitle.value = `应用授权 - ${record.name}`
  appGrantRows.value = []
  appGrantDialogVisible.value = true
  loadAppGrant()
}

const handleSaveAppGrant = async () => {
  const tenantId = appGrantTenantId.value
  const submits: Array<() => Promise<any>> = []
  appGrantRows.value.forEach(row => {
    const expireAt = row.expireAt ?? null
    if (row.checked && (!row.initialChecked || expireAt !== (row.initialExpireAt ?? null))) {
      // 新勾＝开通；已勾但改了到期时间＝重 bind（后端幂等 upsert 会更新 expire_at），成功文案逐条由 request 层弹
      submits.push(() => bindTenantApp(tenantId, row.appCode, expireAt))
    } else if (!row.checked && row.initialChecked) {
      submits.push(() => unbindTenantApp(tenantId, row.appCode))
    }
  })
  if (!submits.length) return message.info('授权无变更')
  appGrantSaving.value = true
  try {
    for (const submit of submits) await submit()
    await loadAppGrant()
  } catch {
    // 半提交态：成功项已生效、失败项 request 层已 toast，弹窗保持打开可重试（bind 幂等，重试无害）——
    // 此处吞掉 rejection 只为消 unhandled 告警（review 棒3 M-2），错误面已由 request 层呈现
  } finally {
    appGrantSaving.value = false
  }
}

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

.app-grant-hint {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.app-grant-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.app-grant-expire-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-grant-expired-tag {
  flex-shrink: 0;
}

.table-operation-btns {
  display: flex;
  gap: 8px;
}
</style>
