<template>
  <div
    :class="{ collapsed: collapsed }"
    class="indicator-tree-panel"
  >
    <!-- 折叠控制按钮 -->
    <div
      class="collapse-trigger"
      @click="toggleCollapse"
    >
      <MenuFoldOutlined v-if="!collapsed" />
      <MenuUnfoldOutlined v-else />
    </div>

    <!-- 可调整宽度的分隔条 -->
    <div
      v-if="!collapsed"
      class="resize-handle"
      @mousedown="startResize"
    ></div>

    <!-- 树形面板内容 -->
    <div
      v-if="!collapsed"
      :style="{ width: panelWidth + 'px' }"
      class="tree-content"
    >
      <!-- 搜索框 -->
      <div class="search-section">
        <a-input
          v-model:value="searchKeyword"
          allow-clear
          placeholder="搜索指标"
          @input="onSearch"
        >
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
              ref="commonTreeKey"
              v-model:checked-keys="selectedCommonIndicators"
              v-model:expanded-keys="expandedCommonKeys"
              :checkable="true"
              :draggable="true"
              :selectable="false"
              :show-icon="true"
              :show-line="true"
              :tree-data="filteredCommonIndicators"
              block-node
              @check="onCommonIndicatorCheck"
              @drop="onCommonTreeDrop"
            >
              <template #title="{ title, dataRef }">
                <div
                  :class="{ 'search-highlight': isHighlighted(title) }"
                  class="tree-node-title"
                  @contextmenu.prevent="(e) => showContextMenu(e, dataRef, 'common')"
                >
                  <span
                    class="node-title node-title-clickable"
                    @click.stop="editIndicator(dataRef)"
                  >{{ title }}</span>
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
        <div
          v-if="showPersonalIndicators"
          class="category-section"
        >
          <div class="category-header">
            <h4>个人指标</h4>
          </div>
          <div class="tree-wrapper">
            <a-tree
              ref="personalTreeKey"
              v-model:checked-keys="selectedPersonalIndicators"
              v-model:expanded-keys="expandedPersonalKeys"
              :checkable="true"
              :draggable="true"
              :selectable="false"
              :show-icon="true"
              :show-line="true"
              :tree-data="filteredPersonalIndicators"
              block-node
              @check="onPersonalIndicatorCheck"
              @drop="onPersonalTreeDrop"
            >
              <template #title="{ title, dataRef }">
                <div
                  :class="{ 'search-highlight': isHighlighted(title) }"
                  class="tree-node-title"
                  @contextmenu.prevent="(e) => showContextMenu(e, dataRef, 'personal')"
                >
                  <span
                    class="node-title node-title-clickable"
                    @click.stop="editIndicator(dataRef)"
                  >{{ title }}</span>
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
    <div
      v-else
      class="collapsed-content"
    >
      <div class="collapsed-icon">
        <BarChartOutlined />
      </div>
      <div class="collapsed-text">
        指标
      </div>
    </div>

    <!-- 悬浮的新增指标按钮 -->
    <div
      v-if="!collapsed && shouldShowAddButton"
      :style="{ left: (panelWidth - 58) + 'px' }"
      class="floating-add-button"
    >
      <a-button
        shape="circle"
        size="large"
        type="primary"
        @click="addIndicator"
      >
        <PlusOutlined />
      </a-button>
    </div>
  
    <!-- 右键菜单 -->
    <a-dropdown
      v-model:open="contextMenuVisible"
      :trigger="['contextmenu']"
    >
      <div
        :style="{
          position: 'fixed',
          left: contextMenuPosition.x + 'px',
          top: contextMenuPosition.y + 'px',
          width: '1px',
          height: '1px'
        }"
      ></div>
      <template #overlay>
        <a-menu @click="handleContextMenuClick">
          <a-menu-item
            v-if="currentContextNode && getPermissions('edit')"
            key="add"
          >
            <PlusOutlined />
            <span>添加子节点</span>
          </a-menu-item>
          <a-menu-item
            v-if="currentContextNode && getPermissions('edit')"
            key="edit"
          >
            <EditOutlined />
            <span>编辑</span>
          </a-menu-item>
          <a-menu-item
            v-if="currentContextNode && getPermissions('edit')"
            key="copy"
          >
            <CopyOutlined />
            <span>复制</span>
          </a-menu-item>
          <a-menu-item
            v-if="currentContextNode && getPermissions('delete')"
            key="delete"
            danger
          >
            <DeleteOutlined />
            <span>删除</span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<script lang="ts" setup>
import {
  BarChartOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { updateStatisticOrder, updateStatisticPid } from './api'
import { collectLeafIds, findNodeInTree, isLeafNode, sortNodesByOrder } from './treeUtils'
import type { IndicatorNode } from './types'

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

  (e: 'add-indicator', parentNode?: IndicatorNode): void;

  (e: 'edit-indicator', indicator: IndicatorNode): void;

  (e: 'copy-indicator', indicator: IndicatorNode): void;

  (e: 'delete-indicator', indicatorId: string): void;

  (e: 'add-dashboard', indicatorIds: string[]): void;

  (e: 'delete-dashboard', indicatorIds: string[]): void;

  (e: 'reload-data'): void;

  (e: 'node-title-click', indicatorId: string): void;
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

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const currentContextNode = ref<IndicatorNode | null>(null)
const currentContextType = ref<'common' | 'personal'>('common')

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

// 监听搜索关键词变化,更新展开状态
watch(
  () => searchKeyword.value,
  (newVal) => {
    if (newVal.trim()) {
      // 如果有搜索关键词,根据过滤结果更新展开状态
      updateExpandedKeysForSearch(newVal)
    }
    // 搜索框清空时不再自动恢复展开状态,保持用户当前的展开状态
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

// 显示右键菜单
const showContextMenu = (e: MouseEvent, node: IndicatorNode, type: 'common' | 'personal') => {
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  currentContextNode.value = node
  currentContextType.value = type
  contextMenuVisible.value = true
}

// 获取当前节点的权限
const getPermissions = (action: 'edit' | 'delete') => {
  if (!currentContextNode.value) return false
  const permissions = currentContextType.value === 'common' 
    ? props.commonIndicatorPermissions 
    : props.personalIndicatorPermissions
  return permissions?.[action] || false
}

// 处理右键菜单点击
const handleContextMenuClick = ({ key }: { key: any }) => {
  if (!currentContextNode.value) return

  switch (String(key)) {
    case 'add':
      // 添加子节点，传入父节点
      emit('add-indicator', currentContextNode.value)
      break
    case 'edit':
      editIndicator(currentContextNode.value)
      break
    case 'copy':
      // 复制图表
      emit('copy-indicator', currentContextNode.value)
      break
    case 'delete':
      deleteIndicator(currentContextNode.value)
      break
  }
  
  contextMenuVisible.value = false
  currentContextNode.value = null
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
    content: `确定要删除指标“${indicator.title}”吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk() {
      emit('delete-indicator', indicator.id)
    }
  })
}

// 拖拽放下事件处理器工厂（通用/个人共用）
const makeTreeDropHandler = (getSource: () => IndicatorNode[]) => async (info: any) => {
  try {
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos.split('-').map(Number)
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    const dropToGap = info.dropToGap

    const source = getSource()
    // 获取拖拽节点和目标节点
    const dragNode = findNodeInTree(source, dragKey)
    const dropNode = findNodeInTree(source, dropKey)

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
    await updateSiblingOrder(source, dragKey, dropKey, dropPosition, newPid)

    // 重新加载数据以更新界面
    emit('reload-data')
  } catch (error) {
    console.error('拖拽更新失败:', error)
    message.error('拖拽更新失败')
  }
}

const onCommonTreeDrop = makeTreeDropHandler(() => commonIndicators.value)
const onPersonalTreeDrop = makeTreeDropHandler(() => personalIndicators.value)

// 更新同级节点的顺序（通用/个人共用，传入对应的树数据源）
const updateSiblingOrder = async (
  source: IndicatorNode[],
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
      const parentNode = findNodeInTree(source, parentId)
      if (parentNode && parentNode.children) {
        siblingNodes = [...parentNode.children]
      }
    } else {
      // 如果没有父节点，获取所有根节点（pid为null、undefined或空字符串的节点）
      siblingNodes = [...source.filter(node => !node.pid || node.pid === '' || node.pid === null)]
    }

    // 找到拖拽节点和目标节点的原始位置
    const dragIndex = siblingNodes.findIndex((node) => node.key === dragKey)
    const originalDropIndex = siblingNodes.findIndex((node) => node.key === dropKey)

    let draggedNode = null
    if (dragIndex !== -1) {
      [draggedNode] = siblingNodes.splice(dragIndex, 1)
    }

    // 重新找到目标节点的位置（因为数组可能已经改变）
    let dropIndex = siblingNodes.findIndex((node) => node.key === dropKey)

    // 如果原来的拖拽节点在目标节点前面，那么移除后目标节点的索引不变
    // 如果原来的拖拽节点在目标节点后面，那么目标节点的索引也不变
    // 但为了保险起见，我们重新查找
    if (dropIndex === -1) {
      // 如果没找到，说明可能有问题，使用原始位置并调整
      dropIndex = originalDropIndex
      if (dragIndex < originalDropIndex) {
        dropIndex = originalDropIndex - 1
      }
    }

    // 计算插入位置
    let insertIndex = 0 // 默认插入到开头

    if (dropIndex !== -1) {
      if (dropPosition === -1) {
        // 放在目标节点前面
        insertIndex = dropIndex
      } else if (dropPosition === 1) {
        // 放在目标节点后面
        insertIndex = dropIndex + 1
      } else {
        // dropPosition为0，表示放在目标节点内部，但在同级排序中应该不会出现这种情况
        insertIndex = dropIndex + 1
      }
    } else {
      // 如果没找到目标节点，说明是拖拽到父节点内部
      if (dropPosition === 0) {
        // dropPosition为0表示要插入到父节点的第一个位置
        insertIndex = 0
      } else {
        // 其他情况插入到末尾
        insertIndex = siblingNodes.length
      }
    }

    // 确保插入位置在合理范围内
    insertIndex = Math.max(0, Math.min(insertIndex, siblingNodes.length))

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
    console.error('更新同级节点顺序失败:', error)
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
  // resize 相关监听在 startResize/handleMouseUp 内部成对注册与移除，此处无需再处理
})

// 选中状态变化处理器工厂（通用/个人共用）：对新增/取消的叶子节点触发 dashboard 增删事件
const makeCheckWatchHandler = (getSource: () => IndicatorNode[]) =>
  (newVal: string[], oldVal: string[]) => {
    // 如果是来自props的更新，不触发事件
    if (isUpdatingFromProps.value) {
      return
    }

    // 检测新增的选中项（checked）和取消选中的项（unchecked）
    const newlyChecked = newVal.filter((key: string) => !oldVal.includes(key))
    const newlyUnchecked = oldVal.filter((key: string) => !newVal.includes(key))

    // 如果没有变化，不触发事件
    if (newlyChecked.length === 0 && newlyUnchecked.length === 0) {
      return
    }

    const source = getSource()
    // 将 key 列表转换为叶子节点的 id 列表
    const toLeafIds = (keys: string[]): string[] =>
      keys
        .map((key: string) => findNodeInTree(source, key))
        .filter((node): node is IndicatorNode => !!node && isLeafNode(node))
        .map((node) => node.id)
        .filter(Boolean) as string[]

    const leafNodeIdsChecked = toLeafIds(newlyChecked)
    const leafNodeIdsUnchecked = toLeafIds(newlyUnchecked)

    // 只对叶子节点触发新增dashboard事件
    if (leafNodeIdsChecked.length > 0) {
      emit('add-dashboard', leafNodeIdsChecked)
    }

    // 只对叶子节点触发删除dashboard事件
    if (leafNodeIdsUnchecked.length > 0) {
      emit('delete-dashboard', leafNodeIdsUnchecked)
    }
  }

// 监听个人指标选中状态变化，触发dashboard事件
watch(
  () => selectedPersonalIndicators.value,
  makeCheckWatchHandler(() => personalIndicators.value),
  { deep: true }
)

// 监听通用指标选中状态变化，触发dashboard事件
watch(
  () => selectedCommonIndicators.value,
  makeCheckWatchHandler(() => commonIndicators.value),
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
// 注意:只在初始化时使用props的展开状态,后续用户手动展开/收起后不再被props覆盖
watch(
  () => props.expandedCommonKeys,
  (newVal) => {
    // 只在初始化时(当前展开keys为空)才使用props的值
    if (newVal && expandedCommonKeys.value.length === 0) {
      expandedCommonKeys.value = [...newVal]
    }
  },
  { deep: true }
)

watch(
  () => props.expandedPersonalKeys,
  (newVal) => {
    // 只在初始化时(当前展开keys为空)才使用props的值
    if (newVal && expandedPersonalKeys.value.length === 0) {
      expandedPersonalKeys.value = [...newVal]
    }
  },
  { deep: true }
)

// 获取筛选后的所有叶子节点指标ID（供父组件"选中所有"使用）
const getFilteredLeafIndicatorIds = (): string[] => {
  return [
    ...collectLeafIds(filteredCommonIndicators.value),
    ...collectLeafIds(filteredPersonalIndicators.value)
  ]
}

defineExpose({
  getFilteredLeafIndicatorIds
})
</script>

<style lang="less" scoped src="./css/IndicatorTree.less"></style>