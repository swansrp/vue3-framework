<template>
  <a-modal
    v-model:open="visible"
    :footer="null"
    title="一键初始化字典指标"
    width="1000px"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <div class="dict-batch-init">
        <a-alert
          :message="alertMessage"
          show-icon
          type="info"
          style="margin-bottom: 16px"
        />

        <!-- 字段列表 -->
        <div class="section-block">
          <div class="section-header">
            <h4 class="section-title">
              <DatabaseOutlined />
              扫描到的字典字段
              <a-tag
                color="blue"
                style="margin-left: 8px"
              >
                共 {{ fieldRows.length }} 个
              </a-tag>
              <a-tag
                color="green"
                style="margin-left: 8px"
              >
                已选 {{ selectedKeys.length }} 个
              </a-tag>
            </h4>
            <a-space>
              <a-button
                size="small"
                @click="handleSelectAll"
              >
                全选
              </a-button>
              <a-button
                size="small"
                @click="handleDeselectAll"
              >
                清空
              </a-button>
            </a-space>
          </div>

          <a-empty
            v-if="!loading && fieldRows.length === 0"
            description="当前 Portal 没有可用的字典类字段（需开启筛选并显示）"
          />
          <a-table
            v-else
            :columns="fieldColumns"
            :data-source="fieldRows"
            :pagination="false"
            :row-selection="rowSelection"
            :scroll="{ y: 300 }"
            bordered
            row-key="key"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="fieldTypeTagColor(record.fieldType)">
                  {{ fieldTypeLabel(record.fieldType) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'groupStatus'">
                <a-tag
                  v-if="record.existingGroupId"
                  color="green"
                >
                  复用同名组
                </a-tag>
                <a-tag
                  v-else
                  color="orange"
                >
                  将新建
                </a-tag>
              </template>
              <template v-else-if="column.key === 'count'">
                <span v-if="record.errorMsg" class="text-danger">{{ record.errorMsg }}</span>
                <span v-else>{{ record.items.length }}</span>
              </template>
              <template v-else-if="column.key === 'unknown'">
                <a-tooltip title="额外生成该字段的「未知」（NULL 值）指标">
                  <a-checkbox
                    v-model:checked="record.unknownChecked"
                    :disabled="!selectedKeys.includes(record.key)"
                  />
                </a-tooltip>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 生成汇总 -->
        <div class="section-block summary-block">
          <span>
            预计生成
            <strong class="text-primary">{{ toGenerateCount }}</strong>
            个指标
          </span>
          <span
            v-if="skippedCount > 0"
            class="text-gray"
          >
            （已自动跳过组内已存在的 {{ skippedCount }} 个）
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="action-section">
          <a-space size="large">
            <a-button
              :disabled="!canGenerate"
              :loading="generating"
              size="large"
              type="primary"
              @click="handleGenerate"
            >
              <template #icon>
                <ThunderboltOutlined />
              </template>
              {{ generating ? '生成中...' : '一键初始化' }}
            </a-button>
            <a-button
              size="large"
              @click="handleClose"
            >
              <template #icon>
                <CloseOutlined />
              </template>
              取消
            </a-button>
          </a-space>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import { CloseOutlined, DatabaseOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import { getTreeList } from '@/framework/apis/common/common'
import { getDictByDictName } from '@/framework/apis/dict/dict'
import { addEntity, addEntityList, generalSelect } from '@/framework/apis/portal'
import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import type { QueryType } from '@/framework/components/common/Portal/type'
import { buildCondition } from '@/framework/components/common/Portal/utils'
import { getNameHashColor } from '@/framework/utils/colorUtils'
import { isNotEmpty } from '@/framework/utils/common'

// 组件 Props
const props = withDefaults(
  defineProps<{
    show: boolean
    config?: any
    selectedGroupId?: string | number
  }>(),
  {}
)

// 组件 Emits
const emit = defineEmits<{
  (e: 'generated', data: any[], groupId: string | number): void
  (e: 'close'): void
  (e: 'update:show', value: boolean): void
}>()

// 显示状态管理
const visible = ref(false)

watch(() => props.show, (newValue) => {
  visible.value = newValue
  if (newValue) {
    initScan()
  }
})

watch(visible, (newValue) => {
  emit('update:show', newValue)
})

const handleClose = () => {
  visible.value = false
  emit('close')
}

// 字典字段行数据
interface DictFieldRow {
  key: string
  displayName: string
  property: string
  reference: string
  fieldType: string
  items: Array<{ dictValue: string; dictLabel: string; isAutoGenerated?: boolean }>
  // 是否额外生成该字段的「未知」（NULL 值）指标，默认勾选
  unknownChecked: boolean
  // 目标父级下已存在的同名指标组 id（生成时复用）
  existingGroupId?: string | number | null
  // 同名组内已存在的指标值集合（用于查重跳过）
  existingValues: Set<string>
  // 同名组内是否已存在该字段的「未知」（NULL 条件）指标
  unknownExists: boolean
  errorMsg?: string
}

const DICT_FIELD_TYPES = [
  FIELD_TYPE.SELECT,
  FIELD_TYPE.SELECT_MULTI_IN_ONE,
  FIELD_TYPE.TREE,
  FIELD_TYPE.TREE_MULTI_IN_ONE
]

// 状态
const loading = ref(false)
const generating = ref(false)
const fieldRows = ref<DictFieldRow[]>([])
const selectedKeys = ref<string[]>([])

// 表格列定义
const fieldColumns = [
  { title: '字段名称', dataIndex: 'displayName', key: 'displayName' },
  { title: '字段属性', dataIndex: 'property', key: 'property', width: 140 },
  { title: '字典', dataIndex: 'reference', key: 'reference', width: 160 },
  { title: '类型', key: 'type', width: 130, align: 'center' as const },
  { title: '组状态', key: 'groupStatus', width: 110, align: 'center' as const },
  { title: '字典项数', key: 'count', width: 90, align: 'center' as const },
  { title: '未知指标', key: 'unknown', width: 90, align: 'center' as const }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys: Array<string | number>) => {
    selectedKeys.value = keys.map(k => String(k))
  }
}))

// 字段类型展示
const fieldTypeLabel = (fieldType: string) => {
  switch (fieldType) {
    case FIELD_TYPE.SELECT: return '字典'
    case FIELD_TYPE.SELECT_MULTI_IN_ONE: return '逗号分隔字典'
    case FIELD_TYPE.TREE: return '树形字典'
    case FIELD_TYPE.TREE_MULTI_IN_ONE: return '树形字典(多选)'
    default: return fieldType
  }
}

const fieldTypeTagColor = (fieldType: string) => {
  switch (fieldType) {
    case FIELD_TYPE.SELECT: return 'blue'
    case FIELD_TYPE.SELECT_MULTI_IN_ONE: return 'geekblue'
    case FIELD_TYPE.TREE: return 'cyan'
    case FIELD_TYPE.TREE_MULTI_IN_ONE: return 'purple'
    default: return 'default'
  }
}

// groupId 归一化（防御：可能是对象）
const resolveGroupId = () => {
  const raw = props.selectedGroupId as any
  return raw && typeof raw === 'object' ? (raw.id ?? raw.key ?? '') : (raw || '')
}

// pid 归一化：空值统一为 ''，便于比较
const normalizePid = (pid: any) => (isNotEmpty(pid) ? String(pid) : '')

// 顶部提示信息：每个字段生成独立指标组；选中组时作为其子组
const alertMessage = computed(() => {
  const base = '将扫描当前 Portal 中已配置的字典类字段（字典类型、逗号分隔字典、树形字典），每个选中字段生成一个独立的指标组（以字段名称命名），并为各字典项批量生成统计指标。组内已存在的指标会自动跳过。'
  return isNotEmpty(resolveGroupId())
    ? base + '新指标组将作为当前选中指标组的子组。'
    : base + '新指标组将创建为根指标组。'
})

// 判断指标条件 JSON 中是否包含指定字段的 NULL（「未知」）条件
const hasNullCondition = (conditionJson: string, property: string) => {
  try {
    const cond = conditionJson ? JSON.parse(conditionJson) : null
    return (cond?.conditionList || []).some(
      (c: any) => Number(c?.relation) === FILTER_TYPE.NULL && String(c?.property) === property
    )
  } catch {
    return false
  }
}

// 加载平铺字典项
const loadFlatDictItems = async (dictName: string) => {
  const response = await getDictByDictName({ dictName })
  return (response?.payload || []).map((item: any) => ({
    dictValue: String(item.value),
    dictLabel: item.label
  }))
}

// 加载树形字典，仅取叶子节点
const loadTreeDictItems = async (dictName: string) => {
  const response = await getTreeList(dictName)
  const tree = response?.payload || []
  const leaves: Array<{ dictValue: string; dictLabel: string }> = []
  const walk = (nodes: Array<any>) => {
    for (const node of nodes) {
      if (node.isLeaf || !node.children?.length) {
        leaves.push({ dictValue: String(node.value), dictLabel: node.label })
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(tree)
  return leaves
}

// 打开弹窗时扫描全部字典字段并加载字典项
const initScan = async () => {
  loading.value = true
  fieldRows.value = []
  selectedKeys.value = []

  try {
    const portalName = props.config?.name || ''
    // 左侧选中的指标组作为父组，未选则生成根组
    const parentId = resolveGroupId()
    // 与 DictToIndicatorGenerator 保持一致的字段过滤条件
    const columns = (props.config?.columns || []).filter(
      (item: any) => item.filterAble === '1' && item.show === '1'
    )
    const dictColumns = columns.filter(
      (item: any) => DICT_FIELD_TYPES.includes(item.fieldType) && isNotEmpty(item.reference)
    )

    // 拉取当前 Portal 全部指标组，用于查找目标父级下的同名组
    let groupRows: any[] = []
    if (isNotEmpty(portalName)) {
      const gResp = await generalSelect('portal/indicator/group', {
        conditionList: [buildCondition('portalName', FILTER_TYPE.EQUAL, [portalName])]
      } as QueryType, undefined, false, true)
      groupRows = gResp?.payload || []
    }

    // 并行加载各字段字典项，保持字段原顺序
    const rows: DictFieldRow[] = await Promise.all(
      dictColumns.map(async (col: any) => {
        const row: DictFieldRow = {
          key: col.reference + '###' + col.property + '###' + col.fieldType,
          displayName: col.displayName,
          property: col.property,
          reference: col.reference,
          fieldType: col.fieldType,
          items: [],
          unknownChecked: true,
          existingGroupId: null,
          existingValues: new Set<string>(),
          unknownExists: false
        }
        try {
          const isTree = col.fieldType === FIELD_TYPE.TREE || col.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
          row.items = isTree
            ? await loadTreeDictItems(col.reference)
            : await loadFlatDictItems(col.reference)
        } catch (error) {
          console.error(`加载字典 ${col.reference} 失败:`, error)
          row.errorMsg = '加载失败'
        }
        // 查找目标父级下的同名指标组，存在则复用并拉取其已有指标用于查重
        const existingGroup = groupRows.find(
          (g: any) => String(g.name) === col.displayName && normalizePid(g.pid) === normalizePid(parentId)
        )
        if (existingGroup?.id) {
          row.existingGroupId = existingGroup.id
          try {
            const resp = await generalSelect('portal/indicator', {
              conditionList: [buildCondition('groupId', FILTER_TYPE.EQUAL, [existingGroup.id])]
            } as QueryType, undefined, false, true)
            const indicators = resp?.payload || []
            row.existingValues = new Set(indicators.map((item: any) => String(item.itemValue)))
            row.unknownExists = indicators.some((item: any) => hasNullCondition(item.condition, col.property))
          } catch (error) {
            console.error(`加载指标组「${col.displayName}」已有指标失败:`, error)
          }
        }
        return row
      })
    )
    fieldRows.value = rows
    // 默认全选有字典项的字段
    selectedKeys.value = rows.filter(r => r.items.length > 0).map(r => r.key)
  } catch (error) {
    console.error('扫描字典字段失败:', error)
    message.error('扫描字典字段失败')
  } finally {
    loading.value = false
  }
}

const handleSelectAll = () => {
  selectedKeys.value = fieldRows.value.filter(r => r.items.length > 0).map(r => r.key)
}

const handleDeselectAll = () => {
  selectedKeys.value = []
}

// 「未知」自动生成项
const buildUnknownItem = () => ({
  dictValue: 'UNKNOWN',
  dictLabel: '未知',
  isAutoGenerated: true
})

// 展开所有待生成项（字段 × 字典项，含按字段勾选的「未知」项）
const previewList = computed(() => {
  const selectedSet = new Set(selectedKeys.value)
  const list: Array<{ row: DictFieldRow; item: any }> = []
  for (const row of fieldRows.value) {
    if (!selectedSet.has(row.key)) continue
    for (const item of row.items) {
      list.push({ row, item })
    }
    if (row.unknownChecked) {
      list.push({ row, item: buildUnknownItem() })
    }
  }
  return list
})

const skippedCount = computed(() => {
  return previewList.value.filter(p => {
    // 查重均按字段自己的同名组判断：「未知」看 NULL 条件，普通字典项看 itemValue
    if (p.item.isAutoGenerated) return p.row.unknownExists
    return p.row.existingValues.has(p.item.dictValue)
  }).length
})

// 最终待生成项：跳过各自同名组内已存在的指标
// 每个字段独立成组，不同字段间字典值相同也不互相影响
const toGenerateList = computed(() => {
  const list: Array<{ row: DictFieldRow; item: any }> = []
  for (const p of previewList.value) {
    if (p.item.isAutoGenerated) {
      if (p.row.unknownExists) continue
    } else if (p.row.existingValues.has(p.item.dictValue)) {
      continue
    }
    list.push(p)
  }
  return list
})

const toGenerateCount = computed(() => toGenerateList.value.length)

const canGenerate = computed(() => {
  return toGenerateCount.value > 0 && !generating.value
})

// 与 DictToIndicatorGenerator 保持一致的条件生成规则：
// 「未知」项用 NULL；单选类字段用 EQUAL，多选类字段用 CONTAIN
const generateCondition = (row: DictFieldRow, item: any) => {
  if (item.isAutoGenerated && item.dictValue === 'UNKNOWN') {
    return JSON.stringify({
      conditionList: [
        {
          property: row.property,
          relation: FILTER_TYPE.NULL,
          value: []
        }
      ],
      andOr: '0'
    })
  }
  const isSingleSelect = row.fieldType === FIELD_TYPE.SELECT || row.fieldType === FIELD_TYPE.TREE
  return JSON.stringify({
    conditionList: [
      {
        property: row.property,
        relation: isSingleSelect ? FILTER_TYPE.EQUAL : FILTER_TYPE.CONTAIN,
        value: [item.dictValue]
      }
    ],
    andOr: '0'
  })
}

// 每个字段独立成组：优先复用扫描到的同名组，否则在目标父组下新建
const resolveFieldGroup = async (
  row: DictFieldRow,
  parentId: string | number,
  portalName: string,
  groupCache: Map<string, string | number>,
  counters: { created: number; reused: number }
) => {
  if (groupCache.has(row.key)) return groupCache.get(row.key)!
  if (isNotEmpty(row.existingGroupId)) {
    groupCache.set(row.key, row.existingGroupId as string | number)
    counters.reused++
    return row.existingGroupId as string | number
  }
  const res = await addEntity('portal/indicator/group', {
    portalName,
    name: row.displayName,
    pid: isNotEmpty(parentId) ? parentId : null
  }, undefined, false, false)
  const groupId = res.payload?.id ?? res.payload
  groupCache.set(row.key, groupId)
  counters.created++
  return groupId
}

const handleGenerate = async () => {
  if (toGenerateCount.value === 0) {
    message.info('没有需要生成的指标（可能全部已存在）')
    return
  }

  generating.value = true
  try {
    const portalName = props.config?.name || ''
    // 左侧选中的指标组作为父组，未选则字段组创建为根组
    const parentId = resolveGroupId()
    const groupCache = new Map<string, string | number>()
    const groupCounters = { created: 0, reused: 0 }

    // 逐字段解析目标组后统一构建指标数据
    const allIndicatorData: Array<any> = []
    for (const { row, item } of toGenerateList.value) {
      const groupId = await resolveFieldGroup(row, parentId, portalName, groupCache, groupCounters)
      const itemName = item.dictLabel
      allIndicatorData.push({
        itemValue: item.dictValue,
        itemName,
        // 默认图表颜色按指标名称哈希生成，保证同名指标跨图表同色
        color: getNameHashColor(itemName),
        comment: `基于字段「${row.displayName}」字典项 ${item.dictLabel} 生成的指标`,
        portalName,
        groupId,
        condition: generateCondition(row, item),
        dynamicColumn: null
      })
    }

    await addEntityList('portal/indicator', allIndicatorData, undefined, false, false)

    message.success(`初始化完成：新建 ${groupCounters.created} 个指标组，复用 ${groupCounters.reused} 个，成功生成 ${allIndicatorData.length} 个指标！`)
    emit('generated', allIndicatorData, parentId)
  } catch (error) {
    console.error('一键初始化指标失败:', error)
    message.error('一键初始化失败，请检查网络连接或联系管理员')
  } finally {
    generating.value = false
  }
}
</script>

<style lang="less" scoped>
.dict-batch-init {
  .section-block {
    margin-bottom: 20px;
    padding: 20px;
    background: var(--bg-hover);
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    display: flex;
    align-items: center;
    margin-bottom: 0;
    font-size: 16px;
    font-weight: 600;
    color: #262626;

    .anticon {
      margin-right: 8px;
      color: #1890ff;
    }
  }

  .summary-block {
    padding: 12px 20px;
    font-size: 14px;
  }

  .action-section {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
    border-top: 1px solid #f0f0f0;
  }

  .text-primary {
    color: #1890ff;
    font-size: 16px;
    margin: 0 4px;
  }

  .text-gray {
    color: #999;
  }

  .text-danger {
    color: #ff4d4f;
  }
}
</style>
