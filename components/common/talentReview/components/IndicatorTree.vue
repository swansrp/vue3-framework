<template>
  <div :class="{ collapsed: collapsed }" class="indicator-tree-panel">
    <!-- 折叠控制按钮 -->
    <div class="collapse-trigger" @click="toggleCollapse">
      <MenuFoldOutlined v-if="!collapsed" />
      <MenuUnfoldOutlined v-else />
    </div>

    <!-- 可调整宽度的分隔条 -->
    <div v-if="!collapsed" class="resize-handle" @mousedown="startResize"></div>

    <!-- 树形面板内容 -->
    <div v-if="!collapsed" :style="{ width: panelWidth + 'px' }" class="tree-content">
      <!-- 搜索框 -->
      <div class="search-section">
        <a-input v-model:value="searchKeyword" allowClear placeholder="搜索指标" @input="onSearch">
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
      </div>

      <!-- 指标分类 -->
      <div class="indicator-categories">
        <!-- 通用指标 -->
        <div class="category-section">
          <div class="category-header">
            <h4>通用指标</h4>
          </div>
          <div class="tree-wrapper">
            <a-tree
              ref="commonTreeKey" v-model:checkedKeys="selectedCommonIndicators"
              v-model:expandedKeys="expandedCommonKeys" :checkable="true" :selectable="false" :show-icon="true"
              :show-line="true" :tree-data="filteredCommonIndicators" :draggable="true" block-node
              @check="onCommonIndicatorCheck" @drop="onCommonTreeDrop">
              <template #title="{ title, isLeaf, dataRef }">
                <div :class="{ 'search-highlight': isHighlighted(title) }" class="tree-node-title">
                  <span class="node-title">{{ title }}</span>
                  <div
                    v-if="isLeaf && !dataRef.children && (commonIndicatorPermissions?.edit || commonIndicatorPermissions?.delete)"
                    class="node-actions">
                    <a-tooltip v-if="commonIndicatorPermissions?.edit" title="编辑">
                      <EditOutlined @click.stop="editIndicator(dataRef)" />
                    </a-tooltip>
                    <a-tooltip v-if="commonIndicatorPermissions?.delete" title="删除">
                      <DeleteOutlined @click.stop="deleteIndicator(dataRef)" />
                    </a-tooltip>
                  </div>
                </div>
              </template>
              <template #icon="{ dataRef }">
                <FolderOutlined v-if="!dataRef.isLeaf" />
                <BarChartOutlined v-else />
              </template>
            </a-tree>
          </div>
        </div>

        <!-- 个人指标 -->
        <div v-if="showPersonalIndicators" class="category-section">
          <div class="category-header">
            <h4>个人指标</h4>
          </div>
          <div class="tree-wrapper">
            <a-tree
              ref="personalTreeKey" v-model:checkedKeys="selectedPersonalIndicators"
              v-model:expandedKeys="expandedPersonalKeys" :checkable="true" :selectable="false" :show-icon="true"
              :show-line="true" :tree-data="filteredPersonalIndicators" :draggable="true" block-node
              @check="onPersonalIndicatorCheck" @drop="onPersonalTreeDrop">
              <template #title="{ title, isLeaf, dataRef }">
                <div :class="{ 'search-highlight': isHighlighted(title) }" class="tree-node-title">
                  <span class="node-title">{{ title }}</span>
                  <div
                    v-if="isLeaf && (personalIndicatorPermissions?.edit || personalIndicatorPermissions?.delete)"
                    class="node-actions">
                    <a-tooltip v-if="personalIndicatorPermissions?.edit" title="编辑">
                      <EditOutlined @click.stop="editIndicator(dataRef)" />
                    </a-tooltip>
                    <a-tooltip v-if="personalIndicatorPermissions?.delete" title="删除">
                      <DeleteOutlined @click.stop="deleteIndicator(dataRef)" />
                    </a-tooltip>
                  </div>
                </div>
              </template>
              <template #icon="{ dataRef }">
                <FolderOutlined v-if="!dataRef.isLeaf" />
                <BarChartOutlined v-else />
              </template>
            </a-tree>
          </div>
        </div>
      </div>
    </div>

    <!-- 折叠状态的缩略显示 -->
    <div v-else class="collapsed-content">
      <div class="collapsed-icon">
        <BarChartOutlined />
      </div>
      <div class="collapsed-text">指标</div>
    </div>

    <!-- 悬浮的新增指标按钮 -->
    <div
      v-if="!collapsed && shouldShowAddButton" class="floating-add-button"
      :style="{ left: (panelWidth - 58) + 'px' }">
      <a-button shape="circle" size="large" type="primary" @click="addIndicator">
        <PlusOutlined />
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import type { IndicatorNode } from '../types'
import { updateStatisticOrder, updateStatisticPid } from '../api'

// 权限接口定义
interface IndicatorPermissions {
  edit?: boolean;
  delete?: boolean;
}

interface Props {
  collapsed: boolean;
  commonIndicators: IndicatorNode[];
  personalIndicators: IndicatorNode[];
  selectedCommonIndicators?: string[];
  selectedPersonalIndicators?: string[];
  selectedIndicators?: string[];
  expandedCommonKeys?: string[];
  expandedPersonalKeys?: string[];
  showPersonalIndicators?: boolean; // 是否显示个人指标
  commonIndicatorPermissions?: IndicatorPermissions; // 通用指标权限
  personalIndicatorPermissions?: IndicatorPermissions; // 个人指标权限
}

interface Emits {
  (e: 'update:collapsed', value: boolean): void;

  (e: 'update:selected-common', value: string[]): void;

  (e: 'update:selected-personal', value: string[]): void;

  (e: 'update:selected', value: string[]): void;

  (e: 'add-indicator'): void;

  (e: 'edit-indicator', indicator: IndicatorNode): void;

  (e: 'delete-indicator', indicatorId: string): void;

  (e: 'add-dashboard', indicatorIds: string[]): void;

  (e: 'delete-dashboard', indicatorIds: string[]): void;

  (e: 'reload-data'): void;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  commonIndicators: () => [],
  personalIndicators: () => [],
  selectedCommonIndicators: () => [],
  selectedPersonalIndicators: () => [],
  selectedIndicators: () => [],
  expandedCommonKeys: () => [],
  expandedPersonalKeys: () => [],
  showPersonalIndicators: true
  // 注意：权限配置不设置默认值，由父组件传入
})

const emit = defineEmits<Emits>()

// 面板状态
const panelWidth = ref(320)
const isResizing = ref(false)
const searchKeyword = ref('')

// 展开的节点keys
const expandedCommonKeys = ref<string[]>([...(props.expandedCommonKeys || [])])
const expandedPersonalKeys = ref<string[]>([...(props.expandedPersonalKeys || [])])

// 防止循环触发的标志位
const isUpdatingFromProps = ref(false)

// 响应式数据 - 分别处理通用指标和个人指标的选中状态
const selectedCommonIndicators = ref<string[]>([
  ...(props.selectedCommonIndicators || [])
])
const selectedPersonalIndicators = ref<string[]>([
  ...(props.selectedPersonalIndicators || [])
])

// 分离通用指标和个人指标，确保按order字段排序
const commonIndicators = computed(() => sortNodesByOrder(props.commonIndicators || []))
const personalIndicators = computed(() => sortNodesByOrder(props.personalIndicators || []))

const commonTreeKey = ref(true)
const personalTreeKey = ref(true)

// 搜索过滤和高亮
const filteredCommonIndicators = computed(() => {
  return filterAndHighlightTree(commonIndicators.value, searchKeyword.value)
})

const filteredPersonalIndicators = computed(() => {
  return filterAndHighlightTree(personalIndicators.value, searchKeyword.value)
})

// 决定是否显示新增按钮
const shouldShowAddButton = computed(() => {
  const result = props.showPersonalIndicators ?
    props.personalIndicatorPermissions?.edit :
    props.commonIndicatorPermissions?.edit

  return result
})
// 获取默认应该展开的节点（有items且不为空的节点及其祖先）
const getDefaultExpandedKeys = (tree: IndicatorNode[]): string[] => {
  const keysToExpand = new Set<string>()

  const collectExpandableNodes = (nodes: IndicatorNode[], ancestors: string[] = []) => {
    nodes.forEach((node) => {
      const currentPath = [...ancestors, node.key]

      if (node.items && node.items.length > 0) {
        // 有指标的节点，展开其所有祖先
        currentPath.forEach((key) => keysToExpand.add(key))
      }

      if (node.children && node.children.length > 0) {
        collectExpandableNodes(node.children, currentPath)
      }
    })
  }

  collectExpandableNodes(tree)
  return Array.from(keysToExpand)
}
// 初始化展开的节点
const initializeExpandedKeys = () => {
  // 如果props中已经提供了展开的节点keys，则使用这些keys
  if (props.expandedCommonKeys && props.expandedCommonKeys.length > 0) {
    expandedCommonKeys.value = [...props.expandedCommonKeys]
  } else {
    // 否则使用默认逻辑
    const allIndicators = [...props.commonIndicators, ...props.personalIndicators]
    const expandedKeys = getDefaultExpandedKeys(allIndicators)
    expandedCommonKeys.value = expandedKeys.filter((key) =>
      findNodeInTree(props.commonIndicators, key)
    )
  }

  // 如果props中已经提供了展开的节点keys，则使用这些keys
  if (props.expandedPersonalKeys && props.expandedPersonalKeys.length > 0) {
    expandedPersonalKeys.value = [...props.expandedPersonalKeys]
  } else {
    // 否则使用默认逻辑
    const allIndicators = [...props.commonIndicators, ...props.personalIndicators]
    const expandedKeys = getDefaultExpandedKeys(allIndicators)
    expandedPersonalKeys.value = expandedKeys.filter((key) =>
      findNodeInTree(props.personalIndicators, key)
    )
  }
}

// 监听搜索关键词变化，更新展开状态
watch(
  () => searchKeyword.value,
  (newVal) => {
    if (!newVal.trim()) {
      // 如果搜索关键词为空，恢复默认展开状态
      initializeExpandedKeys()
    } else {
      // 如果有搜索关键词，根据过滤结果更新展开状态
      updateExpandedKeysForSearch(newVal)
    }
  }
)

// 根据搜索关键词更新展开状态
const updateExpandedKeysForSearch = (keyword: string) => {
  // 获取过滤后的通用指标和展开的键
  const filteredCommon = filterAndHighlightTree(commonIndicators.value, keyword)
  const keysToExpandCommon = getKeysToExpandFromFilteredTree(filteredCommon)

  // 获取过滤后的个人指标和展开的键
  const filteredPersonal = filterAndHighlightTree(personalIndicators.value, keyword)
  const keysToExpandPersonal = getKeysToExpandFromFilteredTree(filteredPersonal)

  // 更新展开状态
  expandedCommonKeys.value = keysToExpandCommon.filter((key) =>
    findNodeInTree(props.commonIndicators, key)
  )
  expandedPersonalKeys.value = keysToExpandPersonal.filter((key) =>
    findNodeInTree(props.personalIndicators, key)
  )
}

// 从过滤后的树中获取需要展开的键
const getKeysToExpandFromFilteredTree = (tree: IndicatorNode[]): string[] => {
  const keysToExpand = new Set<string>()

  const collectKeys = (nodes: IndicatorNode[], ancestors: string[] = []) => {
    nodes.forEach((node) => {
      const currentPath = [...ancestors, node.key]

      // 如果节点有子节点，需要展开它
      if (node.children && node.children.length > 0) {
        currentPath.forEach((key) => keysToExpand.add(key))
        collectKeys(node.children, currentPath)
      }
    })
  }

  collectKeys(tree)
  return Array.from(keysToExpand)
}

// 过滤和高亮树形数据
const filterAndHighlightTree = (
  tree: IndicatorNode[],
  keyword: string
): IndicatorNode[] => {
  if (!keyword.trim()) return tree

  const filterNode = (
    node: IndicatorNode,
    ancestors: string[] = []
  ): IndicatorNode | null => {
    // 检查节点标题是否匹配
    const titleMatches =
      node.title?.toLowerCase().includes(keyword.toLowerCase()) || false

    // 检查节点的items是否有匹配的
    let itemsMatch = false
    if (node.items && node.items.length > 0) {
      itemsMatch = node.items.some((item: any) =>
        item.title?.toLowerCase().includes(keyword.toLowerCase())
      )
    }

    // 递归过滤子节点
    const filteredChildren: IndicatorNode[] = []
    if (node.children) {
      node.children.forEach((child) => {
        const filteredChild = filterNode(child, [...ancestors, node.key])
        if (filteredChild) {
          filteredChildren.push(filteredChild)
        }
      })
    }

    // 如果当前节点匹配或有匹配的子节点，则保留
    const shouldKeep = titleMatches || itemsMatch || filteredChildren.length > 0

    if (shouldKeep) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : undefined
      }
    }

    return null
  }

  return tree.map((node) => filterNode(node)).filter(Boolean) as IndicatorNode[]
}

// 检查文本是否应该高亮
const isHighlighted = (text: string): boolean => {
  if (!searchKeyword.value.trim()) return false
  return text.toLowerCase().includes(searchKeyword.value.toLowerCase())
}

// 事件处理
const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}

const onSearch = () => {
  // 搜索逻辑在computed中处理
}

const onPersonalIndicatorCheck = (checkedKeys: any) => {
  // 当checkStrictly为true时，checkedKeys是对象格式{checked: [...], halfChecked: [...]}
  const keys = Array.isArray(checkedKeys)
    ? checkedKeys
    : checkedKeys.checked || checkedKeys

  // 更新选中状态
  selectedPersonalIndicators.value = keys
  emit('update:selected-personal', keys)
  // 同时更新合并的选中状态，但保持通用指标的选中状态
  emit('update:selected', [...selectedCommonIndicators.value, ...keys])

  // dashboard事件触发已移到watch函数中
}

const onCommonIndicatorCheck = (checkedKeys: any) => {
  // 当checkStrictly为true时，checkedKeys是对象格式{checked: [...], halfChecked: [...]}
  const keys = Array.isArray(checkedKeys)
    ? checkedKeys
    : checkedKeys.checked || checkedKeys

  // 更新选中状态
  selectedCommonIndicators.value = keys
  emit('update:selected-common', keys)
  // 同时更新合并的选中状态，但保持个人指标的选中状态
  emit('update:selected', [...keys, ...selectedPersonalIndicators.value])

  // dashboard事件触发已移到watch函数中
}

const addIndicator = () => {
  emit('add-indicator')
}

const editIndicator = (indicator: IndicatorNode) => {
  emit('edit-indicator', indicator)
}

const deleteIndicator = (indicator: IndicatorNode) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除指标"${indicator.title}"吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk() {
      emit('delete-indicator', indicator.id)
    }
  })
}

// 处理通用指标树的拖拽放下事件
const onCommonTreeDrop = async (info: any) => {
  try {
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos.split('-').map(Number)
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    const dropToGap = info.dropToGap

    // 获取拖拽节点和目标节点
    const dragNode = findNodeInTree(commonIndicators.value, dragKey)
    const dropNode = findNodeInTree(commonIndicators.value, dropKey)

    if (!dragNode) {
      console.error('找不到拖拽节点:', dragKey)
      return
    }

    let newPid: string | null = null

    if (!dropToGap) {
      // 拖拽到节点内部，设置为目标节点的子节点
      newPid = dropNode ? dropNode.id : null
    } else {
      // 拖拽到节点间隙，设置为目标节点的同级
      newPid = dropNode ? dropNode.pid : null
    }

    // 只有在父节点真的改变时才更新pid
    if (dragNode.pid !== newPid) {
      await updateStatisticPid({
        id: dragNode.id,
        pid: newPid
      })
    }

    // 更新顺序（无论是否改变了父节点都需要更新顺序）
    await updateCommonSameLevelOrder(dragKey, dropKey, dropPosition, newPid)

    // 重新加载数据以更新界面
    emit('reload-data')
  } catch (error) {
    console.error('通用指标拖拽更新失败:', error)
    message.error('通用指标拖拽更新失败')
  }
}

// 处理个人指标树的拖拽放下事件
const onPersonalTreeDrop = async (info: any) => {
  try {
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos.split('-').map(Number)
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    // 获取拖拽节点和目标节点
    const dragNode = findNodeInTree(personalIndicators.value, dragKey)
    const dropNode = findNodeInTree(personalIndicators.value, dropKey)

    // 即使找不到节点，也要继续执行更新操作，确保UI的一致性
    // 如果拖拽到同一个父节点下，只需要更新顺序
    if (dragNode && dropNode && dragNode.pid === dropNode.pid) {
      // 获取同级节点并更新顺序
      await updateSameLevelOrder(dragKey, dropKey, dropPosition, dropNode.pid)
    } else {
      // 如果拖拽到不同的父节点下，需要更新父节点和顺序
      // 或者当节点找不到时，仍然尝试更新顺序
      await updateDifferentParent(dragKey, dropKey, dropPosition)
    }
    // 重新加载数据以更新界面
    emit('reload-data')
  } catch (error) {
    console.error('拖拽更新失败:', error)
    message.error('拖拽更新失败')
  }
}

// 更新同级节点的顺序
const updateSameLevelOrder = async (
  dragKey: string,
  dropKey: string,
  dropPosition: number,
  parentId: string | null
) => {
  try {
    // 获取同级节点
    let siblingNodes: IndicatorNode[] = []

    if (parentId) {
      // 如果有父节点，获取父节点的子节点
      const parentNode = findNodeInTree(personalIndicators.value, parentId)
      if (parentNode && parentNode.children) {
        siblingNodes = parentNode.children
      }
    } else {
      // 如果没有父节点，获取所有根节点（pid为null、undefined或空字符串的节点）
      siblingNodes = personalIndicators.value.filter(node => !node.pid || node.pid === '' || node.pid === null)
    }

    // 重新排序
    const newOrder = [...siblingNodes]
    const dragIndex = newOrder.findIndex((node) => node.key === dragKey)
    const dropIndex = newOrder.findIndex((node) => node.key === dropKey)

    // 即使找不到节点，也要继续执行更新操作，确保UI的一致性
    // 移除拖拽节点（如果存在）
    let draggedNode = null
    if (dragIndex !== -1) {
      [draggedNode] = newOrder.splice(dragIndex, 1)
    }

    // 计算插入位置
    let insertIndex = newOrder.length // 默认插入到末尾

    // 特别处理：当将节点放在第一个节点前面时
    if (dropPosition === 0 && dropIndex === -1) {
      // 将节点放在第一个位置前面
      insertIndex = 0
    } else if (dropIndex !== -1) {
      // 计算插入位置
      if (dropPosition === -1) {
        // 放在目标节点前面
        insertIndex = dropIndex
      } else if (dropPosition === 1) {
        // 放在目标节点后面
        insertIndex = dropIndex + 1
      }

      // 如果拖拽节点原本在目标节点后面，移除节点后索引会前移，所以需要调整插入位置
      if (dragIndex !== -1 && dragIndex > dropIndex) {
        // 当拖拽节点在目标节点后面时，移除拖拽节点后，目标节点的索引会前移1位
        // 所以插入位置需要减1
        if (dropPosition === -1) {
          // 放在目标节点前面，插入位置应该是目标节点的新索引
          insertIndex = dropIndex
        } else if (dropPosition === 1) {
          // 放在目标节点后面，插入位置应该是目标节点的新索引+1
          insertIndex = dropIndex + 1
        }
      } else if (dragIndex !== -1 && dragIndex < dropIndex) {
        // 当拖拽节点在目标节点前面时，移除拖拽节点后，目标节点的索引会前移1位
        // 所以插入位置需要减1
        insertIndex--
      }
    } else if (dropPosition === -1) {
      // 如果找不到目标节点，但要求放在前面，则插入到开头
      insertIndex = 0
    }


    // 如果找到了拖拽节点，则插入到计算的位置
    if (draggedNode) {
      newOrder.splice(insertIndex, 0, draggedNode)
    }

    // 构造更新顺序的数据，从1开始计数
    const orderData = newOrder.map((node, index) => ({
      id: node.id,
      showOrder: index + 1 // 从1开始计数
    }))

    // 调用API更新顺序
    await updateStatisticOrder(orderData)
  } catch (error) {
    console.error('更新同级节点顺序失败:', error)
    throw error
  }
}

// 更新不同父节点的情况
const updateDifferentParent = async (
  dragKey: string,
  dropKey: string,
  dropPosition: number
) => {
  try {
    // 获取拖拽节点和目标节点
    const dragNode = findNodeInTree(personalIndicators.value, dragKey)
    const dropNode = findNodeInTree(personalIndicators.value, dropKey)

    // 即使找不到节点，也要继续执行更新操作，确保UI的一致性
    let newPid: string | null = null

    if (dragNode && dropNode) {
      // 根据dropPosition确定新的父节点
      if (dropPosition === -1) {
        // 放在目标节点前面，父节点为目标节点的父节点
        newPid = dropNode.pid
      } else if (dropPosition === 1) {
        // 放在目标节点后面，父节点为目标节点的父节点
        newPid = dropNode.pid
      } else {
        // 放在目标节点内部，父节点为目标节点
        newPid = dropNode.id
      }

      // 更新父节点
      await updateStatisticPid({
        id: dragNode.id,
        pid: newPid
      })
    } else {
      // 如果找不到节点，仍然尝试根据dropKey确定新的父节点
      if (dropNode) {
        if (dropPosition === -1 || dropPosition === 1) {
          // 放在目标节点前面或后面，父节点为目标节点的父节点
          newPid = dropNode.pid
        } else {
          // 放在目标节点内部，父节点为目标节点
          newPid = dropNode.id
        }
      }
      // 如果连dropNode都找不到，我们仍然需要更新顺序，使用null作为父节点
    }

    // 更新同级节点顺序
    await updateSameLevelOrder(dragKey, dropKey, dropPosition, newPid)
  } catch (error) {
    console.error('更新不同父节点失败:', error)
    throw error
  }
}

// 更新通用指标同级节点的顺序
const updateCommonSameLevelOrder = async (
  dragKey: string,
  dropKey: string,
  dropPosition: number,
  parentId: string | null
) => {
  try {
    // 获取新父节点下的所有子节点
    let siblingNodes: IndicatorNode[] = []

    if (parentId) {
      // 如果有父节点，获取父节点的子节点
      const parentNode = findNodeInTree(commonIndicators.value, parentId)
      if (parentNode && parentNode.children) {
        siblingNodes = [...parentNode.children]
      }
    } else {
      // 如果没有父节点，获取所有根节点（pid为null、undefined或空字符串的节点）
      siblingNodes = [...commonIndicators.value.filter(node => !node.pid || node.pid === '' || node.pid === null)]
    }

    // 找到拖拽节点并移除（如果存在）
    const dragIndex = siblingNodes.findIndex((node) => node.key === dragKey)
    let draggedNode = null
    if (dragIndex !== -1) {
      [draggedNode] = siblingNodes.splice(dragIndex, 1)
    }

    // 找到目标节点的位置
    const dropIndex = siblingNodes.findIndex((node) => node.key === dropKey)

    // 计算插入位置
    let insertIndex = siblingNodes.length // 默认插入到末尾

    if (dropIndex !== -1) {
      if (dropPosition === -1) {
        // 放在目标节点前面
        insertIndex = dropIndex
      } else if (dropPosition === 1) {
        // 放在目标节点后面
        insertIndex = dropIndex + 1
      }
    }

    // 插入拖拽节点到新位置
    if (draggedNode) {
      siblingNodes.splice(insertIndex, 0, draggedNode)
    }

    // 构造更新顺序的数据
    const orderData = siblingNodes.map((node, index) => ({
      id: node.id,
      showOrder: index + 1
    }))

    // 调用API更新顺序
    await updateStatisticOrder(orderData)
  } catch (error) {
    console.error('更新通用指标同级节点顺序失败:', error)
    throw error
  }
}

// 拖拽调整宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = panelWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const deltaX = e.clientX - startX
    panelWidth.value = Math.max(200, Math.min(600, startWidth + deltaX))
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    window.removeEventListener('blur', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('blur', handleMouseUp)
}

// 生命周期
onMounted(() => {
})

onUnmounted(() => {
  // 确保在组件卸载时移除所有事件监听器
  document.removeEventListener('mousemove', null as any)
  document.removeEventListener('mouseup', null as any)
  window.removeEventListener('blur', null as any)
})

// 监听个人指标选中状态变化，触发dashboard事件
watch(
  () => selectedPersonalIndicators.value,
  (newVal, oldVal) => {
    // 如果是来自props的更新，不触发事件
    if (isUpdatingFromProps.value) {
      return
    }

    // 检测新增的选中项（checked）
    const newlyChecked = newVal.filter((key: string) => !oldVal.includes(key))
    // 检测取消选中的项（unchecked）
    const newlyUnchecked = oldVal.filter((key: string) => !newVal.includes(key))

    // 如果没有变化，不触发事件
    if (newlyChecked.length === 0 && newlyUnchecked.length === 0) {
      return
    }

    // 过滤出叶子节点的变更
    // 叶子节点判断：没有children属性或者children为空数组
    const leafNodesChecked = newlyChecked.filter((key: string) => {
      const node = findNodeInTree(personalIndicators.value, key)
      // 只有叶子节点才能添加到dashboard
      return node ? (!node.children || node.children.length === 0) : false
    })

    const leafNodesUnchecked = newlyUnchecked.filter((key: string) => {
      const node = findNodeInTree(personalIndicators.value, key)
      // 只有叶子节点才能从dashboard移除
      return node ? (!node.children || node.children.length === 0) : false
    })

    // 将key转换为id用于API调用
    const leafNodeIdsChecked = leafNodesChecked
      .map((key: string) => {
        const node = findNodeInTree(personalIndicators.value, key)
        return node ? node.id : null
      })
      .filter(Boolean) as string[]

    const leafNodeIdsUnchecked = leafNodesUnchecked
      .map((key: string) => {
        const node = findNodeInTree(personalIndicators.value, key)
        return node ? node.id : null
      })
      .filter(Boolean) as string[]

    // 只对叶子节点触发新增dashboard事件
    if (leafNodeIdsChecked.length > 0) {
      emit('add-dashboard', leafNodeIdsChecked)
    }

    // 只对叶子节点触发删除dashboard事件
    if (leafNodeIdsUnchecked.length > 0) {
      emit('delete-dashboard', leafNodeIdsUnchecked)
    }
  },
  { deep: true }
)

// 监听通用指标选中状态变化，触发dashboard事件
watch(
  () => selectedCommonIndicators.value,
  (newVal, oldVal) => {
    // 如果是来自props的更新，不触发事件
    if (isUpdatingFromProps.value) {
      return
    }

    // 检测新增的选中项（checked）
    const newlyChecked = newVal.filter((key: string) => !oldVal.includes(key))
    // 检测取消选中的项（unchecked）
    const newlyUnchecked = oldVal.filter((key: string) => !newVal.includes(key))

    // 如果没有变化，不触发事件
    if (newlyChecked.length === 0 && newlyUnchecked.length === 0) {
      return
    }

    // 过滤出叶子节点的变更
    // 叶子节点判断：没有children属性或者children为空数组
    const leafNodesChecked = newlyChecked.filter((key: string) => {
      const node = findNodeInTree(commonIndicators.value, key)
      // 只有叶子节点才能添加到dashboard
      return node ? (!node.children || node.children.length === 0) : false
    })

    const leafNodesUnchecked = newlyUnchecked.filter((key: string) => {
      const node = findNodeInTree(commonIndicators.value, key)
      // 只有叶子节点才能从dashboard移除
      return node ? (!node.children || node.children.length === 0) : false
    })

    // 将key转换为id用于API调用
    const leafNodeIdsChecked = leafNodesChecked
      .map((key: string) => {
        const node = findNodeInTree(commonIndicators.value, key)
        return node ? node.id : null
      })
      .filter(Boolean) as string[]

    const leafNodeIdsUnchecked = leafNodesUnchecked
      .map((key: string) => {
        const node = findNodeInTree(commonIndicators.value, key)
        return node ? node.id : null
      })
      .filter(Boolean) as string[]

    // 只对叶子节点触发新增dashboard事件
    if (leafNodeIdsChecked.length > 0) {
      emit('add-dashboard', leafNodeIdsChecked)
    }

    // 只对叶子节点触发删除dashboard事件
    if (leafNodeIdsUnchecked.length > 0) {
      emit('delete-dashboard', leafNodeIdsUnchecked)
    }
  },
  { deep: true }
)

// 监听props中选中状态的变化
watch(
  () => props.selectedCommonIndicators,
  (newVal) => {
    if (newVal) {
      // 设置标志位，表示这是来自props的更新
      isUpdatingFromProps.value = true
      selectedCommonIndicators.value = [...newVal]

      // 下一个tick后重置标志位
      nextTick(() => {
        isUpdatingFromProps.value = false
      })
    }
  },
  { deep: true }
)

watch(
  () => props.selectedPersonalIndicators,
  (newVal) => {
    if (newVal) {
      // 设置标志位，表示这是来自props的更新
      isUpdatingFromProps.value = true
      selectedPersonalIndicators.value = [...newVal]

      // 下一个tick后重置标志位
      nextTick(() => {
        isUpdatingFromProps.value = false
      })
    }
  },
  { deep: true }
)

// 监听props中展开状态的变化
watch(
  () => props.expandedCommonKeys,
  (newVal) => {
    if (newVal) {
      expandedCommonKeys.value = [...newVal]
    }
  },
  { deep: true }
)

watch(
  () => props.expandedPersonalKeys,
  (newVal) => {
    if (newVal) {
      expandedPersonalKeys.value = [...newVal]
    }
  },
  { deep: true }
)

// 按order字段排序节点数组
// 修复排列顺序问题：确保每次刷新（手动刷新、删除、新增）都按顺序排列
const sortNodesByOrder = (nodes: IndicatorNode[]): IndicatorNode[] => {
  return [...nodes].sort((a, b) => {
    // 如果有order字段，按order排序，否则按title排序作为后备方案
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return 1
    return (a.title || '').localeCompare(b.title || '')
  }).map(node => ({
    ...node,
    // 递归排序子节点
    children: node.children ? sortNodesByOrder(node.children) : undefined
  }))
}

// 在树中查找节点
const findNodeInTree = (tree: IndicatorNode[], key: string): IndicatorNode | null => {
  for (const node of tree) {
    if (node.key === key) return node
    if (node.children) {
      const found = findNodeInTree(node.children, key)
      if (found) return found
    }
  }
  return null
}
</script>

<style lang="less" scoped>
.indicator-tree-panel {
  position: relative;
  background: white;
  border-right: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  min-height: 830px;
  z-index: 100;

  &.collapsed {
    width: 48px;

    .collapsed-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 60px;
      padding: 16px 8px;

      .collapsed-icon {
        font-size: 18px;
        color: #666;
        margin-bottom: 8px;
      }

      .collapsed-text {
        font-size: 12px;
        color: #666;
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }
    }
  }

  .collapse-trigger {
    position: absolute;
    top: 16px;
    right: 8px;
    z-index: 101;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.3s;

    &:hover {
      color: #1890ff;
      border-color: #1890ff;
      background: #f0f8ff;
    }
  }

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    background: transparent;
    z-index: 101;

    &:hover {
      background: #1890ff;
      opacity: 0.5;
    }
  }

  .floating-add-button {
    position: fixed;
    bottom: 60px;
    left: 280px;
    z-index: 102;
    transition: left 0.3s ease;
  }

  /* 当侧边栏折叠时，隐藏添加按钮 */
  &.collapsed .floating-add-button {
    display: none;
  }

  .tree-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    overflow: hidden;

    .search-section {
      margin-bottom: 16px;
    }

    .indicator-categories {
      flex: 1;
      overflow: auto;

      .category-section {
        margin-bottom: 24px;

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;

          h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #262626;
          }
        }

        .tree-wrapper {
          :deep(.ant-tree) {
            .ant-tree-node-content-wrapper {
              display: flex;
              flex: 1;

              .ant-tree-title {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;

                .tree-node-title {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  width: 100%;

                  .node-title {
                    flex: 1;

                    &.search-highlight {
                      background: #fff3cd;
                      color: #856404;
                      padding: 0 2px;
                      border-radius: 2px;
                    }
                  }

                  .node-actions {
                    display: none;
                    gap: 4px;
                    align-items: center;

                    .ant-switch {
                      margin-right: 4px;
                    }

                    .anticon {
                      padding: 2px;
                      border-radius: 2px;
                      cursor: pointer;
                      color: #666;

                      &:hover {
                        background: #f0f0f0;
                        color: #1890ff;
                      }
                    }
                  }
                }

                &:hover .node-actions {
                  display: flex;
                }
              }
            }

            .ant-tree-checkbox {
              margin-block-start: 0;
              margin-right: 8px;
            }
          }
        }
      }
    }
  }

  .search-highlight {
    background: #fff3cd !important;
    color: #856404 !important;
    padding: 0 2px;
    border-radius: 2px;
  }
}
</style>
