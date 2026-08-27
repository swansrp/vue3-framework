<template>
  <div class="tpl-page">
    <div class="tpl-head">
      <a-button
        size="small"
        @click="handleBack"
      >
        ← 返回 Agent 列表
      </a-button>
      <span class="tpl-title">表模板库（跨 Agent 共享）</span>
      <span class="tpl-tip">各 Agent 认证的实体配置沉淀于此，其他 Agent 选到同表时骨架自动套用；此处手工编辑直接影响后续套用</span>
      <a-button
        size="small"
        :loading="treeLoading"
        @click="loadTree"
      >
        刷新
      </a-button>
    </div>
    <div class="tpl-body">
      <!-- 左：数据源/数据库/表 三级树（模板总览构建，表节点可点选） -->
      <div class="tpl-tree">
        <a-input-search
          v-model:value="keyword"
          size="small"
          allow-clear
          placeholder="搜索表名"
          class="tpl-search"
        />
        <a-spin :spinning="treeLoading">
          <a-tree
            v-if="treeData.length"
            v-model:expanded-keys="expandedKeys"
            :tree-data="treeData"
            :selected-keys="selectedKeys"
            block-node
            @select="onTreeSelect"
          >
            <template #title="{ title, isLeaf, fieldCount }">
              <span
                :title="title"
                class="tpl-tree-name"
              >{{ title }}</span>
              <span
                v-if="isLeaf && fieldCount != null"
                class="tpl-tree-count"
              >{{ fieldCount }} 列</span>
            </template>
          </a-tree>
          <a-empty
            v-else
            :image="simpleImage"
            description="模板库为空：在 Agent 实体确认页「认证本表」或「保存到模板」后沉淀于此"
          />
        </a-spin>
      </div>
      <!-- 右：选中表的沉淀列配置（复用实体确认页同款列配置编辑） -->
      <div class="tpl-detail">
        <template v-if="entity">
          <div class="tpl-detail-head">
            <div class="tpl-detail-meta">
              <span class="tpl-detail-table">{{ entity.table }}</span>
              <a-tag v-if="entity.certified" color="green">已认证</a-tag>
              <a-tag v-else-if="entity.confirmed" color="blue">已确认</a-tag>
              <span class="tpl-detail-src">来源 Agent：{{ sourceAgent || '-' }} · 更新于 {{ updateTime }}</span>
            </div>
            <div class="tpl-detail-btns">
              <a-popconfirm
                title="删除该表模板？不影响已套用模板的 Agent 草稿"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete"
              >
                <a-button
                  size="small"
                  danger
                >
                  删除模板
                </a-button>
              </a-popconfirm>
              <a-button
                size="small"
                type="primary"
                :disabled="!dirty"
                :loading="saving"
                @click="handleSave"
              >
                保存修改
              </a-button>
            </div>
          </div>
          <!-- 表级结论：与实体确认页同款行（键/分区/列表约束/时间窗/缺省输出列） -->
          <div class="ent-keyrow">
            <span class="ent-keylabel">业务键：</span>
            <a-select
              v-model:value="entity.primary_key"
              mode="multiple"
              size="small"
              class="ent-keyselect"
              :options="fieldOptions"
              placeholder="选择业务键列（复合键可多选）"
              @change="dirty = true"
            />
          </div>
          <div class="ent-keyrow">
            <span class="ent-keylabel">分区列：</span>
            <a-select
              v-model:value="entity.partition_column"
              size="small"
              allow-clear
              class="ent-partselect"
              :options="fieldOptions"
              placeholder="无"
              @change="dirty = true"
            />
          </div>
          <div class="ent-keyrow">
            <span class="ent-keylabel">列表约束：</span>
            <a-switch
              v-model:checked="entity.listable"
              size="small"
              checked-children="可列表"
              un-checked-children="禁列表"
              @change="dirty = true"
            />
            <span class="ent-basis">禁列表后问数拒绝该表明细查询（超大日志/敏感主数据表用，缺省可列表）</span>
          </div>
          <div
            v-if="entity.listable !== false"
            class="ent-keyrow"
          >
            <span class="ent-keylabel">时间窗字段：</span>
            <a-select
              v-model:value="entity.time_field"
              size="small"
              allow-clear
              class="ent-partselect"
              :options="fieldOptions"
              placeholder="无"
              @change="dirty = true"
            />
            <span class="ent-basis">配了后 list 查询必须携带该字段时间窗（防超大表全量扫）</span>
          </div>
          <div
            v-if="entity.listable !== false"
            class="ent-keyrow"
          >
            <span class="ent-keylabel">缺省输出列：</span>
            <a-select
              v-model:value="entity.display_fields"
              mode="multiple"
              size="small"
              class="ent-keyselect"
              :options="fieldOptions"
              placeholder="不指定则明细查询需显式报列名"
              @change="dirty = true"
            />
            <span class="ent-basis">list 查询未指定输出列时的缺省 SELECT 列</span>
          </div>
          <!-- 字段级结论：列名/显示名/角色/单位/粒度/归类/禁用，与实体确认页同口径 -->
          <a-table
            :columns="entFieldColumns"
            :data-source="entity.fields || []"
            row-key="name"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ y: 420 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === '__col'">
                <span class="ent-colname">{{ record.name }}</span>
                <span class="ent-coltype">{{ record.type }}</span>
              </template>
              <template v-else-if="column.key === '__disp'">
                <a-input
                  v-model:value="record.display_name"
                  size="small"
                  placeholder="（沿用列备注）"
                  @change="markDirty(record)"
                />
              </template>
              <template v-else-if="column.key === '__role'">
                <a-select
                  :value="record.role === 'dimension' && record.multi_value ? 'multi_dimension' : record.role"
                  size="small"
                  class="ent-role"
                  :options="ROLE_OPTIONS"
                  @change="(v: any) => onRoleChange(record, v)"
                />
              </template>
              <template v-else-if="column.key === '__unit'">
                <a-input
                  v-model:value="record.unit"
                  size="small"
                  :disabled="record.role !== 'metric'"
                  placeholder="元/万元/%/个…"
                  @change="markDirty(record)"
                />
              </template>
              <template v-else-if="column.key === '__gran'">
                <a-select
                  v-model:value="record.granularity"
                  size="small"
                  allow-clear
                  class="ent-gran"
                  :disabled="!isTimeCol(record)"
                  :options="GRAN_OPTIONS"
                  placeholder="—"
                  @change="markDirty(record)"
                />
              </template>
              <template v-else-if="column.key === '__group'">
                <a-select
                  v-model:value="record.dim_group"
                  size="small"
                  allow-clear
                  class="ent-dimgroup"
                  :disabled="record.role !== 'dimension'"
                  :options="groupOptions"
                  placeholder="选分组"
                  @change="markDirty(record)"
                />
              </template>
              <template v-else-if="column.key === '__disabled'">
                <a-checkbox
                  v-model:checked="record.disabled"
                  title="禁用列：不参与 AI 生成/评审输入，也不派生维度（问数不可见）"
                  @change="markDirty(record)"
                />
              </template>
            </template>
          </a-table>
          <div class="ent-foot">
            <span class="ent-tip">改动保存后对「后续」选表套用生效；已套用模板的 Agent 草稿不受影响</span>
          </div>
        </template>
        <a-empty
          v-else-if="!detailLoading"
          class="tpl-empty"
          description="选择左侧树中的表，查看并编辑沉淀的列配置"
        />
        <a-spin
          v-else
          class="tpl-spin"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Empty, message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import {
  deleteTemplate,
  getTemplateDetail,
  listAllTemplates,
  updateTemplate
} from '@/framework/apis/smartAgent'
import { dictStore } from '@/framework/store/common'

const emit = defineEmits(['back'])

const { currentRoute } = useRouter()
const baseDomain = currentRoute.value.query?.domain ? '/' + currentRoute.value.query.domain : undefined

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

// ---------------- 左树：总览行 → 数据源/数据库/表 三级树 ----------------
// 行契约：{ ds_name, table_name(db.tbl), source_agent, update_at, field_count }；
// 节点 key：数据源 `ds:{ds}`、库 `db:{ds}/{db}`、表 `tpl:{ds}::{table}`（仅表节点可点选）
const treeLoading = ref(false)
const keyword = ref('')
const treeData = ref<Array<any>>([])
const expandedKeys = ref<Array<string>>([])
const selectedKeys = ref<Array<string>>([])
// key → { dsName, tableName }（表节点）；选中态与详情加载解耦
const templateRows = ref<Array<any>>([])

const loadTree = (keepSelection = true) => {
  treeLoading.value = true
  listAllTemplates(baseDomain).then((res: any) => {
    templateRows.value = Array.isArray(res.payload) ? res.payload : []
    buildTree()
    if (keepSelection && selectedKeys.value.length) {
      const node = templateRows.value.find((r: any) => nodeKeyOf(r) === selectedKeys.value[0])
      if (!node) selectedKeys.value = []
    }
  }).finally(() => { treeLoading.value = false })
}

const nodeKeyOf = (row: any) => `tpl:${row.ds_name}::${row.table_name}`

// 按 数据源 → 库（表全名 db 段，无库段挂数据源下）→ 表 组装；关键字过滤只留命中表
const buildTree = () => {
  const kw = keyword.value.trim().toLowerCase()
  const rows = kw
    ? templateRows.value.filter((r: any) => String(r.table_name).toLowerCase().includes(kw))
    : templateRows.value
  const dsMap = new Map<string, Map<string, Array<any>>>()
  for (const r of rows) {
    const dot = String(r.table_name).indexOf('.')
    const db = dot > 0 ? r.table_name.slice(0, dot) : ''
    if (!dsMap.has(r.ds_name)) dsMap.set(r.ds_name, new Map())
    const dbMap = dsMap.get(r.ds_name)!
    if (!dbMap.has(db)) dbMap.set(db, [])
    dbMap.get(db)!.push(r)
  }
  const tree: Array<any> = []
  const expanded: Array<string> = []
  dsMap.forEach((dbMap, ds) => {
    const dsNode: any = { key: `ds:${ds}`, title: ds, selectable: false, children: [] }
    expanded.push(dsNode.key)
    dbMap.forEach((tables, db) => {
      if (db) {
        const dbNode: any = { key: `db:${ds}/${db}`, title: db, selectable: false, children: [] }
        expanded.push(dbNode.key)
        dsNode.children.push(dbNode)
        tables.forEach((r: any) => dbNode.children.push(leafOf(r)))
      } else {
        tables.forEach((r: any) => dsNode.children.push(leafOf(r)))
      }
    })
    tree.push(dsNode)
  })
  treeData.value = tree
  // 全量加载默认展开；过滤时保持既有展开键
  if (!kw) expandedKeys.value = expanded
}

const leafOf = (r: any) => {
  const full = String(r.table_name)
  const dot = full.indexOf('.')
  return {
    key: nodeKeyOf(r),
    title: dot > 0 ? full.slice(dot + 1) : full,
    isLeaf: true,
    fieldCount: r.field_count,
    dsName: r.ds_name,
    tableName: r.table_name
  }
}

watch(keyword, buildTree)

// ---------------- 右详情：实体定义编辑（列配置与实体确认页同款） ----------------
const detailLoading = ref(false)
const saving = ref(false)
const dirty = ref(false)
const entity = ref<any>(null)
const sourceAgent = ref('')
const updateTime = ref('')
// 当前加载中的模板身份（保存/删除用）
const currentDs = ref('')
const currentTable = ref('')

const onTreeSelect = (keys: Array<string>, info: any) => {
  const node = info.node
  if (!node?.isLeaf) return
  if (!keys.length) return
  const doLoad = () => loadDetail(node.dsName, node.tableName, keys[0])
  if (dirty.value) {
    Modal.confirm({
      title: '当前表有未保存的修改',
      content: '切换到其他表将丢失修改，是否继续？',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: doLoad
    })
    return
  }
  doLoad()
}

const loadDetail = (dsName: string, tableName: string, key: string) => {
  detailLoading.value = true
  entity.value = null
  currentDs.value = dsName
  currentTable.value = tableName
  selectedKeys.value = [key]
  getTemplateDetail({ dsName, tableName }, baseDomain).then((res: any) => {
    entity.value = res.payload?.entity || null
    sourceAgent.value = res.payload?.source_agent || ''
    updateTime.value = formatTime(res.payload?.update_at)
    dirty.value = false
  }).finally(() => { detailLoading.value = false })
}

const formatTime = (v: any) => {
  if (!v) return '-'
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v))
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

// 字段级编辑（与实体确认页同口径）：角色下拉含「多值维度」复合展示选项，落库仍拆为
// dimension + multi_value；离开维度类角色清多值标记防残留；模板无草稿重建链路，无需 edited 标记
const ROLE_OPTIONS = [
  { label: '忽略', value: 'ignore' },
  { label: '维度', value: 'dimension' },
  { label: '多值维度', value: 'multi_dimension' },
  { label: '度量', value: 'metric' },
  { label: '名称', value: 'name' }
]
const GRAN_OPTIONS = [
  { label: '年', value: 'year' },
  { label: '季', value: 'quarter' },
  { label: '月', value: 'month' },
  { label: '日', value: 'day' }
]

// 字段级编辑统一入口：标脏 + 撤销该列单位裁决经验（unit_verified，与实体确认页同口径：
// 旧经验不得盖住新结论，后续套用模板的 Agent 自查会重新复核单位）
const markDirty = (record: any) => {
  dirty.value = true
  if (record?.unit_verified) record.unit_verified = null
}

const onRoleChange = (record: any, v: any) => {
  if (v === 'multi_dimension') {
    record.role = 'dimension'
    record.multi_value = true
  } else {
    record.role = v
    if (v !== 'dimension') record.multi_value = null
  }
  markDirty(record)
}

// 时间列判定：Date 类型 或数仓时间分区命名（dy=年/dm=月/dd=日）——解锁粒度选择
const isTimeCol = (record: any) => record?.type === 'Date'
  || /(^|_)(dy|dm|dd)$/i.test(record?.name || '')

const fieldOptions = computed(() =>
  ((entity.value?.fields || []) as Array<any>).map((f: any) => ({ label: f.name, value: f.name })))

// 归类候选：字典 DIMENSION_GROUP_DICT 为主，并入模板存量 dim_group 值（防存量组名不在字典时下拉显裸值）
const dictGroups = ref<Array<string>>([])
const groupOptions = computed(() => {
  const existing = ((entity.value?.fields || []) as Array<any>)
    .map((f: any) => f.dim_group).filter(Boolean)
  return Array.from(new Set([...dictGroups.value, ...existing])).map(n => ({ label: n, value: n }))
})

const entFieldColumns = [
  { title: '列名 / 类型', key: '__col', dataIndex: 'name', width: 200 },
  { title: '显示名', key: '__disp', dataIndex: 'display_name', width: 180 },
  { title: '角色', key: '__role', dataIndex: 'role', width: 110 },
  { title: '单位（度量）', key: '__unit', dataIndex: 'unit', width: 130 },
  { title: '时间粒度', key: '__gran', dataIndex: 'granularity', width: 110 },
  { title: '归类（维度）', key: '__group', dataIndex: 'dim_group', width: 140 },
  { title: '禁用', key: '__disabled', width: 70 }
]

// ---------------- 保存 / 删除 / 返回 ----------------
const handleSave = () => {
  if (!entity.value) return
  saving.value = true
  updateTemplate({ dsName: currentDs.value, tableName: currentTable.value, entity: entity.value }, baseDomain)
    .then(() => {
      dirty.value = false
      message.success('模板已保存，后续选表套用时生效')
      loadTree()
    }).finally(() => { saving.value = false })
}

const handleDelete = () => {
  deleteTemplate({ dsName: currentDs.value, tableName: currentTable.value }, baseDomain).then(() => {
    message.success('模板已删除')
    entity.value = null
    selectedKeys.value = []
    dirty.value = false
    loadTree(false)
  })
}

// 返回列表：未保存修改先确认
const handleBack = () => {
  if (dirty.value) {
    Modal.confirm({
      title: '当前表有未保存的修改',
      content: '返回将丢失修改，是否继续？',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: () => emit('back')
    })
    return
  }
  emit('back')
}

onMounted(() => {
  loadTree(false)
  // 归类字典（与实体确认页同源：DimensionGroupDict 枚举 @MetaDict 自动注册）
  dictStore().getDict('DIMENSION_GROUP_DICT', baseDomain)
    .then((items: any) => {
      dictGroups.value = (items || []).map((d: any) => String(d?.value)).filter(Boolean)
    }).catch(() => {})
})
</script>

<style scoped>
.tpl-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
}
.tpl-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.tpl-title {
  font-weight: 600;
  font-size: 15px;
}
.tpl-tip {
  color: #999;
  font-size: 12px;
  flex: 1;
}
.tpl-body {
  flex: 1;
  min-height: 0;
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.tpl-tree {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  padding: 10px;
  overflow-y: auto;
}
.tpl-search {
  margin-bottom: 8px;
}
.tpl-tree-count {
  color: #999;
  font-size: 11px;
  margin-left: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}
/* 节点单行省略：长表名不折行（避免「N 列」孤行/选中高亮劈裂），悬停看全名 */
.tpl-tree :deep(.ant-tree-node-content-wrapper) {
  overflow: hidden;
}
.tpl-tree :deep(.ant-tree-title) {
  display: flex;
  align-items: center;
  overflow: hidden;
}
.tpl-tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tpl-detail {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  overflow-y: auto;
}
.tpl-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.tpl-detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tpl-detail-table {
  font-weight: 600;
  font-size: 14px;
}
.tpl-detail-src {
  color: #999;
  font-size: 12px;
}
.tpl-detail-btns {
  display: flex;
  gap: 8px;
}
.tpl-empty,
.tpl-spin {
  margin-top: 120px;
}
/* 以下与实体确认页同款（行/键编辑行/列配置单元格） */
.ent-keyrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ent-keylabel {
  width: 72px;
  color: #666;
  flex-shrink: 0;
}
.ent-keyselect {
  min-width: 260px;
}
.ent-partselect {
  width: 160px;
}
.ent-basis {
  color: #999;
  font-size: 12px;
}
.ent-colname {
  font-weight: 600;
}
.ent-coltype {
  color: #999;
  font-size: 11px;
  margin-left: 6px;
}
.ent-role,
.ent-gran,
.ent-dimgroup {
  min-width: 90px;
}
.ent-foot {
  margin-top: 8px;
}
.ent-tip {
  color: #999;
  font-size: 12px;
}
</style>
