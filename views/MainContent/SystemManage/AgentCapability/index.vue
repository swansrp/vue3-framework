<template>
  <div class="capability-page">
    <div class="page-header">
      <div class="header-text">
        <span class="title">{{ TAB_TITLES[tab] }}</span>
        <a-tag color="blue">
          只读
        </a-tag>
        <span class="count">{{ headerCount }}</span>
      </div>
      <a-button
        :loading="loading"
        @click="reload"
      >
        刷新
      </a-button>
    </div>

    <a-tabs v-model:activeKey="tab">
      <a-tab-pane
        key="packages"
        tab="能力包清单"
      >
        <a-alert
          class="hint"
          type="info"
          show-icon
          message="清单来自代码登记，不是数据库"
          description="能力包＝一组同副作用档的工具，登记单位是包不是单只工具；包缺席时工具降级不挂（不会让应用起不来）。本页不提供增删改——勾选与绑定长在 Agent 定义上（M14 后续棒次），且勾选只能收窄、加不出代码里没有的能力。"
        />

        <a-table
          :columns="columns"
          :data-source="packages"
          :loading="loading"
          :pagination="false"
          row-key="name"
          size="middle"
          :scroll="{ x: 1210 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="pkg-name">
                {{ record.name }}
              </div>
              <div class="pkg-display">
                {{ record.displayName }}
              </div>
            </template>
            <template v-else-if="column.key === 'tags'">
              <a-tag
                v-for="tag in record.tags"
                :key="tag"
                :color="tagColor(tag)"
              >
                {{ tagLabel(tag) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'tools'">
              <a-typography-text
                v-for="tool in record.tools"
                :key="tool"
                code
                class="tool-name"
              >
                {{ tool }}
              </a-typography-text>
            </template>
            <template v-else-if="column.key === 'description'">
              <span class="desc">{{ record.description }}</span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane
        key="manifest"
        tab="会话装配单"
      >
        <a-alert
          class="hint"
          type="info"
          show-icon
          message="一场会话一行，记的是工具面定形那一刻"
          description="工具面＝真的发给模型的那份清单，含引擎按上下文治理追加的回捞工具，不是业务代码里声明的那份；技能与提示词段由业务贡献者在同一线程现读，与那次装配同源。快照只在 M14 棒 2 之后发起的会话才有，更早的历史会话查出来是空的。本页不提供增删改。"
        />

        <div class="toolbar">
          <a-input
            v-model:value="sessionId"
            placeholder="会话 ID"
            allow-clear
            class="session-input"
            @press-enter="queryBySession"
          />
          <a-button
            :loading="manifestLoading"
            @click="queryBySession"
          >
            查这场
          </a-button>
          <a-select
            v-model:value="agentKey"
            :options="agentOptions"
            placeholder="按 agent 筛"
            allow-clear
            class="agent-select"
          />
          <a-button
            :loading="manifestLoading"
            @click="loadRecent"
          >
            最近清单
          </a-button>
        </div>

        <a-table
          :columns="manifestColumns"
          :data-source="rows"
          :loading="manifestLoading"
          :pagination="false"
          row-key="sessionId"
          size="small"
          table-layout="fixed"
          :custom-row="pickRow"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sessionId'">
              <a-typography-text
                code
                class="session-cell"
                :copyable="{ text: record.sessionId }"
              >
                {{ record.sessionId }}
              </a-typography-text>
            </template>
            <template v-else-if="column.key === 'agentKey'">
              {{ record.displayName || record.agentKey }}
            </template>
            <template v-else-if="column.key === 'createAt'">
              {{ fmtTime(record.createAt) }}
            </template>
          </template>
        </a-table>

        <a-empty
          v-if="queried && !current"
          class="empty"
          description="这场会话没有装配单（棒 2 之前发起的会话不留快照）"
        />

        <div
          v-if="current"
          class="detail"
        >
          <a-descriptions
            :column="2"
            :label-style="{ width: '84px', whiteSpace: 'nowrap' }"
            size="small"
            bordered
            class="detail-head"
          >
            <a-descriptions-item label="会话">
              {{ current.sessionId }}
            </a-descriptions-item>
            <a-descriptions-item label="Agent">
              {{ current.displayName || current.agentKey }}
            </a-descriptions-item>
            <a-descriptions-item label="发起人">
              {{ current.askedBy || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="定形时刻">
              {{ fmtTime(current.createAt) }}
            </a-descriptions-item>
            <a-descriptions-item label="模型档">
              {{ current.modelTier || '（业务未报）' }}
            </a-descriptions-item>
            <a-descriptions-item label="工具只数">
              {{ current.toolCount }}
            </a-descriptions-item>
            <a-descriptions-item
              label="业务标注"
              :span="2"
            >
              <span
                v-for="(value, key) in current.extras"
                :key="key"
                class="extra-chip"
              >{{ key }}={{ value }}</span>
              <span v-if="!extraKeys.length">—</span>
            </a-descriptions-item>
          </a-descriptions>

          <div class="block">
            <div class="block-title">
              工具面（发给模型的那份，按注册序）
            </div>
            <a-tooltip
              v-for="tool in current.toolNames"
              :key="tool"
              :title="toolHint(tool)"
            >
              <a-tag
                :color="toolTagColor(tool)"
                class="tool-name"
              >
                {{ tool }}
              </a-tag>
            </a-tooltip>
            <div
              v-if="unListed.length"
              class="warn-line"
            >
              未入册 {{ unListed.length }} 只：{{ unListed.join('、') }}——代码里挂着但没有能力包登记它，按档勾选圈不住它。
            </div>
          </div>

          <div class="block">
            <div class="block-title">
              注入技能与版本
            </div>
            <div
              v-for="skill in current.skills"
              :key="skill.name"
              class="line"
            >
              <a-typography-text code>
                {{ skill.name }}
              </a-typography-text>
              <span class="line-ver">{{ skill.version == null ? '版本未取到' : `v${skill.version}` }}</span>
              <a-tag
                v-if="skill.note"
                color="default"
              >
                {{ skill.note }}
              </a-tag>
            </div>
            <div
              v-if="!skillCount"
              class="desc"
            >
              这场会话没有注入技能包
            </div>
          </div>

          <div class="block">
            <div class="block-title">
              提示词段（按拼装顺序）
            </div>
            <div
              v-for="(section, idx) in current.promptSections"
              :key="section"
              class="line"
            >
              <span class="line-no">{{ idx + 1 }}</span>{{ section }}
            </div>
            <div
              v-if="!sectionCount"
              class="desc"
            >
              该 agent 未登记段结构（贡献者只报代码里真实存在的段，未知 agent 留空不猜）
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { getAgentManifest, getCapabilityPackages, listAgents, listRecentManifest } from '@/framework/apis/agent'

const TAG_LABELS: Record<string, string> = {
  READ: '只读',
  SESSION: '会话控制',
  WRITE: '业务写入',
  EXTERNAL_EFFECT: '外部效应'
}

const TAG_COLORS: Record<string, string> = {
  READ: 'blue',
  SESSION: 'default',
  WRITE: 'red',
  EXTERNAL_EFFECT: 'purple'
}

const TAB_TITLES: Record<string, string> = {
  packages: '能力包清单',
  manifest: '会话装配单'
}

const columns = [
  { title: '能力包', key: 'name', dataIndex: 'name', width: 170 },
  { title: '来源模块', key: 'module', dataIndex: 'module', width: 120 },
  { title: '能力档', key: 'tags', dataIndex: 'tags', width: 110 },
  { title: '包内工具', key: 'tools', dataIndex: 'tools', width: 330 },
  { title: '说明', key: 'description', dataIndex: 'description', width: 480 }
]

const manifestColumns = [
  { title: '会话', key: 'sessionId', dataIndex: 'sessionId', width: 200 },
  { title: 'Agent', key: 'agentKey', dataIndex: 'agentKey', width: 140 },
  { title: '工具', key: 'toolCount', dataIndex: 'toolCount', width: 56 },
  { title: '定形时刻', key: 'createAt', dataIndex: 'createAt', width: 150 }
]

const tab = ref('packages')
const packages = ref<any[]>([])
const toolNames = ref<string[]>([])
const loading = ref(false)

const rows = ref<any[]>([])
const current = ref<any>(null)
const agents = ref<any[]>([])
const sessionId = ref('')
const agentKey = ref<string>()
const manifestLoading = ref(false)
const queried = ref(false)

const tagLabel = (tag: string) => TAG_LABELS[tag] || tag
const tagColor = (tag: string) => TAG_COLORS[tag] || 'default'

const headerCount = computed(() =>
  tab.value === 'packages'
    ? `能力包 ${packages.value.length} 个 · 工具 ${toolNames.value.length} 只`
    : `装配单 ${rows.value.length} 场`
)

const extraKeys = computed(() => Object.keys(current.value?.extras || {}))
const skillCount = computed(() => (current.value?.skills || []).length)
const sectionCount = computed(() => (current.value?.promptSections || []).length)

/** 工具名 → 登记它的能力包：装配单里的工具在这里查不到，就是棒 1 登记口径漏了一只 */
const toolIndex = computed(() => {
  const index: Record<string, { name: string; tags: string[] }> = {}
  packages.value.forEach((pkg: any) => {
    (pkg.tools || []).forEach((tool: string) => {
      if (!index[tool]) {
        index[tool] = { name: pkg.name, tags: pkg.tags || [] }
      }
    })
  })
  return index
})

const unListed = computed(() =>
  (current.value?.toolNames || []).filter((tool: string) => !toolIndex.value[tool])
)

const toolTagColor = (tool: string) => {
  const pkg = toolIndex.value[tool]
  return pkg ? tagColor(pkg.tags[0]) : 'orange'
}

const toolHint = (tool: string) => {
  const pkg = toolIndex.value[tool]
  if (!pkg) {
    return '未入册：没有能力包登记这只工具'
  }
  return `${pkg.name}（${pkg.tags.map(tagLabel).join('·')}）`
}

const agentOptions = computed(() =>
  agents.value.map((agent: any) => ({ label: agent.displayName || agent.key, value: agent.key }))
)

const fmtTime = (value: any) => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const load = async () => {
  loading.value = true
  try {
    const resp: any = await getCapabilityPackages()
    const manifest = resp?.payload || {}
    packages.value = manifest.packages || []
    toolNames.value = manifest.toolNames || []
  } finally {
    loading.value = false
  }
}

const loadRecent = async () => {
  manifestLoading.value = true
  queried.value = false
  try {
    const resp: any = await listRecentManifest(agentKey.value, 20)
    rows.value = resp?.payload || []
    current.value = rows.value[0] || null
  } finally {
    manifestLoading.value = false
  }
}

const queryBySession = async () => {
  if (!sessionId.value) {
    return
  }
  manifestLoading.value = true
  queried.value = true
  try {
    const resp: any = await getAgentManifest(sessionId.value.trim())
    // 🔴 框架信封把 null 响应体渲染成空对象，不判空就会渲染出一张全空的详情壳
    const payload = resp?.payload
    current.value = payload && Object.keys(payload).length ? payload : null
  } finally {
    manifestLoading.value = false
  }
}

const pickRow = (record: any) => ({
  onClick: () => {
    current.value = record
    queried.value = false
  }
})

const loadAgents = async () => {
  const resp: any = await listAgents()
  agents.value = resp?.payload || []
}

const reload = () => (tab.value === 'packages' ? load() : loadRecent())

// 切到装配单页签即拉最近清单：不点就只见空表，看不出这页有什么可查
watch(tab, (key) => {
  if (key === 'manifest' && !rows.value.length) {
    loadRecent()
  }
})

onMounted(() => {
  load()
  loadAgents()
})
</script>

<style lang="less" scoped>
.capability-page {
  padding: 16px 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-text {
  display: flex;
  align-items: center;
  gap: 8px;

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .count {
    color: var(--text-secondary);
  }
}

.hint {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.session-input {
  width: 260px;
}

.agent-select {
  width: 200px;
}

.empty {
  margin: 16px 0;
}

.detail {
  margin-top: 16px;
}

.detail-head {
  margin-bottom: 12px;
}

.block {
  margin-bottom: 14px;
}

.block-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.line {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 24px;
}

.line-no {
  color: var(--text-secondary);
  width: 18px;
}

.line-ver {
  color: var(--text-secondary);
}

.extra-chip {
  display: inline-block;
  margin-right: 8px;
  font-family: monospace;
}

.warn-line {
  margin-top: 6px;
  color: var(--ant-warning-color, #d46b08);
}

.pkg-name {
  font-family: monospace;
}

.pkg-display {
  color: var(--text-secondary);
}

.tool-name {
  margin: 0 6px 4px 0;
  white-space: nowrap;
}

.session-cell {
  word-break: break-all;
}

.desc {
  color: var(--text-secondary);
}
</style>
