<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

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
import { AUTO_UUID_ROW_KEY } from '@/framework/components/common/Portal/constant'
import { ColumnType, FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { dictStore, useTreeStore } from '@/framework/store/common'

/**
 * 透视报表组件
 * 行维度列(group by) + 动态父表头列(条件聚合列) + 度量子列(sum/count/countDistinct/avg/min/max)
 * 直接复用 Portal 组件的数据模式(data + customColumns + summaryData),
 * 表格渲染/深色样式/导出/汇总行均与 DarkTable 完全一致
 * 左侧筛选栏通过 #side 插槽传入 FilterItems(自包含 a-descriptions)
 */
const props = withDefaults(
  defineProps<{
    /** 表格配置(sys_portal_table) */
    portalTableConfig: PortalTableVO
    /** 查询条件(来自 table filter) */
    condition?: Array<ConditionListType>
    /** 左侧筛选栏宽度 */
    width?: number | string
    /** 标题，默认取路由 meta.title */
    title?: string
  }>(),
  {
    condition: () => [],
    width: 260,
    title: ''
  }
)

const router = useRouter()
const dict = dictStore()
const treeDict = useTreeStore()

/** 透视聚合查询返回的原始数据 */
const rows = ref<any[]>([])
const portalUrl = ref('')
const pivotColumns = ref<PortalPivotColumnVO[]>([])
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
      const list = JSON.parse(raw) as Array<{ field: string; display?: boolean; sort?: number }>
      return list
        .filter((item) => item.field)
        .map((item) => ({
          field: item.field,
          display: item.display !== false,
          // 聚合行排序: 0=正序 1=倒序(PORTAL_SORT_DICT), 未配置不排序
          sort: item.sort === 0 || item.sort === 1 ? item.sort : undefined
        }))
    } catch (e) {
      console.error('解析行维度配置失败，按逗号串兜底:', e)
    }
  }
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s)
    .map((f: string) => ({ field: f, display: true, sort: undefined as number | undefined }))
})

/** 全部行维度字段(含隐藏项，均参与 group by) */
const groupFields = computed(() => groupFieldConfigs.value.map(c => c.field))

/** 显示的行维度字段(隐藏项仅参与 group by 不渲染列) */
const visibleGroupFields = computed(() =>
  groupFieldConfigs.value.filter(c => c.display).map(c => c.field)
)

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
    await loadData()
  } catch (e) {
    console.error('加载透视报表配置失败:', e)
  }
}

/** 组装请求并查询透视数据 */
const loadData = async () => {
  if (!portalUrl.value || !groupFields.value.length || !pivotColumns.value.length || !measures.value.length) {
    return
  }
  try {
    const req: PivotReqVO = {
      condition: { conditionList: props.condition },
      sortList: sortList.value.length > 0 ? sortList.value : undefined,
      groupColumns: groupFields.value.map(f => ({
        value: f,
        label: columnMetaMap.value[f]?.displayName || f
      })),
      pivotColumns: pivotColumns.value.map(p => ({
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

/**
 * Portal 动态列: 行维度列 + 度量子列
 * 多个度量时: 度量子列通过 displayGroupName 由 Portal multiHeader 生成透视父表头(双层)
 * 单个度量时: 不分组, 透视列名直接作为单层表头
 * 数据已预翻译/预格式化, 列按纯文本展示(fieldType 不走 parse 转换)
 */
const portalColumns = computed(() => {
  const cols: ColumnType[] = []
  const multiMeasure = measures.value.length > 1
  let order = 2
  // 行维度只渲染显示字段(隐藏字段仍参与 group by，用于行粒度细化/筛选目标)
  for (const f of visibleGroupFields.value) {
    cols.push({
      title: columnMetaMap.value[f]?.displayName || f,
      dataIndex: f,
      key: f,
      width: columnMetaMap.value[f]?.width || 140,
      fixed: true,
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
  for (const pv of pivotColumns.value) {
    for (const m of measures.value) {
      cols.push({
        // 单度量: 透视列名即表头; 多度量: 表头为度量名, 父表头为透视列名
        title: multiMeasure ? m.label || m.field : pv.itemName,
        dataIndex: `${pv.itemValue}__${m.field}`,
        key: `${pv.itemValue}__${m.field}`,
        width: 120,
        fieldType: FIELD_TYPE.NUMBER,
        contentAlign: 'right',
        displayGroupName: multiMeasure ? pv.itemName : undefined,
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
  return cols
})

/** 表格数据: 行维度字典翻译, 度量数字格式化(行主键由 Portal 的 AUTO_UUID_ROW_KEY 机制自动分配) */
const dataSource = computed(() => rows.value.map((row) => {
  const item: any = {}
  for (const f of visibleGroupFields.value) {
    item[f] = translate(f, row[f])
  }
  for (const pv of pivotColumns.value) {
    for (const m of measures.value) {
      const key = `${pv.itemValue}__${m.field}`
      item[key] = formatNumber(row[key])
    }
  }
  return item
}))

/** 汇总行数据: 按度量聚合方式汇总——sum/count 求和, min/max 取列极值, avg/countDistinct 无法由聚合值推导留空 */
const summaryData = computed(() => {
  const summary: Record<string, any> = {}
  for (const pv of pivotColumns.value) {
    for (const m of measures.value) {
      const key = `${pv.itemValue}__${m.field}`
      // 排除空值(SQL NULL/空串), 避免 min/max 被 0 污染
      const nums = rows.value
        .map((row) => row[key])
        .filter((v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        .map(Number)
      if (m.agg === 'min') {
        summary[key] = nums.length ? formatNumber(Math.min(...nums)) : ''
      } else if (m.agg === 'max') {
        summary[key] = nums.length ? formatNumber(Math.max(...nums)) : ''
      } else if (m.agg === 'avg' || m.agg === 'countDistinct') {
        // avg(加权均值)与 countDistinct(跨行可能重复)均无法由聚合后的值推导
        summary[key] = ''
      } else {
        summary[key] = formatNumber(nums.reduce((acc, n) => acc + n, 0))
      }
    }
  }
  return summary
})

/** 度量子列 key 列表(${透视列标识}__${度量字段}, 用于动态插槽与钻取定位) */
const measureKeys = computed(() =>
  pivotColumns.value.flatMap(pv => measures.value.map(m => `${pv.itemValue}__${m.field}`))
)

/** 动态列必须就绪后才能挂载 Portal(Portal 仅在初始化时读取 customColumns) */
const ready = computed(() =>
  !!portalUrl.value &&
  visibleGroupFields.value.length > 0 &&
  pivotColumns.value.length > 0 &&
  measures.value.length > 0
)

/** 导出文件名 */
const getDownloadFileName = () => props.title || router.currentRoute.value.meta.title as string || '透视报表'

// ==================== 单元格钻取明细 ====================
const drillOpen = ref(false)
const drillTitle = ref('')
const drillCondition = ref<ConditionListType>({ conditionList: [] })

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
 * 数据行钻取条件: ① 全局筛选(props.condition) ② 透视列条件 ③ 行维度原始值
 * 三者 AND 合并, 与透视聚合 SQL 的 WHERE(先于 group by) 语义严格对齐
 */
const buildDrillCondition = (index: number, pv: PortalPivotColumnVO): ConditionListType[] => {
  const list: ConditionListType[] = [...props.condition, ...parsePivotColumnCondition(pv)]
  // 行维度用原始行值(group by 的原值), 不能用 dataSource 里翻译/格式化后的值
  const rawRow = rows.value[index] || {}
  for (const f of groupFields.value) {
    const v = rawRow[f]
    if (v === null || v === undefined || v === '') {
      // 空值: IS NULL(FILTER_TYPE.NULL), 注意不是 10(不包含)
      list.push({ property: f, relation: FILTER_TYPE.NULL, value: [], conditionList: [] })
    } else {
      list.push({ property: f, relation: FILTER_TYPE.EQUAL, value: [v], conditionList: [] })
    }
  }
  return list
}
/** 点击度量单元格: 打开底部抽屉展示该单元格对应的明细数据 */
const openDrill = (index: number, key: string) => {
  const sepIdx = key.indexOf('__')
  const itemValue = key.substring(0, sepIdx)
  const measureField = key.substring(sepIdx + 2)
  const pv = pivotColumns.value.find(p => p.itemValue === itemValue)
  const measure = measures.value.find(m => m.field === measureField)
  if (!pv) {
    return
  }
  drillTitle.value = `${pv.itemName || itemValue}${measures.value.length > 1 && measure ? ` · ${measure.label || measure.field}` : ''} - 明细数据`
  drillCondition.value = { conditionList: buildDrillCondition(index, pv), andOr: '0' }
  drillOpen.value = true
}

/** 点击汇总行单元格: 只拼 ①+②(不带行维度), 即该透视列的全部明细 */
const openSummaryDrill = (key: string) => {
  const sepIdx = key.indexOf('__')
  const itemValue = key.substring(0, sepIdx)
  const measureField = key.substring(sepIdx + 2)
  const pv = pivotColumns.value.find(p => p.itemValue === itemValue)
  const measure = measures.value.find(m => m.field === measureField)
  if (!pv) {
    return
  }
  drillTitle.value = `${pv.itemName || itemValue}${measures.value.length > 1 && measure ? ` · ${measure.label || measure.field}` : ''} - 全部明细`
  drillCondition.value = { conditionList: [...props.condition, ...parsePivotColumnCondition(pv)], andOr: '0' }
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
  <div class="body">
    <content-layout
      :width="props.width"
      class="dark-content-layout"
    >
      <template #side>
        <!-- FilterItems 自包含 a-descriptions, 直接透传 -->
        <slot name="side"></slot>
      </template>
      <template #content>
        <div class="dark-dialog">
          <div class="title">
            {{ props.title || router.currentRoute.value.meta.title }}
          </div>
          <div class="dialog-info">
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
              :multi-header="measures.length > 1"
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
                  @click="openDrill(cellIndex(cellSlot), key)"
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
          </div>
        </div>
      </template>
    </content-layout>

    <!-- 钻取明细抽屉: 从下向上弹出, 普通模式 Portal 按底层明细表(portalName)自身列配置渲染 -->
    <a-drawer
      v-model:open="drillOpen"
      :title="drillTitle"
      placement="bottom"
      :height="700"
      :body-style="{ backgroundColor: '#023955', padding: '16px' }"
      :header-style="{ backgroundColor: '#0E3D55', borderBottom: '1px solid #0F7094', color: '#fff' }"
      destroy-on-close
      root-class-name="pivot-drill-drawer"
    >
      <!-- dark-content-layout 包裹层: 模板内元素 teleport 后仍带 scope 属性,
           复用 dark.css 的令牌覆盖与 :deep 规则, 抽屉内 Portal 自动适配深色 -->
      <div
        class="dark-content-layout"
        style="height: 100%;"
      >
        <portal
          v-if="props.portalTableConfig.portalName"
          :key="drillTitle"
          :table-id="props.portalTableConfig.portalName"
          :advance-condition="drillCondition"
          :action-width="0"
          hide-add
          hide-refresh
          hide-row-selection
          mode-lock
        />
      </div>
    </a-drawer>
  </div>
</template>

<style lang="less" scoped src="@/framework/components/common/Portal/css/dark.css"></style>
<style lang="less" scoped>
.body {
  height: 100%;
  width: 100%;
  background-size: cover;
  background-color: #143662;
  background-image: url("../../../components/common/Content/imgs/dashboard-bg.svg");
  background-repeat: no-repeat;
}

:deep(.side-wrapper) {
  height: 100%;
  visibility: visible !important;
  display: block !important;
}

.dark-dialog {
  background: url("../../../components/common/Content/imgs/dialog-bg.png") no-repeat center center;
  width: 100%;
  height: calc(100vh - 20px);
  background-size: 100% 100%;
  margin-left: -3px;

  .title {
    margin-top: 12px;
    line-height: 35px;
    color: #fff;
    font-size: 35px;
    font-weight: 700;
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    font-family: 'Noto Sans SC', serif;
  }

  .dialog-info {
    position: relative;
    width: 98%;
    height: 850px;
    margin: 5px auto;
    transform: translateY(-20px);
    overflow: auto;
  }
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
</style>

<!-- 钻取抽屉补充样式(非 scoped, 因 a-drawer teleport 到 body;
     表格主体深色由抽屉内 .dark-content-layout 包裹层复用 dark.css 实现,
     这里只补 antd 外壳与表头/行等 dark.css 未覆盖的部分, 范式参照 epc BudgetDetailDialog) -->
<style lang="less">
.pivot-drill-drawer .ant-drawer-title {
  color: #fff !important;
}

.pivot-drill-drawer .ant-drawer-close {
  color: #fff !important;
}

.pivot-drill-drawer .ant-drawer-close:hover {
  color: #42F6FF !important;
}

/* 表头样式 */
.pivot-drill-drawer .surely-table-header {
  background-color: #0E3D55 !important;
}

.pivot-drill-drawer .surely-table-header-cell {
  padding: 8px 16px !important;
  background-color: #0E3D55 !important;
  font-weight: 600 !important;
}

.pivot-drill-drawer .surely-table-header-cell .surely-table-cell-content,
.pivot-drill-drawer .surely-table-header-cell span,
.pivot-drill-drawer .surely-table-header-cell div {
  color: #ffffff !important;
  font-weight: 600 !important;
}

.pivot-drill-drawer .portal-table,
.pivot-drill-drawer .surely-table {
  background-color: rgb(2, 57, 85) !important;
}

.pivot-drill-drawer .portal-table td,
.pivot-drill-drawer .surely-table td,
.pivot-drill-drawer .surely-table .surely-table-cell {
  border-right: none !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-top: none !important;
  border-left: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.pivot-drill-drawer .portal-table tr:last-child td,
.pivot-drill-drawer .surely-table tr:last-child td,
.pivot-drill-drawer .surely-table tr:last-child .surely-table-cell {
  border-bottom: none !important;
}

.pivot-drill-drawer .surely-table-row-even,
.pivot-drill-drawer tbody tr.surely-table-row-even {
  background-color: #1B475D !important;
  color: #ffffff !important;
}

.pivot-drill-drawer .surely-table-row-odd,
.pivot-drill-drawer tbody tr.surely-table-row-odd {
  background-color: #0E3D55 !important;
  color: #ffffff !important;
}

.pivot-drill-drawer .surely-table-body {
  background-color: rgb(2, 57, 85) !important;
}
</style>
