<template>
  <div
    v-if="!configMode && !proposalMode && !templateMode"
    ref="agentSpace"
    class="agent-space"
  >
    <div class="list-wrapper">
      <surely-table
        :columns="surelyTableColumns"
        :data-source="surelyTableData"
        :table-height="tableHeight"
        :table-width="tableWidth"
        table-id="agentManageTable"
        @change="tableChange"
        @handle-search="handleSearch"
        @handle-reset="handleReset"
      >
        <template #right-btns>
          <a-space>
            <a-button
              size="small"
              type="primary"
              @click="handleAdd"
            >
              新增
            </a-button>
            <a-button
              size="small"
              @click="refresh"
            >
              刷新缓存
            </a-button>
            <a-button
              size="small"
              @click="templateMode = true"
            >
              模板库
            </a-button>
          </a-space>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="(column as any).dataIndex === 'status'">
            <a-tag :color="record.status === '1' ? 'green' : ''">
              {{ record.status === '1' ? '启用' : '停用' }}
            </a-tag>
          </template>
          <!-- 思考强度：空/非正=最强不限制，其余按档位文案展示（与编辑弹窗三档同口径） -->
          <template v-if="(column as any).dataIndex === 'thinkingBudget'">
            <a-tag :color="thinkingBudgetColor(record.thinkingBudget)">
              {{ thinkingBudgetLabel(record.thinkingBudget) }}
            </a-tag>
          </template>
          <!-- 空备注占位，避免 autoHeight 列空内容坍缩导致行高不一 -->
          <template v-if="(column as any).dataIndex === 'remark'">
            {{ record.remark || '-' }}
          </template>
          <template v-if="(column as any).dataIndex === 'operation'">
            <div class="table-operation-btns">
              <a-button
                size="small"
                type="primary"
                @click="handleConfig(record)"
              >
                配置
              </a-button>
              <a-button
                size="small"
                @click="handleTest(record)"
              >
                测试
              </a-button>
              <a-button
                size="small"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-badge
                :count="draftCounts[record.agentCode] || 0"
                :offset="[-4, 0]"
                size="small"
              >
                <a-button
                  size="small"
                  :class="{ 'draft-pending': draftCounts[record.agentCode] > 0 }"
                  @click="handlePublish(record)"
                >
                  发布
                </a-button>
              </a-badge>
              <!-- 变更提案入口：徽标显示该 Agent 未处理（待审）提案数 -->
              <a-badge
                :count="pendingCounts[record.agentCode] || 0"
                :offset="[-4, 0]"
                size="small"
              >
                <a-button
                  size="small"
                  :class="{ 'proposal-pending': pendingCounts[record.agentCode] > 0 }"
                  @click="handleProposals(record)"
                >
                  提案
                </a-button>
              </a-badge>
              <delete-pop-confirm @delete-event="handleDelete(record)" />
            </div>
          </template>
        </template>
        <template #customFilterIcon>
          <search-outlined />
        </template>
      </surely-table>
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="pageSize"
        :page-size-options="pageSizeOptions"
        :total="totalPageNumber"
        class="pagination"
        show-quick-jumper
        show-size-changer
        @change="paginationChange"
      />
    </div>
    <agent-form-dialog
      v-model:visible="agentBoxVisible"
      :is-add="isAdd"
      :record="editRecord"
      @saved="getTableData"
    />
    <!-- 智能问数测试抽屉：行内「测试」唤起，预置该 Agent，destroy-on-close 保证每次重开干净重建 -->
    <a-drawer
      v-model:open="testVisible"
      :title="'智能问数测试：' + testAgentCode"
      width="80%"
      destroy-on-close
      :body-style="{ padding: 0 }"
    >
      <smart-query-test
        v-if="testVisible"
        :initial-agent-code="testAgentCode"
        :show-back="false"
      />
    </a-drawer>
  </div>
  <agent-config-view
    v-else-if="configMode"
    :agent-code="configAgent.agentCode"
    :ds-name="configAgent.dsName"
    @back="exitConfig"
  />
  <proposal-review
    v-else-if="proposalMode"
    :agent-code="proposalAgentCode"
    show-back
    @back="exitProposal"
  />
  <!-- 表模板库管理（跨 Agent/数据源）：左树 数据源/库/表，右侧编辑沉淀的列配置 -->
  <template-library
    v-else-if="templateMode"
    @back="templateMode = false"
  />
</template>

<script lang="ts" setup>
import { SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import * as _ from 'lodash'
import { Ref } from 'vue'
import { useRouter } from 'vue-router'


import AgentConfigView from './AgentConfigView.vue'
import AgentFormDialog from './AgentFormDialog.vue'
import surelyTableColumns from './constant'
import ProposalReview from './ProposalReview.vue'
import { validateAndPublish } from './publishValidate'
import SmartQueryTest from './SmartQueryTest.vue'
import TemplateLibrary from './TemplateLibrary.vue'

import {
  deleteAgent,
  draftAssetCounts,
  pendingProposalCounts,
  queryAgents,
  refreshAgents
} from '@/framework/apis/smartAgent'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import { QueryConditionType, SORT_TYPE, SortObjType } from '@/framework/components/common/surelyTable/contant'
import SurelyTable from '@/framework/components/common/surelyTable/SurelyTable.vue'
import { updateTableSize } from '@/framework/utils/common'
import { DEFAULT_PAGE_SIZE_OPTION } from '@/framework/utils/constant'

const { currentRoute } = useRouter()
const route = currentRoute.value

const baseDomain = route.query ? route.query.domain ? '/' + route.query.domain : undefined : undefined

// ---------------- 列表 ----------------
let currentPage = ref(1)
let pageSize = ref(10)
let totalPageNumber = ref(0)
const surelyTableData: Ref<Array<any>> = ref([])
const pageSizeOptions = ref<string[]>(DEFAULT_PAGE_SIZE_OPTION)

let sortList: SortObjType[] = []
let myQueryCondition: QueryConditionType | {} = {}

// 思考强度档位文案/色（与编辑弹窗三档同口径：空/非正=最强）
const thinkingBudgetLabel = (v: number | null | undefined) =>
  v === 8192 ? '均衡' : v === 2048 ? '轻量' : (!v || v <= 0 ? '最强' : v + ' token')
const thinkingBudgetColor = (v: number | null | undefined) =>
  v === 8192 ? 'blue' : v === 2048 ? 'orange' : ''

const tableChange = (_pagination: any, _filters: any, sorter: any) => {
  if (!Array.isArray(sorter)) {
    const property = sorter.field
    const type = SORT_TYPE[sorter.order]
    sortList = [{ property, type }]
  } else {
    sortList = sorter.map(item => {
      const property = item.field
      const type = SORT_TYPE[item.order]
      return { property, type }
    })
  }
  getTableData()
}

const paginationChange = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  getTableData()
}

const refresh = () => refreshAgents(baseDomain).then(getTableData)

// ---------------- 变更提案（行内徽标 + 未处理提示 + 整页审批视图） ----------------
const pendingCounts = ref<Record<string, number>>({})

// notify=true 时若存在未处理提案则提醒管理员（进入页面 / 审批返回时），翻页刷新仅静默更新徽标
const loadPendingCounts = (notify = false) => {
  pendingProposalCounts(baseDomain).then((res: any) => {
    pendingCounts.value = res.payload || {}
    if (notify) {
      const agentNum = Object.keys(pendingCounts.value).length
      const total = Object.values(pendingCounts.value).reduce((sum: number, n: any) => sum + Number(n || 0), 0)
      if (total > 0) {
        message.warning(`共 ${agentNum} 个 Agent 有 ${total} 条未处理的变更提案，请点击行内「提案」处理`)
      }
    }
  })
}

// 未发布草稿资产数（生成/编辑/提案合并后均回草稿态），徽标提示管理员点发布
const draftCounts = ref<Record<string, number>>({})
const loadDraftCounts = () => {
  draftAssetCounts(baseDomain).then((res: any) => {
    draftCounts.value = res.payload || {}
  })
}

const proposalMode = ref(false)
const proposalAgentCode = ref('')

const handleProposals = (record: any) => {
  proposalAgentCode.value = record.agentCode
  proposalMode.value = true
}

const exitProposal = () => {
  proposalMode.value = false
  getTableData()
  loadPendingCounts(true)
}

const getTableData = () => {
  const queryList = Object.values(myQueryCondition)
  queryAgents(queryList, sortList, pageSize.value, currentPage.value, baseDomain).then((res: any) => {
    surelyTableData.value = res.payload.records
    totalPageNumber.value = res.payload.total
    surelyTableData.value.forEach((item: any, index: number) => {
      item['key'] = item.agentId
      item['index'] = (currentPage.value - 1) * pageSize.value + index + 1
    })
  })
  loadPendingCounts()
  loadDraftCounts()
}

const handleSearch = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getTableData()
}

const handleReset = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getTableData()
}

// ---------------- 新增/编辑（表单在 AgentFormDialog 组件内） ----------------
let agentBoxVisible: Ref<boolean> = ref(false)
let isAdd: Ref<boolean> = ref(true)
let editRecord: any = ref(null)

const handleAdd = () => {
  editRecord.value = null
  isAdd.value = true
  agentBoxVisible.value = true
}

const handleEdit = (record: any) => {
  editRecord.value = record
  isAdd.value = false
  agentBoxVisible.value = true
}

const handleDelete = (record: any) =>
  deleteAgent(record.agentId, baseDomain).then(getTableData)

// 发布前预检：错误弹清单阻断、提醒确认后继续，发布成功后刷新草稿徽标
const handlePublish = (record: any) =>
  validateAndPublish(record.agentCode, baseDomain).then((ok: boolean) => {
    if (ok) loadDraftCounts()
  })

// ---------------- 智能问数测试（行内抽屉，预置当前 Agent） ----------------
const testVisible = ref(false)
const testAgentCode = ref('')

const handleTest = (record: any) => {
  testAgentCode.value = record.agentCode
  testVisible.value = true
}

// ---------------- Agent 配置（整页视图，与列表互斥切换） ----------------
const configMode = ref(false)
const configAgent: any = reactive({ agentCode: '', dsName: '' })

const handleConfig = (record: any) => {
  configAgent.agentCode = record.agentCode
  configAgent.dsName = record.dsName
  configMode.value = true
}

const exitConfig = () => {
  configMode.value = false
  getTableData()
}

// ---------------- 表模板库（跨 Agent 整页视图，与列表互斥切换） ----------------
const templateMode = ref(false)

// ---------------- 尺寸自适应 ----------------
const agentSpace: Ref = ref()
let tableWidth: Ref<number> = ref(0)
let tableHeight: Ref<number> = ref(0)

const updateTableWidthAndHeight = () => updateTableSize(agentSpace, tableWidth, 40, tableHeight, 75)
window.addEventListener('resize', _.debounce(updateTableWidthAndHeight, 50))
onMounted(() => {
  getTableData()
  loadPendingCounts(true)
  updateTableWidthAndHeight()
})
</script>

<style scoped>
.agent-space {
  position: relative;
  height: calc(100% - 70px);
}
.agent-space > .list-wrapper {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
}
.table-operation-btns {
  display: flex;
  justify-content: space-around;
}
/* 有未处理提案/未发布草稿时行内按钮高亮提醒 */
.table-operation-btns .proposal-pending,
.table-operation-btns .draft-pending {
  color: #d46b08;
  border-color: #d46b08;
}
.pagination {
  margin-top: 15px;
  margin-right: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
