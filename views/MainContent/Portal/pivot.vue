<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import PivotDrillContent from './PivotDrillContent.vue'
import PivotDrillContentDark from './PivotDrillContentDark.vue'

import { getPortalConfig } from '@/framework/apis/portal/config'
import {
  getPortalPivotColumnList,
  pivotQuery,
  PivotMeasureVO,
  PivotReqVO,
  PortalPivotColumnVO,
  PortalTableVO
} from '@/framework/apis/portal/table'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { AUTO_UUID_ROW_KEY, PIVOT_SUBTOTAL_PREFIX } from '@/framework/components/common/Portal/constant'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { resolveConditionVariables } from '@/framework/utils/common'
import { formatMoney } from '@/framework/utils/formatter'

/**
 * 透视报表组件(纯表格, 无外壳)
 * 行维度列(group by) + 动态父表头列(条件聚合列) + 度量子列(sum/count/countDistinct/avg/min/max)
 * 直接复用 Portal 组件的数据模式(data + customColumns + summaryData)
 * 深色外壳/标题/左侧筛选栏由 DarkTable(tableMode="pivot")统一提供
 */
const props = withDefaults(
  defineProps<{
    /** 表格配置(sys_portal_table) */
    portalTableConfig: PortalTableVO
    /** 查询条件(来自 table filter) */
    condition?: Array<ConditionListType>
    /** 主题: dark=深色外壳(DarkTable)内, light=浅色外壳内(钻取数字等局部颜色跟随浅色) */
    theme?: 'dark' | 'light'
  }>(),
  {
    condition: () => [],
    theme: 'dark'
  }
)

const router = useRouter()
const dict = dictStore()
const treeDict = useTreeStore()

/** 透视聚合查询返回的原始数据 */
const rows = ref<any[]>([])
const portalUrl = ref('')
/** sys_portal.default_condition 解析出的默认查询条件(AdvancedQuery 形态 {conditionList}) */
const defaultConditions = ref<ConditionListType[]>([])
const pivotColumns = ref<PortalPivotColumnVO[]>([])
/** 透视列配置是否已加载完成(Portal 仅在初始化时读取 customColumns,
 *  必须等透视列列表就绪后再挂载, 否则可能以 TOTAL 退化列形态锁死表头) */
const pivotColumnLoaded = ref(false)
/** 未配置透视列时退化为单个无条件"总计"列(后端 CASE WHEN 1=1 即纯度量聚合) */
const TOTAL_PIVOT = { itemValue: 'total', itemName: '' } as unknown as PortalPivotColumnVO
const effectivePivotColumns = computed<PortalPivotColumnVO[]>(() =>
  pivotColumns.value.length > 0 ? pivotColumns.value : [TOTAL_PIVOT]
)
/** 是否配置了透视列(影响表头形态: 无透视列时度量名直接作单层表头) */
const hasPivotColumns = computed(() => pivotColumns.value.length > 0)
// Portal 列元数据: property -> layout(displayName/fieldType/reference/width)
const columnMetaMap = ref<Record<string, any>>({})
// 行维度字典翻译: field -> { value: label }
const dictOptionMap = ref<Record<string, Record<string, string>>>({})

/** 度量列配置(解析 pivotMeasures JSON) */
const measures = computed<PivotMeasureVO[]>(() => {
  if (!props.portalTableConfig.pivotMeasures) {
    return []
  }
  try {
    const parsed = JSON.parse(props.portalTableConfig.pivotMeasures)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('解析透视度量配置失败:', e)
    return []
  }
})

/** 行维度字段配置(兼容 JSON 数组 [{field,display,sort}] 与旧逗号串格式) */
const groupFieldConfigs = computed(() => {
  const raw = (props.portalTableConfig.groupByFields || '').trim()
  if (!raw) {
    return []
  }
  if (raw.startsWith('[')) {
    try {
      const list = JSON.parse(raw) as Array<{ field: string; display?: boolean; sort?: number; fixed?: boolean }>
      return list
        .filter((item) => item.field)
        .map((item) => ({
          field: item.field,
          display: item.display !== false,
          // 聚合行排序: 0=正序 1=倒序(PORTAL_SORT_DICT), 未配置不排序
          sort: item.sort === 0 || item.sort === 1 ? item.sort : undefined,
          // 左锁定(逐字段配置, 与度量列右锁定互斥)
          fixed: item.fixed === true
        }))
    } catch (e) {
      console.error('解析行维度配置失败，按逗号串兜底:', e)
    }
  }
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s)
    .map((f: string) => ({ field: f, display: true, sort: undefined as number | undefined, fixed: false }))
})

/** 全部行维度字段(含隐藏项，均参与 group by) */
const groupFields = computed(() => groupFieldConfigs.value.map(c => c.field))

/** 显示的行维度字段配置(隐藏项仅参与 group by 不渲染列) */
const visibleGroupFieldConfigs = computed(() => groupFieldConfigs.value.filter(c => c.display))

/** 显示的行维度字段(数据翻译/请求组装等处使用) */
const visibleGroupFields = computed(() => visibleGroupFieldConfigs.value.map(c => c.field))

/** 聚合后行排序(按行维度配置顺序生效, 作用于 group by 后的结果行) */
const sortList = computed(() =>
  groupFieldConfigs.value
    .filter(c => c.sort === 0 || c.sort === 1)
    .map(c => ({ property: c.field, type: c.sort as number }))
)

/** 树形字典展平 */
const flattenTree = (tree: any[]): any[] => {
  const result: any[] = []
  const walk = (nodes: any[]) => {
    for (const node of nodes || []) {
      result.push(node)
      if (node.children && node.children.length) {
        walk(node.children)
      }
    }
  }
  walk(tree)
  return result
}

/** 加载行维度字段的字典选项(用于翻译显示，仅显示列需要) */
const loadDictForField = async (field: string) => {
  const layout = columnMetaMap.value[field]
  const dictCode = layout?.reference || layout?.entity
  if (!dictCode) {
    return
  }
  try {
    let options: any[] = []
    if (layout.fieldType === FIELD_TYPE.TREE || layout.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE) {
      options = flattenTree(await treeDict.getTree(dictCode))
    } else {
      options = await dict.getDict(dictCode)
    }
    const map: Record<string, string> = {}
    ;(options || []).forEach((o: any) => {
      map[o.value] = o.label ?? o.value
    })
    dictOptionMap.value[field] = map
  } catch (e) {
    console.error(`加载行维度字段 ${field} 的字典 ${dictCode} 失败:`, e)
  }
}

/** 字典翻译(支持逗号分隔多值) */
const translate = (field: string, value: any) => {
  if (value === undefined || value === null || value === '') {
    return value
  }
  const map = dictOptionMap.value[field]
  if (!map) {
    return value
  }
  return String(value).split(',').map(v => map[v] ?? v).join(',')
}

/** 数字格式化 */
const formatNumber = (value: any) => {
  const num = Number(value)
  if (value === undefined || value === null || value === '' || isNaN(num)) {
    return value ?? ''
  }
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

/**
 * 度量值格式化: 度量字段在 Portal 列配置为金额(fieldType=MONEY)时按 referenceDict "小数位,除数"换算
 * (如 2,10000 = 2位小数除以1万即万元), 与 Portal 单元格/汇总行同一 formatMoney;
 * 其余类型维持千分位通用格式。空值仍返回 ''(不渲染不钻取, 与 formatNumber 约定一致)
 */
const formatMeasure = (measure: PivotMeasureVO | undefined, value: any) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const layout = measure ? columnMetaMap.value[measure.field] : undefined
  if (layout?.fieldType === FIELD_TYPE.MONEY) {
    const [fix, unit] = String(layout.referenceDict || '').split(',')
    return formatMoney(Number(value), Number(fix) || 2, Number(unit) || 10000)
  }
  return formatNumber(value)
}

/** 收集可参与聚合的数值(排除 SQL NULL/空串, 避免 min/max 被 0 污染与 NaN 混入) */
const collectMeasureNums = (values: any[]): number[] =>
  values
    .filter((v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number)

/**
 * 按度量自身聚合方式对一组聚合值做二次聚合
 * sum/count 跨组可加; min/max 取极值; avg/countDistinct 无法由聚合后的值推导(加权均值/跨组去重), 留空
 * row/col 两种布局的合计都必须走本函数, 禁止无脑求和(曾因 row 模式混算不同度量 + 对 avg 求和产生过垃圾总计)
 */
const aggregateByMeasure = (measure: PivotMeasureVO | undefined, nums: number[]): number | '' => {
  if (measure?.agg === 'min') {
    return nums.length ? Math.min(...nums) : ''
  }
  if (measure?.agg === 'max') {
    return nums.length ? Math.max(...nums) : ''
  }
  if (measure?.agg === 'avg' || measure?.agg === 'countDistinct') {
    return ''
  }
  return nums.length ? nums.reduce((acc, n) => acc + n, 0) : ''
}

// ==================== 报表默认排序(sys_portal_table.default_sort) ====================
/** 排序配置(取 JSON 首项): type 0=正序 1=倒序, 空/'[]'/解析失败=不排序 */
const defaultSort = computed<{ property: string, type: number } | null>(() => {
  const raw = (props.portalTableConfig.defaultSort || '').trim()
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    const first = Array.isArray(parsed) ? parsed[0] : undefined
    return first?.property ? { property: first.property, type: first.type === 1 ? 1 : 0 } : null
  } catch (e) {
    console.error('解析报表默认排序失败:', e)
    return null
  }
})

/**
 * 单行排序取值
 * - 命中行维度字段 → 聚合原值(与后端 ORDER BY 同口径)
 * - 命中度量字段 → 该度量跨透视列的聚合值(与合计列同口径); 单透视列(含未配透视列的 total 退化列)直接取单元格,
 *   避开 avg/countDistinct 多列不可二次聚合的问题
 * - 两者都不是(配置变更后残留的字段) → undefined, 不参与排序
 */
const sortValueOf = (row: any, property: string): any => {
  if (groupFields.value.includes(property)) {
    return row[property]
  }
  const measure = measures.value.find((m) => m.field === property)
  if (!measure) {
    return undefined
  }
  const cells = effectivePivotColumns.value
    .filter((pv) => !isSubtotalColumn(pv))
    .map((pv) => row[`${pv.itemValue}__${measure.field}`])
  return cells.length === 1 ? cells[0] : aggregateByMeasure(measure, collectMeasureNums(cells))
}

const isBlankSortValue = (value: any) => value === null || value === undefined || value === ''

/**
 * 聚合结果行本地排序(透视报表全量返回、无服务端分页)
 * 不下推后端 sortList: 外层 ORDER BY 只认 group by 列与 ${透视列}__${度量} 别名, 度量跨多个透视列时没有唯一别名可排
 * 空值恒排末位(不随方向翻转); avg/countDistinct 多透视列不可推导时各项均为空→稳定排序自然回退后端原序
 * 行维度排序已由 pushDownSortList 下推后端(返回即有序), 本地排序同序重排仅是幂等兼兕底
 */
const sortedRows = computed<any[]>(() => {
  const sort = defaultSort.value
  if (!sort) {
    return rows.value
  }
  const sign = sort.type === 1 ? -1 : 1
  return [...rows.value].sort((a, b) => {
    const va = sortValueOf(a, sort.property)
    const vb = sortValueOf(b, sort.property)
    const blankA = isBlankSortValue(va)
    const blankB = isBlankSortValue(vb)
    if (blankA && blankB) {
      return 0
    }
    if (blankA) {
      return 1
    }
    if (blankB) {
      return -1
    }
    const numA = Number(va)
    const numB = Number(vb)
    if (!isNaN(numA) && !isNaN(numB)) {
      return sign * (numA - numB)
    }
    return sign * String(va).localeCompare(String(vb), 'zh-CN')
  })
})

/** 下推后端的排序(聚合后外层 ORDER BY): 行维度配置排序 + 默认排序命中行维度字段时一并下推;
 *  度量排序不下推(跨透视列的度量聚合值在 SQL 里没有对应列), 仍由 sortedRows 本地排 */
const pushDownSortList = computed<{ property: string; type: number }[]>(() => {
  const list = [...sortList.value]
  const sort = defaultSort.value
  if (sort && groupFields.value.includes(sort.property) && !list.some((s) => s.property === sort.property)) {
    list.push({ property: sort.property, type: sort.type })
  }
  return list
})

/** 加载 Portal 配置与透视列配置 */
const loadConfig = async () => {
  if (!props.portalTableConfig.portalName) {
    return
  }
  try {
    const configRes = await getPortalConfig(props.portalTableConfig.portalName)
    if (!configRes?.payload) {
      console.error('Portal 配置不存在:', props.portalTableConfig.portalName)
      return
    }
    portalUrl.value = configRes.payload.url
    // 默认查询条件(sys_portal.default_condition): 通用列表由 Portal 组件前端合并下发, 后端不消费;
    // 透视链路此前完全漏带 → 主请求/钻取在此统一并入, 与列表路径同一配置正源
    try {
      const parsed = configRes.payload.defaultCondition ? JSON.parse(configRes.payload.defaultCondition) : null
      if (Array.isArray(parsed?.conditionList)) {
        // '${currentYear}' 等内置时间变量与通用列表走同一份解析(见 resolveConditionVariables)
        resolveConditionVariables(parsed)
        defaultConditions.value = parsed.conditionList
      } else {
        defaultConditions.value = []
      }
    } catch (e) {
      console.error('解析默认查询条件失败:', e)
    }
    const metaMap: Record<string, any> = {}
    for (const layout of configRes.payload.columns || []) {
      metaMap[layout.property] = layout
    }
    columnMetaMap.value = metaMap
    // 诊断日志: 确认落库的行维度配置是否含 display=false
    console.log('[pivot] groupByFields 配置:', props.portalTableConfig.groupByFields,
      '| 渲染列:', visibleGroupFields.value, '| 全部(group by):', groupFields.value)
    await Promise.all(visibleGroupFields.value.map(f => loadDictForField(f)))

    const columnRes = await getPortalPivotColumnList(props.portalTableConfig.id!)
    pivotColumns.value = columnRes?.payload?.records || []
    pivotColumnLoaded.value = true
    await loadData()
  } catch (e) {
    console.error('加载透视报表配置失败:', e)
    // 配置加载异常也放行挂载, 避免表格永久空白(退化为 TOTAL 形态)
    pivotColumnLoaded.value = true
  }
}

/** 组装请求并查询透视数据(透视列可为空, 空时退化为无条件总计列) */
const loadData = async () => {
  if (!portalUrl.value || !groupFields.value.length || !measures.value.length) {
    return
  }
  try {
    const req: PivotReqVO = {
      // 默认查询条件(sys_portal.default_condition)并入: 与通用列表路径同一配置正源
      condition: { conditionList: [...defaultConditions.value, ...props.condition] },
      // 行维度排序下推(聚合后 ORDER BY 行维度列, 两链路均支持); 度量排序后端无别名可排, 不在此列
      sortList: pushDownSortList.value.length > 0 ? pushDownSortList.value : undefined,
      groupColumns: groupFields.value.map(f => ({
        value: f,
        label: columnMetaMap.value[f]?.displayName || f
      })),
      pivotColumns: effectivePivotColumns.value.map(p => ({
        value: p.itemValue!,
        label: p.itemName!,
        condition: p.condition ? JSON.parse(p.condition) : {}
      })),
      measures: measures.value
    }
    const res = await pivotQuery(portalUrl.value, req)
    rows.value = res?.payload || []
  } catch (e) {
    console.error('透视聚合查询失败:', e)
    rows.value = []
  }
}

watch(() => props.condition, () => {
  loadData()
}, { deep: true })

// ==================== 度量布局模式 ====================
/** 合成列 dataIndex: 度量名称列(仅 row 模式) */
const MEASURE_NAME_COL = '_measure_name'
/** 合成列 dataIndex: 横向合计列(仅 row 模式, 同一度量跨透视列聚合) */
const TOTAL_COL = '_row_total'
/** 合成字段: 行对象携带的原始聚合行引用(钻取条件取 group by 原值, 与本地排序后的渲染行序解耦) */
const RAW_ROW_REF_KEY = '_raw_row_ref'

/** 分组小计列识别(树形-多层生成: itemValue 以 _gt_ 前缀, 条件为 IN 组内叶子值) */
const isSubtotalColumn = (pv: PortalPivotColumnVO): boolean => !!pv.itemValue?.startsWith(PIVOT_SUBTOTAL_PREFIX)
/** 是否度量转行模式: 布局配置为 row 且度量数 > 1 时生效 */
const isMeasureInRow = computed(() =>
  props.portalTableConfig.pivotMeasureLayout === 'row' && measures.value.length > 1
)

/** 解析透视列父链路径 JSON(自外向内 label 数组), 空/非法返回 [](树形-多层生成时落库) */
const parseGroupPath = (pv: PortalPivotColumnVO): string[] => {
  if (!pv.groupPath) {
    return []
  }
  try {
    const parsed = JSON.parse(pv.groupPath)
    return Array.isArray(parsed) ? parsed.filter((s: any) => typeof s === 'string' && s) : []
  } catch (e) {
    return []
  }
}

/**
 * 按父链组装树形多层表头(row 模式无度量层, 列头即纯树)
 * 每层按组首次出现序聚拢(组间序跟随 displayOrder, 预览拖拽调序仍生效),
 * 同父叶子包进 {title, children} 分组壳列(无 dataIndex, 不参与汇总), 叶子列原样下沉为末级
 */
const buildGroupedColumns = (items: Array<{ path: string[]; col: ColumnType }>): ColumnType[] => {
  const buildLevel = (list: Array<{ path: string[]; col: ColumnType }>): ColumnType[] => {
    // 同父叶子必须相邻才能归组: 按组键首次出现序稳定聚拢(组内保持原相对序)
    const keyOf = (it: { path: string[]; col: ColumnType }) => it.path[0] ?? ''
    const groupSeq = new Map<string, number>()
    for (const it of list) {
      const k = keyOf(it)
      if (!groupSeq.has(k)) {
        groupSeq.set(k, groupSeq.size)
      }
    }
    const sorted = [...list].sort((a, b) => (groupSeq.get(keyOf(a)) ?? 0) - (groupSeq.get(keyOf(b)) ?? 0))
    const res: ColumnType[] = []
    let i = 0
    while (i < sorted.length) {
      const item = sorted[i]
      if (item.path.length === 0) {
        res.push(item.col)
        i++
        continue
      }
      const groupTitle = item.path[0]
      const groupItems: Array<{ path: string[]; col: ColumnType }> = []
      let j = i
      while (j < sorted.length && sorted[j].path[0] === groupTitle) {
        groupItems.push({ path: sorted[j].path.slice(1), col: sorted[j].col })
        j++
      }
      res.push({ title: groupTitle, children: buildLevel(groupItems) } as unknown as ColumnType)
      i = j
    }
    return res
  }
  return buildLevel(items)
}

/**
 * Portal 动态列: 行维度列 + 度量子列
 * col模式: 行维度 + (透视列×度量) 横向平铺
 * row模式: 行维度 + 指标名称列 + 透视列(每列一个度量值)
 */
const portalColumns = computed(() => {
  const cols: ColumnType[] = []
  const multiMeasure = measures.value.length > 1
  const hasPivot = hasPivotColumns.value
  let order = 2
  // 行维度只渲染显示字段(隐藏字段仍参与 group by，用于行粒度细化/筛选目标)
  for (const cfg of visibleGroupFieldConfigs.value) {
    cols.push({
      title: columnMetaMap.value[cfg.field]?.displayName || cfg.field,
      dataIndex: cfg.field,
      key: cfg.field,
      width: columnMetaMap.value[cfg.field]?.width || 140,
      fixed: cfg.fixed,
      fieldType: FIELD_TYPE.INPUT,
      tooltip: false,
      order: order++,
      editable: false,
      sorter: false,
      filterAble: false,
      addShow: false,
      editShow: false,
      detailShow: false
    } as ColumnType)
  }

  if (isMeasureInRow.value) {
    // === row 模式: 行维度 + 指标名称 + 透视列 ===
    cols.push({
      title: '指标',
      dataIndex: MEASURE_NAME_COL,
      key: MEASURE_NAME_COL,
      width: 120,
      fixed: visibleGroupFieldConfigs.value.some(c => c.fixed) ? 'left' : false,
      fieldType: FIELD_TYPE.INPUT,
      tooltip: false,
      order: order++,
      editable: false,
      sorter: false,
      filterAble: false,
      addShow: false,
      editShow: false,
      detailShow: false
    } as ColumnType)
    // 合计列: 每行是同一度量在各透视列上的取值(同量纲), 横向聚合安全;
    // 不右锁定: 与行维度左锁并存会触发 s-table 两侧同时锁定的渲染异常;
    // 位置可配: first=透视列之前(紧跟指标列, 列多横向滚动时合计更早可见), 缺省 last=透视列之后
    // order 必须在 push 时赋值(Portal 按值排序, 提前赋会破坏位置)
    const pushTotalCol = () => {
      cols.push({
        title: '合计',
        dataIndex: TOTAL_COL,
        key: TOTAL_COL,
        width: 120,
        fieldType: FIELD_TYPE.NUMBER,
        contentAlign: 'right',
        tooltip: false,
        order: order++,
        editable: false,
        sorter: false,
        filterAble: false,
        addShow: false,
        editShow: false,
        detailShow: false
      } as ColumnType)
    }
    // 透视列: 带 groupPath(树形-多层生成)时按父链组装嵌套表头, 否则平铺(原逻辑)
    const leafItems = effectivePivotColumns.value.map((pv) => ({
      path: parseGroupPath(pv),
      col: {
        title: pv.itemName || pv.itemValue,
        dataIndex: pv.itemValue,
        key: pv.itemValue,
        width: 140,
        fieldType: FIELD_TYPE.NUMBER,
        contentAlign: 'right',
        tooltip: false,
        order: order++,
        editable: false,
        sorter: false,
        filterAble: false,
        addShow: false,
        editShow: false,
        detailShow: false
      } as ColumnType
    }))
    if (props.portalTableConfig.pivotTotalPos === 'first') {
      pushTotalCol()
    }
    if (leafItems.some((it) => it.path.length > 0)) {
      cols.push(...buildGroupedColumns(leafItems))
    } else {
      for (const it of leafItems) {
        cols.push(it.col)
      }
    }
    if (props.portalTableConfig.pivotTotalPos !== 'first') {
      pushTotalCol()
    }
    // 统一按最终数组序重编 order(Portal 按值排序): leafItems 的 map 先于 pushTotalCol 执行,
    // first 时合计若沿用 push 时取号会拿到最大号而跑到末尾; 重编同时给树形壳列补上 order
    cols.forEach((c, idx) => {
      c.order = idx + 2
    })
  } else {
    // === col 模式(原逻辑): 行维度 + 透视列×度量 ===
    for (const pv of effectivePivotColumns.value) {
      for (const m of measures.value) {
        cols.push({
          title: multiMeasure || !hasPivot ? (m.label || m.field) : pv.itemName,
          dataIndex: `${pv.itemValue}__${m.field}`,
          key: `${pv.itemValue}__${m.field}`,
          width: 120,
          fixed: m.fixed === true ? 'right' : false,
          fieldType: FIELD_TYPE.NUMBER,
          contentAlign: 'right',
          displayGroupName: hasPivot && multiMeasure ? pv.itemName : undefined,
          tooltip: false,
          order: order++,
          editable: false,
          sorter: false,
          filterAble: false,
          addShow: false,
          editShow: false,
          detailShow: false
        } as ColumnType)
      }
    }
  }
  return cols
})

let pivotRowKeySeq = 0
/** 表格数据: col模式直接映射; row模式熔接(每行×每度量=一行) + 伪合并(组内首行显示维度值) */
const dataSource = computed(() => {
  // 行源统一下移到 sortedRows: 未配默认排序时直接返回 rows, 不产生额外拷贝
  if (!isMeasureInRow.value) {
    // === col 模式(原逻辑) ===
    return sortedRows.value.map((row) => {
      const item: any = {}
      item[AUTO_UUID_ROW_KEY] = `pivot-row-${++pivotRowKeySeq}`
      item[RAW_ROW_REF_KEY] = row
      for (const f of visibleGroupFields.value) {
        item[f] = translate(f, row[f])
      }
      for (const pv of effectivePivotColumns.value) {
        for (const m of measures.value) {
          const key = `${pv.itemValue}__${m.field}`
          item[key] = formatMeasure(m, row[key])
        }
      }
      return item
    })
  }

  // === row 模式: 熔接数据 + 伪合并 ===
  const melted: any[] = []
  // 记录每个行维度字段上一次的值, 用于判断是否首行
  const lastGroupValues: Record<string, any> = {}
  for (const row of sortedRows.value) {
    for (const m of measures.value) {
      const item: any = {}
      item[AUTO_UUID_ROW_KEY] = `pivot-row-${++pivotRowKeySeq}`
      item[RAW_ROW_REF_KEY] = row
      // 行维度: 伪合并——只在组内第一行显示文字, 后续行留空
      for (const f of visibleGroupFields.value) {
        const translated = translate(f, row[f])
        if (lastGroupValues[f] === translated) {
          item[f] = ''
        } else {
          item[f] = translated
        }
        lastGroupValues[f] = translated
      }
      // 指标名称列
      item[MEASURE_NAME_COL] = m.label || m.field
      // 每个透视列对应的度量值
      // 小计列(_gt_前缀)参与列输出, 但不并入横向合计(避免叶子+小计重复累加)
      const totalSourcePvs = effectivePivotColumns.value.filter((pv) => !isSubtotalColumn(pv))
      for (const pv of effectivePivotColumns.value) {
        const srcKey = `${pv.itemValue}__${m.field}`
        item[pv.itemValue!] = formatMeasure(m, row[srcKey])
      }
      // 合计列: 同一度量跨透视列的横向聚合(按度量自身 agg 语义, avg/countDistinct 不可推导留空)
      item[TOTAL_COL] = formatMeasure(
        m,
        aggregateByMeasure(m, collectMeasureNums(totalSourcePvs.map((pv) => row[`${pv.itemValue}__${m.field}`])))
      )
      melted.push(item)
    }
    // 切换原始行时重置合并状态(下一组的第一行重新显示文字)
    for (const f of visibleGroupFields.value) {
      lastGroupValues[f] = undefined
    }
  }
  return melted
})

/** 汇总行数据 */
const summaryData = computed(() => {
  const summary: Record<string, any> = {}
  if (isMeasureInRow.value) {
    // row 模式不出总计行: 列容器纵向堆叠多个度量(不同量纲), 单行汇总无论按列还是混算都语义错误;
    // 跨 group 的总计坐标是 (度量, 透视列), 天然形状为 N 行, summaryData 一行结构装不下;
    // 横向合计已由合计列(TOTAL_COL)承担
    return summary
  }
  // col 模式: 每个 ${pv}__${measure} 列独立汇总(列内同度量同量纲)
  for (const pv of effectivePivotColumns.value) {
    for (const m of measures.value) {
      const key = `${pv.itemValue}__${m.field}`
      summary[key] = formatMeasure(m, aggregateByMeasure(m, collectMeasureNums(rows.value.map((row) => row[key]))))
    }
  }
  return summary
})

/** 度量子列 key 列表(用于动态插槽与钻取定位) */
const measureKeys = computed<string[]>(() => {
  if (isMeasureInRow.value) {
    // row 模式: 插槽按透视列 itemValue 定位; 合计列一并纳入(可钻取)
    return [...effectivePivotColumns.value.map(pv => pv.itemValue!).filter(Boolean), TOTAL_COL]
  }
  // col 模式: ${透视列}__${度量字段}
  return effectivePivotColumns.value.flatMap(pv => measures.value.map(m => `${pv.itemValue}__${m.field}`))
})

/** 动态列必须就绪后才能挂载 Portal(Portal 仅在初始化时读取 customColumns; 透视列可为空=退化为总计列) */
const ready = computed(() =>
  !!portalUrl.value &&
  pivotColumnLoaded.value &&
  visibleGroupFields.value.length > 0 &&
  measures.value.length > 0
)

/** 导出文件名 */
const getDownloadFileName = () => router.currentRoute.value.meta.title as string || '透视报表'

// ==================== 单元格钻取明细 ====================
const drillOpen = ref(false)
const drillTitle = ref('')
const drillCondition = ref<ConditionListType>({ conditionList: [] })

// 抽屉外观随主题: 浅色外壳→antd 默认浅色抽屉, 深色外壳→保持原深色
const drillDrawerBodyStyle = computed(() => (props.theme === 'light' ? { padding: '16px' } : { backgroundColor: '#023955', padding: '16px' }))
const drillDrawerHeaderStyle = computed(() => (props.theme === 'light' ? {} : { backgroundColor: '#0E3D55', borderBottom: '1px solid #0F7094', color: '#fff' }))
const drillDrawerRootClass = computed(() => (props.theme === 'light' ? 'pivot-drill-drawer pivot-drill-light' : 'pivot-drill-drawer'))

/** ② 透视列条件(CASE WHEN 的列条件, JSON 存储的 ConditionListType) */
const parsePivotColumnCondition = (pv: PortalPivotColumnVO): ConditionListType[] => {
  if (!pv.condition) {
    return []
  }
  try {
    const parsed = JSON.parse(pv.condition)
    if (Array.isArray(parsed?.conditionList)) {
      return parsed.conditionList
    }
    if (parsed?.property) {
      return [parsed]
    }
  } catch (e) {
    console.error('解析透视列钻取条件失败:', e)
  }
  return []
}

/**
 * 单个行维度值的钻取条件
 * 值条件必须与后端 group by 的原值严格对应, 且要同时满足两条取数路径:
 * forge(Dataset/Matrix → BaseSqlBuilder 拼参数化 SQL) 与 kernel(MyBatis wrapper → PortalSelectRepo),
 * 二者对"空值/未实现 relation"的容忍度不同, 下面的类型选择均为两路径交集
 */
const buildGroupValueCondition = (field: string, value: any): ConditionListType => {
  // null/undefined → IS NULL: 透视 group by 的列表达式不包 IFNULL(仅 statistic 路径包), 真 NULL 会原样返回
  if (value === null || value === undefined) {
    return { property: field, relation: FILTER_TYPE.NULL, value: [], conditionList: [] }
  }
  // 空串 → IN(['']) 而非 EQUAL(['']): 库里存 '' 的维度值 group by 出来是空串行, 发 IS NULL 会匹配不到(钻取 0 条);
  // 而 kernel 的 EQUAL 分支带"首元素为空则不拼条件"守卫, col = '' 会被静默丢弃退化成全表,
  // IN 分支只判集合非空 → 两路径均可生成 col IN ('')
  if (value === '') {
    return { property: field, relation: FILTER_TYPE.IN, value: [''], conditionList: [] }
  }
  // 其余(含多值列的逗号串)一律整串等值: group by 键就是该行原值, 等值是唯一能与聚合数字严格对齐的写法。
  // 多值列(逗号串存一格)不用 CONTAIN 包含匹配: 钻取的比较值是完整 group key(整串),
  // 不同于筛选栏拿单个元素去撞(那种场景才必须 FIND_IN_SET, 见 AdvancedSearch/funs.ts 对 18/19 只开放 CONTAIN 系);
  // 改成"包含全部"会让 'A,B,C' 这类超集行一并命中, 把"偶尔漏"换成"必然多", 反而破坏数字对齐。
  // 已知残留隐患: 若行维度列的值由 GROUP_CONCAT 现拼且未带 ORDER BY(拼接顺序目下无保证),
  // 透视与钻取两次查询可能分别得到 'A,B' / 'B,A' 使等值漏行, 根治应在 SQL 侧让拼接确定性
  return { property: field, relation: FILTER_TYPE.EQUAL, value: [value], conditionList: [] }
}

/**
 * 求和度量"隐藏零值明细"的钻取附加条件(不满足条件时返回 null)
 * 仅 agg=sum 生效: sum 是唯一"去掉 0/NULL 行结果仍恒等"的聚合——
 * count 每行都计 1、countDistinct 可能少一个去重值、avg 丢分母、min/max 可能丢极值, 过滤即与单元格数字不符
 * 用 NOT_EQUAL [0]: SQL 三值逻辑下 col <> 0 同时排除 0 与 NULL, 一条条件即可;
 * 且值为数字 0, kernel 侧 isNotEmpty(0) 判非空不会静默丢条件(空串才会), forge 侧生成参数化 col != :p
 */
const buildMeasureZeroCondition = (measure?: PivotMeasureVO): ConditionListType | null => {
  if (!measure || measure.agg !== 'sum' || measure.hideZero !== true) {
    return null
  }
  return { property: measure.field, relation: FILTER_TYPE.NOT_EQUAL, value: [0], conditionList: [] }
}

/**
 * 数据行钻取条件: ① 默认查询条件(sys_portal.default_condition)+全局筛选(props.condition) ② 透视列条件(合计列钻取不带) ③ 行维度原始值 ④ 求和度量的零值过滤(可选)
 * 前三者 AND 合并, 与透视聚合 SQL 的 WHERE(先于 group by) + CASE WHEN(行内条件) + GROUP BY(行维度) 语义严格对齐;
 * ④ 只减掉对合计无贡献的行, 所以钻取列表的该列合计仍与单元格一致(但行数不再等于贡献行数)
 * rawRow 必须取 record 上携带的原始聚合行引用: sortedRows 本地排序后渲染行序 ≠ rows 后端返回序,
 * 按渲染 index 反查 rows 会张冠李戴(显示 level 1 的行, 钻取却拼出 level 3 的条件)
 */
const buildDrillCondition = (rawRow: any, pv: PortalPivotColumnVO | undefined, measure?: PivotMeasureVO): ConditionListType[] => {
  const list: ConditionListType[] = [...defaultConditions.value, ...props.condition, ...(pv ? parsePivotColumnCondition(pv) : [])]
  // 行维度用原始行值(group by 的原值), 不能用 dataSource 里翻译/格式化后的值
  for (const f of groupFields.value) {
    list.push(buildGroupValueCondition(f, rawRow?.[f]))
  }
  const zeroCond = buildMeasureZeroCondition(measure)
  if (zeroCond) {
    list.push(zeroCond)
  }
  return list
}
/** 钻取标题: 透视列名 · 度量名(无透视列时显示度量名, 避免回退原始字段名) */
const buildDrillTitle = (pv: PortalPivotColumnVO, itemValue: string, measure: PivotMeasureVO | undefined, measureField: string, suffix: string) => {
  const pivotLabel = hasPivotColumns.value ? (pv.itemName || itemValue) : ''
  // 无透视列: 标题必须带度量名(否则只剩原始字段名); 有透视列且单度量: 度量名无区分度可省略
  const measureLabel = (!hasPivotColumns.value || measures.value.length > 1) && measure ? (measure.label || measure.field) : ''
  return `${[pivotLabel, measureLabel].filter(Boolean).join(' · ') || measureField} - ${suffix}`
}

/** 行分组的显示标签(取该组原始行的行维度翻译值拼接, 用于合计列钻取标题) */
const buildGroupLabel = (rawRow: any) => {
  return visibleGroupFields.value.map((f) => String(translate(f, rawRow?.[f]) ?? '')).filter(Boolean).join(' / ')
}

/** 点击度量单元格: 打开底部抽屉展示该单元格对应的明细数据 */
const openDrill = (record: any, index: number, key: string) => {
  // 原始行必须取 record 携带的引用: sortedRows 本地排序后渲染行序 ≠ rows 后端返回序,
  // 按渲染 index 反查 rows 会取错行(点 level 1 的单元格, 钻取条件却拼成 level 3)
  const rawRow = record?.[RAW_ROW_REF_KEY]
  if (isMeasureInRow.value) {
    // row 模式: key=pv.itemValue(或合计列), index是熔接后的行号, 仅用于定位当前度量
    const measureCount = measures.value.length
    const measureIdx = index % measureCount
    const measure = measures.value[measureIdx]
    if (!measure) {
      return
    }
    if (key === TOTAL_COL) {
      // 合计列: 该组该度量跨全部透视列的明细 → 不带透视列条件(②)
      drillTitle.value = `${buildGroupLabel(rawRow)} · ${measure.label || measure.field} - 全部分类明细`
      drillCondition.value = { conditionList: buildDrillCondition(rawRow, undefined, measure), andOr: '0' }
      drillOpen.value = true
      return
    }
    const pv = effectivePivotColumns.value.find(p => p.itemValue === key)
    if (!pv) {
      return
    }
    drillTitle.value = `${pv.itemName || key} · ${measure.label || measure.field} - 明细数据`
    drillCondition.value = { conditionList: buildDrillCondition(rawRow, pv, measure), andOr: '0' }
  } else {
    // col 模式: key=${itemValue}__${measureField}
    const sepIdx = key.indexOf('__')
    const itemValue = key.substring(0, sepIdx)
    const measureField = key.substring(sepIdx + 2)
    const pv = effectivePivotColumns.value.find(p => p.itemValue === itemValue)
    const measure = measures.value.find(m => m.field === measureField)
    if (!pv) {
      return
    }
    drillTitle.value = buildDrillTitle(pv, itemValue, measure, measureField, '明细数据')
    drillCondition.value = { conditionList: buildDrillCondition(rawRow, pv, measure), andOr: '0' }
  }
  drillOpen.value = true
}

/** 点击汇总行单元格: 只拼 ①+②(不带行维度), 即该透视列的全部明细 */
const openSummaryDrill = (key: string) => {
  if (isMeasureInRow.value) {
    // row 模式: key=pv.itemValue
    const pv = effectivePivotColumns.value.find(p => p.itemValue === key)
    if (!pv) {
      return
    }
    drillTitle.value = `${pv.itemName || key} - 全部明细`
    // row 模式下汇总行单元格不对应单一度量, 无法确定按哪个度量列滤零, 故不附加零值条件
    drillCondition.value = { conditionList: [...props.condition, ...parsePivotColumnCondition(pv)], andOr: '0' }
  } else {
    // col 模式: key=${itemValue}__${measureField}
    const sepIdx = key.indexOf('__')
    const itemValue = key.substring(0, sepIdx)
    const measureField = key.substring(sepIdx + 2)
    const pv = effectivePivotColumns.value.find(p => p.itemValue === itemValue)
    const measure = measures.value.find(m => m.field === measureField)
    if (!pv) {
      return
    }
    drillTitle.value = buildDrillTitle(pv, itemValue, measure, measureField, '全部明细')
    const summaryConditionList: ConditionListType[] = [...props.condition, ...parsePivotColumnCondition(pv)]
    const zeroCond = buildMeasureZeroCondition(measure)
    if (zeroCond) {
      summaryConditionList.push(zeroCond)
    }
    drillCondition.value = { conditionList: summaryConditionList, andOr: '0' }
  }
  drillOpen.value = true
}

// 动态插槽名(bodyCell_${key})无法被 vue-tsc 推断, 回退为全部插槽类型联合, 取参用 any 封装
const cellRecord = (slot: any) => slot?.record
const cellIndex = (slot: any) => slot?.index
const cellValue = (slot: any) => slot?.value

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div :class="['pivot-body', { 'pivot-light': props.theme === 'light' }]">
    <portal
      v-if="ready"
      :table-id="props.portalTableConfig.portalName || ''"
      :data="dataSource"
      :custom-columns="portalColumns"
      :summary-data="summaryData"
      :download-file-name="getDownloadFileName"
      :action-width="0"
      :index-width="0"
      :page-size="50"
      :hide-export="props.portalTableConfig.downloadAble === '0'"
      :advance="false"
      :multi-header="!isMeasureInRow && pivotColumns.length > 0 && measures.length > 1"
      read-only
      :row-key-field="AUTO_UUID_ROW_KEY"
      hide-import
      hide-refresh
      hide-row-selection
    >
      <!-- 度量单元格: 非空数字可点击钻取明细(动态插槽覆盖所有度量列) -->
      <template
        v-for="key in measureKeys"
        :key="key"
        #[`bodyCell_${key}`]="cellSlot"
      >
        <span
          v-if="cellRecord(cellSlot)?.[key] !== '' && cellRecord(cellSlot)?.[key] != null"
          class="pivot-drill-cell"
          @click="openDrill(cellRecord(cellSlot), cellIndex(cellSlot), key)"
        >{{ cellRecord(cellSlot)?.[key] }}</span>
      </template>
      <!-- 汇总行单元格: 点击钻取该透视列全部明细(条件只拼全局筛选+透视列条件);
           居中对齐同 PortalSummary 默认渲染 -->
      <template
        v-for="key in measureKeys"
        :key="`summary-${key}`"
        #[`summaryCell_${key}`]="summarySlot"
      >
        <div :style="{ textAlign: 'center' }">
          <span
            v-if="cellValue(summarySlot) !== '--' && cellValue(summarySlot) != null"
            class="pivot-drill-cell"
            @click="openSummaryDrill(key)"
          >{{ cellValue(summarySlot) }}</span>
          <span v-else>--</span>
        </div>
      </template>
    </portal>

    <!-- 钻取明细抽屉: 从下向上弹出, 普通模式 Portal 按底层明细表(portalName)自身列配置渲染 -->
    <a-drawer
      v-model:open="drillOpen"
      :title="drillTitle"
      placement="bottom"
      :height="700"
      :body-style="drillDrawerBodyStyle"
      :header-style="drillDrawerHeaderStyle"
      destroy-on-close
      :root-class-name="drillDrawerRootClass"
    >
      <!-- 抽屉内容抽到独立组件: 深色外壳用 Dark 变体(scoped 挂 dark.css),
           浅色外壳用纯浅色变体, 不残留任何深色覆盖 -->
      <pivot-drill-content-dark
        v-if="props.theme !== 'light'"
        :table-id="props.portalTableConfig.portalName || ''"
        :condition="drillCondition"
        :cache-key="drillTitle"
      />
      <pivot-drill-content
        v-else
        :table-id="props.portalTableConfig.portalName || ''"
        :condition="drillCondition"
        :cache-key="drillTitle"
      />
    </a-drawer>
  </div>
</template>

<!-- 主表格不挂 dark.css: 深色由 DarkTable 外壳提供, 浅色外壳下跟随浅色主题;
     抽屉深色样式见 PivotDrillContent.vue -->
<style lang="less" scoped>
.pivot-body {
  height: 100%;
  width: 100%;
}

// 度量单元格可点击钻取(偏白高亮, 悬停回主题强调色)
.pivot-drill-cell {
  cursor: pointer;
  color: #eaf9ff;

  &:hover {
    color: #1fc6ff;
    text-decoration: underline;
  }
}

// 浅色主题: 近白高亮在浅底上不可见, 钻取数字改用链接蓝
.pivot-light .pivot-drill-cell {
  color: #1677ff;

  &:hover {
    color: #4096ff;
  }
}
</style>

<!-- 钻取抽屉补充样式(非 scoped, 因 a-drawer teleport 到 body);
     深色规则仅在深色外壳下生效, 浅色外壳(.pivot-drill-light)跟随 antd 默认浅色 -->
<style lang="less">
.pivot-drill-drawer:not(.pivot-drill-light) {
  .ant-drawer-title {
    color: #fff !important;
  }

  .ant-drawer-close {
    color: #fff !important;
  }

  .ant-drawer-close:hover {
    color: #42F6FF !important;
  }

  /* 表头样式 */
  .surely-table-header {
    background-color: #0E3D55 !important;
  }

  .surely-table-header-cell {
    padding: 8px 16px !important;
    background-color: #0E3D55 !important;
    font-weight: 600 !important;
  }

  .surely-table-header-cell .surely-table-cell-content,
  .surely-table-header-cell span,
  .surely-table-header-cell div {
    color: #ffffff !important;
    font-weight: 600 !important;
  }

  .portal-table,
  .surely-table {
    background-color: rgb(2, 57, 85) !important;
  }

  .portal-table td,
  .surely-table td,
  .surely-table .surely-table-cell {
    border-right: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-top: none !important;
    border-left: 1px solid rgba(255, 255, 255, 0.3) !important;
  }

  .portal-table tr:last-child td,
  .surely-table tr:last-child td,
  .surely-table tr:last-child .surely-table-cell {
    border-bottom: none !important;
  }

  .surely-table-row-even,
  tbody tr.surely-table-row-even {
    background-color: #1B475D !important;
    color: #ffffff !important;
  }

  .surely-table-row-odd,
  tbody tr.surely-table-row-odd {
    background-color: #0E3D55 !important;
    color: #ffffff !important;
  }

  .surely-table-body {
    background-color: rgb(2, 57, 85) !important;
  }
}
</style>
