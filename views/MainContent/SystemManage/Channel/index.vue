<template>
  <div class="channel-page">
    <div class="channel-page__toolbar">
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
      row-key="id"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.dataIndex === 'index'">
          {{ (currentPage - 1) * pageSize + index + 1 }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <a-switch
            :checked="!!+record.status"
            :loading="statusLoading[record.id]"
            @change="(checked: any) => onStatusChange(record, checked)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'appSecret'">
          {{ secretVisible[record.id] ? record.appSecret : '••••••••' }}
          <a-button
            type="link"
            size="small"
            @click="toggleSecret(record.id)"
          >
            {{ secretVisible[record.id] ? '隐藏' : '显示' }}
          </a-button>
        </template>
        <template v-else-if="column.dataIndex === 'operation'">
          <div style="display: flex; justify-content: space-around; align-items: center;">
            <a-button
              size="small"
              type="primary"
              @click="openRedirectPanel(record)"
            >
              回调地址
            </a-button>
            <delete-pop-confirm @delete-event="handleDeleteTable(record)" />
          </div>
        </template>
      </template>
    </a-table>

    <!-- 新增：渠道名称（remark）——appKey/appSecret 由服务端生成，保存后一次性展示 -->
    <dialog-box
      v-model:visible="addBoxVisible"
      title="新增渠道"
      :width="420"
    >
      <a-form-item
        :validate-status="addNameError ? 'error' : ''"
        :help="addNameError"
        label="渠道名称"
      >
        <a-input
          v-model:value="addName"
          :maxlength="50"
          placeholder="不超过 50 字"
          @press-enter="submitAdd"
        />
      </a-form-item>
      <a-button
        type="primary"
        block
        :loading="adding"
        @click="submitAdd"
      >
        确 定
      </a-button>
    </dialog-box>

    <!-- 密钥一次性展示（关闭后不再可见） -->
    <dialog-box
      v-model:visible="addTableItemFinishedVisible"
      title="信息"
      :width="800"
    >
      <a-descriptions
        layout="vertical"
        bordered
        :column="1"
        :label-style="{fontWeight: 'bold'}"
      >
        <a-descriptions-item label="渠道名称">
          {{ newTableItemInfo.remark }}
        </a-descriptions-item>
        <a-descriptions-item label="应用标识">
          {{ newTableItemInfo.appKey }}
        </a-descriptions-item>
        <a-descriptions-item label="应用密钥">
          {{ newTableItemInfo.appSecret }}
        </a-descriptions-item>
      </a-descriptions>
    </dialog-box>

    <!-- SSO 回调地址登记（ac_sso_redirect，按渠道过滤；只有地址＋备注两个录入字段） -->
    <dialog-box
      v-model:visible="redirectBoxVisible"
      title="SSO 回调地址登记"
      :width="860"
    >
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <a-input
          v-model:value="redirectDraft.redirectUri"
          placeholder="回调地址（如 http://127.0.0.1:5174）"
          style="flex: 1 1 320px;"
        />
        <a-input
          v-model:value="redirectDraft.remark"
          placeholder="备注（用途/环境）"
          style="flex: 1 1 220px;"
          @press-enter="addRedirect"
        />
        <a-button
          type="primary"
          :loading="redirectAdding"
          @click="addRedirect"
        >
          登记
        </a-button>
      </div>
      <a-table
        size="small"
        :columns="redirectColumns"
        :data-source="redirectRows"
        :loading="redirectLoading"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'operation'">
            <a-button
              size="small"
              danger
              @click="removeRedirect(record)"
            >
              撤销
            </a-button>
          </template>
        </template>
      </a-table>
    </dialog-box>
  </div>
</template>

<script setup lang="ts">
/**
 * 渠道管理（2026-10-21 去 MDM 化重构）：渠道＝InkHub 系统内部的 SSO 子系统应用（AcPartner），
 * 不再挂「所属平台」字典（MDM_PLATFORM_DICT 为 MDM 主数据同步的动态字典，与本概念无关）。
 * 左侧平台选择器与 platform 过滤撤除，/query 全量分页；新增只收渠道名称（remark，
 * 服务端生成 appKey/appSecret 并一次性展示）。回调地址登记面板（ac_sso_redirect）原样保留。
 * 🔴 删除渠道不级联删其回调登记行——登记行按 partnerId 查询自然查不到，无害。
 */
import { Ref, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { addRequest, deleteRequest, generalQueryRequest } from '@/framework/apis'
import {
  addSequenceChannelTable,
  deleteSequenceChannelTable,
  editSequenceChannelTable,
  getSequenceChannelTable
} from '@/framework/apis/channel'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import surelyTableColumns from '@/framework/views/MainContent/SystemManage/Channel/channel'
import { message } from 'ant-design-vue'


const { currentRoute } = useRouter()
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
    const res = await getSequenceChannelTable({ currentPage: page, pageSize: size }, baseDomain)
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

// ==================== 新增（渠道名称 → 生成 appKey/appSecret） ====================

const addBoxVisible: Ref<boolean> = ref(false)
const addName: Ref<string> = ref('')
const addNameError: Ref<string> = ref('')
const adding: Ref<boolean> = ref(false)
let addTableItemFinishedVisible: Ref<boolean> = ref(false)
const newTableItemInfo: Ref<{ remark: string, appKey: string, appSecret: string }> = ref({ remark: '', appKey: '', appSecret: '' })

const openAddBox = () => {
  addName.value = ''
  addNameError.value = ''
  addBoxVisible.value = true
}
const submitAdd = async () => {
  const remark = addName.value.trim()
  if (!remark) {
    addNameError.value = '渠道名称不能为空'
    return
  }
  addNameError.value = ''
  adding.value = true
  try {
    const res = await addSequenceChannelTable({ remark }, baseDomain)
    newTableItemInfo.value = { remark, appKey: res.payload.appKey, appSecret: res.payload.appSecret }
    addBoxVisible.value = false
    addTableItemFinishedVisible.value = true
    fetchPage(1)
  } finally {
    adding.value = false
  }
}

// ==================== 密钥显隐 ====================

const secretVisible = reactive<Record<string, boolean>>({})
const toggleSecret = (id: string) => {
  secretVisible[id] = !secretVisible[id]
}

// ==================== 有效性就地开关（免弹框） ====================

const statusLoading = reactive<Record<string, boolean>>({})
const onStatusChange = (record: any, checked: any) => {
  const status = checked ? 1 : 0
  statusLoading[record.id] = true
  editSequenceChannelTable({ id: record.id, status }, baseDomain)
    .then(() => {
      record.status = status
      record.statusDisplay = status === 1 ? '已启用' : '已停用'
    })
    .finally(() => {
      statusLoading[record.id] = false
    })
}

// ==================== 删除 ====================

const handleDeleteTable = (record: any) => deleteSequenceChannelTable(record.id, baseDomain).then(() => fetchPage())

// ==================== SSO 回调地址登记面板 ====================

const currentPartnerId: Ref<string | number | null> = ref(null)
const redirectBoxVisible: Ref<boolean> = ref(false)
const redirectRows: Ref<any[]> = ref([])
const redirectLoading: Ref<boolean> = ref(false)
const redirectDraft = reactive({ redirectUri: '', remark: '' })
const redirectAdding: Ref<boolean> = ref(false)

// SSO 回调登记：走通用口 /web/admin/sso/redirect/{general/query,add,delete}（AuthAdmin 档），
// 只取 地址/备注 两个业务字段；撤销＝物理删除（登记约定本就是「撤销置 0、再登记插新行」，等效）
const REDIRECT_URL = '/admin/sso/redirect'
const redirectColumns = [
  { title: '回调地址', dataIndex: 'redirectUri' },
  { title: '备注', dataIndex: 'remark' },
  { title: '登记时间', dataIndex: 'createAt', width: 180 },
  { title: '操作', dataIndex: 'operation', width: 90 }
]

const loadRedirects = async () => {
  if (!currentPartnerId.value) return
  redirectLoading.value = true
  try {
    const res = await generalQueryRequest(REDIRECT_URL, new Map(), [{ property: 'partnerId', relation: 1, value: [currentPartnerId.value] }], [], 50, 1, baseDomain, false, false)
    redirectRows.value = (res.payload.records || []).filter((r: any) => r.valid === '1')
  } finally {
    redirectLoading.value = false
  }
}
const addRedirect = async () => {
  const redirectUri = redirectDraft.redirectUri.trim()
  if (!redirectUri) {
    message.warning('回调地址不能为空')
    return
  }
  redirectAdding.value = true
  try {
    await addRequest(REDIRECT_URL, { partnerId: currentPartnerId.value, redirectUri, remark: redirectDraft.remark.trim() }, baseDomain, true, false)
    redirectDraft.redirectUri = ''
    redirectDraft.remark = ''
    loadRedirects()
  } finally {
    redirectAdding.value = false
  }
}
const removeRedirect = (record: any) => {
  deleteRequest(REDIRECT_URL, record.id, baseDomain, true, false).then(() => loadRedirects())
}
const openRedirectPanel = (record: any) => {
  currentPartnerId.value = record.id
  redirectBoxVisible.value = true
  redirectRows.value = []
  redirectLoading.value = true
  loadRedirects()
}

</script>

<style scoped>
.channel-page {
  padding: 16px;
}

.channel-page__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
