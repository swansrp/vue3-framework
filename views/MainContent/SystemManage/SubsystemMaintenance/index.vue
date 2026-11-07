<template>
  <div class="subsystem-page">
    <div class="subsystem-page__toolbar">
      <a-button
        type="primary"
        @click="openAddBox"
      >
        新增
      </a-button>
    </div>
    <a-table
      :columns="surelyTableColumns"
      :data-source="tableData"
      :loading="loading"
      :pagination="{ current: currentPage, pageSize, total, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
      row-key="appCode"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.dataIndex === 'index'">
          {{ (currentPage - 1) * pageSize + index + 1 }}
        </template>
        <template v-else-if="column.dataIndex === 'entryType'">
          {{ entryTypeText(record.entryType) }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <a-switch
            :checked="record.status === '1'"
            :loading="statusLoading[record.appCode]"
            @change="(checked: any) => onStatusChange(record, checked)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'visibleToAllTenant'">
          {{ record.visibleToAllTenant === '1' ? '公开' : '按授权' }}
        </template>
        <template v-else-if="column.dataIndex === 'operation'">
          <div style="display: flex; justify-content: space-around; align-items: center;">
            <a-button
              size="small"
              type="primary"
              @click="openEditBox(record)"
            >
              编辑
            </a-button>
            <a-button
              size="small"
              @click="gotoMenuConfig(record)"
            >
              配置菜单
            </a-button>
            <delete-pop-confirm @delete-event="handleDeleteTable(record)" />
          </div>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑应用（appCode 仅新增可填；appCode 与 name 必填；选了入口类型则入口地址必填） -->
    <dialog-box
      v-model:visible="editBoxVisible"
      :title="editing ? '编辑应用' : '新增应用'"
      :width="560"
    >
      <a-form label-align="right">
        <a-form-item
          :validate-status="formError.appCode ? 'error' : ''"
          :help="formError.appCode"
          label="应用编码"
        >
          <a-input
            v-model:value="editForm.appCode"
            :disabled="editing"
            :maxlength="64"
            placeholder="业务主键，创建后不可修改"
          />
        </a-form-item>
        <a-form-item
          :validate-status="formError.name ? 'error' : ''"
          :help="formError.name"
          label="名称"
          required
        >
          <a-input
            v-model:value="editForm.name"
            :maxlength="100"
            placeholder="子系统显示名"
          />
        </a-form-item>
        <a-form-item label="图标">
          <a-input
            v-model:value="editForm.icon"
            :maxlength="200"
            placeholder="图标名或图标地址"
          />
        </a-form-item>
        <a-form-item label="入口类型">
          <a-select
            v-model:value="editForm.entryType"
            :options="entryTypeOptions"
            allow-clear
            placeholder="入口打开形态"
          />
        </a-form-item>
        <a-form-item
          :validate-status="formError.entryUrl ? 'error' : ''"
          :help="formError.entryUrl"
          label="入口地址"
        >
          <a-input
            v-model:value="editForm.entryUrl"
            :maxlength="500"
            placeholder="选了入口类型则必填"
          />
        </a-form-item>
        <a-form-item label="归属渠道">
          <a-select
            v-model:value="editForm.partnerId"
            :loading="partnerLoading"
            :options="partnerSelectOptions"
            allow-clear
            placeholder="显示渠道标识(appKey)，存渠道 id"
          />
        </a-form-item>
        <a-form-item label="全租户可见">
          <a-switch v-model:checked="editForm.visibleToAllTenant" />
          <span class="subsystem-page__hint">开=公开目录（只读展示）；关=按开通与授权判定</span>
        </a-form-item>
        <a-form-item label="有效性">
          <a-switch v-model:checked="editForm.status" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number
            v-model:value="editForm.orderNo"
            :min="0"
            :precision="0"
            style="width: 160px;"
          />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea
            v-model:value="editForm.description"
            :maxlength="500"
            :rows="3"
            placeholder="不超过 500 字"
          />
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            block
            :loading="saving"
            @click="submitEdit"
          >
            确 定
          </a-button>
        </a-form-item>
      </a-form>
    </dialog-box>
  </div>
</template>

<script setup lang="ts">
/**
 * 应用管理（子系统注册表 ac_subsystem 维护面，方案B 棒5）：
 * 门户入口清单——应用编码/名称/入口形态/归属渠道/可见性/排序等维护；
 * 渠道标识列由服务端在 /query 行带出（partnerAppKey），归属渠道下拉走 /partner-options
 * （显示 appKey、存 id，🔴 投影不含密钥）。启停就地开关走 /enable /disable（id=appCode）；
 * 删除遇菜单行引用由后端拒（错误信息 request 层直接展示）；「配置菜单」跳菜单管理页按 appCode 过滤。
 */
import { reactive, Ref, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  addSubsystem,
  deleteSubsystem,
  disableSubsystem,
  enableSubsystem,
  getPartnerOptions,
  getSubsystemTable,
  updateSubsystem
} from '@/framework/apis/admin/subsystem'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import surelyTableColumns from '@/framework/views/MainContent/SystemManage/SubsystemMaintenance/subsystem'


const { currentRoute, push } = useRouter()
const route = currentRoute.value
const baseDomain = route.query ? route.query.domain ? '/' + route.query.domain : undefined : undefined

const loading: Ref<boolean> = ref(false)
const tableData: Ref<any[]> = ref([])
const currentPage: Ref<number> = ref(1)
const pageSize: Ref<number> = ref(20)
const total: Ref<number> = ref(0)

const fetchPage = async (page = currentPage.value, size = pageSize.value) => {
  loading.value = true
  try {
    const res = await getSubsystemTable({ currentPage: page, pageSize: size }, baseDomain)
    tableData.value = res.payload.records || []
    total.value = res.payload.total || 0
    currentPage.value = page
    pageSize.value = size
  } finally {
    loading.value = false
  }
}
const onTableChange = (pag: { current?: number, pageSize?: number }) => {
  fetchPage(pag.current || 1, pag.pageSize || pageSize.value)
}
fetchPage()

// ==================== 字典/翻译 ====================

// 入口形态取值口径与 AcSubsystem.entryType 注释一致（iframe/新窗口/同页）
const entryTypeOptions = [
  { value: 'iframe', label: 'iframe' },
  { value: '新窗口', label: '新窗口' },
  { value: '同页', label: '同页' }
]
const entryTypeText = (value: string) => entryTypeOptions.find((item) => item.value === value)?.label || value || '-'

// ==================== 归属渠道下拉（/partner-options，显示 appKey 存 id） ====================

const partnerOptions: Ref<any[]> = ref([])
const partnerLoading: Ref<boolean> = ref(false)
const partnerSelectOptions: Ref<Array<{ value: number, label: string }>> = ref([])

const loadPartnerOptions = async () => {
  partnerLoading.value = true
  try {
    const res = await getPartnerOptions(baseDomain)
    partnerOptions.value = res.payload || []
    partnerSelectOptions.value = partnerOptions.value.map((item: any) => ({
      value: item.id,
      label: +item.status === 1 ? item.appKey : `${item.appKey}（已停用）`
    }))
  } finally {
    partnerLoading.value = false
  }
}

// ==================== 新增/编辑 ====================

interface SubsystemForm {
  appCode: string
  name: string
  icon: string
  entryType: string | undefined
  entryUrl: string
  partnerId: number | undefined
  visibleToAllTenant: boolean
  status: boolean
  orderNo: number | undefined
  description: string
}

const editBoxVisible: Ref<boolean> = ref(false)
const editing: Ref<boolean> = ref(false)
const saving: Ref<boolean> = ref(false)
const editForm: Ref<SubsystemForm> = ref({
  appCode: '',
  name: '',
  icon: '',
  entryType: undefined,
  entryUrl: '',
  partnerId: undefined,
  visibleToAllTenant: false,
  status: true,
  orderNo: undefined,
  description: ''
})
const formError = reactive({ appCode: '', name: '', entryUrl: '' })

const resetFormError = () => {
  formError.appCode = ''
  formError.name = ''
  formError.entryUrl = ''
}

const openAddBox = () => {
  editing.value = false
  editForm.value = {
    appCode: '',
    name: '',
    icon: '',
    entryType: undefined,
    entryUrl: '',
    partnerId: undefined,
    visibleToAllTenant: false,
    status: true,
    orderNo: undefined,
    description: ''
  }
  resetFormError()
  editBoxVisible.value = true
  loadPartnerOptions()
}

const openEditBox = (record: any) => {
  editing.value = true
  editForm.value = {
    appCode: record.appCode,
    name: record.name,
    icon: record.icon || '',
    entryType: record.entryType || undefined,
    entryUrl: record.entryUrl || '',
    partnerId: record.partnerId ?? undefined,
    visibleToAllTenant: record.visibleToAllTenant === '1',
    status: record.status === '1',
    orderNo: record.orderNo ?? undefined,
    description: record.description || ''
  }
  resetFormError()
  editBoxVisible.value = true
  loadPartnerOptions()
}

const validateForm = () => {
  resetFormError()
  if (!editForm.value.appCode.trim()) formError.appCode = '应用编码不能为空'
  if (!editForm.value.name.trim()) formError.name = '名称不能为空'
  // 选了入口类型则入口地址必填
  if (editForm.value.entryType && !editForm.value.entryUrl.trim()) formError.entryUrl = '选了入口类型则入口地址不能为空'
  return !formError.appCode && !formError.name && !formError.entryUrl
}

const submitEdit = async () => {
  if (!validateForm()) return
  saving.value = true
  try {
    const data = {
      // 编辑态也带 appCode：后端靠它定位行（写入前 beforeUpdate 自行钉死不改）
      appCode: editForm.value.appCode.trim(),
      name: editForm.value.name.trim(),
      icon: editForm.value.icon.trim(),
      entryType: editForm.value.entryType || '',
      entryUrl: editForm.value.entryUrl.trim(),
      partnerId: editForm.value.partnerId ?? null,
      visibleToAllTenant: editForm.value.visibleToAllTenant ? '1' : '0',
      status: editForm.value.status ? '1' : '0',
      orderNo: editForm.value.orderNo ?? null,
      description: editForm.value.description.trim()
    }
    const request = editing.value ? updateSubsystem(data, baseDomain) : addSubsystem(data, baseDomain)
    await request
    editBoxVisible.value = false
    fetchPage(editing.value ? currentPage.value : 1)
  } finally {
    saving.value = false
  }
}

// ==================== 有效性就地开关（/enable /disable，id=appCode） ====================

const statusLoading = reactive<Record<string, boolean>>({})
const onStatusChange = (record: any, checked: any) => {
  const target = checked ? '1' : '0'
  statusLoading[record.appCode] = true
  const request = checked ? enableSubsystem(record.appCode, baseDomain) : disableSubsystem(record.appCode, baseDomain)
  request
    .then(() => { record.status = target })
    .finally(() => { statusLoading[record.appCode] = false })
}

// ==================== 删除（菜单引用由后端拒，错误信息 request 层展示） ====================

const handleDeleteTable = (record: any) => deleteSubsystem(record.appCode, baseDomain).then(() => fetchPage())

// ==================== 配置菜单（跳菜单管理页，带 appCode 过滤参数） ====================

// 菜单树路径：SystemManage(顶级)/permit(权限管理)/MenuMaintenance(菜单管理)——扁平路由注册后的完整 path
const gotoMenuConfig = (record: any) => {
  push({ path: '/SystemManage/permit/MenuMaintenance', query: { appCode: record.appCode } })
}

</script>

<style scoped>
.subsystem-page {
  padding: 16px;
}

.subsystem-page__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.subsystem-page__hint {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
