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
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'appSecret'">
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
          <a-button
            size="small"
            type="primary"
            @click="handleEditTable(record)"
          >
            编辑
          </a-button>
          <a-button
            size="small"
            type="primary"
            style="margin-left: 8px;"
            @click="openRedirectPanel(record)"
          >
            回调地址
          </a-button>
          <delete-pop-confirm @delete-event="handleDeleteTable(record)" />
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

    <!-- 编辑有效性 -->
    <dialog-box
      v-model:visible="editTableItemBoxVisible"
      title="编辑应用信息"
      :width="400"
    >
      <div style="width: 200px; margin: 0 auto;">
        <a-form-item label="有效性">
          <a-switch v-model:checked="tableDataItemDisabled" />
        </a-form-item>
        <a-form-item>
          <a-button
            html-type="submit"
            type="primary"
            block
            @click="submitEdit"
          >
            提交修改
          </a-button>
        </a-form-item>
      </div>
    </dialog-box>

    <!-- SSO 回调地址登记（ac_sso_redirect，按 partnerId 过滤） -->
    <dialog-box
      v-model:visible="redirectBoxVisible"
      title="SSO 回调地址登记"
      is-full
    >
      <Portal
        v-if="currentPartnerId"
        table-id="AcSsoRedirect"
        :advance-condition="advanceCondition"
        :bind-default-value="{ partnerId: currentPartnerId }"
      />
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
import { Ref, computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  addSequenceChannelTable,
  deleteSequenceChannelTable,
  editSequenceChannelTable,
  getSequenceChannelTable
} from '@/framework/apis/channel'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import Portal from '@/framework/components/common/Portal/index.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
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

// ==================== 编辑有效性 ====================

let currentTableItemId: Ref<string> = ref('')
let tableDataItemDisabled: Ref<boolean> = ref(false)
let editTableItemBoxVisible: Ref<boolean> = ref(false)
const handleEditTable = (record: any) => {
  currentTableItemId.value = record.id
  tableDataItemDisabled.value = !!+record.status
  editTableItemBoxVisible.value = true
}
const submitEdit = () => {
  const id = currentTableItemId.value
  const status = Number(tableDataItemDisabled.value)
  editSequenceChannelTable({ id, status }, baseDomain).then(() => {
    editTableItemBoxVisible.value = false
    fetchPage()
  })
}

// ==================== 删除 ====================

const handleDeleteTable = (record: any) => deleteSequenceChannelTable(record.id, baseDomain).then(() => fetchPage())

// ==================== SSO 回调地址登记面板 ====================

const currentPartnerId: Ref<string | number | null> = ref(null)
const redirectBoxVisible: Ref<boolean> = ref(false)
const advanceCondition = computed(() => {
  return { conditionList: [buildCondition('partnerId', FILTER_TYPE.EQUAL, [currentPartnerId.value])] } as ConditionListType
})
const openRedirectPanel = (record: any) => {
  currentPartnerId.value = record.id
  redirectBoxVisible.value = true
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
