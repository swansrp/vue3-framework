<template>
  <div class="filter-panel-config">
    <div class="fpc-head">
      <div class="fpc-title">
        {{ mode === 'local' ? '我的筛选项' : '筛选面板' }}
        <span class="fpc-sub">{{ mode === 'local' ? '保存后作为本机默认（按项目+账号+报表隔离），仅自己可见' : '报表顶部/左侧的条件面板，默认不启用' }}</span>
      </div>
      <a-button
        type="primary"
        size="small"
        :loading="saving"
        @click="save"
      >
        {{ mode === 'local' ? '保存我的筛选项' : '保存筛选面板' }}
      </a-button>
    </div>

    <!-- 开关组仅配置端模式：运行态的启用/位置/展开走工具栏开关与右键菜单 -->
    <div
      v-if="mode === 'config'"
      class="fpc-switches"
    >
      <a-form layout="inline">
        <a-form-item label="启用">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>
        <a-form-item label="位置">
          <a-radio-group
            v-model:value="form.position"
            :disabled="!form.enabled"
          >
            <a-radio value="top">表格上方</a-radio>
            <a-radio value="left">左侧</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="默认展开">
          <a-switch
            v-model:checked="form.expanded"
            :disabled="!form.enabled"
          />
        </a-form-item>
        <a-form-item label="字段间">
          <a-radio-group
            v-model:value="form.andOr"
            :disabled="!form.enabled"
          >
            <a-radio value="0">且</a-radio>
            <a-radio value="1">或</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </div>

    <div
      v-if="mode === 'config' ? form.enabled : true"
      class="fpc-fields"
    >
      <div class="fpc-fields-head">
        <span>字段（{{ form.fields.length }}）</span>
        <a-button
          size="small"
          @click="addField"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          添加字段
        </a-button>
      </div>
      <div
        v-if="form.fields.length === 0"
        class="fpc-empty"
      >
        还没有字段，点「添加字段」从下方可用字段里挑。
      </div>
      <div
        v-for="(f, i) in form.fields"
        :key="i"
        class="fpc-row"
      >
        <a-select
          v-model:value="f.column"
          :options="fieldOptions"
          :filter-option="true"
          placeholder="选择字段"
          show-search
          style="width: 180px"
          @change="(v) => onColumnChange(f, v)"
        />
        <a-select
          v-model:value="f.relation"
          :options="relationsFor(f)"
          style="width: 120px"
        />
        <div class="fpc-val">
          <template v-if="isRangeRelation(f)">
            <div class="fpc-range">
              <condition-variable-input
                :value="getSlot(f, 0)"
                placeholder="起"
                @update:value="(v) => setSlot(f, 0, v)"
              />
              <span class="fpc-sep">~</span>
              <condition-variable-input
                :value="getSlot(f, 1)"
                placeholder="止"
                @update:value="(v) => setSlot(f, 1, v)"
              />
            </div>
          </template>
          <a-select
            v-else-if="valueKind(f) === 'dict'"
            v-model:value="f.defaultValueText"
            :options="optionsFor(f)"
            :filter-option="true"
            placeholder="请选择默认值"
            show-search
            allow-clear
            style="width: 100%"
          />
          <a-tree-select
            v-else-if="valueKind(f) === 'tree'"
            v-model:value="f.defaultValueText"
            :tree-data="treeDataFor(f)"
            placeholder="请选择默认值"
            show-search
            allow-clear
            tree-default-expand-all
            style="width: 100%"
          />
          <condition-variable-input
            v-else
            v-model:value="f.defaultValueText"
            placeholder="默认值（可插变量，多值逗号隔）"
          />
        </div>
        <a-button
          type="text"
          danger
          size="small"
          @click="removeField(i)"
        >
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </div>
    <div
      v-else
      class="fpc-disabled-tip"
    >
      未启用：报表上不会出现筛选面板。打开上方「启用」再配置字段。
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import ConditionVariableInput from '@/framework/components/common/ConditionVariableInput.vue'
import { FILTER_TYPE, FIELD_TYPE, FILTER_RELATION_LABELS } from '@/framework/components/common/Portal/type'
import { getRelation } from '@/framework/components/common/AdvancedSearch/funs'
import { updatePortalConfig } from '@/framework/apis/portal/config'
import { dictStore } from '@/framework/store/common'

// 关系枚举 → 中文走共享单源（type.ts FILTER_RELATION_LABELS，全集防裸数字）
const RELATION_LABELS = FILTER_RELATION_LABELS

interface PanelField {
  column: string
  label: string
  relation: number
  /** UI 编辑用单串（逗号分隔多值 / 单个 ${} 变量），落库转数组 */
  defaultValueText: string
}

const props = withDefaults(defineProps<{
  /** config=配置端编辑 sys_portal.filterPanel；local=运行态编辑本机「我的筛选项」 */
  mode?: 'config' | 'local'
  /** config 模式：portal 表格配置对象(sys_portal + columns), 即 PortalConfig 页的 tableConfig */
  table?: any
  /** local 模式：打开时预载的字段清单（配置端字段 + 用户已加的），{column,label,relation,defaultValue[]} */
  initialFields?: Array<{ column: string, label?: string, relation?: number, defaultValue?: any[] }>
  /**
   * 可选字段元数据。config 模式：{ property,title?,displayName?,reference?(字典名),fieldType? }；
   * local 模式：{ property,title?,fieldType?,referenceOptions?(字典/树选项数组,列上已带无需再拉) }
   */
  availableFields: Array<any>
}>(), {
  mode: 'config',
  table: undefined,
  initialFields: () => []
})
interface PanelFieldPayload { column: string, label: string, relation: number, defaultValue: string[] }
const emit = defineEmits<{ 'saved': [], 'save-local': [fields: PanelFieldPayload[]] }>()

const saving = ref(false)

const fieldOptions = computed(() => (props.availableFields || []).map(f => ({
  value: f.property,
  label: f.title || f.displayName || f.property
})))

// 字段类型 → 可选关系（复用高级搜索 getRelation，单一实现）
const relationsFor = (f: PanelField) => {
  const meta = (props.availableFields || []).find(x => x.property === f.column)
  const allowed: number[] = getRelation(meta?.fieldType ?? '')
  return allowed.map(v => ({ value: v, label: RELATION_LABELS[v] || String(v) }))
}
const firstRelationFor = (column: string): number => {
  const meta = (props.availableFields || []).find(x => x.property === column)
  const allowed: number[] = getRelation(meta?.fieldType ?? '')
  // 优先「等于」——大多数筛选场景的默认；不在该类型允许清单里则取第一个
  return allowed.includes(FILTER_TYPE.EQUAL) ? FILTER_TYPE.EQUAL : (allowed[0] ?? FILTER_TYPE.EQUAL)
}

// ==================== 值控件形态判断（对齐 AdvancedSearch：字典→下拉、树形→树选择） ====================
const fieldMeta = (column: string) => (props.availableFields || []).find(x => x.property === column)
const valueKind = (f: PanelField): 'dict' | 'tree' | 'var' => {
  const meta = fieldMeta(f.column)
  const ft = String(meta?.fieldType ?? '')
  // config 模式看字典名 reference；local 模式列上已带选项数组 referenceOptions
  const hasRef = props.mode === 'local' ? (Array.isArray(meta?.referenceOptions) && meta.referenceOptions.length > 0) : !!meta?.reference
  if ((ft === String(FIELD_TYPE.SELECT) || ft === String(FIELD_TYPE.SELECT_MULTI_IN_ONE)) && hasRef) return 'dict'
  if ((ft === String(FIELD_TYPE.TREE) || ft === String(FIELD_TYPE.TREE_MULTI_IN_ONE)) && hasRef) return 'tree'
  return 'var'
}
const dictRef = (f: PanelField) => fieldMeta(f.column)?.reference || ''
const dictOpts = (ref: string) => dictOptsMap[ref] || []
const treeOpts = (ref: string) => treeOptsMap[ref] || []
const loadFieldOptions = async (f: PanelField) => {
  // local 模式选项随列下发（referenceOptions），无需异步拉字典
  if (props.mode === 'local') return
  try {
    const kind = valueKind(f)
    const ref = dictRef(f)
    if (!ref) return
    if (kind === 'dict' && !dictOptsMap[ref]) dictOptsMap[ref] = (await dict.getDict(ref)) || []
    if (kind === 'tree' && !treeOptsMap[ref]) treeOptsMap[ref] = (await dict.getTree(ref)) || []
  } catch (e) {
    console.warn('[筛选面板] 字典加载失败', dictRef(f), e)
  }
}
// local 模式直接取列上下发的选项数组
const inlineOpts = (f: PanelField) => fieldMeta(f.column)?.referenceOptions || []

// 字典/树形下拉的选项缓存（key=字典编码，仅 config 模式用）
const dictOptsMap = reactive<Record<string, any[]>>({})
const treeOptsMap = reactive<Record<string, any[]>>({})
// dictStore 是 defineStore 返回的工厂，必须调用取实例
const dict = dictStore()

// 模板取选项：local 走列上下发，config 走字典缓存
const optionsFor = (f: PanelField) => props.mode === 'local' ? inlineOpts(f) : dictOpts(dictRef(f))
const treeDataFor = (f: PanelField) => props.mode === 'local' ? inlineOpts(f) : treeOpts(dictRef(f))

const form = reactive({
  enabled: false,
  position: 'top' as 'top' | 'left',
  expanded: false,
  andOr: '0',
  fields: [] as PanelField[]
})

const isVar = (v: string) => typeof v === 'string' && /^\$\{[^}]*\}$/.test(v.trim())

const load = () => {
  if (props.mode === 'local') {
    form.fields = (props.initialFields || []).map(f => ({
      column: f.column,
      label: f.label || '',
      relation: typeof f.relation === 'number' ? f.relation : firstRelationFor(f.column),
      defaultValueText: Array.isArray(f.defaultValue) ? f.defaultValue.join(',') : (f.defaultValue || '')
    }))
    return
  }
  const raw = props.table?.filterPanel
  let cfg: any = {}
  if (raw) {
    try { cfg = JSON.parse(raw) } catch { cfg = {} }
  }
  form.enabled = !!cfg.enabled
  form.position = cfg.position === 'left' ? 'left' : 'top'
  form.expanded = !!cfg.expanded
  form.andOr = cfg.andOr === '1' ? '1' : '0'
  form.fields = Array.isArray(cfg.fields)
    ? cfg.fields.map((f: any) => ({
      column: f.column,
      label: f.label || '',
      relation: typeof f.relation === 'number' ? f.relation : firstRelationFor(f.column),
      defaultValueText: Array.isArray(f.defaultValue) ? f.defaultValue.join(',') : (f.defaultValue || '')
    }))
    : []
  // 预载已配置字段的字典/树形选项
  form.fields.forEach(f => loadFieldOptions(f))
}

watch(() => props.table?.id, load, { immediate: true })
watch(() => props.table?.filterPanel, load)

const addField = () => {
  form.fields.push({ column: '', label: '', relation: FILTER_TYPE.EQUAL, defaultValueText: '' })
}
const removeField = (i: number) => form.fields.splice(i, 1)
const onColumnChange = (f: PanelField, col: string) => {
  const opt = (props.availableFields || []).find(x => x.property === col)
  f.label = opt ? (opt.title || opt.displayName || col) : col
  // 换字段后按新类型收敛可选关系，默认取该类型第一个
  const allowed: number[] = getRelation(opt?.fieldType ?? '')
  if (!allowed.includes(f.relation)) f.relation = allowed[0] ?? FILTER_TYPE.EQUAL
  // 换字段后清默认值并预载字典/树形选项
  f.defaultValueText = ''
  loadFieldOptions(f)
}

// 区间类关系：默认值拆「起/止」两槽
const isRangeRelation = (f: PanelField) =>
  f.relation === FILTER_TYPE.BETWEEN || f.relation === FILTER_TYPE.NOT_BETWEEN
const getSlot = (f: PanelField, i: number): string => {
  const parts = (f.defaultValueText || '').split(',')
  return parts[i]?.trim() || ''
}
const setSlot = (f: PanelField, i: number, v: string) => {
  const parts = (f.defaultValueText || '').split(',')
  while (parts.length < 2) parts.push('')
  parts[i] = v
  f.defaultValueText = parts.filter(s => s !== '').join(',')
}

const toDefaultArray = (text: string): string[] => {
  const t = (text || '').trim()
  if (!t) return []
  // 单个 ${} 变量整体保留；否则按逗号拆
  if (isVar(t)) return [t]
  return t.split(',').map(s => s.trim()).filter(Boolean)
}

const save = async () => {
  const payloadFields = form.fields
    .filter(f => !!f.column)
    .map(f => {
      const opt = (props.availableFields || []).find(x => x.property === f.column)
      return {
        column: f.column,
        label: f.label || (opt ? (opt.title || opt.displayName || f.column) : f.column),
        relation: f.relation,
        defaultValue: toDefaultArray(f.defaultValueText)
      }
    })
  if (props.mode === 'local') {
    emit('save-local', payloadFields)
    return
  }
  saving.value = true
  try {
    const payload = {
      enabled: form.enabled,
      position: form.position,
      expanded: form.expanded,
      andOr: form.andOr,
      fields: payloadFields
    }
    // 不改 props.table（避免 vue/no-mutating-props），用拷贝落库后靠 saved 重新拉取
    const entity = { ...props.table, filterPanel: JSON.stringify(payload) }
    await updatePortalConfig(entity, false)
    message.success('筛选面板已保存')
    emit('saved')
  } catch (e) {
    // updatePortalTable 内部已提示错误
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.filter-panel-config {
  padding: 4px 2px;
}

.fpc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .fpc-title {
    font-weight: 600;
    font-size: 14px;

    .fpc-sub {
      margin-left: 8px;
      font-weight: 400;
      font-size: 12px;
      color: var(--text-tertiary, #999);
    }
  }
}

.fpc-switches {
  padding: 8px 0 12px;
  border-bottom: 1px solid var(--border-subtle, #f0f0f0);
}

.fpc-fields {
  margin-top: 12px;
}

.fpc-fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}

.fpc-empty,
.fpc-disabled-tip {
  padding: 16px;
  color: var(--text-tertiary, #999);
  font-size: 13px;
  text-align: center;
  background: var(--bg-hover, #fafafa);
  border-radius: 6px;
}

.fpc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .fpc-val {
    flex: 1;
    min-width: 0;
  }

  .fpc-range {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;

    > * {
      flex: 1;
      min-width: 0;
    }

    .fpc-sep {
      flex: 0 0 auto;
      color: var(--text-tertiary, #999);
    }
  }
}
</style>
