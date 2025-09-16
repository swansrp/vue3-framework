<template>
  <div :class="{ collapsed: collapsed }" class="indicator-tree-panel">
    <!-- 折叠控制按钮 -->
    <div class="collapse-trigger" @click="toggleCollapse">
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
    <div v-if="!collapsed" :style="{ width: panelWidth + 'px' }" class="tree-content">
      <!-- 搜索框 -->
      <div class="search-section">
        <a-input
          v-model:value="searchKeyword"
          allowClear
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
              v-model:checkedKeys="selectedCommonIndicators"
              v-model:expandedKeys="expandedCommonKeys"
              :checkable="true"
              :selectable="false"
              :show-icon="true"
              :show-line="true"
              :tree-data="filteredCommonIndicators"
              block-node
              @check="onCommonIndicatorCheck"
            >
              <template #title="{ title }">
                <div :class="{ 'search-highlight': isHighlighted(title) }" class="tree-node-title">
                  <span class="node-title">{{ title }}</span>
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
        <div class="category-section">
          <div class="category-header">
            <h4>个人指标</h4>
          </div>
          <div class="tree-wrapper">
            <a-tree
              ref="personalTreeKey"
              v-model:checkedKeys="selectedPersonalIndicators"
              v-model:expandedKeys="expandedPersonalKeys"
              :checkable="true"
              :selectable="false"
              :show-icon="true"
              :show-line="true"
              :tree-data="filteredPersonalIndicators"
              block-node
              @check="onPersonalIndicatorCheck"
            >
              <template #title="{ title, isLeaf, dataRef }">
                <div :class="{ 'search-highlight': isHighlighted(title) }" class="tree-node-title">
                  <span class="node-title">{{ title }}</span>
                  <div v-if="isLeaf" class="node-actions">
                    <a-tooltip title="编辑">
                      <EditOutlined @click.stop="editIndicator(dataRef)" />
                    </a-tooltip>
                    <a-tooltip title="删除">
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
    <div v-if="!collapsed" class="floating-add-button">
      <a-button shape="circle" size="large" type="primary" @click="addIndicator">
        <PlusOutlined />
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

interface Props {
  collapsed: boolean
  commonIndicators: IndicatorNode[]
  personalIndicators: IndicatorNode[]
  selectedCommonIndicators?: string[]
  selectedPersonalIndicators?: string[]
  selectedIndicators?: string[]
}

interface Emits {
  (e: 'update:collapsed', value: boolean): void

  (e: 'update:selected-common', value: string[]): void

  (e: 'update:selected-personal', value: string[]): void

  (e: 'update:selected', value: string[]): void

  (e: 'add-indicator'): void

  (e: 'edit-indicator', indicator: IndicatorNode): void

  (e: 'delete-indicator', indicatorId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  commonIndicators: () => [],
  personalIndicators: () => [],
  selectedCommonIndicators: () => [],
  selectedPersonalIndicators: () => [],
  selectedIndicators: () => []
})

const emit = defineEmits<Emits>()

// 面板状态
const panelWidth = ref(320)
const isResizing = ref(false)
const searchKeyword = ref('')

// 展开的节点keys
const expandedCommonKeys = ref<string[]>([])
const expandedPersonalKeys = ref<string[]>([])

// 响应式数据 - 分别处理通用指标和个人指标的选中状态
const selectedCommonIndicators = ref<string[]>([...props.selectedCommonIndicators || []])
const selectedPersonalIndicators = ref<string[]>([...props.selectedPersonalIndicators || []])

// 分离通用指标和个人指标（现在直接使用props传入的数据）
const commonIndicators = computed(() => props.commonIndicators)
const personalIndicators = computed(() => props.personalIndicators)

const commonTreeKey = ref(true)
const personalTreeKey = ref(true)

// 搜索过滤和高亮
const filteredCommonIndicators = computed(() => {
  return filterAndHighlightTree(commonIndicators.value, searchKeyword.value)
})

const filteredPersonalIndicators = computed(() => {
  return filterAndHighlightTree(personalIndicators.value, searchKeyword.value)
})

// 监听props变化
watch(() => props.selectedCommonIndicators, (newVal) => {
  // 只有在选中状态真正改变时才更新
  if (newVal && (newVal.length !== selectedCommonIndicators.value.length ||
    !newVal.every(id => selectedCommonIndicators.value.includes(id)))) {
    selectedCommonIndicators.value = [...newVal]
    // 强制刷新树组件
    commonTreeKey.value = !commonTreeKey.value
  }
})

watch(() => props.selectedPersonalIndicators, (newVal) => {
  // 只有在选中状态真正改变时才更新
  if (newVal && (newVal.length !== selectedPersonalIndicators.value.length ||
    !newVal.every(id => selectedPersonalIndicators.value.includes(id)))) {
    selectedPersonalIndicators.value = [...newVal]
    // 强制刷新树组件
    personalTreeKey.value = !personalTreeKey.value
  }
})

// 监听通用指标和个人指标的变化
watch([() => props.commonIndicators, () => props.personalIndicators], () => {
  initializeExpandedKeys()
}, { deep: true })

// 初始化展开的节点
const initializeExpandedKeys = () => {
  // 合并通用指标和个人指标
  const allIndicators = [...props.commonIndicators, ...props.personalIndicators]
  const expandedKeys = getDefaultExpandedKeys(allIndicators)
  expandedCommonKeys.value = expandedKeys.filter(key =>
    findNodeInTree(props.commonIndicators, key)
  )
  expandedPersonalKeys.value = expandedKeys.filter(key =>
    findNodeInTree(props.personalIndicators, key)
  )
}

// 获取默认应该展开的节点（有items且不为空的节点及其祖先）
const getDefaultExpandedKeys = (tree: IndicatorNode[]): string[] => {
  const keysToExpand = new Set<string>()

  const collectExpandableNodes = (nodes: IndicatorNode[], ancestors: string[] = []) => {
    nodes.forEach(node => {
      const currentPath = [...ancestors, node.key]

      if (node.items && node.items.length > 0) {
        // 有指标的节点，展开其所有祖先
        currentPath.forEach(key => keysToExpand.add(key))
      }

      if (node.children && node.children.length > 0) {
        collectExpandableNodes(node.children, currentPath)
      }
    })
  }

  collectExpandableNodes(tree)
  return Array.from(keysToExpand)
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

// 过滤和高亮树形数据
const filterAndHighlightTree = (tree: IndicatorNode[], keyword: string): IndicatorNode[] => {
  if (!keyword.trim()) return tree

  const keysToExpand = new Set<string>()

  const filterNode = (node: IndicatorNode, ancestors: string[] = []): IndicatorNode | null => {
    const currentPath = [...ancestors, node.key]

    // 检查节点标题是否匹配
    const titleMatches = node.title?.toLowerCase().includes(keyword.toLowerCase()) || false

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
      node.children.forEach(child => {
        const filteredChild = filterNode(child, currentPath)
        if (filteredChild) {
          filteredChildren.push(filteredChild)
        }
      })
    }

    // 如果当前节点匹配或有匹配的子节点，则保留
    const shouldKeep = titleMatches || itemsMatch || filteredChildren.length > 0

    if (shouldKeep) {
      // 标记需要展开的祖先节点
      currentPath.forEach(key => keysToExpand.add(key))

      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : undefined
      }
    }

    return null
  }

  const filteredTree = tree.map(node => filterNode(node)).filter(Boolean) as IndicatorNode[]

  // 更新展开的节点
  expandedCommonKeys.value = Array.from(keysToExpand).filter(key =>
    findNodeInTree(commonIndicators.value, key)
  )
  expandedPersonalKeys.value = Array.from(keysToExpand).filter(key =>
    findNodeInTree(personalIndicators.value, key)
  )

  return filteredTree
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

const onPersonalIndicatorCheck = (checkedKeys: any, e: any) => {
  const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked
  selectedPersonalIndicators.value = keys
  emit('update:selected-personal', keys)
  // 同时更新合并的选中状态，但保持通用指标的选中状态
  emit('update:selected', [...selectedCommonIndicators.value, ...keys])
}

const onCommonIndicatorCheck = (checkedKeys: any, e: any) => {
  const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked
  selectedCommonIndicators.value = keys
  emit('update:selected-common', keys)
  // 同时更新合并的选中状态，但保持个人指标的选中状态
  emit('update:selected', [...keys, ...selectedPersonalIndicators.value])
}

// 显示状态改变
const onShowChange = (indicator: IndicatorNode) => {
  // 可以在这里添加保存逻辑
  console.log('显示状态改变:', indicator.key, indicator.show)
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
    content: `确定要删除指标"${ indicator.title }"吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk() {
      emit('delete-indicator', indicator.id)
    }
  })
}

const viewIndicator = (indicator: IndicatorNode) => {
  // 查看指标详情
  message.info(`查看指标：${ indicator.title }`)
}

// 拖拽调整宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = panelWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const deltaX = e.clientX - startX
    const newWidth = Math.max(200, Math.min(600, startWidth + deltaX))
    panelWidth.value = newWidth
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
  initializeExpandedKeys()
})

onUnmounted(() => {
  // 确保在组件卸载时移除所有事件监听器
  document.removeEventListener('mousemove', null as any)
  document.removeEventListener('mouseup', null as any)
  window.removeEventListener('blur', null as any)
})
</script>

<style lang="less" scoped>
.indicator-tree-panel {
  position: relative;
  background: white;
  border-right: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  z-index: 100;

  &.collapsed {
    width: 48px;

    .collapsed-content {
      display: flex;
      flex-direction: column;
      align-items: center;
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
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 102;
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
              margin-block-start: 0px;
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