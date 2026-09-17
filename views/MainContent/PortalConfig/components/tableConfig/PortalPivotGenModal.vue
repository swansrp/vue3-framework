<template>
  <a-modal
    v-model:open="openState"
    title="按字典批量生成透视列"
    width="960px"
    :mask-closable="false"
    class="gen-pivot-modal"
    @ok="handleConfirmGenPivot"
  >
    <a-form
      layout="vertical"
      :colon="false"
    >
      <a-form-item label="生成来源">
        <a-radio-group
          v-model:value="genSource"
          button-style="solid"
          @change="handleGenSourceChange"
        >
          <a-radio-button value="indicator">
            复用图表指标
          </a-radio-button>
          <a-radio-button value="dict">
            按字典生成
          </a-radio-button>
          <a-radio-button value="cross">
            两字典组合
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <template v-if="genSource === 'indicator'">
        <a-form-item label="指标组（组内每个指标生成一个透视列，条件直接复用指标条件）">
          <a-select
            v-model:value="genIndicatorGroup"
            show-search
            :loading="genLoading"
            :filter-option="filterOption"
            placeholder="选择指标组"
            :options="genIndicatorGroups.map((g) => ({ label: `${g.groupName}（${g.items.length}个指标）`, value: g.groupId }))"
            @change="(val: any) => handleGenGroupChange(val)"
          />
        </a-form-item>
      </template>
      <template v-else-if="genSource === 'cross'">
        <div class="gen-cross-wrap">
          <div class="gen-cross-dim">
            <div class="gen-cross-dim-title">
              组合维度 A
            </div>
            <a-form-item label="条件字段">
              <a-select
                :value="genFieldA"
                show-search
                :filter-option="filterOption"
                placeholder="选择字段"
                :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                @change="(val: any) => { genFieldA = val; handleGenCrossFieldChange('A', val) }"
              />
            </a-form-item>
            <a-form-item label="字典编码">
              <a-input
                v-model:value="genDictCodeA"
                placeholder="字典编码"
              />
            </a-form-item>
            <a-form-item label="字典层级">
              <a-radio-group
                v-model:value="genDictModeA"
                button-style="solid"
                size="small"
              >
                <a-radio-button value="flat">
                  平铺
                </a-radio-button>
                <a-radio-button value="treeParent">
                  树-父层
                </a-radio-button>
                <a-radio-button value="treeLeaf">
                  树-叶子
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
          </div>
          <div class="gen-cross-dim">
            <div class="gen-cross-dim-title">
              组合维度 B
            </div>
            <a-form-item label="条件字段">
              <a-select
                :value="genFieldB"
                show-search
                :filter-option="filterOption"
                placeholder="选择字段"
                :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                @change="(val: any) => { genFieldB = val; handleGenCrossFieldChange('B', val) }"
              />
            </a-form-item>
            <a-form-item label="字典编码">
              <a-input
                v-model:value="genDictCodeB"
                placeholder="字典编码"
              />
            </a-form-item>
            <a-form-item label="字典层级">
              <a-radio-group
                v-model:value="genDictModeB"
                button-style="solid"
                size="small"
              >
                <a-radio-button value="flat">
                  平铺
                </a-radio-button>
                <a-radio-button value="treeParent">
                  树-父层
                </a-radio-button>
                <a-radio-button value="treeLeaf">
                  树-叶子
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
          </div>
        </div>
        <a-form-item label=" ">
          <a-button
            type="primary"
            :loading="genLoading"
            @click="loadCrossItems"
          >
            加载组合预览
          </a-button>
          <span class="gen-cross-tip">每个 A×B 组合生成一列，条件为两个等于条件 AND</span>
        </a-form-item>
      </template>
      <template v-else>
        <a-form-item label="条件字段（统计列按该字段的取值分列）">
          <a-select
            :value="genPivotField"
            show-search
            :filter-option="filterOption"
            placeholder="选择字段"
            :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
            @change="(val: any) => { genPivotField = val; handleGenFieldChange(val) }"
          />
        </a-form-item>
        <a-form-item label="字典编码（默认取自字段的字典引用，可手工修改）">
          <a-input
            v-model:value="genDictCode"
            placeholder="字典编码"
            @press-enter="loadGenItems"
          />
        </a-form-item>
        <a-form-item label="字典层级">
          <a-radio-group
            v-model:value="genDictMode"
            button-style="solid"
          >
            <a-radio-button value="flat">
              平铺字典
            </a-radio-button>
            <a-radio-button value="treeParent">
              树形-父层
            </a-radio-button>
            <a-radio-button value="treeLeaf">
              树形-叶子层
            </a-radio-button>
            <a-radio-button value="treeMulti">
              树形-多层
            </a-radio-button>
          </a-radio-group>
          <a-button
            type="primary"
            size="small"
            :loading="genLoading"
            style="margin-left: 12px"
            @click="loadGenItems"
          >
            加载预览
          </a-button>
        </a-form-item>
      </template>
    </a-form>
    <div
      v-if="genItems.length > 0"
      class="gen-pivot-preview"
    >
      <div class="gen-pivot-preview-header">
        <span>将生成 {{ genItems.filter((i) => i.checked).length }} / {{ genItems.length }} 个透视列</span>
        <a-checkbox
          :checked="genItems.length > 0 && genItems.every((i) => i.checked)"
          :indeterminate="genItems.some((i) => i.checked) && !genItems.every((i) => i.checked)"
          @change="(e: any) => toggleGenAll(e.target.checked)"
        >
          全选
        </a-checkbox>
      </div>
      <div class="gen-pivot-preview-list">
        <div
          v-for="(item, index) in genItems"
          :key="item.value"
          :class="['gen-pivot-preview-item', { 'gen-drag-over': genDragOverIndex === index }]"
          draggable="true"
          @dragstart="handleGenDragStart($event, index)"
          @dragover.prevent="genDragOverIndex = index"
          @dragleave="genDragOverIndex = -1"
          @drop="handleGenDrop($event, index)"
          @dragend="handleGenDragEnd"
        >
          <a-checkbox v-model:checked="item.checked">
            <span
              v-if="item.groupPath && item.groupPath.length"
              class="gen-path-prefix"
            >{{ item.groupPath.join(' / ') }} / </span>{{ item.label }}（{{ item.value }}）
          </a-checkbox>
          <span class="gen-pivot-preview-actions">
            <a-button
              type="text"
              size="small"
              :disabled="index === 0"
              title="置顶"
              @click="moveGenItemToEdge(index, 'top')"
            >
              <template #icon>
                <VerticalAlignTopOutlined />
              </template>
            </a-button>
            <a-button
              type="text"
              size="small"
              :disabled="index === genItems.length - 1"
              title="置底"
              @click="moveGenItemToEdge(index, 'bottom')"
            >
              <template #icon>
                <VerticalAlignBottomOutlined />
              </template>
            </a-button>
          </span>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button @click="openState = false">
        取消
      </a-button>
      <a-button
        type="primary"
        :loading="genSaving"
        :disabled="genItems.filter((i) => i.checked).length === 0"
        @click="handleConfirmGenPivot"
      >
        确认生成
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import { getIndicatorConfig } from '@/framework/apis/portal'
import { addPortalPivotColumnList } from '@/framework/apis/portal/table'
import { collectLeafPathGroups, fetchTreeDict, flattenTreeToParentGroups } from '@/framework/components/common/chart/utils/treeStacked'
import { PIVOT_SUBTOTAL_PREFIX } from '@/framework/components/common/Portal/constant'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { dictStore } from '@/framework/store/common'

const props = defineProps<{
  open: boolean;
  tableId?: number;
  portalName?: string;
  availableFields: Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>;
  // 已有透视列标识(查重跳过)
  existingPivotValues?: string[];
}>()

const emit = defineEmits<{
  'update:open': [value: boolean];
  'generated': [];
}>()

const dict = dictStore()

const openState = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const genLoading = ref(false)
const genSaving = ref(false)

// 打开生成弹窗：重置上次残留状态(默认指标模式，预加载指标组)
watch(openState, (open) => {
  if (open) {
    genPivotFieldReset()
    loadIndicatorGroups()
  }
})

// 生成来源: indicator=复用图表指标, dict=按字典生成, cross=两字典笛卡尔组合
const genSource = ref<'indicator' | 'dict' | 'cross'>('indicator')
// 指标组树(拉平为 分组名 -> 指标项 列表)
interface GenIndicatorGroup {
  groupId: string
  groupName: string
  items: Array<{ key: string; title: string; condition: string | null }>
}
const genIndicatorGroups = ref<GenIndicatorGroup[]>([])
const genIndicatorGroup = ref<string | undefined>(undefined)

const genPivotFieldReset = () => {
  genItems.value = []
  genSource.value = 'indicator'
  genIndicatorGroups.value = []
  genIndicatorGroup.value = undefined
  genPivotField.value = undefined
  genDictCode.value = undefined
  genDictMode.value = 'flat'
  genFieldA.value = undefined
  genDictCodeA.value = undefined
  genDictModeA.value = 'flat'
  genFieldB.value = undefined
  genDictCodeB.value = undefined
  genDictModeB.value = 'flat'
}

// 指标树拍平：递归收集所有组及其指标项(兼容嵌套子组)
const flattenIndicatorTree = (nodes: any[], prefix = ''): GenIndicatorGroup[] => {
  const groups: GenIndicatorGroup[] = []
  for (const node of nodes || []) {
    const groupName = prefix ? `${prefix} / ${node.title}` : node.title
    const items = (node.items || []).map((item: any) => ({
      key: String(item.key),
      title: item.title,
      condition: item.condition || null,
    }))
    if (items.length > 0) {
      groups.push({ groupId: String(node.id), groupName, items })
    }
    groups.push(...flattenIndicatorTree(node.children || [], groupName))
  }
  return groups
}

// 加载指标组列表
const loadIndicatorGroups = async () => {
  if (!props.portalName) {
    message.warning('未找到 Portal 名称，无法加载指标')
    return
  }
  genLoading.value = true
  try {
    const res = await getIndicatorConfig(props.portalName)
    genIndicatorGroups.value = flattenIndicatorTree(res.payload || [])
    if (genIndicatorGroups.value.length === 0) {
      message.warning('当前 Portal 暂无指标配置，可在指标管理中配置，或改用按字典生成')
    }
  } catch (error) {
    console.error('加载指标配置失败:', error)
    genIndicatorGroups.value = []
  } finally {
    genLoading.value = false
  }
}

// 切换来源时自动加载指标组
const handleGenSourceChange = () => {
  genItems.value = []
  if (genSource.value === 'indicator' && genIndicatorGroups.value.length === 0) {
    loadIndicatorGroups()
  }
}

// 切换指标组时生成预览列表
const handleGenGroupChange = (groupId: string) => {
  const group = genIndicatorGroups.value.find((g) => g.groupId === groupId)
  genItems.value = (group?.items || []).map((item) => ({
    value: item.key,
    label: item.title,
    condition: item.condition || undefined,
    checked: true,
  }))
  if (genItems.value.length === 0) {
    message.warning('该指标组下暂无指标项')
  }
}

// 条件字段(提供列条件的字段)
const genPivotField = ref<string | undefined>(undefined)
// 字典编码(默认取自字段的 reference)
const genDictCode = ref<string | undefined>(undefined)
// 字典模式: flat=平铺字典, treeParent=树父层, treeLeaf=树叶子层
const genDictMode = ref<'flat' | 'treeParent' | 'treeLeaf' | 'treeMulti'>('flat')
// 生成预览项
interface GenPivotItem {
  value: string
  label: string
  checked: boolean
  // 指标模式下自带的条件 JSON(透视列直接复用)
  condition?: string
  // 树形-多层: 叶子之上的父链 label 数组(自外向内), 落库到透视列 groupPath
  groupPath?: string[]
}
const genItems = ref<GenPivotItem[]>([])

// 切换条件字段时自动带出字典编码
const handleGenFieldChange = (fieldKey: string) => {
  const field = props.availableFields.find((f) => f.key === fieldKey)
  genDictCode.value = field?.reference || undefined
  genItems.value = []
}

// 按字典模式加载字典项(平铺/树父层/树叶子层)
const loadDictItemsByMode = async (
  dictCode: string,
  mode: 'flat' | 'treeParent' | 'treeLeaf' | 'treeMulti'
): Promise<Array<{ value: string; label: string; groupPath?: string[] }>> => {
  const items: Array<{ value: string; label: string; groupPath?: string[] }> = []
  if (mode === 'flat') {
    // 平铺字典：每个字典项一列(与图表指标逐项生成条件同构)
    const res = await dict.getDict(dictCode)
    ;(res || []).forEach((item: any) => {
      items.push({ value: String(item.value), label: item.label || String(item.value) })
    })
  } else if (mode === 'treeMulti') {
    // 树形-多层：每个叶子一列, 携带其祖先 label 链(自外向内)作为多层父表头
    const tree = await fetchTreeDict(dictCode)
    collectLeafPathGroups(tree).forEach((l) => {
      items.push({ value: l.value, label: l.label, groupPath: l.parentPath })
    })
  } else {
    // 树形字典：复用树形堆叠图的拍平逻辑，按父层/叶子层生成
    const tree = await fetchTreeDict(dictCode)
    const parentGroups = flattenTreeToParentGroups(tree)
    if (mode === 'treeParent') {
      parentGroups.forEach((g) => {
        items.push({ value: g.parentValue, label: g.parentLabel })
      })
    } else {
      parentGroups.forEach((g) => {
        g.children.forEach((c) => {
          items.push({ value: c.value, label: c.label })
        })
      })
    }
  }
  return items
}

// 加载字典生成预览列表
const loadGenItems = async () => {
  if (!genPivotField.value || !genDictCode.value) {
    message.warning('请先选择条件字段与字典编码')
    return
  }
  genLoading.value = true
  try {
    const items = await loadDictItemsByMode(genDictCode.value, genDictMode.value)
    genItems.value = items.map((i) => ({ ...i, checked: true }))
    if (items.length === 0) {
      message.warning('字典中没有可用项')
    }
  } catch (error) {
    console.error('加载字典失败:', error)
  } finally {
    genLoading.value = false
  }
}

// ==================== 两字典笛卡尔组合生成 ====================
// 组合维度 A / B 的字段、字典编码、字典层级
const genFieldA = ref<string | undefined>(undefined)
const genDictCodeA = ref<string | undefined>(undefined)
const genDictModeA = ref<'flat' | 'treeParent' | 'treeLeaf'>('flat')
const genFieldB = ref<string | undefined>(undefined)
const genDictCodeB = ref<string | undefined>(undefined)
const genDictModeB = ref<'flat' | 'treeParent' | 'treeLeaf'>('flat')

// 切换组合维度字段时自动带出字典编码
const handleGenCrossFieldChange = (side: 'A' | 'B', fieldKey: string) => {
  const field = props.availableFields.find((f) => f.key === fieldKey)
  const dictCode = field?.reference || undefined
  if (side === 'A') {
    genDictCodeA.value = dictCode
  } else {
    genDictCodeB.value = dictCode
  }
  genItems.value = []
}

// 加载笛卡尔组合预览列表
const loadCrossItems = async () => {
  if (!genFieldA.value || !genDictCodeA.value || !genFieldB.value || !genDictCodeB.value) {
    message.warning('请完整选择两个组合维度的字段与字典编码')
    return
  }
  genLoading.value = true
  try {
    const [itemsA, itemsB] = await Promise.all([
      loadDictItemsByMode(genDictCodeA.value, genDictModeA.value),
      loadDictItemsByMode(genDictCodeB.value, genDictModeB.value),
    ])
    // 笛卡尔积：每个组合一列，条件 = 字段A等于值A AND 字段B等于值B
    // 列标识用 && 连接(避免与透视别名分隔符 __ 冲突)
    const items: GenPivotItem[] = []
    for (const a of itemsA) {
      for (const b of itemsB) {
        items.push({
          value: `${a.value}&&${b.value}`,
          label: `${a.label}-${b.label}`,
          condition: JSON.stringify({
            andOr: '0',
            conditionList: [
              { property: genFieldA.value, relation: FILTER_TYPE.EQUAL, value: [a.value] },
              { property: genFieldB.value, relation: FILTER_TYPE.EQUAL, value: [b.value] },
            ],
          }),
          checked: true,
        })
      }
    }
    genItems.value = items
    if (items.length === 0) {
      message.warning('字典中没有可用项')
    } else {
      message.info(`已生成 ${items.length} 个组合预览，可勾选后确认生成`)
    }
  } catch (error) {
    console.error('加载组合字典失败:', error)
  } finally {
    genLoading.value = false
  }
}

// 全选/取消全选
const toggleGenAll = (checked: boolean) => {
  genItems.value.forEach((item) => {
    item.checked = checked
  })
}

// 归一化条件为后端要求的 JSON 对象格式 {andOr, conditionList}
// 指标条件历史数据可能为数组/单条件对象等格式，统一包装避免后端校验失败
const normalizePivotCondition = (raw: any): string | null => {
  let parsed: any = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  if (Array.isArray(parsed)) {
    return JSON.stringify({ andOr: '0', conditionList: parsed })
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.conditionList)) {
      return JSON.stringify({ andOr: parsed.andOr || '0', conditionList: parsed.conditionList })
    }
    if (parsed.property) {
      return JSON.stringify({ andOr: '0', conditionList: [parsed] })
    }
  }
  return null
}

// 兜底校验：必须为 JSON 对象字符串(后端 readJson(Map) 要求)，数组/标量/null 字面量一律拒发
const isJsonObjectString = (s: string): boolean => {
  try {
    const p = JSON.parse(s)
    return p !== null && typeof p === 'object' && !Array.isArray(p)
  } catch (e) {
    return false
  }
}

// 预览项置顶/置底(调整生成顺序, 逐位上移下移由拖拽承担)
const moveGenItemToEdge = (index: number, edge: 'top' | 'bottom') => {
  const arr = genItems.value
  const target = edge === 'top' ? 0 : arr.length - 1
  if (index === target) return
  const [moved] = arr.splice(index, 1)
  arr.splice(target, 0, moved)
}

// 生成预览拖拽调序
const genDraggedIndex = ref(-1)
const genDragOverIndex = ref(-1)
const handleGenDragStart = (e: DragEvent, index: number) => {
  genDraggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}
const handleGenDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  genDragOverIndex.value = -1
  const from = genDraggedIndex.value
  genDraggedIndex.value = -1
  if (from < 0 || from === targetIndex) return
  const arr = genItems.value.slice()
  const [moved] = arr.splice(from, 1)
  arr.splice(targetIndex, 0, moved)
  genItems.value = arr
}
// 拖拽中断/落到无效区域时重置状态, 避免残留脏索引影响下一次 drop
const handleGenDragEnd = () => {
  genDraggedIndex.value = -1
  genDragOverIndex.value = -1
}

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || ''
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
}

// 确认批量生成透视列
const handleConfirmGenPivot = async () => {
  if (!props.tableId) return
  if (genSource.value === 'dict' && !genPivotField.value) return
  // 按预览顺序取勾选项(顺序即生成后的 displayOrder)
  const selected = genItems.value.filter((item) => item.checked)
  if (selected.length === 0) {
    message.warning('请至少勾选一项')
    return
  }
  // 列标识查重：已存在的 itemValue 跳过(树形-多层的小计列另在下方独立补齐)
  const existingValues = new Set(props.existingPivotValues || [])
  const toAdd = selected.filter((item) => !existingValues.has(item.value))
  genSaving.value = true
  try {
    let order = (props.existingPivotValues || []).length
    let skippedNoCondition = 0
    // 先本地组装全部待新增数据，再单次批量请求(后端 /insert/list 事务提交)，避免 for 循环逐条 insert
    const toInsert: Array<{
      tableId: number;
      itemValue: string;
      itemName: string;
      condition: string;
      displayOrder: number;
      status: string;
      groupPath: string;
    }> = []
    for (const item of toAdd) {
      // 指标/组合模式：复用自带条件(归一化为 JSON 对象)；字典模式：字段 等于 字典值
      let conditionStr: string | null = null
      if (genSource.value === 'dict') {
        conditionStr = JSON.stringify({
          andOr: '0',
          conditionList: [
            {
              property: genPivotField.value,
              relation: FILTER_TYPE.EQUAL,
              value: [item.value],
            },
          ],
        })
      } else {
        conditionStr = normalizePivotCondition(item.condition)
        if (!conditionStr) {
          // 指标未配置条件时跳过，避免生成全量聚合的误导列
          skippedNoCondition++
          continue
        }
      }
      // 发送前兜底：非 JSON 对象的条件一律跳过，确保不会触发后端校验报错
      if (!isJsonObjectString(conditionStr)) {
        skippedNoCondition++
        continue
      }
      toInsert.push({
        tableId: props.tableId,
        itemValue: item.value,
        itemName: item.label,
        condition: conditionStr,
        displayOrder: ++order,
        status: '1',
        groupPath: JSON.stringify(item.groupPath || []),
      })
    }
    // 树形-多层: 每个首层分组自动补齐小计列(IN 组内勾选叶子值, 含此前已存在的叶子列),
    // 独立于叶子查重 —— 叶子已全部存在时也能幂等补出缺失的小计列
    if (genSource.value === 'dict' && genDictMode.value === 'treeMulti') {
      const groupLeaves = new Map<string, string[]>()
      for (const item of selected) {
        const root = item.groupPath?.[0]
        if (!root) {
          continue
        }
        if (!groupLeaves.has(root)) {
          groupLeaves.set(root, [])
        }
        groupLeaves.get(root)!.push(item.value)
      }
      for (const [rootGroup, leafValues] of groupLeaves) {
        // 标识已存在(重复生成/手工占用)时跳过, 保持幂等
        const subtotalValue = `${PIVOT_SUBTOTAL_PREFIX}${rootGroup}`
        if (existingValues.has(subtotalValue)) {
          continue
        }
        toInsert.push({
          tableId: props.tableId,
          itemValue: subtotalValue,
          itemName: '小计',
          condition: JSON.stringify({
            andOr: '0',
            conditionList: [
              {
                property: genPivotField.value,
                relation: FILTER_TYPE.IN,
                value: leafValues,
              },
            ],
          }),
          displayOrder: ++order,
          status: '1',
          groupPath: JSON.stringify([rootGroup]),
        })
      }
    }
    if (toInsert.length > 0) {
      await addPortalPivotColumnList(toInsert, false, false, false)
      message.success(
        skippedNoCondition > 0
          ? `已生成 ${toInsert.length} 个透视列，跳过 ${skippedNoCondition} 个未配置条件的指标`
          : `已生成 ${toInsert.length} 个透视列`
      )
      openState.value = false
      emit('generated')
    } else if (toAdd.length === 0) {
      message.warning('勾选项均已存在对应透视列，且小计列无缺失')
    } else {
      message.warning(`未能生成：${skippedNoCondition} 个指标均未配置条件`)
    }
  } catch (error) {
    console.error('批量生成透视列失败:', error)
  } finally {
    genSaving.value = false
  }
}
</script>

<style scoped lang="less">
// 按字典批量生成透视列弹窗
.gen-cross-wrap {
  display: flex;
  gap: 12px;

  .gen-cross-dim {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 6px;
    padding: 8px 12px 0;

    .gen-cross-dim-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    :deep(.ant-form-item) {
      margin-bottom: 12px;
    }
  }
}

.gen-cross-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.gen-pivot-preview {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;

  .gen-pivot-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-hover, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .gen-pivot-preview-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;

    .gen-pivot-preview-item {
      width: 50%;
      padding-right: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      cursor: grab;
      border-radius: 4px;
      // 文本可选会劫持拖拽手势(从勾选区起拖变成选中文字而非拖动元素)
      user-select: none;

      &.gen-drag-over {
        outline: 1px dashed var(--accent, #1677ff);
        background: var(--accent-soft, #e6f4ff);
      }

      .gen-pivot-preview-actions {
        flex-shrink: 0;
        display: inline-flex;

        .ant-btn {
          padding: 0 2px;
          height: 20px;
        }
      }
    }
  }
}
</style>
