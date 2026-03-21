<template>
  <div class="bind-tree-container">
    <div class="edit-tree-header">
      <div class="header-row">
        <a-checkbox
          v-model:checked="autoSelectParents"
          style="margin-right: 15px;"
        >
          父联动
        </a-checkbox>
        <a-checkbox
          v-model:checked="autoSelectChildren"
        >
          子联动
        </a-checkbox>
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索(label/key)，逗号分隔多项"
          style="margin-left: auto; width: 400px; flex-shrink: 0;"
          allow-clear
          @search="handleSearch"
          @change="handleSearchChange"
        />
      </div>
    </div>
    <div class="tree-scroll-wrapper">
      <a-spin :spinning="loading">
        <a-tree
          v-if="filteredTreeData.length > 0"
          :checked-keys="innerCheckedKeys"
          :half-checked-keys="halfCheckedKeys"
          :default-expand-all="true"
          :show-line="true"
          checkable
          check-strictly
          :tree-data="filteredTreeData"
          @check="handleCheck"
        >
          <template #title="{ dataRef }">
            <span>
              <Icon
                v-if="dataRef.icon"
                :icon="dataRef.icon"
              />
              <span v-html="dataRef._highlightedTitle || dataRef.title"></span>
              <span
                v-if="halfCheckedKeys.includes(dataRef.key)"
                class="partial-icon"
              >◐</span>
            </span>
          </template>
        </a-tree>
        <a-empty
          v-else-if="searchText && treeData.length > 0"
          description="未找到匹配结果"
        />
        <a-empty
          v-else
          description="暂无数据"
        />
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import { computed, onMounted, ref, watch } from 'vue'

// Props 定义
interface Props {
  /** 树数据 */
  treeData: DataNode[]
  /** 选中的keys */
  checkedKeys?: string[] | number[]
  /** 半选的keys（多选模式用） */
  halfCheckedKeys?: string[] | number[]
  /** 是否多选模式 */
  multiple?: boolean
  /** 绑定的实体ID数组 */
  entityIds?: string[]
  /** 绑定API函数 */
  bindApi?: (entityId: string, nodeId: string) => Promise<any>
  /** 解绑API函数 */
  unbindApi?: (entityId: string, nodeId: string) => Promise<any>
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  checkedKeys: () => [],
  halfCheckedKeys: () => [],
  multiple: false,
  entityIds: () => [],
  loading: false
})

// Emits 定义
const emit = defineEmits<{
  'update:checkedKeys': [keys: string[] | number[]]
  'update:halfCheckedKeys': [keys: string[] | number[]]
  'check': [checked: any, e: { checked: boolean, node: DataNode }]
}>()

// 状态
const autoSelectChildren = ref(true)
const autoSelectParents = ref(false)
const parentMap = ref<Map<string | number, string | number | null>>(new Map())
const childrenMap = ref<Map<string | number, (string | number)[]>>(new Map())
const searchText = ref('')

// 高亮匹配文本
const highlightText = (text: string, keywords: string[]): string => {
  if (!keywords.length || !text) return text
  let result = text
  keywords.forEach(keyword => {
    if (keyword) {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      result = result.replace(regex, '<span style="color: #1890ff; font-weight: bold;">$1</span>')
    }
  })
  return result
}

// 检查节点是否匹配搜索条件
const isNodeMatch = (node: DataNode, keywords: string[]): boolean => {
  const title = String(node.title || '')
  const key = String(node.key)
  return keywords.some(keyword => {
    if (!keyword) return false
    const lowerKeyword = keyword.toLowerCase()
    return title.toLowerCase().includes(lowerKeyword) || key.toLowerCase().includes(lowerKeyword)
  })
}

// 过滤树数据并高亮匹配节点
const filterTreeData = (nodes: DataNode[], keywords: string[]): DataNode[] => {
  return nodes.map(node => {
    const isMatch = isNodeMatch(node, keywords)
    const hasMatchingChildren = node.children && node.children.length > 0
    const filteredChildren = hasMatchingChildren ? filterTreeData(node.children as DataNode[], keywords) : []

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (isMatch || filteredChildren.length > 0) {
      const highlightedTitle = keywords.length > 0 ? highlightText(String(node.title || ''), keywords) : String(node.title || '')
      return {
        ...node,
        _highlightedTitle: highlightedTitle,
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      }
    }
    return null
  }).filter(Boolean) as DataNode[]
}

// 过滤后的树数据
const filteredTreeData = computed(() => {
  if (!searchText.value.trim()) {
    return props.treeData
  }

  // 支持逗号分隔的多项查询
  const keywords = searchText.value.split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)

  if (keywords.length === 0) {
    return props.treeData
  }

  return filterTreeData(props.treeData, keywords)
})

// 处理搜索
const handleSearch = (value: string) => {
  searchText.value = value
}

// 处理搜索输入变化
const handleSearchChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchText.value = target.value
}

// 内部选中状态
const innerCheckedKeys = computed({
  get: () => props.checkedKeys,
  set: (val) => emit('update:checkedKeys', val)
})

// 构建父子关系映射
const buildParentChildMap = (nodes: DataNode[], parentId: string | number | null = null) => {
  nodes.forEach(node => {
    const nodeId = node.key
    parentMap.value.set(nodeId, parentId)

    if (node.children && node.children.length > 0) {
      const childIds = node.children.map(child => child.key)
      childrenMap.value.set(nodeId, childIds)
      buildParentChildMap(node.children as DataNode[], nodeId)
    } else {
      childrenMap.value.set(nodeId, [])
    }
  })
}

// 获取所有父节点路径
const getAllParentIds = (nodeId: string | number): (string | number)[] => {
  const parents: (string | number)[] = []
  let currentId: string | number | null = nodeId

  while (currentId !== null) {
    const parentId = parentMap.value.get(currentId)
    if (parentId !== null && parentId !== undefined) {
      parents.push(parentId)
      currentId = parentId
    } else {
      break
    }
  }

  return parents
}

// 获取所有子节点（递归）
const getAllChildIds = (nodeId: string | number): (string | number)[] => {
  const children = childrenMap.value.get(nodeId) || []
  const result: (string | number)[] = []
  children.forEach(childId => {
    result.push(childId)
    result.push(...getAllChildIds(childId))
  })
  return result
}

// 处理勾选事件
const handleCheck = (checked: any, e: { checked: boolean, node: DataNode }) => {
  const attachId = e.node.key

  // 获取当前选中的 keys 数组
  // 独立选择模式下 checked 是数组，非独立选择模式下是 { checked: [], halfChecked: [] }
  const isArray = Array.isArray(checked)
  const currentCheckedKeys: (string | number)[] = isArray
      ? checked
      : (checked as { checked: (string | number)[] }).checked
  const currentHalfCheckedKeys: (string | number)[] = isArray
      ? []
      : (checked as { halfChecked: (string | number)[] }).halfChecked

  // 计算新的选中状态
  let newCheckedKeys = [...currentCheckedKeys]
  let newHalfCheckedKeys = [...currentHalfCheckedKeys]

  if (e.checked) {
    // 勾选时
    // 自动带父节点逻辑：勾选时自动选中所有父节点
    if (autoSelectParents.value) {
      const parentIds = getAllParentIds(attachId)
      if (parentIds.length > 0) {
        // 将父节点从半选移到全选
        newHalfCheckedKeys = newHalfCheckedKeys.filter(k => !parentIds.includes(k))
        // 添加父节点到全选
        newCheckedKeys = [...new Set([...newCheckedKeys, ...parentIds])]
      }
    }
    // 自动带子节点逻辑：勾选时自动选中所有子节点
    if (autoSelectChildren.value) {
      const childIds = getAllChildIds(attachId)
      newCheckedKeys = [...new Set([...newCheckedKeys, ...childIds])]
    }
  } else {
    // 取消勾选时
    // 自动带父节点逻辑：取消时同时取消所有父节点
    if (autoSelectParents.value) {
      const parentIds = getAllParentIds(attachId)
      newCheckedKeys = newCheckedKeys.filter(k => !parentIds.includes(k))
    }
    // 自动带子节点逻辑：取消时同时取消所有子节点
    if (autoSelectChildren.value) {
      const childIds = getAllChildIds(attachId)
      newCheckedKeys = newCheckedKeys.filter(k => !childIds.includes(k))
    }
  }

  // 更新 UI 状态
  emit('update:checkedKeys', newCheckedKeys)
  if (!isArray) {
    emit('update:halfCheckedKeys', newHalfCheckedKeys)
  }

  // 触发 check 事件，让父组件可以自定义处理
  emit('check', checked, e)

  // 如果没有提供 bindApi/unbindApi，则不执行绑定/解绑逻辑
  if (!props.bindApi || !props.unbindApi) {
    return
  }

  // 获取实体ID数组
  const entityIds = props.entityIds
  if (entityIds.length === 0) {
    return
  }

  if (e.checked) {
    // 绑定权限
    const parentIds = autoSelectParents.value ? getAllParentIds(attachId) : []
    const childIds = autoSelectChildren.value ? getAllChildIds(attachId) : []
    const nodesToBind = [attachId, ...parentIds, ...childIds]

    entityIds.forEach(entityId => {
      nodesToBind.forEach(nodeId => {
        props.bindApi!(entityId, String(nodeId))
      })
    })
  } else {
    // 解绑权限
    const parentIds = autoSelectParents.value ? getAllParentIds(attachId) : []
    const childIds = autoSelectChildren.value ? getAllChildIds(attachId) : []
    const nodesToUnbind = [attachId, ...parentIds, ...childIds]

    entityIds.forEach(entityId => {
      nodesToUnbind.forEach(nodeId => {
        props.unbindApi!(entityId, String(nodeId))
      })
    })
  }
}

// 监听树数据变化，重新构建映射
watch(() => props.treeData, (newData) => {
  if (newData && newData.length > 0) {
    parentMap.value.clear()
    childrenMap.value.clear()
    buildParentChildMap(newData)
  }
}, { immediate: true, deep: true })

// 组件挂载时构建映射
onMounted(() => {
  if (props.treeData.length > 0) {
    buildParentChildMap(props.treeData)
  }
})

// 暴露方法供父组件调用
defineExpose({
  buildParentChildMap,
  getAllParentIds,
  getAllChildIds,
  parentMap,
  childrenMap
})
</script>

<style scoped lang="less">
.bind-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .edit-tree-header {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fafafa;
    border-radius: 4px;
  }

  .header-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  // 新增：滚动包裹容器
  .tree-scroll-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }

  // spin 组件内部结构
  .tree-scroll-wrapper :deep(.ant-spin-nested-loading) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .tree-scroll-wrapper :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-tree) {
    flex: 1;
    min-height: 0;
  }

  :deep(.ant-empty) {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .partial-icon {
    color: #faad14;
    margin-left: 4px;
    font-weight: bold;
  }
}

:deep(.ant-tree-checkbox-indeterminate .ant-tree-checkbox-inner) {
  background-color: #faad14;
  border-color: #faad14;
}

:deep(.ant-tree-checkbox-indeterminate .ant-tree-checkbox-inner::after) {
  background-color: #fff;
}
</style>
