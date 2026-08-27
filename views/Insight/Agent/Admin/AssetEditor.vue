<template>
  <div>
    <div class="asset-toolbar">
      <a-radio-group
        v-model:value="mode"
        button-style="solid"
        @change="onModeChange"
      >
        <a-radio-button value="form">
          表单编辑
        </a-radio-button>
        <a-radio-button value="json">
          JSON 编辑
        </a-radio-button>
      </a-radio-group>
      <span class="asset-toolbar-right">
        <a-button
          @click="copyJson"
        >
          复制 JSON
        </a-button>
        <a-button
          type="primary"
          @click="save"
        >
          保存草稿
        </a-button>
      </span>
    </div>
    <div
      v-if="shape.hint"
      class="asset-hint"
    >
      {{ shape.hint }}
    </div>
    <!-- 按表主从布局：外层注入分组（实体表目录）+行归属函数时启用，左侧目录右侧仅展示当前表的行；
         未注入时维持原扁平行表（指标/关系等跨表资产）；
         行表 key 挂资产类型+当前分组：切 tab/切表重建表格，非受控分页复位第一页（避免停在小数据集的高页码看到空白） -->
    <div
      class="asset-body"
      :class="{ 'asset-body-split': grouped }"
    >
      <div
        v-if="grouped"
        class="asset-menu"
      >
        <div
          v-for="g in groupMenu"
          :key="g.key"
          class="asset-menu-item"
          :class="{ 'asset-menu-active': g.key === activeGroup }"
          @click="activeGroup = g.key"
        >
          <div class="asset-menu-line">
            <span class="asset-menu-name">{{ g.label }}</span>
            <span class="asset-menu-count">{{ g.count }}</span>
          </div>
          <div
            v-if="g.sub"
            class="asset-menu-sub"
          >
            {{ g.sub }}
          </div>
        </div>
      </div>
      <div class="asset-content">
        <asset-rows-table
          v-if="mode === 'form'"
          :key="props.assetType + '|' + activeGroup"
          :columns="shape.columns"
          :rows="visibleRows"
          :default-row="visibleDefaultRow"
          :asset-options="mergedAssetOptions"
          :ai-complete="props.aiComplete"
          :certifiable="certifiable"
          @open-modal="openModal"
          @update:rows="setRows"
          @certify="onCertify"
        />
        <a-textarea
          v-else
          v-model:value="jsonText"
          :rows="16"
          class="asset-json-editor"
          placeholder="（暂无草稿，可先执行“生成资产草稿”）"
        />
      </div>
    </div>
    <a-modal
      v-if="modal.column"
      v-model:open="modal.visible"
      :title="modalTitle"
      :width="1200"
      :footer="null"
    >
      <asset-rows-table
        :columns="modal.column.modalColumns"
        :rows="modalRows"
        :default-row="modal.column.modalDefault"
        dense
        @update:rows="setModalRows"
      />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { message } from 'ant-design-vue'

import { ASSET_SHAPES } from './assetConfig'
import AssetRowsTable from './AssetRowsTable.vue'

// 单类资产编辑器：表单模式（结构化行表）与 JSON 模式（看/改/复制）双轨，保存统一 emit 草稿内容
const props = defineProps<{
  assetType: string,
  content: string,
  // assetSelect 编辑器的选项源（由外层预载兄弟资产草稿，如指标的「支持维度」取 dimensions）
  assetOptions?: Record<string, Array<{ label: string; value: string }>>,
  // AI 补全能力注入（可空）：透传给行表详情弹窗；外层仅对有专属提示词的资产类型（指标/关系/概念）提供；
  // onEvent 收流式事件（tick=已耗时秒，delta=token 增量）供弹窗做活性展示
  aiComplete?: (form: any, guidance: string, onEvent?: (event: string, text: string) => void) => Promise<any>,
  // 按表主从布局（可空）：分组目录（实体表清单，key 为归属键）+行归属函数；
  // 两者齐备时左侧出目录，右侧仅编辑当前组行，保存时与其他组行合并不丢数据（维度/码值域用）
  groups?: Array<{ key: string; label: string; sub?: string }>,
  rowGroup?: (row: any) => string,
  // 分组模式新增行预填：返回需并入 defaultRow 的归属字段补丁（如维度补 expression=当前表.），
  // 保证新行留在当前组视图内不跳「其他」
  groupDefault?: (groupKey: string) => Record<string, any>
}>()

const emit = defineEmits(['save'])

const shape = computed(() => ASSET_SHAPES[props.assetType])

// 可认证资产：骨架三类（认证才进模板）+ 语义三类（认证后 LLM 重生不覆盖）；
// 敏感字段/行权限纯人工声明无认证语义，不出认证交互
const certifiable = computed(() =>
  ['entities', 'dimensions', 'value-domains', 'metrics', 'relations', 'concepts'].includes(props.assetType))

// 逐条认证即落盘：点一条存一条（认证不攒批，沉淀才有意义）
const onCertify = () => {
  emit('save', currentContent())
}

const mode = ref<'form' | 'json'>('form')
const jsonText = ref('')
const parsed = ref<any>(null)
// 码值域（map 形态）的行化副本：[{_key, ...def}]，序列化时重建 domains 映射
const mapRows = ref<Array<any>>([])
const modal: any = reactive({ visible: false, column: null as any, record: null as any })

const modalTitle = computed(() => modal.column ? modal.column.modalTitle : '')
const modalRows = computed(() =>
  modal.record && modal.column ? modal.record[modal.column.key] : [])

const pretty = (obj: any) => JSON.stringify(obj, null, 2)

const init = () => {
  modal.visible = false
  const tpl = shape.value.emptyTemplate
  const raw = props.content && props.content.trim() ? props.content : pretty(tpl)
  jsonText.value = raw
  try {
    parsed.value = JSON.parse(raw)
  } catch {
    parsed.value = JSON.parse(JSON.stringify(tpl))
  }
  rebuildMapRows()
}

const rebuildMapRows = () => {
  if (shape.value.root !== 'map') return
  const map = (parsed.value && parsed.value[shape.value.listKey!]) || {}
  mapRows.value = Object.keys(map).map(key => ({ _key: key, ...map[key] }))
}

// 表单模式当前行集（array/object 直接引用 parsed 内部数组，map 用行化副本）
const formRows = computed(() => {
  if (shape.value.root === 'array') {
    if (!Array.isArray(parsed.value)) parsed.value = []
    return parsed.value
  }
  if (shape.value.root === 'object') {
    if (!Array.isArray(parsed.value[shape.value.listKey!])) parsed.value[shape.value.listKey!] = []
    return parsed.value[shape.value.listKey!]
  }
  return mapRows.value
})

const serializeForm = () => {
  if (shape.value.root === 'map') {
    const domains: Record<string, any> = {}
    mapRows.value.forEach(row => {
      const { _key, ...rest } = row
      if (_key) domains[_key] = rest
    })
    const root = parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value)
      ? parsed.value
      : JSON.parse(JSON.stringify(shape.value.emptyTemplate))
    root[shape.value.listKey!] = domains
    parsed.value = root
  }
  return pretty(parsed.value)
}

// 行集整体替换（子组件不可变更新回传）
const setFormRows = (rows: Array<any>) => {
  if (shape.value.root === 'array') {
    parsed.value = rows
  } else if (shape.value.root === 'object') {
    parsed.value[shape.value.listKey!] = rows
  } else {
    mapRows.value = rows
  }
}

// ---------------- 按表主从布局（外层注入 groups/rowGroup 时启用） ----------------
const grouped = computed(() => !!(props.groups && props.groups.length && props.rowGroup))
const activeGroup = ref('')

// 归属键不在目录内（实体草稿缺失/孤儿行）落「其他」，避免行凭空消失不可编辑
const OTHER_GROUP = '__other'
const groupOf = (row: any) => {
  const k = props.rowGroup ? props.rowGroup(row) : ''
  return props.groups!.some(g => g.key === k) ? k : OTHER_GROUP
}

const groupMenu = computed(() => {
  if (!grouped.value) return []
  const items = props.groups!.map(g => ({
    key: g.key,
    label: g.label,
    sub: g.sub,
    count: formRows.value.filter((r: any) => groupOf(r) === g.key).length
  }))
  const otherCount = formRows.value.filter((r: any) => groupOf(r) === OTHER_GROUP).length
  if (otherCount > 0) items.push({ key: OTHER_GROUP, label: '其他（未匹配到表）', sub: '', count: otherCount })
  return items
})

const visibleRows = computed(() =>
  grouped.value ? formRows.value.filter((r: any) => groupOf(r) === activeGroup.value) : formRows.value)

// 分组模式回传的是当前组新行集：其他组行原位保留 + 当前组整段替换，合并后落回全量行集
const setRows = (rows: Array<any>) => {
  if (!grouped.value) {
    setFormRows(rows)
    return
  }
  const others = formRows.value.filter((r: any) => groupOf(r) !== activeGroup.value)
  setFormRows([...others, ...rows])
}

// 分组模式新增行预填当前表归属字段，避免新行落「其他」组后从当前视图消失
const visibleDefaultRow = computed(() => {
  if (!grouped.value || activeGroup.value === OTHER_GROUP || !props.groupDefault) {
    return shape.value.defaultRow
  }
  return { ...shape.value.defaultRow, ...props.groupDefault(activeGroup.value) }
})

// 切换资产/分组目录变化时选中态复位：落首个有行的组（无行落首组），避免选中组被移除后右侧空白

const setModalRows = (rows: Array<any>) => {
  if (modal.record && modal.column) {
    modal.record[modal.column.key] = rows
    // 子表（码值/连接条件等）改动同样使本行认证失效
    if (modal.record.certified) modal.record.certified = false
  }
}

const currentContent = () => mode.value === 'json' ? jsonText.value : serializeForm()

// assetSelect 选项源合并：兄弟资产预载值 + 自引用选项（source=当前资产类型时取正在编辑的行集，
// 如指标的依赖指标从当前指标草稿取项，编辑中新增/改名实时可见）
const mergedAssetOptions = computed(() => {
  const self = formRows.value
    .map((r: any) => {
      const name = shape.value.root === 'map' ? r._key : r.name
      if (!name) return null
      return {
        label: r.display_name ? `${name}（${r.display_name}）` : String(name),
        value: String(name)
      }
    })
    .filter(Boolean) as Array<{ label: string; value: string }>
  return { ...(props.assetOptions || {}), [props.assetType]: self }
})

const onModeChange = () => {
  if (mode.value === 'json') {
    jsonText.value = serializeForm()
  } else {
    try {
      parsed.value = JSON.parse(jsonText.value)
      rebuildMapRows()
    } catch {
      message.error('JSON 不合法，无法切换到表单模式')
      mode.value = 'json'
    }
  }
}

const save = () => {
  if (mode.value === 'json') {
    try {
      parsed.value = JSON.parse(jsonText.value)
    } catch {
      message.error('JSON 不合法，请先修正再保存')
      return
    }
  }
  emit('save', currentContent())
}

const copyJson = () => {
  const text = currentContent()
  const done = () => message.success('已复制 JSON 到剪贴板')
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
  } else {
    fallbackCopy(text, done)
  }
}

const fallbackCopy = (text: string, done: () => void) => {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  done()
}

const openModal = (column: any, record: any) => {
  if (!Array.isArray(record[column.key])) record[column.key] = []
  modal.column = column
  modal.record = record
  modal.visible = true
}

const resetActiveGroup = () => {
  if (!grouped.value) {
    activeGroup.value = ''
    return
  }
  if (groupMenu.value.some(g => g.key === activeGroup.value)) return
  const firstNonEmpty = groupMenu.value.find(g => g.count > 0) || groupMenu.value[0]
  activeGroup.value = firstNonEmpty ? firstNonEmpty.key : ''
}

watch(() => [props.assetType, props.content], init, { immediate: true })
watch(groupMenu, resetActiveGroup, { immediate: true })
</script>

<style scoped>
.asset-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.asset-hint {
  color: #999;
  font-size: 12px;
  margin-bottom: 6px;
}
/* 按表主从布局：与实体确认页同风格（左目录右详情） */
.asset-body-split {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.asset-menu {
  width: 230px;
  flex-shrink: 0;
  max-height: 560px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  background: #fafafa;
}
.asset-menu-item {
  padding: 7px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.asset-menu-item:hover {
  background: #f0f5ff;
}
.asset-menu-active {
  background: #e6f4ff;
  border-left: 3px solid #1890ff;
  padding-left: 9px;
}
.asset-menu-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.asset-menu-name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-menu-count {
  color: #888;
  font-size: 12px;
  flex-shrink: 0;
}
.asset-menu-sub {
  color: #999;
  font-size: 11px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-content {
  flex: 1;
  min-width: 0;
  padding: 0;
}
.asset-body-split .asset-content {
  padding: 8px;
}
.asset-json-editor {
  font-family: Consolas, Menlo, monospace;
  font-size: 12px;
}
</style>
