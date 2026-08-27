<template>
  <div
    v-if="dense"
    class="rows-dense"
  >
    <a-table
      :columns="denseColumns"
      :data-source="rows"
      :row-key="rowKey"
      :pagination="{ pageSize: densePageSize, size: 'small', showSizeChanger: false }"
      :scroll="{ y: 560 }"
      size="small"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <a-input
          v-if="colEditor(column) === 'input'"
          size="small"
          :value="getVal(record, colKey(column))"
          @change="(e: any) => setVal(record, colKey(column), e.target.value)"
        />
        <a-select
          v-else-if="colEditor(column) === 'select'"
          size="small"
          :value="getVal(record, colKey(column))"
          :options="colOptions(column)"
          style="width: 100%"
          allow-clear
          @change="(v: any) => setVal(record, colKey(column), v ?? undefined)"
        />
        <!-- tags：自由追加（如码值的口语别名），输入后回车/逗号成项 -->
        <a-select
          v-else-if="colEditor(column) === 'tags'"
          size="small"
          :value="getVal(record, colKey(column)) || []"
          mode="tags"
          style="width: 100%"
          :open="false"
          placeholder="输入后回车追加"
          @change="(v: any) => setVal(record, colKey(column), v)"
        />
        <a-switch
          v-else-if="colEditor(column) === 'switch'"
          size="small"
          :checked="!!getVal(record, colKey(column))"
          @change="(v: any) => setVal(record, colKey(column), !!v)"
        />
        <a-button
          v-else-if="column.key === '__op'"
          danger
          type="link"
          size="small"
          @click="removeRow(record)"
        >
          删除
        </a-button>
        <span v-else>{{ getVal(record, colKey(column)) }}</span>
      </template>
    </a-table>
    <a-button
      type="dashed"
      style="width: 100%; margin-top: 6px;"
      @click="addRow"
    >
      + 新增一行
    </a-button>
  </div>
  <div
    v-else
    class="rows-table"
  >
    <!-- 概览表格：只展示简单字段（长文本 full 列不在表中出现），行尾编辑/删除，10 条/页 -->
    <a-table
      :columns="tableColumns"
      :data-source="rows"
      :row-key="rowKey"
      :pagination="{ pageSize: 10, size: 'small', showSizeChanger: false }"
      :scroll="{ x: 'max-content' }"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === '__op'">
          <!-- 逐条认证：人工填的不默认算认证，一条一条点认证，点完即落盘（外层收 certify 事件即存） -->
          <a-button
            v-if="certifiable && !record.certified"
            type="link"
            size="small"
            @click="certifyRow(record, true)"
          >
            认证
          </a-button>
          <a-button
            v-if="certifiable && record.certified"
            danger
            type="link"
            size="small"
            @click="certifyRow(record, false)"
          >
            撤销认证
          </a-button>
          <a-button
            type="link"
            size="small"
            @click="openEdit(record)"
          >
            编辑
          </a-button>
          <a-button
            danger
            type="link"
            size="small"
            @click="removeRow(record)"
          >
            删除
          </a-button>
        </template>
        <span
          v-else
          class="cell-text"
        >
          <!-- 认证类资产（指标/关系/概念）：首列前挂行级认证标记（绿√已认证 / 红×未认证） -->
          <span
            v-if="certMarkCol && colKey(column) === firstColKey"
            class="cert-mark"
            :class="record.certified ? 'cert-ok' : 'cert-no'"
            :title="record.certified ? '已认证（LLM 重生不覆盖）' : '未认证（LLM 重生会覆盖）'"
          >
            <CheckOutlined v-if="record.certified" />
            <CloseOutlined v-else />
          </span>
          {{ displayVal(record, column) }}
        </span>
      </template>
    </a-table>
    <a-button
      type="dashed"
      style="width: 100%; margin-top: 6px;"
      @click="addRow"
    >
      + 新增一行
    </a-button>
    <!-- 详情编辑弹窗：单条记录全字段（两列网格，长文本独占整行），表格只读概览、细节全在这里改 -->
    <a-modal
      v-model:open="editVisible"
      :title="editTitle"
      :width="820"
      :footer="null"
    >
      <!-- AI 补全工具条：外层注入 aiComplete（仅指标/关系/概念提供）才显示；
           已填项后端强制保留，补全结果填回表单由用户检查确认，保存草稿才落盘盖章 -->
      <div
        v-if="props.aiComplete"
        class="ai-bar"
      >
        <a-input
          v-model:value="aiGuidance"
          allow-clear
          placeholder="补全侧重（可选），如：description 侧重业务口径"
        />
        <a-button
          type="primary"
          ghost
          :loading="aiBusy"
          @click="runAiComplete"
        >
          AI 补全
        </a-button>
      </div>
      <!-- 流式活性区：tick 心跳（已耗时）+ delta 尾窗实时滚动，转圈可分辨“死了还是想着”；
           SSE 被中间层缓冲时收不到事件，本区不显示（等同旧静默等待，不误报） -->
      <div
        v-if="aiBusy && (aiElapsed > 0 || aiLiveText)"
        class="ai-progress"
      >
        <span class="ai-progress-meta">生成中 · 已耗时 {{ aiElapsed }}s<template v-if="aiLiveText"> · 已生成 {{ aiLiveText.length }} 字</template></span>
        <pre
          v-if="aiLiveText"
          class="ai-progress-tail"
        >{{ aiTail }}</pre>
      </div>
      <div class="row-card-body">
        <template
          v-for="record in editRows"
          :key="rowKey(record)"
        >
          <div
            v-for="col in columns"
            :key="col.key"
            class="field-item"
            :class="{ 'field-full': col.full }"
          >
            <div class="field-label">
              {{ col.title }}
            </div>
            <div class="field-control">
              <a-textarea
                v-if="col.editor === 'input' && col.full"
                :value="getVal(record, col.key)"
                :auto-size="{ minRows: 1, maxRows: 4 }"
                @change="(e: any) => setVal(record, col.key, e.target.value)"
              />
              <a-input
                v-else-if="col.editor === 'input'"
                :value="getVal(record, col.key)"
                @change="(e: any) => setVal(record, col.key, e.target.value)"
              />
              <a-select
                v-else-if="col.editor === 'select'"
                :value="getVal(record, col.key)"
                :options="col.options"
                style="width: 100%"
                allow-clear
                @change="(v: any) => setVal(record, col.key, v ?? undefined)"
              />
              <a-select
                v-else-if="col.editor === 'tags'"
                :value="getVal(record, col.key) || []"
                mode="tags"
                style="width: 100%"
                :open="false"
                placeholder="输入后回车追加"
                @change="(v: any) => setVal(record, col.key, v)"
              />
              <!-- 字段下拉：选项来自同行 fields 清单（字段名+显示名），可输入筛选；
                   主键多选、时间窗字段单选，限定只能选真实存在的列 -->
              <a-select
                v-else-if="col.editor === 'fieldSelect'"
                :value="col.multiple ? (getVal(record, col.key) || []) : getVal(record, col.key)"
                :mode="col.multiple ? 'multiple' : undefined"
                :options="fieldOptions(record)"
                style="width: 100%"
                allow-clear
                show-search
                :filter-option="filterFieldOption"
                :placeholder="fieldOptions(record).length ? '可输入筛选' : '请先在「字段」中添加字段'"
                @change="(v: any) => setVal(record, col.key, col.multiple ? (v || []) : (v ?? undefined))"
              />
              <!-- 兄弟资产下拉：选项由外部按 col.source 注入（如支持维度取 dimensions 草稿），可筛选 -->
              <a-select
                v-else-if="col.editor === 'assetSelect'"
                :value="col.multiple ? (getVal(record, col.key) || []) : getVal(record, col.key)"
                :mode="col.multiple ? 'multiple' : undefined"
                :options="(assetOptions && assetOptions[col.source]) || []"
                style="width: 100%"
                allow-clear
                show-search
                :filter-option="filterFieldOption"
                :placeholder="((assetOptions && assetOptions[col.source]) || []).length ? '可输入筛选' : '暂无可选项（请先维护来源资产）'"
                @change="(v: any) => setVal(record, col.key, col.multiple ? (v || []) : (v ?? undefined))"
              />
              <a-switch
                v-else-if="col.editor === 'switch'"
                :checked="!!getVal(record, col.key)"
                @change="(v: any) => setVal(record, col.key, !!v)"
              />
              <a-button
                v-else-if="col.editor === 'modal'"
                @click="emit('open-modal', col, record)"
              >
                {{ (getVal(record, col.key) || []).length }} 项…
              </a-button>
            </div>
          </div>
        </template>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

// 资产草稿通用行编辑：概览表格（简单字段只读展示 + 行尾编辑/删除，10 条/页）+ 详情编辑弹窗（全字段）；
// columns 由 assetConfig 驱动（input/select/tags/switch/modal/fieldSelect/assetSelect 编辑器；full 长文本只在弹窗出现）；
// dense 模式：紧凑表格布局（子弹表弹窗用，如实体字段清单动辄 70+ 行）
const props = defineProps<{
  columns: Array<any>,
  rows: Array<any>,
  defaultRow: Record<string, any>,
  dense?: boolean,
  // 可认证资产（骨架三类+语义三类）：行尾出认证/撤销认证按钮，首列前挂认证标记；
  // 骨架三类认证后进模板，语义三类认证后 LLM 重生不覆盖（未注入则无任何认证交互）
  certifiable?: boolean,
  // assetSelect 编辑器的选项源：source 资产类型 → 选项列表（由外层预载兄弟资产草稿）
  assetOptions?: Record<string, Array<{ label: string; value: string }>>,
  // AI 补全能力注入（可空）：传入才在详情弹窗显示「AI 补全」按钮；外层封装 API 调用，
  // 本通用组件不耦网络层（机制通用、能力注入）；onEvent 收流式事件（tick=已耗时秒，delta=token 增量）
  aiComplete?: (form: any, guidance: string, onEvent?: (event: string, text: string) => void) => Promise<any>
}>()

const emit = defineEmits(['open-modal', 'update:rows', 'certify'])

// 稳定唯一行键：WeakMap 懒分配，不侵入行数据（避免序列化时污染资产 JSON）
const rkMap = new WeakMap<object, string>()
let rkSeed = 0
const rowKey = (record: any): string => {
  if (!rkMap.has(record)) rkMap.set(record, 'rk_' + ++rkSeed)
  return rkMap.get(record)!
}

// 概览表格列：只列简单字段（full 长文本不进表），单元格只读展示，编辑走弹窗
const tableColumns = computed<any[]>(() => [
  ...props.columns.filter(col => !col.full).map(col => ({
    title: col.title,
    key: col.key,
    dataIndex: col.key,
    width: col.width || 140,
    editor: col.editor,
    options: col.options
  })),
  { title: '操作', key: '__op', dataIndex: '__op', width: 110, fixed: 'right' }
])

// 单元格只读展示值：select 回显 label、switch 是/否、modal 子表「N 项」、数组/其余转文本
const displayVal = (record: any, column: any) => {
  const v = getVal(record, colKey(column))
  const editor = colEditor(column)
  if (editor === 'switch') return v ? '是' : '否'
  if (editor === 'modal') return Array.isArray(v) ? `${v.length} 项` : '0 项'
  if (editor === 'select') {
    const opt = colOptions(column).find((o: any) => o.value === v)
    return opt ? opt.label : fmt(v)
  }
  return fmt(v)
}

// 详情编辑弹窗：当前编辑行（弹窗内编辑器直接改原行对象，保存草稿时统一序列化）
const editVisible = ref(false)
const editRecord = ref<any>(null)
const editRows = computed(() => editRecord.value ? [editRecord.value] : [])
const editTitle = computed(() => editRecord.value ? '编辑：' + headText(editRecord.value) : '')
const openEdit = (record: any) => {
  editRecord.value = record
  editVisible.value = true
}

// AI 补全：当前表单深拷贝交外层调后端（已填项后端强制保留），返回对象顶层合并回编辑行；
// 用户检查字段后关闭弹窗，行数据已在，保存草稿（盖章）才真正落盘；
// onEvent 收流式事件做活性展示：tick 更新已耗时，delta 累积生成文本取尾窗滚动
const aiGuidance = ref('')
const aiBusy = ref(false)
const aiElapsed = ref(0)
const aiLiveText = ref('')
// 尾窗：只留最近 400 字（活性可视化，避免长输出撑爆弹窗）
const aiTail = computed(() => aiLiveText.value.slice(-400))
const runAiComplete = async () => {
  if (!props.aiComplete || !editRecord.value || aiBusy.value) return
  aiBusy.value = true
  aiElapsed.value = 0
  aiLiveText.value = ''
  try {
    const form = JSON.parse(JSON.stringify(editRecord.value))
    delete form._key
    const res = await props.aiComplete(form, aiGuidance.value, (event: string, text: string) => {
      if (event === 'tick') {
        const secs = Number(text)
        if (Number.isFinite(secs)) aiElapsed.value = secs
      } else if (event === 'delta') {
        aiLiveText.value += text
        if (aiLiveText.value.length > 4000) aiLiveText.value = aiLiveText.value.slice(-2000)
      }
    })
    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.assign(editRecord.value, res)
      message.success('AI 补全完成，请检查各字段后关闭弹窗并保存草稿')
    } else {
      message.error('AI 补全返回内容为空，请重试')
    }
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || 'AI 补全失败')
  } finally {
    aiBusy.value = false
  }
}

// dense 模式：a-table 列映射（编辑器类型随列透传给 bodyCell 槽）+ 操作列固定右侧；
// data-source 直接用原始行对象（行值多为基本类型，包装浅拷贝会导致编辑丢失）；
// 返回 any[]：自定义 editor/options 字段超出 antd ColumnType 定义，模板侧用 col* 取值器访问
const densePageSize = 20
const denseColumns = computed<any[]>(() => [
  ...props.columns.map(col => ({
    title: col.title,
    key: col.key,
    dataIndex: col.key,
    width: col.width || 140,
    editor: col.editor,
    options: col.options
  })),
  { title: '操作', key: '__op', dataIndex: '__op', width: 64, fixed: 'right' }
])

// bodyCell 槽 column 类型为 antd ColumnType，自定义属性经取值器访问以过类型检查
const colKey = (c: any): string => String(c.key)
const colEditor = (c: any): string => c.editor || ''
const colOptions = (c: any): any[] => c.options || []

// 行级认证标记：可认证资产（外层注入 certifiable）挂在首列前；
// 缺字段视为未认证（与后端 mergeLlmDraftWithCertified 口径一致）
const certMarkCol = computed(() => !!props.certifiable)
const firstColKey = computed(() => String(props.columns[0]?.key || ''))

// 卡片头部摘要：前两个字段值（数组以「/」拼接）
const fmt = (v: any) => Array.isArray(v) ? v.join(' / ') : (v == null ? '' : String(v))
const headText = (record: any) => {
  const first = fmt(getVal(record, props.columns[0].key)) || '（未命名）'
  const second = props.columns[1] ? fmt(getVal(record, props.columns[1].key)) : ''
  return second ? first + ' · ' + second : first
}

// 支持 a.b 嵌套键读写（如 concepts 的 expands_to.dimension）
const getVal = (record: any, key: string) =>
  key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), record)

// fieldSelect 选项：同行 fields 清单映射（字段名为值，显示名拼进 label 供辨识与筛选）
const fieldOptions = (record: any) =>
  (record.fields || []).filter((f: any) => f && f.name).map((f: any) => ({
    label: f.display_name ? `${f.name}（${f.display_name}）` : f.name,
    value: f.name
  }))

// 可搜索下拉筛选：字段名/显示名均参与匹配（antd filter-option 签名：input + option）
const filterFieldOption = (input: string, option: any) =>
  String(option.label || '').toLowerCase().includes(input.toLowerCase())

// 逐条认证：只翻转当前行并上抛（外层立即落盘）；不提供批量/一键认证（认证是逐条语义裁决）
const certifyRow = (record: any, on: boolean) => {
  record.certified = on
  emit('certify', record, on)
}

const setVal = (record: any, key: string, value: any) => {
  const keys = key.split('.')
  let target = record
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {}
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value
  // 编辑内容使本行认证失效（改过的结论不算认证过的；语义三类手动保存会重新盖章）
  if (key !== 'certified' && record.certified) record.certified = false
}

const addRow = () => {
  const row = JSON.parse(JSON.stringify(props.defaultRow))
  emit('update:rows', [...props.rows, row])
  // 新增后直接打开详情弹窗录入
  openEdit(row)
}

// 按行对象引用删除（页内序号在翻页场景会指错行）
const removeRow = (record: any) => {
  if (editRecord.value === record) editVisible.value = false
  emit('update:rows', props.rows.filter(r => r !== record))
}
</script>

<style scoped>
/* AI 补全工具条：指导语输入 + 触发按钮（能力由外层注入才显示） */
.ai-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
/* AI 补全流式活性区：心跳耗时 + 生成文本尾窗（等宽小字，上限高度内滚动） */
.ai-progress {
  margin: -4px 0 12px;
}
.ai-progress-meta {
  color: #888;
  font-size: 12px;
}
.ai-progress-tail {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
  font-size: 12px;
  margin: 4px 0 0;
  max-height: 84px;
  overflow: auto;
  padding: 6px 8px;
  white-space: pre-wrap;
  word-break: break-all;
}
.row-card-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}
.field-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.field-full {
  grid-column: 1 / -1;
}
.field-label {
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
}
/* 概览单元格：超长省略，详情去编辑弹窗看 */
.cell-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 行级认证标记：绿√已认证 / 红×未认证（缺字段视同未认证） */
.cert-mark {
  margin-right: 5px;
  font-size: 12px;
}
.cert-ok {
  color: #52c41a;
}
.cert-no {
  color: #ff4d4f;
}
</style>
