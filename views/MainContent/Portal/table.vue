<script lang="ts" setup>
import type { Ref } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import FilterItems from './FilterItems.vue'
import PivotTable from './pivot.vue'

import {
  getPortalTableByCode,
  getPortalTableById,
  getPortalTableFilterList,
  PortalTableFilterVO,
  PortalTableVO
} from '@/framework/apis/portal/table'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import DarkTable from '@/framework/components/common/Content/DarkTable.vue'
import { FILTER_TYPE, QuerySortType } from '@/framework/components/common/Portal/type'
import { parseUrlParams } from '@/framework/network/utils'
import { dictStore } from '@/framework/store/common'
import { useTreeStore } from '@/framework/store/common'
import { resolveDynamicVariable } from '@/framework/utils/common'


interface Props {
  tableId?: string
  /** 主题: dark=深色外壳(DarkTable), light=浅色(原生 content-layout + Portal) */
  theme?: 'dark' | 'light'
}

const props = withDefaults(defineProps<Props>(), {
  tableId: undefined,
  theme: 'dark'
})

const dict = dictStore()
const treeDict = useTreeStore()

// 树形选项缓存
const treeOptionsCache = ref<Record<string, any[]>>({})

const { currentRoute } = useRouter()
const route = currentRoute.value
const pathArray = route.path.split('/')
const darkTableId: Ref<string> = ref(props.tableId || pathArray[pathArray.length - 1] as string)

// 字典选项缓存
const dictOptionsCache = ref<Record<string, Array<{ label: string, value: string }>>>({})

// 获取字典选项
const getDictOptions = async (dictCode: string) => {
  // 确保 dictOptionsCache 已初始化
  if (!dictOptionsCache.value) {
    dictOptionsCache.value = {}
  }
  
  if (dictOptionsCache.value[dictCode]) {
    return dictOptionsCache.value[dictCode]
  }

  try {
    const res = await dict.getDict(dictCode)
    const options = (res || []).map((item: any) => ({
      label: item.label || item.value,
      value: item.value
    }))
    dictOptionsCache.value[dictCode] = options
    // 强制触发响应式更新
    dictOptionsCache.value = { ...dictOptionsCache.value }
    return options
  } catch (error) {
    console.error(`获取字典 ${dictCode} 失败:`, error)
    return []
  }
}

// 获取下拉选项
const getSelectOptions = (dictCode: string | undefined) => {
  if (!dictCode) {
    return []
  }
  
  if (!dictOptionsCache.value) {
    return []
  }
  
  return dictOptionsCache.value[dictCode] || []
}

// 获取树形选项
const getTreeOptions = async (dictCode: string | undefined) => {
  if (!dictCode) {
    return []
  }
  
  // 检查缓存
  if (treeOptionsCache.value[dictCode]) {
    return treeOptionsCache.value[dictCode]
  }
  
  try {
    const treeData = await treeDict.getTree(dictCode)
    treeOptionsCache.value[dictCode] = treeData
    return treeData
  } catch (error) {
    console.error(`获取树形字典 ${dictCode} 失败:`, error)
    return []
  }
}

// 加载字典选项（用于下拉框聚焦时加载）
const loadDictOptions = async (dictCode: string | undefined) => {
  if (!dictCode) {
    return
  }
  
  if (!dictOptionsCache.value[dictCode]) {
    await getDictOptions(dictCode)
  }
}
// 加载字典选项（用于下拉框聚焦时加载）}
const portalTableConfig = ref<PortalTableVO | null>(null)
const filterConfigList = ref<PortalTableFilterVO[]>([])

// 表格列的 dataIndex 集合（用于 URL 参数匹配）
const columnDataIndexes = ref<Set<string>>(new Set())

// 筛选值状态
const filterValues = ref<Record<string, any>>({})

// URL 参数中不在 filterConfigList 里的额外条件
const urlExtraConditions = ref<ConditionListType[]>([])

// 表格组件引用
const tableRef = ref()

// 配置是否已加载完成
const configLoaded = ref(false)

// 将 URL 参数映射到筛选值
const mapUrlParamsToFilterValues = () => {
  const urlParams = parseUrlParams()
  
  // filterConfigList 为空时跳过
  if (!filterConfigList.value || filterConfigList.value.length === 0) {
    urlExtraConditions.value = []
    return
  }
  
  const filterCodes = new Set(filterConfigList.value.map(f => f.code))
  console.log('=======',filterCodes)
  const extraConditions: ConditionListType[] = []
  
  filterConfigList.value.forEach(filter => {
    const urlValue = urlParams[filter.code!]
    if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
      filterValues.value[filter.code!] = urlValue
    }
  })
  
  // 处理不在 filterConfigList 中但匹配列名的 URL 参数
  Object.keys(urlParams).forEach(key => {
    // 跳过已在 filterConfigList 中的
    if (filterCodes.has(key)) {
      return
    }
    
    // 检查是否是表格列
    if (columnDataIndexes.value.has(key)) {
      const urlValue = urlParams[key]
      if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
        // 构建 EQUAL 条件
        const value = Array.isArray(urlValue) ? urlValue : [urlValue]
        const condition = {
          relation: value.length > 1 ? FILTER_TYPE.IN : FILTER_TYPE.EQUAL,
          property: key,
          value: value
        }
        extraConditions.push(condition as ConditionListType)
      }
    } else {
      console.log(`URL参数 ${key} 不匹配任何列名，忽略`)
    }
  })
  
  urlExtraConditions.value = extraConditions
}

// 处理 DarkTable 配置加载完成事件
const onConfigLoaded = (_config: any, columnArray: any[]) => {
  configLoaded.value = true
  columnDataIndexes.value = new Set(columnArray.map((column: any) => column.dataIndex))
  // 重新处理 URL 参数映射
  mapUrlParamsToFilterValues()
}

// 加载 PortalTable 配置
const loadPortalTableConfig = async () => {
  if (!darkTableId.value) {
    return
  }

  try {
    // 先获取 PortalTable 基础配置
    const tableRes = await getPortalTableByCode(darkTableId.value)
    if(tableRes.payload) {
      portalTableConfig.value = tableRes.payload[0]

      // 多Tab页面: 入口记录配了 tabItems 即宿主, 异步拉成员配置(#table 插槽渲染; 未配置走现状单表)
      const tabItemList = parseTabItems(portalTableConfig.value!.tabItems)
      if (tabItemList.length > 0) {
        isGroupPage.value = true
        loadTabEntries(tabItemList)
      }

      // 获取筛选项配置
      const filterRes = await getPortalTableFilterList(portalTableConfig.value!.id!)
      if (filterRes?.payload?.records) {
        filterConfigList.value = filterRes.payload.records
        
        // 初始化筛选值
        filterConfigList.value.forEach((filter) => {
          if (filter.defaultValue) {
            // 解析内置时间变量并返回实际时间值（兜底+专项双模式）
            const resolvedValue = resolveDynamicVariable(filter.defaultValue)
            if (resolvedValue !== undefined) {
              filterValues.value[filter.code!] = resolvedValue
            }
          }
          // 预加载下拉选择类型的字典选项
          if (filter.filterType === 'select') {
            if (filter.dictCode) {
              loadDictOptions(filter.dictCode)
            }
          }
          // 预加载树形下拉选择类型的字典选项
          if (filter.filterType === 'treeSelect') {
            if (filter.dictCode) {
              getTreeOptions(filter.dictCode)
            }
          }
        })
        
        // 先处理 filterConfigList 中的 URL 参数
        // 列匹配需要等 DarkTable 加载完成后通过 onConfigLoaded 处理
        const urlParams = parseUrlParams()
        filterConfigList.value.forEach(filter => {
          const urlValue = urlParams[filter.code!]
          if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
            filterValues.value[filter.code!] = urlValue
          }
        })
      }
    }
  } catch (error) {
    console.error('加载 PortalTable 配置失败:', error)
  }
}

// 判断是否是新格式的 condition（支持按字典值映射）
const isNewConditionFormat = (condition: any): condition is { default: any[], options: Record<string, any[]> } => {
  return condition && typeof condition === 'object' && 'default' in condition
}

// 可作为单个查询值的标量：空串是合法维度值，null/undefined 与嵌套数组/对象则不是
const isScalarValue = (value: any): boolean => value !== null && value !== undefined && typeof value !== 'object'

// 各关系类型拼装所需的最少值个数（与后端 PortalConditionDict.requiredValueCount 口径一致）
const requiredValueCount = (relation: any): number => {
  const type = Number(relation)
  if (type === FILTER_TYPE.NULL || type === FILTER_TYPE.NOT_NULL) {
    return 0
  }
  if (type === FILTER_TYPE.BETWEEN || type === FILTER_TYPE.NOT_BETWEEN) {
    return 2
  }
  return 1
}

/**
 * 下发前归一单条条件：清洗条件值并按关系类型校验个数
 * 筛选项配置(sys_portal_table_filter.condition)里的脏值（如 value:[[]]）会让后端拼出
 * `col = ` 这类残缺 SQL，数据库直接语法报错导致整张报表查询失败，故这类条件在前端就丢弃
 * @returns 归一后的条件；返回 undefined 表示该条件不可用，应整体跳过
 */
const normalizeCondition = (cond: any): any => {
  if (!cond || typeof cond !== 'object') {
    return undefined
  }

  // 组节点：递归归一子条件
  if (Array.isArray(cond.conditionList) && cond.conditionList.length > 0) {
    const conditionList = cond.conditionList.map(normalizeCondition).filter((item: any) => item !== undefined)
    if (conditionList.length === 0) {
      return undefined
    }
    return { ...cond, conditionList }
  }

  const needCount = requiredValueCount(cond.relation)
  if (needCount === 0) {
    // NULL/NOT_NULL 不依赖条件值，原样下发
    return cond
  }

  const rawValues = cond.values !== undefined ? cond.values : cond.value
  if (!Array.isArray(rawValues)) {
    return isScalarValue(rawValues) ? cond : undefined
  }

  const scalarValues = rawValues.filter(isScalarValue)
  if (scalarValues.length < needCount) {
    console.warn('[Portal] 筛选项条件值不可用，已跳过该条件:', cond)
    return undefined
  }

  return cond.values !== undefined ? { ...cond, values: scalarValues } : { ...cond, value: scalarValues }
}

// 构建查询条件
const condition = computed(() => {
  
  const conditionList: ConditionListType[] = []
  // 条件值经归一（清洗脏值 + 校验个数）后才下发，避免后端拼出残缺 SQL
  const pushCondition = (cond: any) => {
    const normalized = normalizeCondition(cond)
    if (normalized !== undefined) {
      conditionList.push(normalized)
    }
  }

  filterConfigList.value.forEach(filter => {
    const value = filterValues.value[filter.code!]
    
    // 过滤无效值：undefined / null / '' / 空数组 / 仅包含「全部」选项
    const isAllSelected = Array.isArray(value) && value.length === 1 && value[0] === '__all__'
    const isEmptyArray = Array.isArray(value) && value.length === 0
    if (value !== undefined && value !== null && value !== '' && !isEmptyArray && !isAllSelected) {
      try {
        // 解析 filter 的 condition 配置
        if (filter.condition) {
          const parsedCondition = JSON.parse(filter.condition)
          
          // 判断是否是新格式（支持按值映射）
          let conditionArray: any[] = []
          
          if (isNewConditionFormat(parsedCondition)) {
            // 新格式：通用条件=必备过滤始终拼入；选中值命中专属 condition 时再 AND 追加
            // value 可能是数组（多选）或单值
            const values = Array.isArray(value) ? value : [value]
            
            // 通用兜底条件：必备条件，始终拼入（与专属条件 AND 合并）
            if (parsedCondition.default && Array.isArray(parsedCondition.default)) {
              conditionArray.push(...parsedCondition.default)
            }
            
            // 检查选中的值是否有专属 condition，命中即追加(取第一个命中)
            for (const v of values) {
              const optionCondition = parsedCondition.options?.[v]
              if (optionCondition && Array.isArray(optionCondition) && optionCondition.length > 0) {
                conditionArray.push(...optionCondition)
                break
              }
            }
          } else {
            // 老格式：直接是数组 或 包含 conditionList 属性的对象
            if (Array.isArray(parsedCondition)) {
              conditionArray = parsedCondition
            } else if (parsedCondition.conditionList && Array.isArray(parsedCondition.conditionList)) {
              conditionArray = parsedCondition.conditionList
            }
          }
          
          if (conditionArray.length > 0) {
            // 替换占位符 $1 为实际值
            conditionArray.forEach((cond) => {
              // 注意：condition 配置中可能是 value 或 values 字段
              const valuesField = cond.values || cond.value
              if (valuesField && Array.isArray(valuesField) && valuesField.includes('$1')) {
                const newCond = { ...cond }
                newCond.values = valuesField.flatMap(v => v === '$1' ? (Array.isArray(value) ? value : [value]) : [v])
                // 多选展开后为多值时 EQUAL 需转为 IN：后端 EQUAL 只取 value[0]，会丢失其余选中值
                if (String(newCond.relation) === String(FILTER_TYPE.EQUAL) && newCond.values.length > 1) {
                  newCond.relation = FILTER_TYPE.IN
                }
                // 如果原始配置用的是 value 字段，保持使用 value
                if (cond.value && !cond.values) {
                  newCond.value = newCond.values
                  delete newCond.values
                }
                pushCondition(newCond)
              } else {
                pushCondition(cond)
              }
            })
          }
        }
      } catch (e) {
        console.error('解析筛选项 condition 失败:', e)
      }
    }
  })

  // 添加 URL 参数中匹配列名的额外条件
  urlExtraConditions.value.forEach(cond => pushCondition(cond))

  return conditionList
})

// 是否透视报表模式
const isPivotMode = computed(() => portalTableConfig.value?.pivotMode === '1')

/**
 * 报表默认排序(sys_portal_table.default_sort): 读到就作为 sortList 下发查询接口
 * 空/'[]'/解析失败 统一返回 undefined, 保持不下发(此时 Portal 回退到 sys_portal 级默认排序)
 */
const parseDefaultSort = (raw?: string): Array<QuerySortType> | undefined => {
  if (!raw) {
    return undefined
  }
  try {
    const parsed = JSON.parse(raw)
    const sortList = (Array.isArray(parsed) ? parsed : []).filter((s: any) => s?.property)
    return sortList.length > 0 ? sortList : undefined
  } catch (e) {
    console.error('解析报表默认排序失败:', e)
    return undefined
  }
}
const defaultSortColumn = computed(() => parseDefaultSort(portalTableConfig.value?.defaultSort))

// 左侧筛选栏宽度(pivot 模式取表格配置 filterWidth)
const sideWidth = computed(() =>
  isPivotMode.value ? (portalTableConfig.value?.filterWidth ?? 260) : 260
)

// 浅色分支 Portal 的查询条件(DarkTable 内部同款包装)
const lightAdvanceCondition = computed(() => ({ conditionList: condition.value } as ConditionListType))

// 计算 padding 样式
const paddingStyle = computed(() => {
  if (!portalTableConfig.value) return {}
  return {
    thPadding: `${portalTableConfig.value.paddingTh ?? 2}px`,
    tdPadding: `${portalTableConfig.value.paddingTd ?? 7}px`
  }
})

// 列过滤函数
const columnFilter = (column: any) => {
  // 如果没有配置 filterColumns，默认显示所有列
  if (!portalTableConfig.value?.filterColumns) {
    return true
  }
  
  // 获取要排除的列名列表
  const excludedColumns = portalTableConfig.value.filterColumns
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s) // 过滤空字符串
  
  // 如果当前列在排除列表中，返回 false（不显示）
  if (excludedColumns.includes(column.dataIndex)) {
    return false
  }
  
  // 其他列都显示
  return true
}

// ==================== 多Tab页面(宿主 tabItems) ====================
/** tabItems JSON 项 */
interface PortalTabItem {
  /** 成员 portalTable 主键 */
  tableId: number
  /** tab 显示名 */
  label?: string
  /** 显示顺序 */
  order?: number
}

/** 渲染用 tab 项(portalName 是表格查询抓手, 提前拽出来保证类型非空) */
interface PortalTabEntry {
  key: string
  label: string
  portalName: string
  config: PortalTableVO
}

// 是否多Tab页面(入口记录配了 tabItems = 宿主; 筛选栏/外观均归属宿主)
const isGroupPage = ref(false)
// 各 tab 成员配置(按 tabItems 顺序)
const tabEntries = ref<PortalTabEntry[]>([])
const tabLoading = ref(false)
const activeTab = ref('')

/** 解析宿主 tabItems JSON(非法项过滤, order 缺省用原序补齐后升序) */
const parseTabItems = (raw?: string): PortalTabItem[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map((it: any, idx: number) => ({
        tableId: Number(it?.tableId),
        label: it?.label as string | undefined,
        order: typeof it?.order === 'number' ? it.order : idx
      }))
      .filter((it) => Number.isFinite(it.tableId))
      .sort((a, b) => a.order - b.order)
  } catch (e) {
    console.error('解析 tabItems 失败:', e)
    return []
  }
}

/** 并行拉取各 tab 成员配置(单个失败/缺 portalName 跳过, 不阻塞整页) */
const loadTabEntries = async (items: PortalTabItem[]) => {
  tabLoading.value = true
  try {
    const configs: Array<PortalTableVO | null> = await Promise.all(items.map(async (it) => {
      try {
        const res = await getPortalTableById(it.tableId)
        return (res?.payload || null) as PortalTableVO | null
      } catch (e) {
        console.error(`加载 Tab 成员配置失败: tableId=${it.tableId}`, e)
        return null
      }
    }))
    tabEntries.value = items
      .map((it, i) => {
        const config = configs[i]
        // portal/pivot 都靠 portalName 拉列配置与发查询, 缺了无法渲染
        if (!config?.portalName) {
          console.error(`Tab 成员缺少 portalName, 已跳过: tableId=${it.tableId}`)
          return null
        }
        return {
          key: String(it.tableId),
          label: it.label || config.tableCode || `Tab${i + 1}`,
          portalName: config.portalName,
          config
        }
      })
      .filter((entry): entry is PortalTabEntry => !!entry)
    activeTab.value = tabEntries.value[0]?.key || ''
  } finally {
    tabLoading.value = false
  }
}

// 多Tab页面普通表 tab 的查询条件包装(同浅色分支)
const tabAdvanceCondition = computed(() => ({ conditionList: condition.value } as ConditionListType))

/** 成员各自的列排除过滤(filterColumns 按成员自身配置生效, 与宿主无关) */
const makeColumnFilter = (config: PortalTableVO) => (column: any) => {
  if (!config.filterColumns) {
    return true
  }
  const excludedColumns = config.filterColumns.split(',').map((s: string) => s.trim()).filter((s: string) => s)
  return !excludedColumns.includes(column.dataIndex)
}

// 监听 tableId 变化
watch(() => props.tableId, (newId) => {
  if (newId) {
    darkTableId.value = newId
    // 重置多Tab页状态, 避免残留上一页成员
    isGroupPage.value = false
    tabEntries.value = []
    loadPortalTableConfig()
  }
})

// 组件挂载时加载配置
onMounted(() => {
  loadPortalTableConfig()
})
</script>

<template>
  <!-- 深色主题: 外壳由 DarkTable 提供, 表格主体由 tableMode 切换(pivot=透视报表, portal=普通表格) -->
  <dark-table
    v-if="props.theme === 'dark' && portalTableConfig?.portalName"
    ref="tableRef"
    :table-mode="isPivotMode ? 'pivot' : 'portal'"
    :portal-table-config="portalTableConfig || undefined"
    :condition="condition"
    :table-id="portalTableConfig?.portalName"
    :column-filter="columnFilter"
    :default-sort-column="defaultSortColumn"
    :hide-export="portalTableConfig?.downloadAble === '0'"
    :width="sideWidth"
    advance
    read-only
    side-plain
    text-area-in-expanded
    @config-loaded="onConfigLoaded"
  >
    <template #side>
      <filter-items
        :filter-config-list="filterConfigList"
        :filter-values="filterValues"
        :tree-options-cache="treeOptionsCache"
        :get-select-options="getSelectOptions"
        :load-dict-options="loadDictOptions"
        :get-tree-options="getTreeOptions"
      />
    </template>
    <!-- 多Tab页面: 右侧表格区由本组件接管(DarkTable 默认二选一渲染被 table 插槽覆盖) -->
    <template
      v-if="isGroupPage"
      #table
    >
      <div class="group-tabs-wrap">
        <a-spin
          v-if="tabLoading"
          class="group-tabs-loading"
        />
        <a-tabs
          v-else
          v-model:active-key="activeTab"
          class="portal-group-tabs"
        >
          <a-tab-pane
            v-for="entry in tabEntries"
            :key="entry.key"
            :tab="entry.label"
          >
            <pivot-table
              v-if="entry.config.pivotMode === '1'"
              :portal-table-config="entry.config"
              :condition="condition"
            />
            <portal
              v-else
              :action-width="0"
              :advance-condition="tabAdvanceCondition"
              :column-filter="makeColumnFilter(entry.config)"
              :default-sort-column="parseDefaultSort(entry.config.defaultSort)"
              :hide-export="entry.config.downloadAble === '0'"
              :page-size="50"
              :table-id="entry.portalName"
              advance
              hide-refresh
              hide-row-selection
              multi-header
              read-only
              text-area-in-expanded
            />
          </a-tab-pane>
        </a-tabs>
      </div>
    </template>
  </dark-table>

  <!-- 浅色主题: 原生 content-layout + Portal/pivot 表格, 不套深色外壳 -->
  <content-layout
    v-else-if="props.theme === 'light' && portalTableConfig?.portalName"
    :width="sideWidth"
  >
    <template #side>
      <filter-items
        :filter-config-list="filterConfigList"
        :filter-values="filterValues"
        :tree-options-cache="treeOptionsCache"
        :get-select-options="getSelectOptions"
        :load-dict-options="loadDictOptions"
        :get-tree-options="getTreeOptions"
        :dark="false"
      />
    </template>
    <template #content>
      <!-- 多Tab页面: 同一套筛选条件驱动全部 tab(pivot 浅色 / portal 同浅色分支参数) -->
      <div
        v-if="isGroupPage"
        class="group-tabs-wrap"
      >
        <a-spin
          v-if="tabLoading"
          class="group-tabs-loading"
        />
        <a-tabs
          v-else
          v-model:active-key="activeTab"
          class="portal-group-tabs"
        >
          <a-tab-pane
            v-for="entry in tabEntries"
            :key="entry.key"
            :tab="entry.label"
          >
            <pivot-table
              v-if="entry.config.pivotMode === '1'"
              :portal-table-config="entry.config"
              :condition="condition"
              theme="light"
            />
            <portal
              v-else
              :action-width="0"
              :advance-condition="tabAdvanceCondition"
              :column-filter="makeColumnFilter(entry.config)"
              :default-sort-column="parseDefaultSort(entry.config.defaultSort)"
              :hide-export="entry.config.downloadAble === '0'"
              :page-size="50"
              :table-id="entry.portalName"
              advance
              hide-refresh
              hide-row-selection
              multi-header
              read-only
              text-area-in-expanded
            />
          </a-tab-pane>
        </a-tabs>
      </div>
      <pivot-table
        v-else-if="isPivotMode"
        :portal-table-config="portalTableConfig"
        :condition="condition"
        theme="light"
      />
      <portal
        v-else
        ref="tableRef"
        :table-id="portalTableConfig.portalName"
        :advance-condition="lightAdvanceCondition"
        :column-filter="columnFilter"
        :default-sort-column="defaultSortColumn"
        :hide-export="portalTableConfig.downloadAble === '0'"
        :action-width="0"
        :page-size="50"
        advance
        read-only
        multi-header
        text-area-in-expanded
        hide-refresh
        hide-row-selection
        @config-loaded="onConfigLoaded"
      />
    </template>
  </content-layout>
</template>

<style lang="less" scoped>
:deep(.ant-descriptions .ant-descriptions-row >th) {
  padding-bottom: v-bind('paddingStyle.thPadding') !important;
}

:deep(.ant-descriptions .ant-descriptions-row >td) {
  padding-bottom: v-bind('paddingStyle.tdPadding') !important;
}

// ==================== 多Tab页面(tabItems 宿主) ====================
// 页签结构/形态只在组件里写一份, 颜色全部取设计令牌:
// 深色壳(DarkTable 的 .dark-content-layout 在 dark.css 里重映射令牌)与浅色入口(tableLight 走
// design-tokens.css 的 :root 取值)各自提供色值, 同一套样式两套主题自适应。
// 带 !important 是因为 dark.css 里已有一批 ant-tabs 的下划线式硬编码覆盖(旧范式), 用更高层级压制
.group-tabs-wrap {
  height: 100%;
  overflow: hidden;
  padding: 2px 8px 0;
}

.group-tabs-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.portal-group-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;

  // 底部色块 + 渐变托底风格: 平铺页签 + 选中项底托渐变 + 指示条微光
  // 注意: .ant-tabs 与 .portal-group-tabs 是同一元素, :deep() 内不可重复写 .ant-tabs
  :deep(> .ant-tabs-nav) {
    margin: 0 0 0;
    background: transparent !important;
    border-bottom: 1px solid var(--border-subtle) !important;
  }

  // 保留 ::before 作为满宽底线轨道
  :deep(> .ant-tabs-nav::before) {
    display: none !important;
  }

  :deep(.ant-tabs-nav-list) {
    gap: 0;
  }

  // 未选中: 平铺文字, 无背景无边框
  :deep(.ant-tabs-nav .ant-tabs-tab) {
    margin: 0 !important;
    padding: 10px 24px !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: var(--text-secondary) !important;
    font-size: 14px;
    line-height: 22px;
    transition: all 0.25s ease !important;
  }

  // antd 会把颜色直接写在 tab-btn 上, 强制继承
  :deep(.ant-tabs-nav .ant-tabs-tab .ant-tabs-tab-btn) {
    color: inherit !important;
  }

  :deep(.ant-tabs-nav .ant-tabs-tab:hover) {
    background: linear-gradient(to top, var(--accent-mid), transparent) !important;
    color: var(--text-primary) !important;
  }

  // 选中: 从底部向上的主题色渐变托底
  :deep(.ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active) {
    background: linear-gradient(to top, var(--accent-soft) 0%, var(--accent-mid) 40%, transparent 100%) !important;
    color: var(--text-primary) !important;
  }

  :deep(.ant-tabs-nav .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
    color: var(--text-primary) !important;
    font-weight: 600 !important;
    text-shadow: 0 0 8px var(--accent-glow) !important;
  }

  // 指示条: 主题色渐变 + 微光
  :deep(.ant-tabs-nav .ant-tabs-ink-bar) {
    background: linear-gradient(90deg, var(--accent), var(--accent-light), var(--accent)) !important;
    height: 2px !important;
    border-radius: 2px !important;
    box-shadow: 0 0 8px var(--accent-glow), 0 0 16px var(--accent-glow) !important;
  }

  :deep(> .ant-tabs-content-holder) {
    flex: 1;
    overflow: auto;
  }

  :deep(.ant-tabs-content),
  :deep(.ant-tabs-tabpane) {
    height: 100%;
  }
}
</style>