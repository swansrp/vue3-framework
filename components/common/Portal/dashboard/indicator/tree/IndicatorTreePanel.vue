<template>
  <div
    v-if="!collapsed"
    class="left-panel"
  >
    <div class="panel-header">
      <h3>指标树</h3>
    </div>

    <div class="panel-content">
      <!-- 搜索框 -->
      <a-input
        v-model:value="searchKeyword"
        class="search-input"
        placeholder="搜索指标项"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>

      <!-- 指标树 -->
      <a-directory-tree
        v-model:expanded-keys="expandedKeys"
        :allow-drop="() => false"
        :draggable="true"
        :tree-data="treeDataFormatted"
        class="indicator-tree"
        show-icon
        @dragend="onDragEnd"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragstart="onDragStart"
      >
        <template #title="{ title, key, isLeaf, items }">
          <span
            :class="{ 'no-items': !items || items.length === 0 }"
            :data-is-leaf="isLeaf"
            :data-items="JSON.stringify(items || [])"
            :data-key="key"
            :data-title="title"
            v-html="title"
          />
        </template>
      </a-directory-tree>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { SearchOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref, toRefs, watch } from 'vue'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DragData {
  key: string
  title: string
  isLeaf: boolean
  items?: IndicatorItem[]
}

// Props
const props = defineProps<{
  collapsed: boolean
  indicatorTreeData: IndicatorGroup[]
}>()
const { indicatorTreeData } = toRefs(props)
// Emits
const emit = defineEmits<{
  dragStart: [data: DragData]
  dragEnd: []
}>()

// 搜索功能
const searchKeyword = ref('')
const expandedKeys = ref<string[]>([])

// 递归转换树数据，标识叶子节点
const convertTreeData = (data: IndicatorGroup[]): any[] => {
  return data.map(node => {
    const isLeaf = (node.items && node.items.length > 0) || (node.children && node.children.length === 0)
    const converted: any = {
      key: node.key,
      title: node.title,
      isLeaf,
      items: node.items || [],
      color: node.color
    }

    // 只有非叶子节点才有children
    if (!isLeaf && node.children && node.children.length > 0) {
      converted.children = convertTreeData(node.children)
    }

    return converted
  })
}

// 递归搜索叶子节点
const searchLeafNodes = (nodes: any[], keyword: string): { matchedNodes: any[], expandKeys: string[] } => {
  const matchedNodes: any[] = []
  const expandKeys: string[] = []

  const search = (nodeList: any[], parentKeys: string[] = []): any[] => {
    return nodeList.map(node => {
      const currentPath = [...parentKeys, node.key]

      // 安全检查 title 字段
      const nodeTitle = node.title || ''

      // 如果是叶子节点且匹配搜索关键词
      if (node.isLeaf && nodeTitle.toLowerCase().includes(keyword.toLowerCase())) {
        // 高亮匹配的文本
        const highlightedTitle = nodeTitle.replace(
          new RegExp(`(${keyword})`, 'gi'),
          '<span style="color: red; font-weight: bold;">$1</span>'
        )

        const matchedNode = {
          ...node,
          title: highlightedTitle
        }

        matchedNodes.push(matchedNode)
        // 添加所有祖先节点的key到展开列表
        expandKeys.push(...parentKeys)

        return matchedNode
      }

      // 如果不是叶子节点，递归搜索子节点
      if (!node.isLeaf && node.children && Array.isArray(node.children)) {
        const searchedChildren = search(node.children, currentPath)
        const hasMatchedChildren = searchedChildren.some(child =>
          matchedNodes.some(matched => matched.key === child.key)
        )

        // 如果子节点有匹配项，保留该父节点
        if (hasMatchedChildren) {
          return {
            ...node,
            children: searchedChildren.filter(child =>
              child.isLeaf ? matchedNodes.some(matched => matched.key === child.key) :
                child.children && Array.isArray(child.children) && child.children.length > 0
            )
          }
        }
      }

      return null
    }).filter(Boolean)
  }

  search(nodes)
  return { matchedNodes, expandKeys: [...new Set(expandKeys)] }
}

// 存储过滤后的树数据
const filteredTreeData = ref<any[]>([])

// 获取所有包含items的节点及其祖先节点的keys用于默认展开
const getAllExpandableKeys = (nodes: any[], parentKeys: string[] = []): string[] => {
  const expandKeys: string[] = []

  const collectKeys = (nodeList: any[], ancestors: string[] = []) => {
    nodeList.forEach(node => {
      const currentPath = [...ancestors, node.key]

      // 如果当前节点有items且不为空，展开所有祖先节点
      if (node.items && Array.isArray(node.items) && node.items.length > 0) {
        expandKeys.push(...ancestors)
      }

      // 如果有子节点，递归处理
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        // 如果子节点中有包含items的节点，也要展开当前节点
        const hasItemsInChildren = node.children.some((child: any) =>
          child.items && Array.isArray(child.items) && child.items.length > 0
        )
        if (hasItemsInChildren) {
          expandKeys.push(...ancestors, node.key)
        }

        collectKeys(node.children, currentPath)
      }
    })
  }

  collectKeys(nodes, parentKeys)
  return [...new Set(expandKeys)] // 去重
}

// 更新树数据的函数
const updateTreeData = () => {
  try {
    const baseTreeData = convertTreeData(indicatorTreeData.value || [])

    if (!searchKeyword.value.trim()) {
      filteredTreeData.value = baseTreeData
      // 默认展开所有包含items的节点及其祖先节点
      expandedKeys.value = getAllExpandableKeys(baseTreeData)
      return
    }

    const { matchedNodes, expandKeys } = searchLeafNodes(baseTreeData, searchKeyword.value.trim())

    // 更新展开的keys
    expandedKeys.value = expandKeys

    // 重新构建树结构，只包含搜索结果的路径
    const buildFilteredTree = (nodes: any[]): any[] => {
      return nodes.map(node => {
        if (node.isLeaf) {
          // 如果是叶子节点，检查是否在匹配列表中
          const matchedNode = matchedNodes.find(matched => matched.key === node.key)
          return matchedNode || null
        } else {
          // 如果不是叶子节点，递归检查子节点
          if (node.children && Array.isArray(node.children)) {
            const filteredChildren = buildFilteredTree(node.children).filter(Boolean)
            if (filteredChildren.length > 0) {
              return {
                ...node,
                children: filteredChildren
              }
            }
          }
        }
        return null
      }).filter(Boolean)
    }

    filteredTreeData.value = buildFilteredTree(baseTreeData)
  } catch (error) {
    console.error('更新树数据时发生错误:', error)
    filteredTreeData.value = []
  }
}

// 计算格式化的树数据（纯函数，无副作用）
const treeDataFormatted = computed(() => filteredTreeData.value)

// 监听搜索关键词和指标数据变化
watch(
  () => searchKeyword.value, () => {
    updateTreeData()
  }, { immediate: true })
watch(
  () => indicatorTreeData.value, () => {
    updateTreeData()
  }, { immediate: true, deep: true })

// 拖拽状态管理
let dragData: DragData | null = null

// 组件生命周期管理
let cleanupGlobalListeners: (() => void) | null = null

onMounted(() => {
  cleanupGlobalListeners = setupGlobalDragListeners()
})

onUnmounted(() => {
  if (cleanupGlobalListeners) {
    cleanupGlobalListeners()
  }
})

// 拖拽事件处理
const onDragStart = (info: any) => {
  const { event, node } = info

  if (!node.items || node.items.length === 0) {
    // 禁止默认事件和事件冒泡
    if (event) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    return false
  }

  // 直接使用该指标的数据
  dragData = {
    key: node.key,
    title: node.title,
    isLeaf: true,
    items: node.items || []
  }

  emit('dragStart', dragData)
  return true
}

// 拖拽进入树组件时的处理
const onDragEnter = () => {
  // 禁止在树组件内部放置
  return false
}

// 拖拽悬停在树组件上时的处理
const onDragOver = () => {
  return false
}

// 拖拽结束事件，重置状态
const onDragEnd = () => {
  dragData = null
  emit('dragEnd')
}

// 全局拖拽事件监听器
const setupGlobalDragListeners = () => {
  // 监听所有拖拽相关事件
  const handleGlobalDragEvent = (e: DragEvent) => {
    const target = e.target as HTMLElement
    const treeNode = target.closest('.ant-tree-treenode')

    if (treeNode) {
      const titleElement = treeNode.querySelector('[data-items]')
      if (titleElement) {
        const itemsData = titleElement.getAttribute('data-items')
        try {
          const items = JSON.parse(itemsData || '[]')
          if (!items || items.length === 0) {
            // items为空，禁止所有拖拽事件
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }
        } catch (err) {
          console.error('解析items数据失败:', err)
        }
      }
    }
  }

  // 添加全局监听器
  document.addEventListener('dragstart', handleGlobalDragEvent, true)
  document.addEventListener('drag', handleGlobalDragEvent, true)
  document.addEventListener('dragenter', handleGlobalDragEvent, true)
  document.addEventListener('dragover', handleGlobalDragEvent, true)

  // 返回清理函数
  return () => {
    document.removeEventListener('dragstart', handleGlobalDragEvent, true)
    document.removeEventListener('drag', handleGlobalDragEvent, true)
    document.removeEventListener('dragenter', handleGlobalDragEvent, true)
    document.removeEventListener('dragover', handleGlobalDragEvent, true)
  }
}
</script>

<style lang="less" scoped>
.left-panel {
  width: 300px;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;

  .panel-header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;
    background: #fafafa;
    height: 64px;
    box-sizing: border-box;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .panel-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;

    .search-input {
      margin-bottom: 16px;
    }
  }

  :deep(.ant-tree-title) {
    span.no-items[data-is-leaf="true"] {
      cursor: not-allowed;
    }

    span[data-is-leaf="false"] {
      cursor: not-allowed;
    }
  }
}


</style>