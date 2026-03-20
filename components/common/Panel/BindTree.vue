<template>
  <div class="bind-tree-container">
    <div class="edit-tree-header">
      <div class="header-row">
        <a-checkbox
          v-model:checked="autoSelectParents"
          :disabled="!permissionCheckStrictly"
          style="margin-right: 15px;"
        >
          自动带父节点
        </a-checkbox>
        <span>独立选择</span>
        <a-switch
          v-model:checked="permissionCheckStrictly"
          size="small"
          style="margin-left: 8px;"
        />
      </div>
    </div>
    <a-spin :spinning="loading">
      <a-tree
        v-if="treeData.length > 0"
        :checked-keys="innerCheckedKeys"
        :half-checked-keys="halfCheckedKeys"
        :default-expand-all="true"
        :show-line="true"
        checkable
        :check-strictly="permissionCheckStrictly"
        :tree-data="treeData"
        @check="handleCheck"
      >
        <template #title="{ dataRef }">
          <span>
            <Icon
              v-if="dataRef.icon"
              :icon="dataRef.icon"
            />
            {{ dataRef.title }}
            <span
              v-if="halfCheckedKeys.includes(dataRef.key)"
              class="partial-icon"
            >◐</span>
          </span>
        </template>
      </a-tree>
      <a-empty
        v-else
        description="暂无数据"
      />
    </a-spin>
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
const permissionCheckStrictly = ref(false)
const autoSelectParents = ref(false)
const parentMap = ref<Map<string | number, string | number | null>>(new Map())
const childrenMap = ref<Map<string | number, (string | number)[]>>(new Map())

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

  // 自动带父节点逻辑：勾选时自动选中所有父节点
  if (autoSelectParents.value && e.checked) {
    const parentIds = getAllParentIds(attachId)
    if (parentIds.length > 0) {
      // 将父节点从半选移到全选
      newHalfCheckedKeys = newHalfCheckedKeys.filter(k => !parentIds.includes(k))
      // 添加父节点到全选
      newCheckedKeys = [...new Set([...newCheckedKeys, ...parentIds])]
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
    const childIds = permissionCheckStrictly.value ? [] : getAllChildIds(attachId)
    const nodesToBind = [attachId, ...parentIds, ...childIds]

    entityIds.forEach(entityId => {
      nodesToBind.forEach(nodeId => {
        props.bindApi!(entityId, String(nodeId))
      })
    })
  } else {
    // 解绑权限
    const childIds = permissionCheckStrictly.value ? [] : getAllChildIds(attachId)
    const nodesToUnbind = [attachId, ...childIds]

    entityIds.forEach(entityId => {
      nodesToUnbind.forEach(nodeId => {
        props.unbindApi!(entityId, String(nodeId))
      })
    })
  }
}

// 监听独立选择变化
watch(permissionCheckStrictly, (newVal) => {
  if (newVal) {
    autoSelectParents.value = true
  } else {
    autoSelectParents.value = false
  }
})

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
  .edit-tree-header {
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
