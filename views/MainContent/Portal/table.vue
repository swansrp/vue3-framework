<script lang="ts" setup>
import type { Ref } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPortalTableByCode,
  getPortalTableFilterList,
  PortalTableFilterVO,
  PortalTableVO
} from '@/framework/apis/portal/table'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import DarkTable from '@/framework/components/common/Content/DarkTable.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { parseUrlParams } from '@/framework/network/utils'
import { dictStore } from '@/framework/store/common'
import { useTreeStore } from '@/framework/store/common'
import { resolveDynamicVariable } from '@/framework/utils/common'

interface Props {
  tableId?: string
}

const props = defineProps<Props>()

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
    const urlValue = urlParams[filter.code]
    if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
      filterValues.value[filter.code] = urlValue
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
        extraConditions.push(condition)
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

      // 获取筛选项配置
      const filterRes = await getPortalTableFilterList(portalTableConfig.value.id!)
      if (filterRes?.payload?.records) {
        filterConfigList.value = filterRes.payload.records
        
        // 初始化筛选值
        filterConfigList.value.forEach((filter) => {
          if (filter.defaultValue) {
            // 解析内置时间变量并返回实际时间值（兜底+专项双模式）
            const resolvedValue = resolveDynamicVariable(filter.defaultValue)
            if (resolvedValue !== undefined) {
              filterValues.value[filter.code] = resolvedValue
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
          const urlValue = urlParams[filter.code]
          if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
            filterValues.value[filter.code] = urlValue
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

// 构建查询条件
const condition = computed(() => {
  
  const conditionList: ConditionListType[] = []

  filterConfigList.value.forEach(filter => {
    const value = filterValues.value[filter.code]
    
    if (value !== undefined && value !== null && value !== '') {
      try {
        // 解析 filter 的 condition 配置
        if (filter.condition) {
          const parsedCondition = JSON.parse(filter.condition)
          
          // 判断是否是新格式（支持按值映射）
          let conditionArray: any[] = []
          
          if (isNewConditionFormat(parsedCondition)) {
            // 新格式：按值查找专属 condition
            // value 可能是数组（多选）或单值
            const values = Array.isArray(value) ? value : [value]
            
            // 检查每个选中的值是否有专属 condition
            let foundSpecialCondition = false
            for (const v of values) {
              const optionCondition = parsedCondition.options?.[v]
              if (optionCondition && Array.isArray(optionCondition) && optionCondition.length > 0) {
                // 找到专属 condition，使用它
                conditionArray = optionCondition
                foundSpecialCondition = true
                break
              }
            }
            
            // 如果没有找到专属 condition，使用通用兜底 condition
            if (!foundSpecialCondition && parsedCondition.default && Array.isArray(parsedCondition.default)) {
              conditionArray = parsedCondition.default
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
                newCond.values = valuesField.map(v => v === '$1' ? value : v)
                // 如果原始配置用的是 value 字段，保持使用 value
                if (cond.value && !cond.values) {
                  newCond.value = newCond.values
                  delete newCond.values
                }
                conditionList.push(newCond)
              } else {
                conditionList.push(cond)
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
  conditionList.push(...urlExtraConditions.value)

  return conditionList
})

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

// 监听 tableId 变化
watch(() => props.tableId, (newId) => {
  if (newId) {
    darkTableId.value = newId
    loadPortalTableConfig()
  }
})

// 组件挂载时加载配置
onMounted(() => {
  loadPortalTableConfig()
})
</script>

<template>
  <dark-table
    v-if="portalTableConfig?.portalName"
    ref="tableRef"
    :condition="condition"
    :table-id="portalTableConfig?.portalName"
    :column-filter="columnFilter"
    :hide-export="portalTableConfig?.downloadAble === '0'"
    advance
    read-only
    text-area-in-expanded
    @config-loaded="onConfigLoaded"
  >
    <template #side>
      <template
        v-for="filter in filterConfigList"
        :key="filter.id"
      >
        <a-descriptions-item :label="filter.label">
          <template #label>
            <span>{{ filter.label }}</span>
            <span
              v-if="filter.filterType === 'select'"
              style="color: #ff4d4f; font-size: 12px;"
            >[{{ filter.dictCode || '无dictCode' }}]</span>
          </template>
          <!-- 输入框类型 -->
          <template v-if="filter.filterType === 'input'">
            <a-input
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请输入' + filter.label"
              style="width: 95%; background-color: rgb(21,76,121);"
            />
          </template>

          <!-- 下拉选择类型 -->
          <template v-else-if="filter.filterType === 'select'">
            <a-select
              :key="`select-${filter.id}-${filter.dictCode}`"
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :mode="filter.multiple === '1' ? 'multiple' : undefined"
              :placeholder="filter.placeholder || '请选择' + filter.label"
              style="width: 95%"
              @focus="() => loadDictOptions(filter.dictCode)"
            >
              <a-select-option 
                v-for="option in getSelectOptions(filter.dictCode)" 
                :key="option.value" 
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>
          </template>

          <!-- 日期范围选择类型 -->
          <template v-else-if="filter.filterType === 'dateRange'">
            <a-range-picker
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请选择日期范围'"
              style="width: 95%"
              value-format="YYYY-MM-DD"
              @change="(dates: any) => {
                if (dates && dates.length === 2) {
                  // $1 对应开始日期，$2 对应结束日期
                  filterValues[filter.code] = dates
                }
              }"
            />
          </template>

          <!-- 树形下拉列表类型 -->
          <template v-else-if="filter.filterType === 'treeSelect'">
            <a-tree-select
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请选择' + filter.label"
              :tree-data="treeOptionsCache[filter.dictCode] || []"
              style="width: 95%"
              tree-node-filter-prop="label"
              :show-search="true"
              @focus="() => getTreeOptions(filter.dictCode)"
            >
              <template #title="{ label }">
                {{ label }}
              </template>
            </a-tree-select>
          </template>

          <!-- 数字输入类型 -->
          <template v-else-if="filter.filterType === 'number'">
            <a-input-number
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请输入' + filter.label"
              style="width: 95%"
            />
          </template>

          <!-- 日期选择类型 -->
          <template v-else-if="filter.filterType === 'date' || filter.filterType === 'week' || filter.filterType === 'month' || filter.filterType === 'year'">
            <a-date-picker
              v-model:value="filterValues[filter.code]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请选择' + filter.label"
              style="width: 95%"
              :picker="filter.filterType"
              value-format="YYYY-MM-DD"
            />
          </template>
        </a-descriptions-item>
      </template>
    </template>
  </dark-table>
</template>

<style lang="less" scoped>
:deep(.ant-descriptions .ant-descriptions-row >th) {
  padding-bottom: v-bind('paddingStyle.thPadding') !important;
}

:deep(.ant-descriptions .ant-descriptions-row >td) {
  padding-bottom: v-bind('paddingStyle.tdPadding') !important;
}
</style>