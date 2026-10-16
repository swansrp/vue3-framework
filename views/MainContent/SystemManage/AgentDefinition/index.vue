<template>
  <div class="agent-def-page">
    <div class="page-header">
      <div class="header-text">
        <span class="title">Agent 勾选</span>
        <a-tag color="purple">
          仅平台管理员
        </a-tag>
        <span class="count">{{ headerCount }}</span>
      </div>
      <a-button
        :loading="loading"
        @click="load"
      >
        刷新
      </a-button>
    </div>

    <a-alert
      class="hint"
      type="info"
      show-icon
      message="勾选只能收窄，加不出代码里没有的能力"
      description="一个 agent 手里有哪些工具，代码里的 feature 面是硬上限；这一页勾的能力包与它取交集，只会更小不会更大。业务侧自己追加的工具不在能力包登记表里，平台关不掉它们。🔴 每一栏都有三种状态且含义相反：未启用＝这一维全部放行（存量 agent 就是这一态，本线上线后行为零漂移）；一个都不勾＝登记表里的全不给；勾了若干＝按并集取交集。改完下一场会话生效，进行中的会话不受影响。五栏里只有「能力包」参与运行期，其余四栏只登记不生效，注入与选型的正源还在原处。"
    />

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      row-key="agentKey"
      size="middle"
      :scroll="{ x: 1080 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'agent'">
          <div class="agent-name">
            {{ record.displayName || record.agentKey }}
            <a-tag
              v-if="record.kind"
              color="default"
              class="agent-kind"
            >
              {{ kindLabel(record.kind) }}
            </a-tag>
          </div>
          <div class="agent-key">
            {{ record.agentKey }}
          </div>
          <div
            v-if="!record.registered"
            class="warn-line"
          >
            不在运行期注册表里（多半已退役），这行的勾选不参与任何会话
          </div>
        </template>
        <template v-else-if="column.key === 'capabilityPackages'">
          <span
            v-if="isUnset(record.capabilityPackages)"
            class="muted"
          >未启用·全部放行</span>
          <a-tag
            v-else-if="!record.capabilityPackages.length"
            color="red"
          >
            一个都不勾
          </a-tag>
          <template v-else>
            <a-tooltip
              v-for="name in record.capabilityPackages"
              :key="name"
              :title="packageHint(name)"
            >
              <a-tag
                :color="packageColor(name)"
                class="pkg-tag"
              >
                {{ name }}
              </a-tag>
            </a-tooltip>
          </template>
          <div
            v-if="!record.hasRow"
            class="muted"
          >
            从未勾过
          </div>
        </template>
        <template v-else-if="column.key === 'registerOnly'">
          <span
            v-if="allRegisterOnlyUnset(record)"
            class="muted"
          >四栏都未启用</span>
          <a-tooltip
            v-for="chip in registerOnlyChips(record)"
            :key="chip.key"
            :title="chip.hint"
          >
            <a-tag
              :color="chip.color"
              class="pkg-tag"
            >
              {{ chip.label }} {{ chip.state }}
            </a-tag>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'owner'">
          <div>{{ record.updateByName || record.updateBy || '—' }}</div>
          <div class="muted">
            {{ fmtTime(record.updateAt) }}
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button
            size="small"
            type="link"
            @click="openEdit(record)"
          >
            勾选
          </a-button>
        </template>
      </template>
    </a-table>

    <a-empty
      v-if="!loading && !rows.length"
      class="empty"
      :description="emptyText"
    />

    <a-modal
      v-model:open="editing"
      :title="editTitle"
      :confirm-loading="saving"
      width="760px"
      ok-text="保存"
      @ok="save"
    >
      <a-alert
        v-if="current && !current.registered"
        class="modal-warn"
        type="warning"
        show-icon
        message="这个 agent 不在运行期注册表里"
        description="勾选照旧能存，但它不参与任何一场会话；能存的原因只是这条历史行需要留个清空的手段。"
      />
      <div
        v-for="meta in COLUMN_METAS"
        :key="meta.key"
        class="draft-block"
      >
        <div class="draft-head">
          <span class="draft-label">{{ meta.label }}</span>
          <a-tag
            v-if="meta.runtime"
            color="blue"
          >
            参与运行期
          </a-tag>
          <a-tag
            v-else
            color="default"
          >
            只登记不生效
          </a-tag>
          <a-radio-group
            v-model:value="draft[meta.key].custom"
            size="small"
            class="draft-switch"
          >
            <a-radio :value="false">
              未启用（全部放行）
            </a-radio>
            <a-radio :value="true">
              自定义勾选
            </a-radio>
          </a-radio-group>
        </div>
        <div class="draft-body">
          <span
            v-if="!draft[meta.key].custom"
            class="muted"
          >
            {{ meta.unsetHint }}
          </span>
          <template v-else>
            <!-- 有登记表的那两栏只能从清单里挑（能力包＝运行期栏、系统技能包＝台账已发布集）；
                 没有正源可查的两栏（外部能力/提示词段）才允许手填，勾完只登记意图 -->
            <template v-if="meta.runtime">
              <a-checkbox-group
                v-if="packages.length"
                v-model:value="draft[meta.key].names"
                class="pick-group"
              >
                <a-checkbox
                  v-for="pkg in packages"
                  :key="pkg.name"
                  :value="pkg.name"
                >
                  <a-tooltip :title="`${pkg.description || pkg.displayName}｜${(pkg.tools || []).join('、')}`">
                    {{ pkg.name }}
                  </a-tooltip>
                </a-checkbox>
              </a-checkbox-group>
              <span
                v-else
                class="muted"
              >
                能力包清单没读到：交集只作用于登记过的工具，这时勾什么都不改变工具面（先确认能力包清单页有数据）
              </span>
            </template>
            <template v-else>
              <a-select
                v-model:value="draft[meta.key].names"
                :mode="meta.strict ? 'multiple' : 'tags'"
                :options="meta.options()"
                :placeholder="meta.placeholder"
                class="pick-input"
              />
              <div
                v-if="meta.strict && !meta.options().length"
                class="muted"
              >
                {{ meta.emptyHint }}
              </div>
              <div
                v-else-if="meta.strict && staleNames(meta).length"
                class="warn-line"
              >
                已勾的名字当前不在候选里（多半这一项后来被下线或注销）：{{ staleNames(meta).join('、') }}
              </div>
            </template>
          </template>
        </div>
        <div
          v-if="draft[meta.key].custom && !draft[meta.key].names.length"
          class="warn-line"
        >
          自定义但一个都没勾＝登记表里的这一维全不给（与「未启用」相反，那是全部放行）
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
/**
 * Agent 勾选页（M14 棒 6-F，框架侧纯加法）：五栏三态勾选的读写面。
 *
 * 🔴 页面上"未启用"与"一个都不勾"必须是两个可见的形态：前者＝放行＝存量 agent 的样子，
 * 后者＝全关。所以编辑框用「未启用／自定义勾选」两档单选打底，只有选了自定义才把名单送上去，
 * 空名单在此刻会显式提示它等于"全不给"，而不是被当成"没填"。
 *
 * 权限不在这里判：闸门在 core 的服务层（平台管理员），bean 取不到即按非管理员拒绝。
 * 本页不藏按钮——藏了就得把管理员判定复制到前端，而那道闸的正源在服务端。
 */
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import { getCapabilityPackages } from '@/framework/apis/agent'
import {
  listAgentDefinitions,
  saveAgentSelection,
  type AgentDefinitionView,
  type AgentSelectionCmd,
  type SelectionNames
} from '@/framework/apis/agent/definition'
import { listReadableSkillNames } from '@/framework/apis/agent/skill'

const KIND_LABELS: Record<string, string> = {
  FLOW: '流程',
  AUTONOMOUS: '自主',
  DYNAMIC: '动态'
}

const TAG_COLORS: Record<string, string> = {
  READ: 'blue',
  SESSION: 'default',
  WRITE: 'red',
  EXTERNAL_EFFECT: 'purple'
}

/** 模型用途档是 core/llm 的封闭枚举，正源就是这四个值，没有台账可查 */
const MODEL_PURPOSES = ['AGENT', 'VISION', 'DEFAULT', 'NODE']

/** 「系统技能包」栏的候选源＝系统半可读集（core 与提示词注入同一把尺），空数组＝没读到或一个都没发布 */
const systemSkillNames = ref<string[]>([])

/**
 * 五栏的定义。
 *
 * 🔴 控件形态按"有没有候选正源"分，不按"是否参与运行期"分：
 * 能力包＝运行期栏（勾登记表里的包名）、系统技能包＝只登记但台账有已发布集可查（`strict`，只能挑不能敲），
 * 模型用途档＝封闭枚举四值（`strict`），外部能力与提示词段＝本期没有正源可查，才留手填（`tags`）。
 * 有清单还放开手填，等于让管理员敲出一个永远读不到的名字——这一栏不参与运行期，敲错了连报错都没有。
 */
const COLUMN_METAS = [
  {
    key: 'capabilityPackages',
    label: '能力包',
    runtime: true,
    strict: true,
    unsetHint: '这一维全部放行（＝没勾选前的形态）',
    placeholder: '',
    emptyHint: '',
    options: (): { value: string, label: string }[] => []
  },
  {
    key: 'systemSkills',
    label: '系统技能包',
    runtime: false,
    strict: true,
    unsetHint: '不启用；注入正源仍是空间「技能包」页的绑定，这一栏只登记意图',
    placeholder: '从已发布的系统技能包里挑（可多选，这一栏只登记、不参与运行期）',
    emptyHint: '系统技能包台账里没有已发布的包（或清单没读到）⇒ 这一栏没有候选：先去「系统技能包」页上传并发布',
    options: (): { value: string, label: string }[] =>
      systemSkillNames.value.map(name => ({ value: name, label: name }))
  },
  {
    key: 'externalCapabilities',
    label: '外部能力',
    runtime: false,
    strict: false,
    unsetHint: '不启用；外部能力真实接入不在本期，这一栏只登记意图',
    placeholder: '填名字，回车入库（这一栏还没有登记表，正源上线前只能手填）',
    emptyHint: '',
    options: (): { value: string, label: string }[] => []
  },
  {
    key: 'modelPurpose',
    label: '模型用途档',
    runtime: false,
    strict: true,
    unsetHint: '不启用；实答模型仍由模型层现读系统配置，这一栏只登记意图',
    placeholder: '从四个用途档里挑（可多选，这一栏只登记、不参与运行期）',
    emptyHint: '',
    options: (): { value: string, label: string }[] =>
      MODEL_PURPOSES.map(name => ({ value: name, label: name }))
  },
  {
    key: 'promptSegments',
    label: '提示词段',
    runtime: false,
    strict: false,
    unsetHint: '不启用；拼装正源在业务侧，这一栏只登记意图',
    placeholder: '填名字，回车入库（段名正源在业务侧拼装处，平台侧没有清单可查）',
    emptyHint: '',
    options: (): { value: string, label: string }[] => []
  }
] as const

type ColumnMeta = typeof COLUMN_METAS[number]

const columns = [
  { title: 'Agent', key: 'agent', dataIndex: 'agentKey', width: 260 },
  { title: '能力包（生效栏）', key: 'capabilityPackages', dataIndex: 'capabilityPackages', width: 260 },
  { title: '其余四栏（仅登记）', key: 'registerOnly', width: 260 },
  { title: '最后改动', key: 'owner', dataIndex: 'updateBy', width: 150 },
  { title: '操作', key: 'action', width: 70 }
]

const rows = ref<AgentDefinitionView[]>([])
const loading = ref(false)
const readFailed = ref(false)
const packages = ref<any[]>([])

const editing = ref(false)
const saving = ref(false)
const current = ref<AgentDefinitionView | null>(null)

type DraftState = Record<string, { custom: boolean, names: string[] }>

const draft = ref<DraftState>(emptyDraft())

function emptyDraft(): DraftState {
  const state: DraftState = {}
  COLUMN_METAS.forEach(meta => {
    state[meta.key] = { custom: false, names: [] }
  })
  return state
}

const isUnset = (names?: SelectionNames) => names === null || names === undefined

const kindLabel = (kind?: string) => (kind && KIND_LABELS[kind]) || kind || '—'

/** 收窄生效中＝能力包那一栏是数组（含空数组），null 一律算放行 */
const narrowedCount = computed(() => rows.value.filter(r => Array.isArray(r.capabilityPackages)).length)

const headerCount = computed(
  () => `共 ${rows.value.length} 个 agent · 工具面已收窄 ${narrowedCount.value} 个`
)

const emptyText = computed(() =>
  readFailed.value
    ? '勾选清单读不到（只有平台管理员可看；被拒的说明已在上方提示条里）'
    : '运行期注册表里一个 agent 都没有（该应用没装 agent 底座）'
)

const packageIndex = computed(() => {
  const index: Record<string, any> = {}
  packages.value.forEach((pkg: any) => {
    index[pkg.name] = pkg
  })
  return index
})

const packageHint = (name: string) => {
  const pkg = packageIndex.value[name]
  if (!pkg) {
    return '未注册：能力包清单里没有这个名字，运行期按窄处理（这个包的工具本次不给）'
  }
  return `${pkg.displayName}｜${(pkg.tags || []).join('·')}｜${(pkg.tools || []).join('、')}`
}

const packageColor = (name: string) => {
  const pkg = packageIndex.value[name]
  return pkg ? TAG_COLORS[(pkg.tags || [])[0]] || 'default' : 'orange'
}

const REGISTER_ONLY_METAS = COLUMN_METAS.filter(meta => !meta.runtime)

const allRegisterOnlyUnset = (record: AgentDefinitionView) =>
  REGISTER_ONLY_METAS.every(meta => isUnset((record as any)[meta.key]))

/** 四栏压成一行小徽标：只露"动过的那几栏"，都未启用时给一句 muted，免得五列各占一行读不动 */
const registerOnlyChips = (record: AgentDefinitionView) => {
  const chips: { key: string, label: string, state: string, color: string, hint: string }[] = []
  REGISTER_ONLY_METAS.forEach(meta => {
    const names = (record as any)[meta.key] as SelectionNames
    if (isUnset(names)) {
      return
    }
    const empty = !names.length
    chips.push({
      key: meta.key,
      label: meta.label,
      state: empty ? '全不给' : `${names.length} 项`,
      color: empty ? 'red' : 'default',
      hint: empty ? `${meta.label}：勾了零个＝这一维登记过的全不给` : `${meta.label}：${names.join('、')}`
    })
  })
  return chips
}

const editTitle = computed(() => {
  const row = current.value
  if (!row) {
    return 'Agent 勾选'
  }
  return `${row.displayName || row.agentKey} · 勾选`
})

const fmtTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '从未改动')

const loadPackages = async () => {
  const resp: any = await getCapabilityPackages().catch(() => null)
  packages.value = resp?.payload?.packages || []
}

const loadSystemSkillNames = async () => {
  const resp: any = await listReadableSkillNames().catch(() => null)
  systemSkillNames.value = resp?.payload || []
}

/** 勾了但已不在候选里的名字（包后来被下线/注销，或那是手填时代留下的旧值）：只提示不拦，这一栏不参与运行期 */
const staleNames = (meta: ColumnMeta) => {
  const known = meta.options().map(opt => opt.value)
  return draft.value[meta.key].names.filter(name => !known.includes(name))
}

const load = async () => {
  loading.value = true
  try {
    const resp = await listAgentDefinitions().catch(() => null)
    readFailed.value = resp === null
    rows.value = resp?.payload || []
  } finally {
    loading.value = false
  }
}

const openEdit = (record: AgentDefinitionView) => {
  current.value = record
  const state = emptyDraft()
  COLUMN_METAS.forEach(meta => {
    const names = (record as any)[meta.key] as SelectionNames
    state[meta.key] = { custom: Array.isArray(names), names: Array.isArray(names) ? [...names] : [] }
  })
  draft.value = state
  editing.value = true
}

const save = async () => {
  const row = current.value
  if (!row) {
    return
  }
  const cmd = {} as AgentSelectionCmd
  COLUMN_METAS.forEach(meta => {
    const state = draft.value[meta.key]
    // 🔴 未启用必须送 null，不能送 []：后者在服务端是"这一维全不给"，是关停不是放行
    cmd[meta.key as keyof AgentSelectionCmd] = state.custom ? state.names : null
  })
  saving.value = true
  try {
    await saveAgentSelection(row.agentKey, cmd)
    message.success('已保存，下一场会话按这份勾选收窄工具面')
    editing.value = false
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadPackages()
  loadSystemSkillNames()
})
</script>

<style lang="less" scoped>
.agent-def-page {
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

.empty {
  margin: 16px 0;
}

.agent-name {
  font-weight: 600;
}

.agent-kind {
  margin-left: 6px;
  font-weight: 400;
}

.agent-key {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.pkg-tag {
  margin: 0 6px 4px 0;
  white-space: nowrap;
}

.muted {
  color: var(--text-secondary);
  font-size: 12px;
}

.warn-line {
  color: var(--ant-warning-color, #d46b08);
  font-size: 12px;
}

.modal-warn {
  margin-bottom: 12px;
}

.draft-block {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-split, #f0f0f0);
}

.draft-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.draft-label {
  font-weight: 600;
  white-space: nowrap;
}

.draft-switch {
  margin-left: auto;
}

.draft-body {
  min-height: 24px;
}

.pick-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  width: 100%;
}

/* 🔴 手填那四栏别复用 .pick-group：flex 会把 antd select 的 .ant-select-selector 压成内容宽，
   空值时整只框塌成一小格、placeholder 被挤没，看着像坏掉的空框 */
.pick-input {
  width: 100%;
}
</style>
