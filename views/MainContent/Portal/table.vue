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
import { dictStore } from '@/framework/store/common'
import { useTreeStore } from '@/framework/store/common'

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
    console.log('dictCode 为空')
    return []
  }
  
  if (!dictOptionsCache.value) {
    console.log('字典缓存未初始化')
    return []
  }
  
  const options = dictOptionsCache.value[dictCode] || []
  return options
}

// 获取树形选项
const getTreeOptions = async (dictCode: string | undefined) => {
  if (!dictCode) {
    console.warn('dictCode 为空，无法加载树形选项')
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
    console.warn('dictCode 为空，无法加载字典选项')
    return
  }
  
  if (!dictOptionsCache.value[dictCode]) {
    console.log(`正在加载字典选项: ${dictCode}`)
    await getDictOptions(dictCode)
  }
}
const portalTableConfig = ref<PortalTableVO | null>(null)
const filterConfigList = ref<PortalTableFilterVO[]>([])

// 筛选值状态
const filterValues = ref<Record<string, any>>({})

// 加载 PortalTable 配置
const loadPortalTableConfig = async () => {
  if (!darkTableId.value) {
    console.warn('未提供 tableId')
    return
  }

  try {
    // 先获取 PortalTable 基础配置
    const tableRes = await getPortalTableByCode(darkTableId.value)
    if(tableRes.payload) {
      portalTableConfig.value = tableRes.payload[0]

      // 获取筛选项配置
      const filterRes = await getPortalTableFilterList(portalTableConfig.value.id!)
      if (filterRes.payload?.records) {
        filterConfigList.value = filterRes.payload.records
        
        // 初始化筛选值
        filterConfigList.value.forEach((filter) => {
          if (filter.defaultValue) {
            filterValues.value[filter.label] = filter.defaultValue
          }
          // 预加载下拉选择类型的字典选项
          if (filter.filterType === 'select') {
            if (filter.dictCode) {
              loadDictOptions(filter.dictCode)
            } else {
              console.warn(`筛选项 ${filter.label} 缺少 dictCode`)  
            }
          }
          // 预加载树形下拉选择类型的字典选项
          if (filter.filterType === 'treeSelect') {
            if (filter.dictCode) {
              getTreeOptions(filter.dictCode)
            } else {
              console.warn(`筛选项 ${filter.label} 缺少 dictCode`)  
            }
          }
        })
      }
    }
  } catch (error) {
    console.error('加载 PortalTable 配置失败:', error)
  }
}

// 构建查询条件
const condition = computed(() => {
  const conditionList: ConditionListType[] = []

  console.log('🔍 [Debug] condition 计算开始')
  console.log('🔍 [Debug] filterConfigList:', filterConfigList.value)
  console.log('🔍 [Debug] filterValues:', filterValues.value)

  filterConfigList.value.forEach(filter => {
    const value = filterValues.value[filter.label]
    console.log('🔍 [Debug] 处理筛选项:', filter.label, '值:', value)
    
    if (value !== undefined && value !== null && value !== '') {
      try {
        // 解析 filter 的 condition 配置
        if (filter.condition) {
          console.log('🔍 [Debug] 原始 condition JSON:', filter.condition)
          const parsedCondition = JSON.parse(filter.condition)
          console.log('🔍 [Debug] 解析后的 condition:', parsedCondition)
          
          // 获取 conditionList 数组（支持两种格式：直接是数组 或 包含 conditionList 属性的对象）
          let conditionArray: any[] = []
          if (Array.isArray(parsedCondition)) {
            conditionArray = parsedCondition
            console.log('🔍 [Debug] condition 直接是数组')
          } else if (parsedCondition.conditionList && Array.isArray(parsedCondition.conditionList)) {
            conditionArray = parsedCondition.conditionList
            console.log('🔍 [Debug] condition 在 conditionList 属性中')
          } else {
            console.log('⚠️ [Warn] condition 格式不符合预期:', parsedCondition)
          }
          
          if (conditionArray.length > 0) {
            console.log('🔍 [Debug] 开始处理占位符替换，共', conditionArray.length, '个条件')
            // 替换占位符 $1 为实际值
            conditionArray.forEach((cond, index) => {
              console.log(`🔍 [Debug] 处理第 ${index} 个 condition:`, cond)
              // 注意：condition 配置中可能是 value 或 values 字段
              const valuesField = cond.values || cond.value
              if (valuesField && Array.isArray(valuesField) && valuesField.includes('$1')) {
                console.log('🔍 [Debug] 发现 $1 占位符，准备替换')
                console.log('🔍 [Debug] 原 values:', valuesField)
                console.log('🔍 [Debug] 替换值为:', value)
                const newCond = { ...cond }
                newCond.values = valuesField.map(v => {
                  const replaced = v === '$1' ? value : v
                  console.log(`🔍 [Debug] values 映射：${v} -> ${replaced}`)
                  return replaced
                })
                // 如果原始配置用的是 value 字段，保持使用 value
                if (cond.value && !cond.values) {
                  newCond.value = newCond.values
                  delete newCond.values
                }
                console.log('🔍 [Debug] 新 condition:', newCond)
                conditionList.push(newCond)
                console.log('🔍 [Debug] 已添加到 conditionList')
              } else {
                console.log('🔍 [Debug] 没有 $1 占位符，直接添加')
                conditionList.push(cond)
              }
            })
          } else {
            console.log('⚠️ [Warn] conditionArray 为空，跳过处理')
          }
        } else {
          console.log('🔍 [Debug] filter.condition 不存在')
        }
      } catch (e) {
        console.error('❌ [Error] 解析筛选项 condition 失败:', e)
        console.error('❌ [Error] 失败的 filter:', filter)
      }
    } else {
      console.log('⚠️ [Warn] 筛选项值为空，跳过:', filter.label)
    }
  })

  console.log('✅ [Success] condition 计算完成，最终 result:', conditionList)
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
              v-model:value="filterValues[filter.label]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请输入' + filter.label"
              style="width: 95%; background-color: rgb(21,76,121);"
            />
          </template>

          <!-- 下拉选择类型 -->
          <template v-else-if="filter.filterType === 'select'">
            <a-select
              :key="`select-${filter.id}-${filter.dictCode}`"
              v-model:value="filterValues[filter.label]"
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
              v-model:value="filterValues[filter.label]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请选择日期范围'"
              style="width: 95%"
              value-format="YYYY-MM-DD"
              @change="(dates: any) => {
                if (dates && dates.length === 2) {
                  // $1 对应开始日期，$2 对应结束日期
                  filterValues[filter.label] = dates
                }
              }"
            />
          </template>

          <!-- 树形下拉列表类型 -->
          <template v-else-if="filter.filterType === 'treeSelect'">
            <a-tree-select
              v-model:value="filterValues[filter.label]"
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
              v-model:value="filterValues[filter.label]"
              :allow-clear="filter.allowClear === '1'"
              :placeholder="filter.placeholder || '请输入' + filter.label"
              style="width: 95%"
            />
          </template>

          <!-- 日期选择类型 -->
          <template v-else-if="filter.filterType === 'date' || filter.filterType === 'week' || filter.filterType === 'month' || filter.filterType === 'year'">
            <a-date-picker
              v-model:value="filterValues[filter.label]"
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