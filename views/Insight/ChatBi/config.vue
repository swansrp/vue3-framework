<!--
 * ChatBI Skill 工作台（DB 菜单 ChatBiWorkbench，component 直达本文件）——业务薄封装
 * （framework 层页面：所有项目共享，后端依赖 insight 模块即可用）
 *
 * 通用底座（framework 层 SkillWorkbench 组件）按 skillCode=chatbi 渲染：
 * 1. 链路画布——registry 结点 schema 驱动（palette/属性表单/默认值全来自后端元数据）
 * 2. 执行轨迹——skill 调试反馈回路：trace 列表 + 结点事件时间线（llm 提示词/回答全文）
 * 3. 评价统计——运营回路：跨访问人聚合的回答赞/踩，通用筛选 + 看板业务维度
 * 4. 看板描述（业务资产 Tab，经 extraTabs + #tab-desc 插槽注入）——候选注册管理：
 *    左侧 folder 树选板，右侧描述编辑（写描述=注册进路由候选，AI 草稿辅助）
 *    + 敏感列配置：勾选值不外泄的列并配对编码替身列（列定义保留供指名查询，值域清单不下发模型）
 *
 * 本文件只维护业务差异：api 适配器（评价 extEquals→tableId）、链路富文案、llm 占位符速查、
 * 看板描述/敏感列全部逻辑与样式、评价看板筛选。
-->
<template>
  <SkillWorkbench
    skill-code="chatbi"
    title="智能问数 · Skill 工作台"
    subtitle="提示词资产编排与执行轨迹调试"
    :api="workbenchApi"
    :flow-meta="FLOW_META"
    :extra-tabs="EXTRA_TABS"
    :rating-ext-equals="ratingExtEquals"
    trace-empty-hint="去「智能问数」菜单提问后回来刷新"
    rating-empty-hint="在「智能问数」菜单对回答点赞/点踩后回来查询"
    @tab-change="onTabChange"
  >
    <!-- llm 结点 template 字段：占位符速查（变量池业务知识，经字段级插槽注入属性面板） -->
    <template #node-config-extra="{ field, type }">
      <div
        v-if="type === 'llm' && field.key === 'template'"
        class="panel-vars"
      >
        <div class="panel-row-title">
          占位符速查（模板可用变量）
        </div>
        <div
          v-for="v in LLM_VARS"
          :key="v.name"
          class="var-item"
        >
          <code>{{ varRef(v.name) }}</code>
          <span>{{ v.desc }}</span>
        </div>
      </div>
    </template>

    <!-- 业务资产 Tab：看板描述（候选注册管理：左树选板 + 右侧描述编辑 + 敏感列配置） -->
    <template #tab-desc>
      <div class="desc-wrap">
        <div class="desc-list">
          <div class="list-head">
            <span>看板目录</span>
            <div class="head-side">
              <span class="reg-count">已注册 {{ registeredCount }}/{{ portalItems.length }}</span>
              <button
                class="btn mini"
                :disabled="descLoading"
                @click="loadRouteCatalog"
              >
                {{ descLoading ? '加载中…' : '刷新' }}
              </button>
            </div>
          </div>
          <div class="desc-search">
            <input
              v-model="portalSearch"
              class="ipt"
              placeholder="搜索看板名称 / 编码"
            />
            <div class="seg filter-seg">
              <button
                class="seg-btn"
                :class="{ active: portalFilter === 'all' }"
                @click="portalFilter = 'all'"
              >
                全部
              </button>
              <button
                class="seg-btn"
                :class="{ active: portalFilter === 'registered' }"
                @click="portalFilter = 'registered'"
              >
                已注册
              </button>
              <button
                class="seg-btn"
                :class="{ active: portalFilter === 'unregistered' }"
                @click="portalFilter = 'unregistered'"
              >
                未注册
              </button>
            </div>
          </div>
          <div class="desc-tree">
            <div
              v-for="node in portalTreeNodes"
              :key="node.key"
              :class="[node.folder ? 'desc-folder' : 'desc-item', { active: !node.folder && selectedPortal && selectedPortal.tableId === node.key }]"
              :style="{ paddingLeft: `${node.depth * 14 + 10}px` }"
              @click="node.folder ? toggleFolder(node.key) : selectPortal(node.item)"
            >
              <template v-if="node.folder">
                <span
                  class="folder-caret"
                  :class="{ open: isFolderOpen(node.key) }"
                >▶</span>
                <span
                  class="folder-name"
                  :title="node.name"
                >{{ node.name }}</span>
                <span class="folder-count">{{ node.count }}</span>
              </template>
              <template v-else>
                <span
                  class="item-dot"
                  :class="{ on: node.registered }"
                ></span>
                <span
                  class="item-label"
                  :title="node.title || node.name"
                >{{ node.name }}</span>
              </template>
            </div>
            <div
              v-if="!descLoading && !portalTreeNodes.length"
              class="list-empty"
            >
              无匹配看板
            </div>
          </div>
        </div>
        <div class="desc-editor">
          <template v-if="selectedPortal">
            <div class="editor-head">
              <div class="editor-title">
                {{ selectedPortal.title || selectedPortal.portalName }}
              </div>
              <div class="editor-meta">
                <code>{{ selectedPortal.tableId }}</code>
                <span
                  class="reg-tag"
                  :class="{ on: !!selectedPortal.description }"
                >
                  {{ selectedPortal.description ? '已注册候选' : '未注册' }}
                </span>
              </div>
            </div>
            <div class="editor-tip">
              候选注册制：写一句业务描述即把该看板注册进全局路由候选（route_catalog），描述供路由大模型判断看板与问题的相关性；清空并保存即注销候选。
            </div>
            <textarea
              v-model="descDraft[selectedPortal.tableId]"
              class="ipt area desc-textarea"
              placeholder="一句话描述该看板承载的业务域，如：项目全生命周期状态分布"
            ></textarea>
            <div class="editor-actions">
              <button
                class="btn"
                :disabled="descGenerating"
                @click="generateDesc"
              >
                {{ descGenerating ? '生成中…' : 'AI 生成草稿' }}
              </button>
              <button
                class="btn primary"
                :disabled="descSaving === selectedPortal.tableId || descDraft[selectedPortal.tableId] === (selectedPortal.description || '')"
                @click="saveDesc(selectedPortal)"
              >
                {{ descSaving === selectedPortal.tableId ? '保存中…' : selectedPortal.description ? '保存修改' : '注册候选' }}
              </button>
            </div>
            <div class="editor-hint">
              AI 草稿按看板元数据（指标卡片 / 筛选组 / 字段）汇总生成，可修改后再保存。
            </div>

            <!-- 敏感列配置：值不外泄（列定义保留供指名查询，值域清单不下发模型，配对编码列做替身） -->
            <div class="sensitive-block">
              <div class="sensitive-head">
                <span class="sensitive-title">敏感列配置</span>
                <span class="sensitive-count">已配 {{ sensitiveCheckedCount }} 列</span>
                <button
                  class="btn mini"
                  :disabled="sensitiveLoading"
                  @click="loadSensitiveColumns()"
                >
                  {{ sensitiveLoading ? '加载中…' : '刷新' }}
                </button>
                <button
                  class="btn primary mini"
                  :disabled="sensitiveSaving === selectedPortal.tableId"
                  @click="saveSensitive(selectedPortal)"
                >
                  {{ sensitiveSaving === selectedPortal.tableId ? '保存中…' : '保存敏感配置' }}
                </button>
              </div>
              <div class="sensitive-tip">
                敏感列 = 值不外泄：列定义保留（用户指名查单条仍可用名称拼等于/模糊条件），值域清单不下发模型；
                配对编码列（如 项目名称 → 项目编号）供模型跨轮/批量子集查询替换引用。保存即整板覆盖，全部取消勾选即恢复。
              </div>
              <div class="sensitive-list">
                <div
                  v-if="sensitiveLoading"
                  class="list-empty"
                >
                  列清单加载中…
                </div>
                <template v-else>
                  <div
                    v-for="col in sensitiveColumns"
                    :key="col.property"
                    class="sensitive-row"
                  >
                    <input
                      type="checkbox"
                      :checked="!!sensitiveDraft[col.property]"
                      @change="toggleSensitiveColumn(col, ($event.target as HTMLInputElement).checked)"
                    />
                    <span
                      class="sens-label"
                      :title="col.property"
                    >{{ col.label || col.property }}</span>
                    <span
                      v-if="col.fieldType"
                      class="sens-type"
                    >{{ col.fieldType }}</span>
                    <select
                      v-if="sensitiveDraft[col.property]"
                      v-model="sensitiveDraft[col.property].replaceProperty"
                      class="ipt sens-pair"
                    >
                      <option value="">
                        不配对（无编码替身）
                      </option>
                      <option
                        v-for="opt in sensitivePairOptions(col)"
                        :key="opt.property"
                        :value="opt.property"
                      >
                        {{ opt.label || opt.property }}
                      </option>
                    </select>
                  </div>
                  <div
                    v-if="!sensitiveColumns.length"
                    class="list-empty"
                  >
                    该看板无可配置列
                  </div>
                </template>
              </div>
            </div>
          </template>
          <div
            v-else
            class="list-empty"
          >
            左侧选择看板后维护业务描述（绿点 = 已注册候选）
          </div>
        </div>
      </div>
    </template>

    <!-- 评价筛选：看板下拉（目录复用 desc Tab 数据；改值即触发组件内 reload 查询） -->
    <template #rating-filter-extra="{ reload }">
      <select
        v-model="ratingTableId"
        class="ipt rating-portal-select"
        @change="reload()"
      >
        <option value="">
          全部看板
        </option>
        <option
          v-for="item in ratingPortalOptions"
          :key="item.tableId"
          :value="item.tableId"
        >
          {{ item.title || item.tableId }}
        </option>
      </select>
    </template>

    <!-- 评价行业务维度：看板名（悬停看 tableId；通用端点回包里看板维度在 record.ext） -->
    <template #rating-meta-extra="{ record }">
      <span
        v-if="ratingPortalLabel(record)"
        :title="ratingPortalTitle(record)"
      >{{ ratingPortalLabel(record) }}</span>
    </template>
  </SkillWorkbench>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'

import {
  generateChatBiTableDesc,
  getChatBiPortalDescAll,
  getChatBiSensitiveColumns,
  saveChatBiSensitiveColumns,
  saveChatBiTableDesc
} from '@/framework/components/common/chatbi/api'
import type { ChatBiRouteItem, ChatBiSensitiveColumn } from '@/framework/components/common/chatbi/types'
import SkillWorkbench from '@/framework/components/common/skill/SkillWorkbench.vue'
import { createSkillWorkbenchApi } from '@/framework/components/common/skill/workbenchApi'

// ===== 业务注入：链路职责富文案（registry 只给显示名，未维护的链由组件降级显示） =====

const FLOW_META: Record<string, { duty: string; trigger: string; output: string }> = {
  route: {
    duty: '看板路由链：看板目录 → LLM 选板 → 提取 tableId → 输出（从候选看板中选出与问题最相关的一个）',
    trigger: '用户提问且未指定看板（POST /route）',
    output: 'tableId / portalName'
  },
  ask: {
    duty: '智能问数链：语义目录 → LLM 流式生成回答与 chart-spec → 提取下发渲染（图表与文案的真正生产线）',
    trigger: '看板确定后问数（POST /ask，SSE）',
    output: 'delta 流 / spec / answer'
  }
}

// ===== 业务注入：llm 模板占位符速查（start/semantic/route_catalog 注入的变量池） =====

const LLM_VARS: Array<{ name: string; desc: string }> = [
  { name: 'question', desc: '用户问题（start 注入）' },
  { name: 'tableId', desc: '当前看板 tableId' },
  { name: 'currentTableId', desc: '路由请求携带的当前看板' },
  { name: 'history', desc: '最近对话文本' },
  { name: 'catalog', desc: '语义目录 JSON（semantic 输出）' },
  { name: 'routeCatalog', desc: '看板候选目录文本（route_catalog 输出）' }
]

// llm 模板占位符引用形式（模板插值里不能直接拼 }}，故由 script 生成）
const varRef = (name: string) => `{{${name}}}`

// ===== 业务注入：Skill 工作台 api 适配器（通用工厂：skillCode=chatbi → /web/api/agent 端点） =====
// 评价看板维度经 ratingExtEquals → extEquals.tableId 透传（与后端 ChatBiRatingListener 存的 ext 同键）

const workbenchApi = createSkillWorkbenchApi('chatbi')

// 业务资产 Tab 注册（看板描述 = 候选注册管理 + 敏感列配置）
const EXTRA_TABS = [{ key: 'desc', label: '看板描述' }]

// ===== 业务资产 Tab：看板描述（候选注册管理） =====

// 左树行节点：folder 行（可折叠）与叶子行（看板）拍平后共用一个序列
interface PortalTreeNode {
  key: string          // folder：'-' 拼接的完整路径；叶子：tableId
  folder: boolean
  name: string         // folder 段名 / 叶子短名（title 末段）
  title?: string       // 叶子完整 title（tooltip）
  depth: number
  count?: number       // folder：子孙看板数
  registered?: boolean // 叶子：是否已注册候选
  item?: ChatBiRouteItem
}

const portalItems = ref<ChatBiRouteItem[]>([])
const portalSearch = ref('')
// 注册状态筛选（与搜索词叠加：先按关键词命中，再按注册状态筛）
const portalFilter = ref<'all' | 'registered' | 'unregistered'>('all')
const selectedPortal = ref<ChatBiRouteItem | null>(null)
const descDraft = ref<Record<string, string>>({})
const descSaving = ref('')
const descGenerating = ref(false)
const descLoading = ref(false)
const descLoaded = ref(false)
const collapsedFolders = ref<Set<string>>(new Set())

const registeredCount = computed(() => portalItems.value.filter(i => !!i.description).length)

// folder 树中间结构（与 sysPortal 管理页左树同款约定：title 按 '-' 分隔，末段是叶子短名）
interface FolderNode {
  name: string
  path: string
  children: Map<string, FolderNode>
  leaves: ChatBiRouteItem[]
}

function countFolderLeaves(folder: FolderNode): number {
  let total = folder.leaves.length
  folder.children.forEach(child => {
    total += countFolderLeaves(child)
  })
  return total
}

// 左树行序列：搜索命中 title/tableId 时过滤并强制展开，注册状态筛选与之叠加，否则按 collapsedFolders 折叠子树
const portalTreeNodes = computed<PortalTreeNode[]>(() => {
  const keyword = portalSearch.value.trim().toLowerCase()
  const keywordMatched = keyword
    ? portalItems.value.filter(
        i => (i.title || '').toLowerCase().includes(keyword) || i.tableId.toLowerCase().includes(keyword)
      )
    : portalItems.value
  const filter = portalFilter.value
  const matched =
    filter === 'all'
      ? keywordMatched
      : keywordMatched.filter(i => (filter === 'registered' ? !!i.description : !i.description))

  const root: FolderNode = { name: '', path: '', children: new Map(), leaves: [] }
  for (const item of matched) {
    const parts = (item.title || item.tableId)
      .split('-')
      .map(s => s.trim())
      .filter(Boolean)
    if (parts.length <= 1) {
      root.leaves.push(item)
      continue
    }
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('-')
      if (!cur.children.has(parts[i])) {
        cur.children.set(parts[i], { name: parts[i], path, children: new Map(), leaves: [] })
      }
      cur = cur.children.get(parts[i]) as FolderNode
    }
    cur.leaves.push(item)
  }

  const collapsed = collapsedFolders.value
  const rows: PortalTreeNode[] = []
  const walk = (folder: FolderNode, depth: number) => {
    const folders = [...folder.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    const leaves = [...folder.leaves].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'))
    for (const f of folders) {
      rows.push({ key: f.path, folder: true, name: f.name, depth, count: countFolderLeaves(f) })
      if (keyword || filter !== 'all' || !collapsed.has(f.path)) walk(f, depth + 1)
    }
    for (const item of leaves) {
      const parts = (item.title || '').split('-').filter(Boolean)
      rows.push({
        key: item.tableId,
        folder: false,
        name: parts.length > 1 ? parts[parts.length - 1] : item.title || item.tableId,
        title: item.title,
        depth,
        registered: !!item.description,
        item
      })
    }
  }
  walk(root, 0)
  return rows
})

async function loadRouteCatalog() {
  descLoading.value = true
  try {
    const resp = await getChatBiPortalDescAll()
    portalItems.value = (resp?.payload as ChatBiRouteItem[] | undefined) || []
    const draft: Record<string, string> = {}
    portalItems.value.forEach(item => {
      draft[item.tableId] = item.description || ''
    })
    descDraft.value = draft
    // 刷新后选中项替换为最新数据引用，避免停留在旧对象上
    if (selectedPortal.value) {
      selectedPortal.value = portalItems.value.find(i => i.tableId === selectedPortal.value?.tableId) || null
    }
  } finally {
    descLoading.value = false
  }
}

function toggleFolder(key: string) {
  const set = collapsedFolders.value
  if (set.has(key)) set.delete(key)
  else set.add(key)
}

function isFolderOpen(key: string): boolean {
  return !collapsedFolders.value.has(key)
}

function selectPortal(item?: ChatBiRouteItem) {
  if (item) {
    selectedPortal.value = item
    loadSensitiveColumns(item.tableId)
  }
}

// AI 草稿：后端按看板语义目录汇总喂模型，返回一句话描述回填编辑框，人工确认后才保存注册
async function generateDesc() {
  const portal = selectedPortal.value
  if (!portal || descGenerating.value) return
  descGenerating.value = true
  try {
    const resp = await generateChatBiTableDesc(portal.tableId)
    const draft = (resp?.payload as string | undefined) || ''
    if (draft) {
      descDraft.value[portal.tableId] = draft
      message.success('草稿已生成，可修改后保存')
    } else {
      message.warning('未生成草稿内容，请稍后重试')
    }
  } finally {
    descGenerating.value = false
  }
}

async function saveDesc(item: ChatBiRouteItem) {
  descSaving.value = item.tableId
  try {
    await saveChatBiTableDesc(item.tableId, descDraft.value[item.tableId] || '')
    item.description = descDraft.value[item.tableId]
    message.success(item.description ? `已保存 ${item.tableId} 的业务描述` : `已注销 ${item.tableId} 的候选注册`)
  } finally {
    descSaving.value = ''
  }
}

// ===== 业务资产 Tab：敏感列配置（值不外泄：列定义保留供指名查询，值域清单不下发模型） =====

// 勾选草稿：property → { replaceProperty }（''=不配对）；切板整体重建，未保存的勾选不跨板
const sensitiveColumns = ref<ChatBiSensitiveColumn[]>([])
const sensitiveDraft = reactive<Record<string, { replaceProperty: string }>>({})
const sensitiveSaving = ref('')
const sensitiveLoading = ref(false)

const sensitiveCheckedCount = computed(() => Object.keys(sensitiveDraft).length)

// 配对下拉选项：同板其它列（剔除自身与已勾选为敏感列的——后端校验同规则）
function sensitivePairOptions(col: ChatBiSensitiveColumn): ChatBiSensitiveColumn[] {
  return sensitiveColumns.value.filter(c => c.property !== col.property && !sensitiveDraft[c.property])
}

function toggleSensitiveColumn(col: ChatBiSensitiveColumn, checked: boolean) {
  if (checked) {
    sensitiveDraft[col.property] = { replaceProperty: col.replaceProperty || '' }
  } else {
    delete sensitiveDraft[col.property]
  }
}

// 列清单加载：全量有效列 + 敏感标记回显（切板时响应若已过期——当前选中板非请求板——丢弃）
async function loadSensitiveColumns(tableId?: string) {
  const id = tableId || selectedPortal.value?.tableId
  if (!id) return
  sensitiveLoading.value = true
  try {
    const resp = await getChatBiSensitiveColumns(id)
    if (selectedPortal.value?.tableId !== id) return
    const list = (resp?.payload as ChatBiSensitiveColumn[] | undefined) || []
    sensitiveColumns.value = list
    Object.keys(sensitiveDraft).forEach(k => delete sensitiveDraft[k])
    list.forEach(col => {
      if (col.sensitive) sensitiveDraft[col.property] = { replaceProperty: col.replaceProperty || '' }
    })
  } finally {
    sensitiveLoading.value = false
  }
}

// 整板覆盖保存：勾选列 + 配对列（空清单即清空恢复）；保存后重载回显（后端校验失败会以错误消息提示）
async function saveSensitive(portal: ChatBiRouteItem) {
  const columns = Object.entries(sensitiveDraft).map(([property, cfg]) => ({
    property,
    replaceProperty: cfg.replaceProperty || undefined
  }))
  sensitiveSaving.value = portal.tableId
  try {
    await saveChatBiSensitiveColumns({ tableId: portal.tableId, columns })
    message.success(
      columns.length
        ? `已保存 ${portal.tableId} 的敏感列配置（${columns.length} 列）`
        : `已清空 ${portal.tableId} 的敏感列配置`
    )
    await loadSensitiveColumns(portal.tableId)
  } finally {
    sensitiveSaving.value = ''
  }
}

// ===== 评价业务维度（看板筛选：插槽维护值，经 ratingExtEquals 传给组件查询） =====

const ratingTableId = ref('')

// 看板筛选下拉（复用 desc Tab 的全量看板目录，按名称排序）
const ratingPortalOptions = computed(() =>
  [...portalItems.value].sort((a, b) => (a.title || a.tableId).localeCompare(b.title || b.tableId, 'zh'))
)

const ratingExtEquals = computed<Record<string, string> | undefined>(() =>
  ratingTableId.value ? { tableId: ratingTableId.value } : undefined
)

// 评价记录看板维度读取（通用端点回包看板维度在 record.ext；组件通用 record 经此取看板名）
function ratingPortalLabel(record: Record<string, unknown>): string {
  const ext = (record.ext as Record<string, string> | undefined) || {}
  // 通用端点回包看板维度在 ext；顶层展平字段仅作兼容兑底
  return ext.portalName || ext.tableId || (record.portalName as string | undefined) || (record.tableId as string | undefined) || ''
}

function ratingPortalTitle(record: Record<string, unknown>): string {
  const ext = (record.ext as Record<string, string> | undefined) || {}
  return ext.tableId || (record.tableId as string | undefined) || ''
}

// ===== 业务 Tab 懒加载（desc 目录同时是评价看板下拉的数据源，首次进入任一即拉取） =====

function onTabChange(tab: string) {
  if ((tab === 'desc' || tab === 'rating') && !descLoaded.value) {
    descLoaded.value = true
    loadRouteCatalog()
  }
}
</script>

<style scoped lang="less">
// 插槽内容样式（scoped 归属本页：组件样式只作用于组件自身模板，插槽内容由业务侧自备）

.btn {
  padding: 5px 16px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  &.mini {
    padding: 2px 10px;
    font-size: 12px;
  }
}

.ipt {
  width: 100%;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-base);
  color: var(--text-primary);
  box-sizing: border-box;

  &.area {
    font-family: monospace;
    font-size: 12px;
    line-height: 1.6;
    resize: vertical;
  }
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  overflow: hidden;

  .seg-btn {
    padding: 4px 14px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

.list-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.list-empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

// llm 占位符速查（注入组件属性面板的字段级插槽）
.panel-vars {
  margin-bottom: 10px;

  .var-item {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--text-secondary);
    padding: 2px 0;

    code {
      color: var(--accent);
      font-size: 11px;
      flex-shrink: 0;
    }
  }
}

.panel-row-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 10px 0 6px;
}

// 评价筛选插槽：看板下拉（.ipt 默认 width:100%，在筛选行内改窄）
.rating-portal-select {
  width: 180px;
}

// 看板描述 Tab（候选注册管理：左树 + 右编辑）
.desc-wrap {
  height: 100%;
  display: flex;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;

  // 左：看板目录 folder 树（title 按 '-' 分隔建层级，同 sysPortal 管理页左树约定）
  .desc-list {
    flex-shrink: 0;
    width: 300px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--border-subtle);

    .head-side {
      display: flex;
      align-items: center;
      gap: 8px;

      .reg-count {
        font-size: 11px;
      }
    }

    .desc-search {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-subtle);

      // 注册状态筛选（复用页面 .seg 段样式，三段撑满更醒目）
      .filter-seg {
        display: flex;

        .seg-btn {
          flex: 1;
        }
      }
    }

    .desc-tree {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 6px 0;
    }

    .desc-folder,
    .desc-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
    }

    .desc-folder {
      color: var(--text-primary);
      font-weight: 600;

      .folder-caret {
        flex-shrink: 0;
        font-size: 9px;
        color: var(--text-secondary);
        transition: transform 0.15s;

        &.open {
          transform: rotate(90deg);
        }
      }

      .folder-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .folder-count {
        flex-shrink: 0;
        margin-left: auto;
        font-size: 10px;
        font-weight: 400;
        color: var(--text-secondary);
      }
    }

    .desc-item {
      color: var(--text-secondary);

      &:hover {
        background: var(--bg-base);
        color: var(--text-primary);
      }

      &.active {
        background: var(--bg-base);
        color: var(--accent);
      }

      .item-dot {
        flex-shrink: 0;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--border-subtle);

        &.on {
          background: #52c41a;
        }
      }

      .item-label {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  // 右：选中看板的描述编辑（写描述=注册进路由候选，AI 草稿辅助起草）
  .desc-editor {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    overflow-y: auto;

    .editor-head {
      .editor-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .editor-meta {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 10px;

        code {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .reg-tag {
          font-size: 11px;
          padding: 1px 8px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);

          &.on {
            border-color: rgba(82, 196, 26, 0.5);
            color: #52c41a;
          }
        }
      }
    }

    .editor-tip {
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-secondary);
      padding: 8px 12px;
      background: var(--bg-base);
      border-radius: 6px;
    }

    .desc-textarea {
      min-height: 110px;
    }

    .editor-actions {
      display: flex;
      gap: 10px;
    }

    .editor-hint {
      font-size: 11px;
      color: var(--text-secondary);
    }

    // 敏感列配置区块（描述编辑区下方：勾选清单 + 配对列下拉）
    .sensitive-block {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sensitive-head {
      display: flex;
      align-items: center;
      gap: 10px;

      .sensitive-title {
        font-size: 13px;
        font-weight: 600;
      }

      .sensitive-count {
        font-size: 11px;
        padding: 1px 8px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        color: var(--text-secondary);
      }
    }

    .sensitive-tip {
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-secondary);
      padding: 8px 12px;
      background: var(--bg-base);
      border-radius: 6px;
    }

    .sensitive-list {
      max-height: 260px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 4px;

      .sensitive-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 3px 6px;
        border-radius: 4px;

        &:hover {
          background: var(--bg-base);
        }

        .sens-label {
          flex-shrink: 0;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .sens-type {
          flex-shrink: 0;
          font-size: 11px;
          padding: 0 6px;
          border-radius: 8px;
          background: var(--bg-base);
          color: var(--text-secondary);
        }

        .sens-pair {
          width: auto;
          flex: 1;
          min-width: 0;
          font-size: 12px;
          padding: 2px 6px;
        }
      }
    }
  }
}
</style>
