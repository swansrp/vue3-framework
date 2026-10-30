<script lang="ts" setup>
import { CaretDownOutlined, CaretUpOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useLocaleReceiver } from 'ant-design-vue/es/locale/LocaleReceiver'
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
import PortalColumnCondition from '@/framework/components/common/Portal/table/PortalColumnCondition.vue'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { getTextWidth, HEADER_ICON_PAD_FILTER, HEADER_ICON_PAD_SORT } from '@/framework/components/common/Portal/utils'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { resolveConditionVariables, strRemoveLF } from '@/framework/utils/common'
import { formatMoney } from '@/framework/utils/formatter'
import { columnToken, measureToken, pivotToken, resolveMyHiddenTokens, RESOURCE_TYPE_PORTAL_COLUMN, RESOURCE_TYPE_PORTAL_PIVOT } from '@/framework/utils/portalColumnPerm'

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
/** 当前用户命中的隐藏 token（后端已数据剔离，此处仅隐表头/列/行）：c: 行维度、p: 透视父列、m: 度量 */
const hiddenC = ref<Set<string>>(new Set())
const hiddenPM = ref<Set<string>>(new Set())
/** 透视列配置是否已加载完成(Portal 仅在初始化时读取 customColumns,
 *  必须等透视列列表就绪后再挂载, 否则可能以 TOTAL 退化列形态锁死表头) */
const pivotColumnLoaded = ref(false)
/** 首轮查询是否已结束(含失败/配置不全)：列宽要靠已取回的数据实测，挂载必须等这一步，否则整表按上限最小值起步且之后不再更新 */
const firstLoadDone = ref(false)
/** 未配置透视列时退化为单个无条件"总计"列(后端 CASE WHEN 1=1 即纯度量聚合) */
const TOTAL_PIVOT = { itemValue: 'total', itemName: '' } as unknown as PortalPivotColumnVO
const effectivePivotColumns = computed<PortalPivotColumnVO[]>(() => {
  if (pivotColumns.value.length === 0) {
    return [TOTAL_PIVOT]
  }
  return pivotColumns.value.filter(p => !hiddenPM.value.has(pivotToken(p.itemValue || '')))
})
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
    const list = Array.isArray(parsed) ? parsed : []
    // 列级权限（m:）：隐藏度量从唯一驱动源剔除，col/row 两布局与钻取序自动跟随
    return list.filter((m: any) => m?.field && !hiddenPM.value.has(measureToken(m.field)))
  } catch (e) {
    console.error('解析透视度量配置失败:', e)
    return []
  }
})

/** 度量显示名: 配置的 label 优先, 未填回退列元数据的中文 displayName, 最后才是英文字段名 */
const measureTitle = (field: string, label?: string): string =>
  label || columnMetaMap.value[field]?.displayName || field

/**
 * 度量输出键: 同字段多条件各出一列时配置端会写 key(field_2 等), 缺省=字段名。
 * 只用于拼列别名 ${透视列标识}__${键} 与按列定位, 取数/格式化仍走 field
 */
const measureKey = (m: PivotMeasureVO): string => m.key || m.field

/** 条件配置归一化为对象(配置存 JSON 串; 兼容已存成对象的历史/外部写入) */
const parseConditionJsonObject = (raw: any, scene: string): any => {
  if (raw == null || raw === '') {
    return null
  }
  if (typeof raw !== 'string') {
    return typeof raw === 'object' ? raw : null
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    console.error(`解析${scene}条件失败:`, e)
    return null
  }
}

/** 度量自身条件 JSON → 请求体条件对象(未配/坏配置都按无条件处理, 不阻断整表查询) */
const parseMeasureCondition = (raw: any): any => parseConditionJsonObject(raw, '度量') || undefined

/** 表头标题拆行: 真实换行与字面 \n 都按换行拆(与 Portal 普通表头、getTextWidth 列宽测量同语义) */
const headerTitleLines = (title: unknown): string[] =>
  title == null ? [] : String(title).split(/\n|\\n/g)

/** 单行形态度量名: 表头以外的文本面(单元格值/钻取标题)不容换行, 字面与真实换行都拆掉 */
const measureSingleLine = (field: string, label?: string): string =>
  strRemoveLF(measureTitle(field, label))

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
const visibleGroupFieldConfigs = computed(() => groupFieldConfigs.value.filter(c => c.display && !hiddenC.value.has(columnToken(c.field))))

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
 * ratio(比率)度量按百分比展示: 后端表达式是 分子聚合 / 分母聚合, 算出来是 0~1 的小数,
 * 直接显示小数不直观 ⇒ 乘 100 保留最多 2 位小数并去掉尾随零(0.9256→92.56%, 1→100%, 0→0%)
 */
const formatRatioPercent = (value: any): string => {
  const num = Number(value)
  if (isNaN(num)) {
    return String(value)
  }
  return `${Number((num * 100).toFixed(2))}%`
}

/**
 * 度量值格式化: 度量字段在 Portal 列配置为金额(fieldType=MONEY)时按 referenceDict "小数位,除数"换算
 * (如 2,10000 = 2位小数除以1万即万元), 与 Portal 单元格/汇总行同一 formatMoney;
 * ratio 度量按百分比展示(见 formatRatioPercent), 其余类型维持千分位通用格式。
 * 空值仍返回 ''(不渲染不钻取, 与 formatNumber 约定一致)
 */
const formatMeasure = (measure: PivotMeasureVO | undefined, value: any) => {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  // ratio 的 field 是"分子_over_分母"派生输出键, 不在列元数据里, 优先级高于 MONEY 判断
  if (measure?.agg === 'ratio') {
    return formatRatioPercent(value)
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
 * sum/count 跨组可加; min/max 取极值; avg/countDistinct/ratio 无法由聚合后的值推导(加权均值/跨组去重/比率不可加), 留空
 * row/col 两种布局的合计都必须走本函数, 禁止无脑求和(曾因 row 模式混算不同度量 + 对 avg 求和产生过垃圾总计)
 */
const aggregateByMeasure = (measure: PivotMeasureVO | undefined, nums: number[]): number | '' => {
  if (measure?.agg === 'min') {
    return nums.length ? Math.min(...nums) : ''
  }
  if (measure?.agg === 'max') {
    return nums.length ? Math.max(...nums) : ''
  }
  if (measure?.agg === 'avg' || measure?.agg === 'countDistinct' || measure?.agg === 'ratio') {
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
  const measure = measures.value.find((m) => measureKey(m) === property)
  if (!measure) {
    return undefined
  }
  const cells = effectivePivotColumns.value
    .filter((pv) => !isSubtotalColumn(pv))
    .map((pv) => row[`${pv.itemValue}__${measureKey(measure)}`])
  return cells.length === 1 ? cells[0] : aggregateByMeasure(measure, collectMeasureNums(cells))
}

const isBlankSortValue = (value: any) => value === null || value === undefined || value === ''

/**
 * 聚合结果行本地排序(仅在排序键无法下推后端时兜底)
 * 外层 ORDER BY 只认 group by 列与 ${透视列}__${度量} 别名: 度量跨多个透视列时同一度量有 N 个别名、
 * 没有"跨列合计"这一列可排, 此时才落到本地按聚合值排
 * 空值恒排末位(不随方向翻转); avg/countDistinct 多透视列不可推导时各项均为空→稳定排序自然回退后端原序
 */
const sortedRows = computed<any[]>(() => {
  const sort = defaultSort.value
  if (!sort) {
    return rows.value
  }
  // 后端已按本次输出的别名排好序(表头点击 或 默认排序命中可排别名)时不再本地重排:
  // 本地按"跨透视列聚合值"排, 后端按"单元格列"排, 口径不同, 双排会让后端结果失效
  if (backendSort.value) {
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

/** 下推后端的排序(聚合后外层 ORDER BY): 表头点击/默认排序为主序, 行维度配置排序退为次序 */
const pushDownSortList = computed<{ property: string; type: number }[]>(() => {
  const list = [...sortList.value]
  const bs = backendSort.value
  if (bs && !list.some((s) => s.property === bs.property)) {
    list.unshift(bs)
  }
  return list
})

// ==================== 表头点击排序(下推后端 ORDER BY) ====================
/**
 * 本次 SQL 输出中可被 ORDER BY 引用的列名集合(与后端 outputAliases 同口径):
 * 行维度字段名 + 每个 ${透视列标识}__${度量字段} 单元格别名。
 * row 模式(度量转行)每行熔接一个度量、pivotRow 模式(透视列转行)度量列混装全部透视值,
 * 同一列都没有唯一对应的 SQL 别名, 故度量别名不纳入(行维度仍可下推)
 */
const sortableAliases = computed(() => {
  const set = new Set<string>(groupFields.value)
  if (!isMeasureInRow.value && !isPivotInRow.value) {
    for (const pv of effectivePivotColumns.value) {
      for (const m of measures.value) {
        set.add(`${pv.itemValue}__${measureKey(m)}`)
      }
    }
  }
  return set
})

/** 表头点击产生的排序(单列): 0=正序 1=倒序, null=未点击 */
const headerSortClick = ref<{ property: string, type: number } | null>(null)

/** 生效的点击排序: 度量布局/透视列变更后旧点击键可能不再是本次输出别名, 后端会按列权限拒绝, 故在此丢弃 */
const headerSort = computed(() => {
  const click = headerSortClick.value
  return click && sortableAliases.value.has(click.property) ? click : null
})

/** 报表默认排序的 property 映射为可排别名(度量裸字段名仅在该度量只出现一次即单个透视列时有唯一别名) */
const resolveSortAlias = (property: string): string | null => {
  if (sortableAliases.value.has(property)) {
    return property
  }
  // pivotRow 模式: 下推单个透视值的别名只影响宽表行序、与熔接后展示列口径不符, 度量排序一律走本地聚合值
  if (!isMeasureInRow.value && !isPivotInRow.value && effectivePivotColumns.value.length === 1 &&
    measures.value.some(m => measureKey(m) === property)) {
    return `${effectivePivotColumns.value[0].itemValue}__${property}`
  }
  return null
}

/** 主排序键: 表头点击优先, 其次能被后端表达的默认排序; 两者都无则回退 sortedRows 本地排 */
const backendSort = computed<{ property: string, type: number } | null>(() => {
  if (headerSort.value) {
    return headerSort.value
  }
  const sort = defaultSort.value
  if (!sort) {
    return null
  }
  const alias = resolveSortAlias(sort.property)
  return alias ? { property: alias, type: sort.type } : null
})

/** 度量列注释: col 模式键与列生成同口径(${透视列标识}__${度量字段}), pivotRow 模式度量列独占表头键=度量输出键; row 模式度量熔进行里, 没有列头可挂注释 */
const measureDescMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  if (isMeasureInRow.value) {
    return map
  }
  if (isPivotInRow.value) {
    for (const m of measures.value) {
      if (m.desc) {
        map[measureKey(m)] = m.desc
      }
    }
    return map
  }
  for (const pv of effectivePivotColumns.value) {
    for (const m of measures.value) {
      if (m.desc) {
        map[`${pv.itemValue}__${measureKey(m)}`] = m.desc
      }
    }
  }
  return map
})

/** 自定义表头的列: 可点击排序 ∪ 配了列注释。一个 dataIndex 只能注册一个 headerCell 插槽 ⇒ 两种形态共用同一模板
 *  配了父节点的透视列会被包成 {title, children} 壳列(壳本身无 dataIndex)，统计列沉在末级
 *  ⇒ 必须递归收叶子，否则二层表头的列拿不到插槽，表头渲染成纯文本、点不动排序 */
const collectLeafDataIndexes = (cols: ColumnType[]): string[] =>
  cols.flatMap((col: any) => col.children?.length
    ? collectLeafDataIndexes(col.children)
    : (col.dataIndex ? [col.dataIndex as string] : []))

const headerSlotKeys = computed(() =>
  collectLeafDataIndexes(portalColumns.value)
    .filter(d => sortableAliases.value.has(d) || !!measureDescMap.value[d])
)

const isSortableHeader = (key: string) => sortableAliases.value.has(key)
const measureDesc = (key: string) => measureDescMap.value[key]

/** 点击表头: 正序 → 倒序 → 取消, 取消后回落到报表默认排序 */
const toggleSort = (alias: string) => {
  const click = headerSort.value
  if (!click || click.property !== alias) {
    headerSortClick.value = { property: alias, type: 0 }
  } else if (click.type === 0) {
    headerSortClick.value = { property: alias, type: 1 }
  } else {
    headerSortClick.value = null
  }
  loadData()
}

/** 表头点击: 只有可排序列响应, 纯注释列点了不产生副作用 */
const onHeaderClick = (key: string) => {
  if (isSortableHeader(key)) {
    toggleSort(key)
  }
}

/** 表头双箭头激活态: 复用 Portal 原生 sorter 的类名, 上色交给组件库与 dark.css, 不自定义颜色 */
const isSortAsc = (alias: string) => {
  const sort = headerSort.value
  return !!sort && sort.property === alias && sort.type === 0
}

const isSortDesc = (alias: string) => {
  const sort = headerSort.value
  return !!sort && sort.property === alias && sort.type === 1
}

/** s-table 原生 sorter 的提示文案正源(ConfigProvider 注入), 不另起一套中文 */
const [tableLocale] = useLocaleReceiver('Table')

/** 悬停提示与原生排序列同语义: 描述"下一次点击会发生什么" */
const sortTip = (alias: string) => {
  const locale = tableLocale.value
  if (isSortDesc(alias)) {
    return locale.cancelSort
  }
  if (isSortAsc(alias)) {
    return locale.triggerDesc
  }
  return locale.triggerAsc
}

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
    // Portal 配置的总计(summary)开关: pivotSummaryShow 未指定时总计行跟随它
    portalSummaryOn.value = configRes.payload.summary === '1'
    // 运行态列权限：一次性拉当前用户命中的隐藏 token（原表列 c: + 透视列 p:/m:），后续渲染/拼请求均据此过滤
    const [cSet, pmSet] = await Promise.all([
      resolveMyHiddenTokens(RESOURCE_TYPE_PORTAL_COLUMN, props.portalTableConfig.portalName),
      resolveMyHiddenTokens(RESOURCE_TYPE_PORTAL_PIVOT, props.portalTableConfig.portalName)
    ])
    hiddenC.value = cSet
    hiddenPM.value = pmSet
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
    // 配置链路走完才放行挂载（含"无行维度/无度量"的退化配置：那次 loadData 不会发查询，
    // 但仍要放行，退化成空表比永久空白好排查）
    firstLoadDone.value = true
  } catch (e) {
    console.error('加载透视报表配置失败:', e)
    // 配置加载异常也放行挂载, 避免表格永久空白(退化为 TOTAL 形态)
    pivotColumnLoaded.value = true
    firstLoadDone.value = true
  }
}

/** 列搜索(表头漏斗)条件: key=列 dataIndex, 值是一条可直接下发的条件 */
const columnFilters = ref<Record<string, { property: string, relation: number, value: unknown[] }>>({})

/**
 * 列搜索按列的归属分两路：
 * ${列标识}__${度量字段} 形态的是聚合输出别名 ⇒ 只能落在 HAVING(聚合后)，与后端 stripPivotHiddenColumns 同口径判形;
 * 其余是行维度列 ⇒ 落在 WHERE(聚合前)，与左侧筛选项同一层，会改变统计口径。
 */
const isAggregateAlias = (key: string) => key.includes('__')

// 切表/换透视列后旧键可能不再是本次输出别名，后端白名单会整条拒掉查询，故下发前先按别名集过滤
const columnFilterList = computed(() =>
  Object.values(columnFilters.value).filter(f => sortableAliases.value.has(f.property)))
const whereColumnFilters = computed(() => columnFilterList.value.filter(f => !isAggregateAlias(f.property)))
const havingColumnFilters = computed(() => columnFilterList.value.filter(f => isAggregateAlias(f.property)))

const onColumnFilterChanged = (values: unknown, dataIndex: unknown, relation: unknown) => {
  const key = String(dataIndex)
  const scalars = Array.isArray(values)
    ? values.filter(v => v !== null && v !== undefined && v !== '')
    : []
  if (scalars.length === 0) {
    delete columnFilters.value[key]
  } else {
    columnFilters.value[key] = { property: key, relation: Number(relation), value: scalars }
  }
  loadData()
}

/** 漏斗控件用的列描述: 行维度列若配了字典，换成字典多选(候选是编码，与库里原始列同口径，避免"看得见却搜不到") */
const filterColumnOf = (column: any) => {
  const map = dictOptionMap.value[column.dataIndex]
  if (!map) {
    return column
  }
  return {
    ...column,
    fieldType: FIELD_TYPE.SELECT,
    referenceDictOption: Object.entries(map).map(([value, label]) => ({ value, label }))
  }
}

/** 漏斗插槽取参(动态插槽名 vue-tsc 推不出类型，同 bodyCell 的 any 封装)：列描述按字典情况改写后交给条件控件 */
const filterSlotProps = (slot: any) => ({
  column: filterColumnOf(slot?.column),
  setSelectedKeys: slot?.setSelectedKeys,
  selectedKeysRef: slot?.selectedKeys,
  confirm: slot?.confirm,
  clearFilters: slot?.clearFilters
})

/** 可列搜索的叶子列(二层表头需递归; 壳列与前端算出的指标/合计列不在其中) */
const filterableLeafKeys = computed(() => {
  const keys: string[] = []
  const walk = (cols: ColumnType[]) => cols.forEach((col: any) => {
    if (col.children?.length) {
      walk(col.children)
    } else if (col.filterAble && col.dataIndex) {
      keys.push(col.dataIndex)
    }
  })
  walk(portalColumns.value)
  return keys
})

/** 组装请求并查询透视数据(透视列可为空, 空时退化为无条件总计列; 行维度可为空, 空时整个过滤集聚成一行总计) */
const loadData = async () => {
  if (!portalUrl.value || !measures.value.length) {
    // 参数没齐＝这次不该发（props.condition 的深度 watch 会在配置回来前先触发一次），
    // 更不能把 firstLoadDone 点亮：那会让 Portal 在空数据上挂载、列宽按下限快照后不再更新
    return
  }
  try {
    const req: PivotReqVO = {
      // 默认查询条件(sys_portal.default_condition)并入: 与通用列表路径同一配置正源
      condition: { conditionList: [...defaultConditions.value, ...props.condition, ...whereColumnFilters.value] },
      // 统计列过滤(聚合后): 后端按本次输出别名白名单校验，名单外直接拒
      havingCondition: havingColumnFilters.value.length > 0
        ? { andOr: '0', conditionList: havingColumnFilters.value }
        : undefined,
      // 行维度排序下推(聚合后 ORDER BY 行维度列, 两链路均支持); 度量排序后端无别名可排, 不在此列
      sortList: pushDownSortList.value.length > 0 ? pushDownSortList.value : undefined,
      groupColumns: groupFields.value.filter(f => !hiddenC.value.has(columnToken(f))).map(f => ({
        value: f,
        label: columnMetaMap.value[f]?.displayName || f
      })),
      pivotColumns: effectivePivotColumns.value.map(p => ({
        value: p.itemValue!,
        label: p.itemName!,
        condition: p.condition ? JSON.parse(p.condition) : {}
      })),
      measures: measures.value.map((m) => ({
        ...m,
        // 配置里存的是 JSON 串, 请求体要条件对象; 未配条件不传该键(后端按无条件处理)
        condition: parseMeasureCondition(m.condition)
      }))
    }
    const res = await pivotQuery(portalUrl.value, req)
    rows.value = res?.payload || []
  } catch (e) {
    console.error('透视聚合查询失败:', e)
    rows.value = []
  } finally {
    firstLoadDone.value = true
  }
}

watch(() => props.condition, () => {
  loadData()
}, { deep: true })

// ==================== 度量布局模式 ====================
/** 合成列 dataIndex: 度量名称列(仅 row 模式) */
const MEASURE_NAME_COL = '_measure_name'
/** 合成列 dataIndex: 透视值名目列(仅 pivotRow 模式, 行标识=透视列显示名) */
const PIVOT_NAME_COL = '_pivot_name'
/** 合成字段: 熔接行携带的透视列 itemValue(钻取定位用, 不渲染) */
const PIVOT_VALUE_COL = '_pivot_value'
/** 合成列 dataIndex 前缀: 透视列父链层级列(仅 pivotRow 模式, 竖排下父表头没有列头可挂 ⇒ 每层转一列) */
const PIVOT_PATH_COL = '_pivot_path_'
/** 合成字段: pivotRow 组内小计行标记(整行再聚合产物, 名目与数值加粗) */
const PIVOT_SUBTOTAL_KEY = '_pivot_subtotal'
/** 合成字段: pivotRow 小计行携带的段内透视列列表(钻取拼 OR 组条件用, 不渲染) */
const PIVOT_RUN_PVS_KEY = '_pivot_run_pvs'
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

/** 是否透视列转行模式: 布局配置为 pivotRow 时生效(每行=行维度×透视值, 度量仍作列) */
const isPivotInRow = computed(() =>
  props.portalTableConfig.pivotMeasureLayout === 'pivotRow'
)

/** 解析父链路径 JSON(自外向内 label 数组), 空/非法返回 []; 透视列(树形-多层生成落库)与度量(配置端「父表头」)同构 */
const parseGroupPath = (source: { groupPath?: string }): string[] => {
  if (!source.groupPath) {
    return []
  }
  try {
    const parsed = JSON.parse(source.groupPath)
    return Array.isArray(parsed) ? parsed.filter((s: any) => typeof s === 'string' && s) : []
  } catch (e) {
    return []
  }
}

// pivotRow 透视列部分(行维度+层级列+名目列)恒左冻结: 这些列就是行标识, 横向滚动时必须常驻
// (无横向滚动时冻结无感知; 度量列在该布局不右锁, 不触发 s-table 两侧锁定异常)

/** 透视列父链最大深度(竖排布局把父表头转成层级列时定列数): 全部透视列路径长度的最大值 */
const pivotPathDepth = computed(() => {  if (!hasPivotColumns.value) {
    return 0
  }
  let max = 0
  for (const pv of effectivePivotColumns.value) {
    const len = parseGroupPath(pv).length
    if (len > max) {
      max = len
    }
  }
  return max
})

/**
 * 按父链组装树形多层表头(row 模式无度量层, 列头即纯树)
 * 列序严格跟传入顺序(即配置行序): 只把「同父且相邻」的叶子包进 {title, children} 分组壳列
 * (无 dataIndex, 不参与汇总), 叶子列原样下沉为末级;
 * 同名父链被平铺列或其他组隔开时各自成壳(壳名相同), 不做跨位置聚拢, 平铺列与分组列按配置顺序穿插
 */
const buildGroupedColumns = (items: Array<{ path: string[]; col: ColumnType }>): ColumnType[] => {
  const buildLevel = (list: Array<{ path: string[]; col: ColumnType }>): ColumnType[] => {
    const res: ColumnType[] = []
    let i = 0
    while (i < list.length) {
      const item = list[i]
      if (item.path.length === 0) {
        res.push(item.col)
        i++
        continue
      }
      const groupTitle = item.path[0]
      const groupItems: Array<{ path: string[]; col: ColumnType }> = []
      let j = i
      while (j < list.length && list[j].path[0] === groupTitle) {
        groupItems.push({ path: list[j].path.slice(1), col: list[j].col })
        j++
      }
      res.push({ title: groupTitle, children: buildLevel(groupItems) } as unknown as ColumnType)
      i = j
    }
    return res
  }
  return buildLevel(items)
}

/** 某列在本次渲染数据里的全部显示值(与表格里看到的字符串一致，含字典翻译与度量格式化) */
const columnDisplayValues = (key: string | undefined): unknown[] =>
  key ? dataSource.value.map((row: any) => row?.[key]) : []

/**
 * 建列时实测列宽(表头文字 ∪ 本次显示值)
 * 此前聚合列只给 minWidth，而 Portal 的弹性列机制要求「所有渲染列都有数字 width」才启动
 * ⇒ 机制不启动、富余宽度被库摊到每一列 ⇒ 整表变胖。这里一次算足交给 Portal，
 * 由它把富余集中给最后一个非锁定列，表头/数据行/汇总行仍读同一份列宽。
 * 用运行期 parse() 同一个 getTextWidth，算完后那句 max() 就成了空转，不会再出现挂载后就地撑宽的错位。
 */
const measureColWidth = (title: string | undefined, values: unknown[], floor: number, iconPad = 0): number => {
  let widest = ''
  let widestScore = -1
  for (const value of values) {
    if (value === null || value === undefined) {
      continue
    }
    const text = String(value)
    // 先按显示宽度粗筛(CJK 记 2)，只测最长的一条，避免逐格建 canvas
    const score = text.length + (text.match(/[一-龥]/g)?.length ?? 0)
    if (score > widestScore) {
      widestScore = score
      widest = text
    }
  }
  // 表头腿不封顶(表头必须完整可见, getTextWidth 对 \n/\\n 取换行后最宽行, 与表头按 \n 拆行渲染同语义);
  // 数据腿封顶 360 防长文本撑爆; +28 = 左右内边距+余量, iconPad = 排序双箭头/漏斗+放大镜等常驻图标带
  const titleWidth = Math.ceil(getTextWidth(title || ''))
  const contentWidth = widestScore > 0 ? Math.min(Math.ceil(getTextWidth(widest)), 360 - 28 - iconPad) : 0
  return Math.max(Math.max(titleWidth, contentWidth) + 28 + iconPad, floor)
}

/** 标记本表所有叶子列的宽度已定死(递归进二层表头的壳列) */
const markWidthFitted = (list: ColumnType[]): void => list.forEach((col: any) =>
  col.children?.length ? markWidthFitted(col.children) : (col.widthFitted = true))

/**
 * Portal 动态列: 行维度列 + 度量子列
 * col模式: 行维度 + (透视列×度量) 横向平铺
 * row模式: 行维度 + 指标名称列 + 透视列(每列一个度量值)
 * pivotRow模式: 行维度 + 透视值名目列 + 度量列(每行=行维度×透视值)
 * 宽度分工: 全部列都在建列时按「表头 ∪ 本次显示值」实测出确定 width(行维度列以配置宽度为下限)，
 * 富余宽度交给 Portal 的弹性列机制集中到最后一个非锁定列；行维度配置宽度 0 则指定该列为自动填充列
 * (与普通表「0为自动」同契约: 只落 minWidth，弹性机制见缺数字 width 收手、富余全进此列)
 * (表头是 table 会摊分剩余宽度、数据行是定宽 div，列宽必须在建列时定死、两边才同源)
 */
const portalColumns = computed(() => {
  const cols: ColumnType[] = []
  const multiMeasure = measures.value.length > 1
  const hasPivot = hasPivotColumns.value
  let order = 2
  // 行维度只渲染显示字段(隐藏字段仍参与 group by，用于行粒度细化/筛选目标)
  for (const cfg of visibleGroupFieldConfigs.value) {
    const meta = columnMetaMap.value[cfg.field]
    const dimTitle = meta?.displayName || cfg.field
    // 配置宽度 0 = 指定此列为自动填充列(与普通表「0为自动」同契约): 只落 minWidth 不落 width，
    // Portal 弹性列机制见有列缺数字 width 会收手不降末列 ⇒ 富余宽度进此列，末列保持实测宽
    const elastic = meta?.width === 0
    const measured = measureColWidth(dimTitle, columnDisplayValues(cfg.field), 140, HEADER_ICON_PAD_SORT + HEADER_ICON_PAD_FILTER)
    cols.push({
      title: dimTitle,
      dataIndex: cfg.field,
      key: cfg.field,
      ...(elastic
        ? { minWidth: measured }
        : {
            // 配置宽度当下限：配宽的列不缩，内容更长的列在建列时一次撑足(不在挂载后就地改)
            // 行维度表头常驻 排序双箭头+列搜索漏斗+放大镜, 图标带计入宽度
            width: Math.max(meta?.width || 140, measured)
          }),
      // fixed 归一化为 'left': surely-vue 粘性定位按字符串比较("left"===fixed), 布尔 true 在部分路径不参与冻结计算;
      // pivotRow 布局行维度恒左冻结(透视列部分=行标识)
      fixed: isPivotInRow.value ? 'left' : (cfg.fixed ? 'left' : false),
      fieldType: FIELD_TYPE.INPUT,
      tooltip: false,
      order: order++,
      editable: false,
      sorter: false,
      // 行维度列可列搜索: 打在聚合前(WHERE)，配了字典的走编码多选、否则走文本 LIKE
      filterAble: true,
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
      width: measureColWidth('指标', columnDisplayValues(MEASURE_NAME_COL), 120),
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
        width: measureColWidth('合计', columnDisplayValues(TOTAL_COL), 120),
        fieldType: FIELD_TYPE.NUMBER,
        // 表头由库居中，数字右对齐会在列宽收紧后看着与表头错位 ⇒ 同向居中
        contentAlign: 'center',
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
        width: measureColWidth(pv.itemName || pv.itemValue, columnDisplayValues(pv.itemValue), 140),
        fieldType: FIELD_TYPE.NUMBER,
        // 表头由库居中，数字右对齐会在列宽收紧后看着与表头错位 ⇒ 同向居中
        contentAlign: 'center',
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
  } else if (isPivotInRow.value) {
    // === pivotRow 模式: 行维度 + 透视列父链层级列 + 透视值名目列 + 度量列(每行=行维度×透视值) ===
    // 透视列父链在竖排下没有列头可挂 ⇒ 逐层转成行维度后的层级列; 表头置空(组标签语义靠行内文字自明, 配置也无正源名)
    for (let level = 0; level < pivotPathDepth.value; level++) {
      const pathKey = `${PIVOT_PATH_COL}${level}`
      cols.push({
        title: '',
        dataIndex: pathKey,
        key: pathKey,
        width: measureColWidth('', columnDisplayValues(pathKey), 120),
        fixed: 'left',
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
    // 名目列仅在有真实透视列时渲染: 无透视列退化 total 列时没有可标识的值, 挂出来只会全是空;
    // 表头置空(值即名目), 汇总行「总计」标签也落在本列(经 summaryLabelColumn 转发)
    if (hasPivot) {
      cols.push({
        title: '',
        dataIndex: PIVOT_NAME_COL,
        key: PIVOT_NAME_COL,
        width: measureColWidth('', columnDisplayValues(PIVOT_NAME_COL), 120),
        fixed: 'left',
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
    // 度量列: 竖排下度量仍是列、有列头可挂 ⇒ 配了父链走壳列出二层表头(叶子标题仍是度量显示名);
    // 全空保持平铺(与 col 分支同一判据, 未配父表头的老报表零变化)
    const rowMeasureItems = measures.value.map((m) => {
      const mKey = measureKey(m)
      const mTitle = measureTitle(m.field, m.label)
      return {
        path: parseGroupPath(m),
        col: {
          title: mTitle,
          dataIndex: mKey,
          key: mKey,
          width: measureColWidth(mTitle, columnDisplayValues(mKey), 120),
          fixed: m.fixed === true ? 'right' : false,
          fieldType: FIELD_TYPE.NUMBER,
          // 表头由库居中，数字右对齐会在列宽收紧后看着与表头错位 ⇒ 同向居中
          contentAlign: 'center',
          tooltip: false,
          order: order++,
          editable: false,
          sorter: false,
          // 度量列在本布局混装全部透视值, 无唯一 SQL 别名 ⇒ 不开排序/列搜索(口径见 sortableAliases)
          filterAble: false,
          addShow: false,
          editShow: false,
          detailShow: false
        } as ColumnType
      }
    })
    if (rowMeasureItems.some(it => it.path.length > 0)) {
      cols.push(...buildGroupedColumns(rowMeasureItems))
    } else {
      for (const it of rowMeasureItems) {
        cols.push(it.col)
      }
    }
    // 壳列补 order(Portal 按值排序): 平铺时与逐列 order++ 同序同值、行零变化; 分组时叶子序号已被壳列顶乱, 统一按终序重编
    cols.forEach((c, idx) => {
      c.order = idx + 2
    })
  } else {
    // === col 模式(原逻辑): 行维度 + 透视列×度量 ===
    const colItems: Array<{ path: string[]; col: ColumnType }> = []
    for (const pv of effectivePivotColumns.value) {
      const gp = parseGroupPath(pv)
      for (const m of measures.value) {
        const cellKey = `${pv.itemValue}__${measureKey(m)}`
        const cellTitle = multiMeasure || !hasPivot ? measureTitle(m.field, m.label) : pv.itemName
        const mp = parseGroupPath(m)
        // 父链拼接(自外向内): 透视列父链 → 透视列名(多度量时叶子让位给度量名, 补进链里保层级) → 度量父链;
        // 任一层配了路径就走壳列通路, 全空才平铺并让 displayGroupName 接管单层分组
        const useExplicitPath = gp.length > 0 || mp.length > 0
        const path = useExplicitPath
          ? [...gp, ...(multiMeasure ? [pv.itemName || pv.itemValue] : []), ...mp]
          : []
        colItems.push({
          path,
          col: {
            title: cellTitle,
            dataIndex: cellKey,
            key: cellKey,
            // 统计列表头常驻 排序双箭头+列搜索漏斗+放大镜, 图标带计入宽度
            width: measureColWidth(cellTitle, columnDisplayValues(cellKey), 120, HEADER_ICON_PAD_SORT + HEADER_ICON_PAD_FILTER),
            fixed: m.fixed === true ? 'right' : false,
            fieldType: FIELD_TYPE.NUMBER,
            // 表头由库居中，数字右对齐会在列宽收紧后看着与表头错位 ⇒ 同向居中
            contentAlign: 'center',
            // 层级已由 path 壳列表达时不再写 displayGroupName，避免与按分组名包壳的通路叠加出多余一层
            displayGroupName: !useExplicitPath && hasPivot && multiMeasure ? pv.itemName : undefined,
            tooltip: false,
            order: order++,
            editable: false,
            sorter: false,
            // 统计列可列搜索: 打在聚合后(HAVING)，数字区间控件
            filterAble: true,
            addShow: false,
            editShow: false,
            detailShow: false
          } as ColumnType
        })
      }
    }
    if (colItems.some(it => it.path.length > 0)) {
      cols.push(...buildGroupedColumns(colItems))
    } else {
      for (const it of colItems) {
        cols.push(it.col)
      }
    }
  }
  // 列宽已在上面按「表头 ∪ 显示值」定死，标记后 Portal 装载数据时不再逐格就地撑宽
  markWidthFitted(cols)
  // 🔍 临时诊断(锁定方向排查): 列定义出口的 fixed 取值, 控制台按 [pivot-lock] 过滤; 排查完移除
  console.log('[pivot-lock] 列定义', JSON.parse(JSON.stringify(cols.map(c => ({
    key: c.dataIndex ?? c.title,
    fixed: c.fixed,
    children: (c as any).children?.map((k: any) => ({ key: k.dataIndex ?? k.title, fixed: k.fixed })),
  })))))
  return cols
})

let pivotRowKeySeq = 0
/** 表格数据: col模式直接映射; row模式熔接(每行×每度量=一行); pivotRow模式熔接透视值(每行×每透视列=一行); 熔接腿都带伪合并(组内首行显示维度值) */
const dataSource = computed(() => {
  // 行源统一下移到 sortedRows: 未配默认排序时直接返回 rows, 不产生额外拷贝
  if (isPivotInRow.value) {
    // === pivotRow 模式: 熔接透视值(每行=行维度×透视值) + 伪合并(组内首行显示维度值) + 父链分段小计 ===
    // 小计列(_gt_前缀)是组内叶子的再聚合, 熔进主序列会与叶子行重复 ⇒ 只熔真实透视列
    const pathDepth = pivotPathDepth.value
    const pathKeys = Array.from({ length: pathDepth }, (_, i) => `${PIVOT_PATH_COL}${i}`)
    const melted: any[] = []
    const lastGroupValues: Record<string, any> = {}
    // 组内小计: 每个原始行的透视列序列按父链全路径分段, 段尾(父链切换或行末)落一行小计;
    // 单列段不出(小计=重复叶子行); 父链全空的段(没配父表头的列凑成的段)不出小计——它们只是没组可归,
    // 不构成一个组(整表合计走汇总行); pivotTotalPos='none' 时配置了「不显示小计」, 全部抑制;
    // 小计位置复用 pivotTotalPos(与 row 布局合计列左/右同一字段): first=段首(叶子行之前), last=段尾(默认);
    // 组名每段只出现一次: first 时挂总计行(叶子行全空), 否则挂组内首行(总计行路径格空), 不重复出现
    const isSamePath = (a: string[], b: string[]) => pathKeys.every((_, i) => (a[i] ?? '') === (b[i] ?? ''))
    let runPvs: Array<PortalPivotColumnVO> = []
    let runRows: any[] = []
    let runPath: string[] = []
    const flushSubtotal = (row: any) => {
      const pvs = runPvs
      const rows = runRows
      runPvs = []
      runRows = []
      // pivotTotalPos='none'(配置「不显示小计」)时整段抑制小计, 行序仍按父链分段伪合并
      const subtotalFirst = props.portalTableConfig.pivotTotalPos === 'first'
      const subtotalOff = props.portalTableConfig.pivotTotalPos === 'none'
      const hasSubtotal = !subtotalOff && pathDepth > 0 && pvs.length >= 2 && runPath.length > 0
      if (hasSubtotal && subtotalFirst) {
        // 小计在前: 组名由总计行携带, 段内叶子行的父链格全部留空
        for (const r of rows) {
          for (const key of pathKeys) {
            r[key] = ''
          }
        }
      } else {
        // 小计在后(或单列段无小计): 组名挂段内首行, 其余行留空
        for (let i = 1; i < rows.length; i++) {
          for (const key of pathKeys) {
            rows[i][key] = ''
          }
        }
      }
      if (!hasSubtotal) {
        melted.push(...rows)
        return
      }
      const item: any = {}
      item[AUTO_UUID_ROW_KEY] = `pivot-row-${++pivotRowKeySeq}`
      // 小计可钻取(同 row 布局合计列口径): 携带所属原始行(行维度取值)与段内透视列列表(拼 OR 组条件);
      // 不挂 PIVOT_VALUE_COL(小计不对应单一透视列, 普通分支反查不到时自然短路)
      item[RAW_ROW_REF_KEY] = row
      item[PIVOT_RUN_PVS_KEY] = pvs
      for (let level = 0; level < pathDepth; level++) {
        item[pathKeys[level]] = subtotalFirst ? (runPath[level] ?? '') : ''
      }
      item[PIVOT_NAME_COL] = '总计'
      item[PIVOT_SUBTOTAL_KEY] = true
      for (const m of measures.value) {
        const key = measureKey(m)
        item[key] = formatMeasure(m, aggregateByMeasure(m, collectMeasureNums(pvs.map((pv) => row[`${pv.itemValue}__${key}`]))))
      }
      if (subtotalFirst) {
        melted.push(item, ...rows)
      } else {
        melted.push(...rows, item)
      }
    }
    for (const row of sortedRows.value) {
      for (const pv of effectivePivotColumns.value) {
        if (isSubtotalColumn(pv)) {
          continue
        }
        const gp = parseGroupPath(pv)
        if (runPvs.length && !isSamePath(runPath, gp)) {
          flushSubtotal(row)
        }
        if (!runPvs.length) {
          runPath = gp
        }
        runPvs.push(pv)
        const item: any = {}
        item[AUTO_UUID_ROW_KEY] = `pivot-row-${++pivotRowKeySeq}`
        item[RAW_ROW_REF_KEY] = row
        // 钻取定位用: 该行对应的透视列 itemValue(名目列显示的是 itemName)
        item[PIVOT_VALUE_COL] = pv.itemValue
        // 行维度: 伪合并——同一聚合行熔出的多行里只在首行显示文字, 后续行留空
        for (const f of visibleGroupFields.value) {
          const translated = translate(f, row[f])
          if (lastGroupValues[f] === translated) {
            item[f] = ''
          } else {
            item[f] = translated
          }
          lastGroupValues[f] = translated
        }
        // 父链层级列: 先写原值, 显示层"组名每段只出现一次"由段尾 flush 统一分配(挂小计行或组内首行)
        for (let level = 0; level < pathDepth; level++) {
          item[pathKeys[level]] = gp[level] ?? ''
        }
        item[PIVOT_NAME_COL] = pv.itemName || pv.itemValue
        for (const m of measures.value) {
          item[measureKey(m)] = formatMeasure(m, row[`${pv.itemValue}__${measureKey(m)}`])
        }
        // 叶子行先攒进段缓冲, 段尾 flush 时按 pivotTotalPos 决定小计行落在段首还是段尾
        runRows.push(item)
      }
      flushSubtotal(row)
      // 切换原始行时重置合并状态(下一组的第一行重新显示文字)
      for (const f of visibleGroupFields.value) {
        lastGroupValues[f] = undefined
      }
    }
    return melted
  }
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
          const key = `${pv.itemValue}__${measureKey(m)}`
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
      item[MEASURE_NAME_COL] = measureSingleLine(m.field, m.label)
      // 每个透视列对应的度量值
      // 小计列(_gt_前缀)参与列输出, 但不并入横向合计(避免叶子+小计重复累加)
      const totalSourcePvs = effectivePivotColumns.value.filter((pv) => !isSubtotalColumn(pv))
      for (const pv of effectivePivotColumns.value) {
        const srcKey = `${pv.itemValue}__${measureKey(m)}`
        item[pv.itemValue!] = formatMeasure(m, row[srcKey])
      }
      // 合计列: 同一度量跨透视列的横向聚合(按度量自身 agg 语义, avg/countDistinct 不可推导留空)
      item[TOTAL_COL] = formatMeasure(
        m,
        aggregateByMeasure(m, collectMeasureNums(totalSourcePvs.map((pv) => row[`${pv.itemValue}__${measureKey(m)}`])))
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

// ==================== 总计行(最底汇总行)显隐 ====================
// 所绑 Portal 配置的 summary 开关值(loadConfig 时捕获), 作为 pivotSummaryShow 未指定时的默认口径
const portalSummaryOn = ref(false)
// 总计行显隐: '1'=显示 '0'=隐藏 空=跟随Portal配置; 经 summaryVisible prop 强制 Portal 的汇总行判定
const summaryRowShow = computed(() => {
  const show = props.portalTableConfig.pivotSummaryShow
  if (show === '1') {
    return true
  }
  if (show === '0') {
    return false
  }
  return portalSummaryOn.value
})

/** 汇总行数据 */
const summaryData = computed(() => {  const summary: Record<string, any> = {}
  if (isMeasureInRow.value) {
    // row 模式不出总计行: 列容器纵向堆叠多个度量(不同量纲), 单行汇总无论按列还是混算都语义错误;
    // 跨 group 的总计坐标是 (度量, 透视列), 天然形状为 N 行, summaryData 一行结构装不下;
    // 横向合计已由合计列(TOTAL_COL)承担
    return summary
  }
  if (isPivotInRow.value) {
    // pivotRow 模式: 行源=每透视列一行, 无行维度时也不是单行总计 ⇒ 汇总依然成立(各度量跨全部透视值);
    // 唯一例外: 无行维度且无真实透视列(退化 total 单行), 再叠汇总=原值重复
    if (!hasPivotColumns.value && visibleGroupFields.value.length === 0) {
      return summary
    }
    // 度量列独立汇总(列内同度量同量纲), 范围=该度量跨全部真实透视列的总计;
    // 小计列(_gt_)是组内叶子再聚合, 并入会重复累加 ⇒ 与 row 模式横向合计同口径剔除
    const totalSourcePvs = effectivePivotColumns.value.filter((pv) => !isSubtotalColumn(pv))
    for (const m of measures.value) {
      const key = measureKey(m)
      summary[key] = formatMeasure(
        m,
        aggregateByMeasure(m, collectMeasureNums(rows.value.flatMap((row) => totalSourcePvs.map((pv) => row[`${pv.itemValue}__${key}`]))))
      )
    }
    return summary
  }
  // col 模式无可见行维度: 聚合结果只有一行且本身就是总计, 再叠一行汇总=原值重复;
  // 且 PortalSummary 的「总计」标签固定占首个数据列的格子, 无维度列时会吃掉第一个度量列的汇总值
  if (visibleGroupFields.value.length === 0) {
    return summary
  }
  // col 模式: 每个 ${pv}__${measure} 列独立汇总(列内同度量同量纲)
  for (const pv of effectivePivotColumns.value) {
    for (const m of measures.value) {
      const key = `${pv.itemValue}__${measureKey(m)}`
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
  if (isPivotInRow.value) {
    // pivotRow 模式: 插槽按度量输出键定位(每列独占一个度量)
    return measures.value.map(m => measureKey(m))
  }
  // col 模式: ${透视列}__${度量输出键}
  return effectivePivotColumns.value.flatMap(pv => measures.value.map(m => `${pv.itemValue}__${measureKey(m)}`))
})

/** 动态列必须就绪后才能挂载 Portal(Portal 仅在初始化时读取 customColumns; 透视列可为空=退化为总计列, 行维度可为空=单行总计表) */
const ready = computed(() =>
  !!portalUrl.value &&
  pivotColumnLoaded.value &&
  // 列宽在建列时按显示值实测，而 Portal 只在 initConfig 读一次 customColumns（没有 watch）
  // ⇒ 必须等首轮数据到位再挂载，否则整表按各列下限起步、之后再也更新不了（部门折行就是这么来的）
  !!firstLoadDone.value &&
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

/**
 * 条件 JSON → 钻取条件数组(透视列条件与度量条件共用)
 * 条件间关系存的是整组的关系('0'=与 '1'=或)；「或」时包成组节点下发，拍平会被请求层的 AND 语义吞掉
 * 老数据无该字段 ⇒ 与，返回值与原来逐字节一致
 */
const parseConditionJsonToList = (raw: any, scene: string): ConditionListType[] => {
  const parsed = parseConditionJsonObject(raw, scene)
  if (!parsed) {
    return []
  }
  let list: ConditionListType[] = []
  if (Array.isArray(parsed?.conditionList)) {
    list = parsed.conditionList
  } else if (parsed?.property) {
    list = [parsed]
  }
  return parsed?.andOr === '1' && list.length > 1 ? [{ andOr: '1', conditionList: list }] : list
}

/** ② 透视列条件(CASE WHEN 的列条件, JSON 存储的 ConditionListType) */
const parsePivotColumnCondition = (pv: PortalPivotColumnVO): ConditionListType[] =>
  parseConditionJsonToList(pv.condition, '透视列')

/** ② 度量自身条件(与列条件同口径, 钻取时必须一并带上才能与单元格数字对齐) */
const parseMeasureConditionList = (measure?: PivotMeasureVO): ConditionListType[] =>
  parseConditionJsonToList(measure?.condition, '度量')

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
 * 数据行钻取条件: ① 默认查询条件(sys_portal.default_condition)+全局筛选(props.condition) ② 透视列条件(合计列钻取不带) ③ 度量自身条件 ④ 行维度原始值 ⑤ 求和度量的零值过滤(可选)
 * 前四者 AND 合并, 与透视聚合 SQL 的 WHERE(先于 group by) + CASE WHEN(行内条件) + GROUP BY(行维度) 语义严格对齐;
 * ⑤ 只减掉对合计无贡献的行, 所以钻取列表的该列合计仍与单元格一致(但行数不再等于贡献行数)
 * rawRow 必须取 record 上携带的原始聚合行引用: sortedRows 本地排序后渲染行序 ≠ rows 后端返回序,
 * 按渲染 index 反查 rows 会张冠李戴(显示 level 1 的行, 钻取却拼出 level 3 的条件)
 */
const buildDrillCondition = (rawRow: any, pv: PortalPivotColumnVO | undefined, measure?: PivotMeasureVO): ConditionListType[] => {
  const list: ConditionListType[] = [
    ...defaultConditions.value,
    ...props.condition,
    ...(pv ? parsePivotColumnCondition(pv) : []),
    ...parseMeasureConditionList(measure)
  ]
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

/**
 * pivotRow 组内小计行钻取条件: ①全局 ②段内各透视列条件包 OR 组——每个透视列的条件先包 AND 节点,
 * 防止单透视列多条件在 OR 层被拆散 ③度量自身条件 ④行维度原始值(小计仍属于其原始行的维度上下文)
 * ⑤求和度量零值过滤(可选, 与叶子钻取同口径)
 * kernel/forge 两条 SQL 构建路径均递归支持组节点(括号嵌套), 与 parseConditionJsonToList 产出的组节点同构
 */
const buildSubtotalDrillCondition = (rawRow: any, runPvs: PortalPivotColumnVO[], measure?: PivotMeasureVO): ConditionListType[] => {
  const orBranches: ConditionListType[] = runPvs
    .map((pv) => parsePivotColumnCondition(pv))
    .filter((conds) => conds.length > 0)
    .map((conds) => ({ andOr: '0', conditionList: conds }))
  const list: ConditionListType[] = [
    ...defaultConditions.value,
    ...props.condition,
    ...(orBranches.length ? [{ andOr: '1', conditionList: orBranches }] : []),
    ...parseMeasureConditionList(measure)
  ]
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
  const measureLabel = (!hasPivotColumns.value || measures.value.length > 1) && measure ? measureSingleLine(measure.field, measure.label) : ''
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
  if (isPivotInRow.value) {
    // pivotRow 模式: key=度量输出键, 透视列从熔接行携带的字段反查
    const measure = measures.value.find(m => measureKey(m) === key)
    if (!measure) {
      return
    }
    if (record?.[PIVOT_SUBTOTAL_KEY]) {
      // 组内小计行: 钻取=段内全部透视列的明细(各透视列条件包 OR 组), 行维度按所属原始行取值(同 row 布局合计列可钻口径)
      const runPvs: Array<PortalPivotColumnVO> = record?.[PIVOT_RUN_PVS_KEY] || []
      if (!runPvs.length) {
        return
      }
      const pathKeys = Array.from({ length: pivotPathDepth.value }, (_, i) => `${PIVOT_PATH_COL}${i}`)
      const pathLabel = pathKeys.map((k) => String(record?.[k] || '')).filter(Boolean).join(' / ')
      drillTitle.value = `${[pathLabel, measureSingleLine(measure.field, measure.label)].filter(Boolean).join(' · ')} - 组内明细`
      drillCondition.value = { conditionList: buildSubtotalDrillCondition(rawRow, runPvs, measure), andOr: '0' }
      drillOpen.value = true
      return
    }
    const itemValue = record?.[PIVOT_VALUE_COL]
    const pv = effectivePivotColumns.value.find(p => p.itemValue === itemValue)
    if (!pv) {
      return
    }
    drillTitle.value = buildDrillTitle(pv, itemValue, measure, measure.field, '明细数据')
    drillCondition.value = { conditionList: buildDrillCondition(rawRow, pv, measure), andOr: '0' }
  } else if (isMeasureInRow.value) {
    // row 模式: key=pv.itemValue(或合计列), index是熔接后的行号, 仅用于定位当前度量
    const measureCount = measures.value.length
    const measureIdx = index % measureCount
    const measure = measures.value[measureIdx]
    if (!measure) {
      return
    }
    if (key === TOTAL_COL) {
      // 合计列: 该组该度量跨全部透视列的明细 → 不带透视列条件(②)
      // 无行维度时组标签为空, 过滤后只剩度量名, 标题不出现悬空的 " · " 前缀
      drillTitle.value = `${[buildGroupLabel(rawRow), measureSingleLine(measure.field, measure.label)].filter(Boolean).join(' · ')} - 全部分类明细`
      drillCondition.value = { conditionList: buildDrillCondition(rawRow, undefined, measure), andOr: '0' }
      drillOpen.value = true
      return
    }
    const pv = effectivePivotColumns.value.find(p => p.itemValue === key)
    if (!pv) {
      return
    }
    drillTitle.value = `${pv.itemName || key} · ${measureSingleLine(measure.field, measure.label)} - 明细数据`
    drillCondition.value = { conditionList: buildDrillCondition(rawRow, pv, measure), andOr: '0' }
  } else {
    // col 模式: key=${itemValue}__${度量输出键}
    const sepIdx = key.indexOf('__')
    const itemValue = key.substring(0, sepIdx)
    const measureField = key.substring(sepIdx + 2)
    const pv = effectivePivotColumns.value.find(p => p.itemValue === itemValue)
    const measure = measures.value.find(m => measureKey(m) === measureField)
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
  if (isPivotInRow.value) {
    // pivotRow 模式: 汇总=该度量跨全部透视值的总计, 不对应单一透视列 ⇒ 不带②, 拼 ①+③(+零值)
    const measure = measures.value.find(m => measureKey(m) === key)
    if (!measure) {
      return
    }
    drillTitle.value = `${measureSingleLine(measure.field, measure.label)} - 全部明细`
    const summaryConditionList: ConditionListType[] = [
      ...props.condition,
      ...parseMeasureConditionList(measure)
    ]
    const zeroCond = buildMeasureZeroCondition(measure)
    if (zeroCond) {
      summaryConditionList.push(zeroCond)
    }
    drillCondition.value = { conditionList: summaryConditionList, andOr: '0' }
  } else if (isMeasureInRow.value) {
    // row 模式: key=pv.itemValue
    const pv = effectivePivotColumns.value.find(p => p.itemValue === key)
    if (!pv) {
      return
    }
    drillTitle.value = `${pv.itemName || key} - 全部明细`
    // row 模式下汇总行单元格不对应单一度量, 无法确定按哪个度量列滤零, 故不附加零值条件
    drillCondition.value = { conditionList: [...props.condition, ...parsePivotColumnCondition(pv)], andOr: '0' }
  } else {
    // col 模式: key=${itemValue}__${度量输出键}
    const sepIdx = key.indexOf('__')
    const itemValue = key.substring(0, sepIdx)
    const measureField = key.substring(sepIdx + 2)
    const pv = effectivePivotColumns.value.find(p => p.itemValue === itemValue)
    const measure = measures.value.find(m => measureKey(m) === measureField)
    if (!pv) {
      return
    }
    drillTitle.value = buildDrillTitle(pv, itemValue, measure, measureField, '全部明细')
    const summaryConditionList: ConditionListType[] = [
      ...props.condition,
      ...parsePivotColumnCondition(pv),
      ...parseMeasureConditionList(measure)
    ]
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
/** 统计格对齐：自定义 bodyCell 插槽会整格接管，不显式写对齐就退回默认左对齐（口径取列配置的 contentAlign） */
const cellAlign = (slot: any) => slot?.column?.contentAlign || 'center'

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
      :summary-visible="summaryRowShow"
      :download-file-name="getDownloadFileName"
      :action-width="0"
      :index-width="0"
      :page-size="50"
      :hide-export="props.portalTableConfig.downloadAble === '0'"
      :advance="false"
      :multi-header="!isMeasureInRow && !isPivotInRow && pivotColumns.length > 0 && measures.length > 1"
      :summary-label-column="isPivotInRow ? PIVOT_NAME_COL : undefined"
      read-only
      :row-key-field="AUTO_UUID_ROW_KEY"
      hide-import
      hide-refresh
      hide-row-selection
    >
      <!-- 自定义表头: 可排序列点击切换 正序→倒序→取消(每次重新下推 sortList 由后端 ORDER BY 全量排序),
           双箭头复用 @surely-vue/table 的 sorter 类名(库样式全局引入) ⇒ 与 Portal 原生排序列同形态、同配色;
           配了列注释的度量列在标题后挂问号 tooltip ⇒ 两种形态共用一个插槽模板 -->
      <template
        v-for="key in headerSlotKeys"
        :key="`header-${key}`"
        #[`headerCell_${key}`]="{ title }"
      >
        <span
          :class="['pivot-sort-header', { 'pivot-sort-static': !isSortableHeader(key) }]"
          @click="onHeaderClick(key)"
        >
          <span class="pivot-sort-label">
            <!-- 标题含 \n(含字面)时逐行渲染, 与 Portal 普通表头同语义; 单行保持原有整串截断 -->
            <span
              v-if="headerTitleLines(title).length > 1"
              class="pivot-sort-title pivot-sort-title-multi"
            >
              <div
                v-for="(line, i) in headerTitleLines(title)"
                :key="i"
              >{{ line }}</div>
            </span>
            <span
              v-else
              class="pivot-sort-title"
            >{{ title }}</span>
            <a-tooltip
              v-if="measureDesc(key)"
              :title="measureDesc(key)"
            >
              <question-circle-outlined
                class="pivot-header-desc"
                @click.stop
              />
            </a-tooltip>
          </span>
          <a-tooltip
            v-if="isSortableHeader(key)"
            :title="sortTip(key)"
          >
            <span class="surely-table-column-sorter surely-table-column-sorter-full">
              <span class="surely-table-column-sorter-inner">
                <caret-up-outlined
                  :class="['surely-table-column-sorter-up', { active: isSortAsc(key) }]"
                />
                <caret-down-outlined
                  :class="['surely-table-column-sorter-down', { active: isSortDesc(key) }]"
                />
              </span>
            </span>
          </a-tooltip>
        </span>
      </template>
      <!-- 列搜索(表头漏斗): 控件复用 Portal 的列条件组件，但条件收回本组件按列归属分两路下发
           (行维度→WHERE、统计列→HAVING)。不走 Portal 内部 queryConditionMap——那条腿只服务
           Portal 自己发查询的链路，透视的查询在本组件 -->
      <template
        v-for="key in filterableLeafKeys"
        :key="`filter-${key}`"
        #[`customFilterDropdown_${key}`]="filterSlot"
      >
        <portal-column-condition
          v-bind="filterSlotProps(filterSlot)"
          @handle-search-condition-changed="onColumnFilterChanged"
        />
      </template>
      <!-- 度量单元格: 非空数字可点击钻取明细(动态插槽覆盖所有度量列);
           组内小计行同可钻(钻段内全部透视列明细, 同 row 布局合计列), 仅加粗区分 -->
      <template
        v-for="key in measureKeys"
        :key="key"
        #[`bodyCell_${key}`]="cellSlot"
      >
        <span
          v-if="cellRecord(cellSlot)?.[key] !== '' && cellRecord(cellSlot)?.[key] != null"
          class="pivot-drill-cell"
          :style="{ display: 'block', textAlign: cellAlign(cellSlot), fontWeight: cellRecord(cellSlot)?.[PIVOT_SUBTOTAL_KEY] ? 600 : undefined }"
          @click="openDrill(cellRecord(cellSlot), cellIndex(cellSlot), key)"
        >{{ cellRecord(cellSlot)?.[key] }}</span>
      </template>
      <!-- 名目列: 小计行的「总计」加粗, 叶子行维持默认文本渲染(该列内容在建列时已按最宽值定宽) -->
      <template #[`bodyCell_${PIVOT_NAME_COL}`]="cellSlot">
        <div :style="cellRecord(cellSlot)?.[PIVOT_SUBTOTAL_KEY] ? { fontWeight: 600 } : undefined">
          {{ cellRecord(cellSlot)?.[PIVOT_NAME_COL] }}
        </div>
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

// 可排序表头: 箭头形态与配色全部交给 @surely-vue/table 的 sorter 类名(main.ts 全局引入库样式)
// 与 dark.css 的既有规则, 本组件只管布局(标题+问号+箭头整体居中)与手型 ⇒ 与 Portal/index.vue 原生排序列同观感
.pivot-sort-header {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: pointer;
  user-select: none;

  &.pivot-sort-static {
    cursor: default;
  }

  // 标题与注释问号同属一组, 与箭头一起整体居中; 窄列下由标题承担截断
  // 箭头与标题的间距由库的 .surely-table-column-sorter{margin-left:8px} 提供, 此处不再叠加 gap
  .pivot-sort-label {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }

  .pivot-sort-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 字面 \n 拆行标题(与 Portal 普通表头同语义): 逐行 div, 行内超宽仍逐行省略
  .pivot-sort-title-multi {
    div {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // 问号图标: 字号与库的排序箭头(11px)对齐, 颜色交给 antd 图标默认色与 dark.css 的表头规则
  .pivot-header-desc {
    flex: none;
    font-size: 11px;
    opacity: 0.5;
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
