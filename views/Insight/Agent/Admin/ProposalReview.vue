<!--
 * 变更提案审批页
 *
 * 问数遇到资产缺失时 LLM 建议的单项资产变更（一次提问 = 一批）。
 * 支持逐项勾选 / 全选 / 反选：合并所选 → upsert 进对应 Agent 草稿资产
 * （仍需到 Agent 列表发布 + 刷新缓存生效）；驳回所选 → 直接丢弃。
 * 展开行查看单项资产 JSON 与建议理由，辅助审批判断。
-->
<template>
  <div class="proposal-page">
    <div class="proposal-toolbar">
      <a-button
        v-if="showBack"
        @click="emit('back')"
      >
        返回
      </a-button>
      <a-select
        v-model:value="agentCode"
        class="proposal-agent"
        placeholder="选择 Agent"
        :options="agentOptions"
        @change="loadProposals"
      />
      <a-radio-group
        v-model:value="status"
        button-style="solid"
        @change="loadProposals"
      >
        <a-radio-button value="0">
          待审
        </a-radio-button>
        <a-radio-button value="1">
          已合并
        </a-radio-button>
        <a-radio-button value="2">
          已驳回
        </a-radio-button>
        <a-radio-button value="">
          全部
        </a-radio-button>
      </a-radio-group>
      <a-space>
        <a-button @click="selectAll">
          全选
        </a-button>
        <a-button @click="invertSelection">
          反选
        </a-button>
        <a-button
          type="primary"
          :disabled="selectedKeys.length === 0 || status === '1' || status === '2'"
          @click="doMerge"
        >
          合并所选（{{ selectedKeys.length }}）
        </a-button>
        <a-button
          danger
          :disabled="selectedKeys.length === 0 || status === '1' || status === '2'"
          @click="doReject"
        >
          驳回所选
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
      :expanded-row-keys="expandedKeys"
      :pagination="false"
      row-key="id"
      size="small"
      @expand="onExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'createAt'">
          {{ formatTime(record.createAt) }}
        </template>
        <template v-else-if="column.dataIndex === 'assetType'">
          <a-tag>{{ record.assetType }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'op'">
          <a-tag :color="record.op === 'add' ? 'green' : 'orange'">
            {{ record.op === 'add' ? '新增' : '修改' }}
          </a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <a-tag :color="record.status === '0' ? 'blue' : record.status === '1' ? 'green' : 'red'">
            {{ record.status === '0' ? '待审' : record.status === '1' ? '已合并' : '已驳回' }}
          </a-tag>
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <div class="proposal-detail">
          <div
            v-if="record.reason"
            class="proposal-reason"
          >
            建议理由：{{ record.reason }}
          </div>
          <div class="proposal-q">
            触发问题：{{ record.questionText }}
          </div>
          <pre class="proposal-json">{{ pretty(record.content) }}</pre>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  listProposals,
  mergeProposals,
  queryAgents,
  rejectProposals
} from '@/framework/apis/smartAgent'

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query?.domain ? '/' + currentRoute.value.query.domain : undefined

// 从 Agent 管理行内进入时预置 agentCode 并显示返回按钮；独立使用时下拉自选
const props = defineProps<{ agentCode?: string, showBack?: boolean }>()
const emit = defineEmits(['back'])

const agentCode = ref<string>(props.agentCode || '')
const agentOptions = ref<any[]>([])
const status = ref('0')
const loading = ref(false)
const rows = ref<any[]>([])
const selectedKeys = ref<number[]>([])
const expandedKeys = ref<number[]>([])

const columns = [
  { title: '时间', dataIndex: 'createAt', width: 150 },
  { title: '资产类型', dataIndex: 'assetType', width: 120 },
  { title: '资产项', dataIndex: 'itemKey' },
  { title: '动作', dataIndex: 'op', width: 70 },
  { title: '批次', dataIndex: 'batchNo', width: 170 },
  { title: '状态', dataIndex: 'status', width: 80 }
]

const loadAgents = () => {
  queryAgents([], [], 50, 1, baseDomain).then((res: any) => {
    agentOptions.value = (res.payload?.records || []).map((a: any) => ({
      label: `${a.agentName || a.agentCode}（${a.agentCode}）`,
      value: a.agentCode
    }))
    // 未预置 Agent 时默认选中第一个，保证进入即有列表
    if (!agentCode.value && agentOptions.value.length > 0) {
      agentCode.value = agentOptions.value[0].value
    }
  })
}

const loadProposals = () => {
  if (!agentCode.value) return
  loading.value = true
  selectedKeys.value = []
  expandedKeys.value = []
  listProposals({ agentCode: agentCode.value, status: status.value || undefined }, baseDomain)
    .then((res: any) => {
      rows.value = res.payload || []
    })
    .catch((e: any) => message.error(e?.message || e?.errMsg || '加载建议失败'))
    .finally(() => {
      loading.value = false
    })
}

const onSelectChange = (keys: number[]) => {
  selectedKeys.value = keys
}

const selectAll = () => {
  selectedKeys.value = rows.value.map((r: any) => r.id)
}

const invertSelection = () => {
  const selected = new Set(selectedKeys.value)
  selectedKeys.value = rows.value.filter((r: any) => !selected.has(r.id)).map((r: any) => r.id)
}

const onExpand = (expanded: boolean, record: any) => {
  expandedKeys.value = expanded
    ? [...expandedKeys.value, record.id]
    : expandedKeys.value.filter(k => k !== record.id)
}

const doMerge = () => {
  mergeProposals({ ids: selectedKeys.value }, baseDomain)
    .then((res: any) => {
      message.success(`已合并 ${res.payload ?? selectedKeys.value.length} 项建议进草稿，请到 Agent 列表发布并刷新缓存生效`)
      loadProposals()
    })
    .catch((e: any) => message.error(e?.message || e?.errMsg || '合并失败'))
}

const doReject = () => {
  rejectProposals({ ids: selectedKeys.value }, baseDomain)
    .then(() => {
      message.success('已驳回所选建议')
      loadProposals()
    })
    .catch((e: any) => message.error(e?.message || e?.errMsg || '驳回失败'))
}

const pretty = (content: string) => {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

const formatTime = (t: any) => {
  if (!t) return ''
  return typeof t === 'string' ? t.replace('T', ' ').substring(0, 19) : String(t)
}

onMounted(() => {
  loadAgents()
  loadProposals()
})
</script>

<style scoped lang="less">
.proposal-page {
  padding: 4px 8px;
}

.proposal-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.proposal-agent {
  width: 220px;
}

.proposal-detail {
  padding: 4px 12px;
}

.proposal-reason {
  color: #d46b08;
  margin-bottom: 4px;
  font-size: 13px;
}

.proposal-q {
  color: #666;
  margin-bottom: 6px;
  font-size: 12px;
}

.proposal-json {
  margin: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}
</style>
