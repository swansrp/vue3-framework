<template>
  <div
    v-if="visible && hasSearchConditions"
    class="portal-search-tags"
  >
    <div class="tags-label">
      <filter-outlined style="margin-right: 4px" />
      <span>筛选条件:</span>
    </div>
    <div class="tags-container">
      <a-tag
        v-for="tag in searchTags"
        :key="tag.key"
        :class="['search-tag', { 'search-tag-wide': isWideTag(tag) }]"
        :color="tag.type === 'filter' ? 'blue' : 'green'"
        closable
        @close="handleRemoveTag(tag)"
      >
        <filter-outlined
          v-if="tag.type === 'filter'"
          style="margin-right: 4px"
        />
        <sort-ascending-outlined
          v-else-if="tag.sortType === 0"
          style="margin-right: 4px"
        />
        <sort-descending-outlined
          v-else
          style="margin-right: 4px"
        />
        <span class="tag-title">{{ tag.title }}</span>
        <span
          v-if="tag.type === 'filter'"
          class="tag-relation"
        >{{ tag.relationText }}</span>
        <span class="tag-value">{{ tag.displayValue }}</span>
      </a-tag>
      <a-button
        v-if="searchTags.length > 1"
        class="clear-all-btn"
        size="small"
        type="link"
        @click="handleClearAll"
      >
        <template #icon>
          <clear-outlined />
        </template>
        清空全部
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ClearOutlined, FilterOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons-vue'

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { ColumnType, FILTER_TYPE, QuerySortType } from '@/framework/components/common/Portal/type'

interface SearchTag {
  key: string
  type: 'filter' | 'sort'
  dataIndex: string
  title: string
  relation?: number | string
  relationText?: string
  value?: any[]
  displayValue: string
  sortType?: 0 | 1  // 0: asc, 1: desc
}

const props = withDefaults(defineProps<{
  queryConditionMap: Map<string, ConditionListType>
  querySortMap: Map<string, QuerySortType>
  columns: Array<ColumnType>
  visible?: boolean
}>(), {
  visible: true
})

const emit = defineEmits<{
  (e: 'remove', dataIndex: string): void
  (e: 'removeSort', dataIndex: string): void
  (e: 'clearAll'): void
}>()

const { queryConditionMap, querySortMap, columns, visible } = toRefs(props)

// 获取关系类型的中文文本
const getRelationText = (relation: number | string): string => {
  const relationMap: Record<number, string> = {
    [FILTER_TYPE.EQUAL]: '=',
    [FILTER_TYPE.NOT_EQUAL]: '≠',
    [FILTER_TYPE.GREATER]: '>',
    [FILTER_TYPE.GREATER_EQUAL]: '≥',
    [FILTER_TYPE.LESS]: '<',
    [FILTER_TYPE.LESS_EQUAL]: '≤',
    [FILTER_TYPE.NULL]: '为空',
    [FILTER_TYPE.NOT_NULL]: '非空',
    [FILTER_TYPE.LIKE]: '包含',
    [FILTER_TYPE.NOT_LIKE]: '不包含',
    [FILTER_TYPE.IN]: '属于',
    [FILTER_TYPE.NOT_IN]: '不属于',
    [FILTER_TYPE.BETWEEN]: '范围',
    [FILTER_TYPE.NOT_BETWEEN]: '不在范围',
    [FILTER_TYPE.CONTAIN]: '含有',
    [FILTER_TYPE.CONTAIN_IN_OR]: '含其一',
    [FILTER_TYPE.CONTAIN_IN_AND]: '含全部'
  }
  return relationMap[Number(relation)] || ''
}

// 获取列的title
const getColumnTitle = (dataIndex: string): string => {
  // 处理带后缀的dataIndex (如 dataIndex0, dataIndex1)
  const baseDataIndex = dataIndex.replace(/[01]$/, '')
  const column = columns.value.find(col => col.dataIndex === baseDataIndex)
  return column?.title?.replace(/[\n\\n]/g, '') || dataIndex
}

// 获取列配置
const getColumn = (dataIndex: string): ColumnType | undefined => {
  const baseDataIndex = dataIndex.replace(/[01]$/, '')
  return columns.value.find(col => col.dataIndex === baseDataIndex)
}

// 格式化显示值
const formatDisplayValue = (condition: ConditionListType, column?: ColumnType): string => {
  const value = condition.value
  if (!value || value.length === 0) return ''

  const relation = Number(condition.relation)

  // 为空/非空
  if (relation === FILTER_TYPE.NULL) return ''
  if (relation === FILTER_TYPE.NOT_NULL) return ''

  // 范围类型
  if (relation === FILTER_TYPE.BETWEEN || relation === FILTER_TYPE.NOT_BETWEEN) {
    const left = value[0]
    const right = value[1]
    return `${left !== undefined && left !== -Number.MAX_SAFE_INTEGER ? left : ''} ~ ${right !== undefined && right !== Number.MAX_SAFE_INTEGER ? right : ''}`
  }

  // 下拉/树形选择，尝试获取标签文本
  if (column?.referenceDictOption && column.referenceDictOption.length > 0) {
    const displayValues = value.map(v => {
      const option = column.referenceDictOption.find(opt => String(opt.value) === String(v))
      return option?.label || v
    })
    return displayValues.join(', ')
  }

  return value.join(', ')
}

// 是否有搜索条件
const hasSearchConditions = computed(() => {
  return (queryConditionMap.value && queryConditionMap.value.size > 0) || 
         (querySortMap.value && querySortMap.value.size > 0)
})

// 合并相关条件（如BETWEEN拆分的两个条件）和排序条件
const searchTags = computed((): SearchTag[] => {
  const tags: SearchTag[] = []
  const processedKeys = new Set<string>()

  // 处理筛选条件
  if (queryConditionMap.value) {
    for (const [key, condition] of queryConditionMap.value.entries()) {
      // 跳过已处理的key
      if (processedKeys.has(key)) continue

      const dataIndex = condition.property || key.replace(/[01]$/, '')

      // 检查是否是BETWEEN拆分的条件（key以0或1结尾）
      if (key.endsWith('0') && queryConditionMap.value.has(key.slice(0, -1) + '1')) {
        const baseKey = key.slice(0, -1)
        const condition0 = condition
        const condition1 = queryConditionMap.value.get(baseKey + '1')

        if (condition1) {
          processedKeys.add(baseKey + '0')
          processedKeys.add(baseKey + '1')
          
          const leftVal = condition0.value?.[0]
          const rightVal = condition1.value?.[0]

          let displayValue = ''
          if (leftVal !== undefined && leftVal !== -Number.MAX_SAFE_INTEGER &&
              rightVal !== undefined && rightVal !== Number.MAX_SAFE_INTEGER) {
            displayValue = `${leftVal} ~ ${rightVal}`
          } else if (leftVal !== undefined && leftVal !== -Number.MAX_SAFE_INTEGER) {
            displayValue = `> ${leftVal}`
          } else if (rightVal !== undefined && rightVal !== Number.MAX_SAFE_INTEGER) {
            displayValue = `< ${rightVal}`
          }

          tags.push({
            key: baseKey,
            type: 'filter',
            dataIndex: baseKey,
            title: getColumnTitle(baseKey),
            relation: FILTER_TYPE.BETWEEN,
            relationText: '',
            value: [leftVal, rightVal],
            displayValue
          })
          continue
        }
      }

      // 跳过已通过0/1组合处理过的key
      if (key.endsWith('1') && processedKeys.has(key)) continue

      processedKeys.add(key)
      const column = getColumn(dataIndex)
      const relation = Number(condition.relation)

      tags.push({
        key: String(key),
        type: 'filter',
        dataIndex: dataIndex,
        title: getColumnTitle(dataIndex),
        relation: relation,
        relationText: getRelationText(relation),
        value: condition.value || [],
        displayValue: formatDisplayValue(condition, column)
      })
    }
  }

  // 处理排序条件
  if (querySortMap.value) {
    for (const [key, sortCondition] of querySortMap.value.entries()) {
      tags.push({
        key: `sort_${key}`,
        type: 'sort',
        dataIndex: String(key),
        title: getColumnTitle(sortCondition.property),
        displayValue: sortCondition.type === 0 ? '升序' : '降序',
        sortType: sortCondition.type
      })
    }
  }

  return tags
})

const handleRemoveTag = (tag: SearchTag) => {
  if (tag.type === 'filter') {
    emit('remove', tag.dataIndex)
  } else {
    emit('removeSort', tag.dataIndex)
  }
}

const handleClearAll = () => {
  emit('clearAll')
}

// 判断是否需要更宽的标签（时间区间等）
const isWideTag = (tag: SearchTag): boolean => {
  // 包含 ~ 的范围查询（如时间区间）
  if (tag.displayValue && tag.displayValue.includes(' ~ ')) {
    return true
  }
  // 显示值超过20个字符
  if (tag.displayValue && tag.displayValue.length > 20) {
    return true
  }
  return false
}
</script>

<style lang="less" scoped>
.portal-search-tags {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  background: linear-gradient(135deg, var(--accent-soft) 0%, var(--accent-mid) 100%);
  border-bottom: 1px solid var(--border-active);
  min-height: 40px;
  position: relative;

  // 顶部微弱内阴影增加凹陷感
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-light), transparent);
    opacity: 0.15;
    pointer-events: none;
  }

  .tags-label {
    display: flex;
    align-items: center;
    color: var(--accent);
    font-size: 13px;
    font-weight: 500;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1;
    align-items: center;
  }

  .search-tag {
    display: inline-flex;
    align-items: center;
    margin: 0;
    padding: 2px 8px;
    font-size: 12px;
    line-height: 20px;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: var(--shadow-glow);
    }

    .tag-title {
      font-weight: 500;
      margin-right: 4px;
    }

    .tag-relation {
      color: var(--text-tertiary);
      margin-right: 4px;
    }

    .tag-value {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    // 宽标签样式（用于时间区间等）
    &.search-tag-wide {
      .tag-value {
        max-width: 300px;
      }
    }
  }

  .clear-all-btn {
    color: var(--danger);
    font-size: 12px;
    padding: 0 4px;
    height: 24px;
    line-height: 22px;

    &:hover {
      color: var(--danger);
    }
  }
}
</style>
