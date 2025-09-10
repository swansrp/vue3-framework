<template>
  <div v-if="!collapsed" class="left-panel">
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
        v-model:expandedKeys="expandedKeys"
        :allow-drop="() => false"
        :draggable="true"
        :tree-data="treeDataFormatted"
        class="indicator-tree"
        showIcon
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
          >
          </span>
        </template>
      </a-directory-tree>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'

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

// Emits
const emit = defineEmits<{
  dragStart: [data: DragData]
  dragEnd: []
}>()

// 搜索功能
const searchKeyword = ref('')
const expandedKeys = ref<string[]>([])

// 拖拽状态管理
let dragData: DragData | null = null

// 优化的搜索过滤，返回过滤结果和展开节点信息
const filteredTreeData = computed(() => {
  console.log('filteredTreeData====', props.indicatorTreeData)
  
  if (!searchKeyword.value.trim()) {
    // 如果搜索为空，返回所有children不为空或者items不为空的数据
    const validGroups = props.indicatorTreeData.filter(group => {
      // 检查分组是否有有效的子节点
      const hasValidChildren = group.children && group.children.length > 0
      const hasValidItems = group.items && group.items.length > 0
      
      if (hasValidChildren) {
        // 过滤出有items的子节点
        const filteredChildren = group.children!.filter(child => 
          (child.items && child.items.length > 0) || 
          (child.children && child.children.length > 0)
        )
        group.children = filteredChildren
        return filteredChildren.length > 0
      }
      
      return hasValidItems
    })
    
    return validGroups
  }

  const keyword = searchKeyword.value.toLowerCase()
  const filtered: IndicatorGroup[] = []

  props.indicatorTreeData.forEach((group) => {
    const matchedChildren: IndicatorGroup[] = []
    let groupHasMatch = false

    // 递归检查所有层级的指标，确保保留items属性
    const checkIndicatorMatch = (node: IndicatorGroup): IndicatorGroup | null => {
      // 创建节点副本，确保保留所有属性包括items
      const nodeCopy: IndicatorGroup = {
        key: node.key,
        title: node.title || '', // 确俟title不为undefined
        isLeaf: node.isLeaf,
        items: node.items ? [...node.items] : undefined, // 深拷贝items数组
        children: node.children ? [...node.children] : undefined
      }
      
      let hasMatch = false
      
      // 检查title是否匹配（不仅仅限制于有items的节点）
      if (nodeCopy.title && nodeCopy.title.toLowerCase().includes(keyword)) {
        hasMatch = true
      }
      
      // 递归检查子节点
      if (nodeCopy.children && nodeCopy.children.length > 0) {
        const matchedSubChildren: IndicatorGroup[] = []
        
        nodeCopy.children.forEach(child => {
          const matchedChild = checkIndicatorMatch(child)
          if (matchedChild) {
            matchedSubChildren.push(matchedChild)
            hasMatch = true
          }
        })
        
        // 更新副本的children
        nodeCopy.children = matchedSubChildren
      }
      
      return hasMatch ? nodeCopy : null
    }

    // 检查分组及其子节点，确保保留items属性
    if (group.children && group.children.length > 0) {
      group.children.forEach((indicator) => {
        const matchedIndicator = checkIndicatorMatch(indicator)
        if (matchedIndicator) {
          matchedChildren.push(matchedIndicator)
          groupHasMatch = true
        }
      })
    }
    
    // 检查分组本身的标题是否匹配（不仅仅限制于有items的分组）
    if (group.title && group.title.toLowerCase().includes(keyword)) {
      groupHasMatch = true
    }

    // 如枟有匹配项，将分组及其匹配的子节点添加到结果中，确保保留所有属性
    if (groupHasMatch) {
      const groupCopy: IndicatorGroup = {
        key: group.key,
        title: group.title,
        isLeaf: group.isLeaf,
        items: group.items ? [...group.items] : undefined, // 保留分组级别的items
        children: matchedChildren.length > 0 ? matchedChildren : group.children
      }
      filtered.push(groupCopy)
    }
  })
  
  return filtered
})

// 计算需要展开的节点（不产生副作用）
const expandedNodeKeys = computed(() => {
  const keyword = searchKeyword.value.trim()
  const newExpandedKeys: string[] = []
  
  if (!keyword) {
    // 如果搜索为空，展开所有有效的一级节点
    return props.indicatorTreeData
      .filter(group => 
        (group.children && group.children.length > 0) || 
        (group.items && group.items.length > 0)
      )
      .map((item) => item.key)
  }

  // 递归检查函数，用于查找所有匹配的节点及其祖先
  const findMatchingNodes = (node: IndicatorGroup, ancestors: string[] = []): boolean => {
    let hasMatch = false
    
    // 检查当前节点的title是否匹配（不仅仅限制于有items的节点）
    if (node.title && node.title.toLowerCase().includes(keyword)) {
      // 将所有祖先节点和当前节点加入展开列表
      newExpandedKeys.push(...ancestors, node.key)
      hasMatch = true
    }
    
    // 递归检查子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const currentAncestors = [...ancestors, node.key]
        if (findMatchingNodes(child, currentAncestors)) {
          hasMatch = true
        }
      })
    }
    
    return hasMatch
  }

  // 检查所有分组
  props.indicatorTreeData.forEach((group) => {
    findMatchingNodes(group)
  })

  // 去重并返回展开节点
  return [...new Set(newExpandedKeys)]
})

// 监听展开节点变化，更新展开状态
watch(expandedNodeKeys, (newKeys) => {
  expandedKeys.value = newKeys
}, { immediate: true })

  // 将树数据转换为Ant Design Vue Tree组件格式，支持完整的多层树形结构和文字高亮
const treeDataFormatted = computed(() => {
  const keyword = searchKeyword.value.trim()
  
  // 递归转换函数，支持任意层级的树结构和文字高亮
  const convertTreeNode = (node: IndicatorGroup): any => {
    // 处理文字高亮（对所有节点都进行检查）
    let displayTitle = node.title || ''
    if (keyword && displayTitle) {
      try {
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        displayTitle = displayTitle.replace(regex, '<span style="color: #ff4d4f; font-weight: 600;">$1</span>')
      } catch (error) {
        console.warn('正则表达式错误:', error)
        displayTitle = node.title || ''
      }
    }
    
    const convertedNode: any = {
      key: node.key,
      title: displayTitle,
      isLeaf: node.isLeaf || false,
      class: (!node.items || node.items.length === 0) ? 'no-items' : ''
    }
    
    // 如果有items，添加到节点中
    if (node.items && node.items.length > 0) {
      convertedNode.items = node.items
    }
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      convertedNode.children = node.children.map(child => convertTreeNode(child))
      // 有子节点的情况下，当前节点不是叶子节点
      convertedNode.isLeaf = false
    } else {
      // 没有子节点的情况下，设为叶子节点
      convertedNode.isLeaf = true
    }
    
    return convertedNode
  }
  
  return filteredTreeData.value.map(group => {
    try {
      return convertTreeNode(group)
    } catch (error) {
      console.error('转换树节点时出错:', error, group)
      // 返回一个安全的默认节点
      return {
        key: group.key || 'error-node',
        title: group.title || '错误节点',
        isLeaf: true,
        class: 'no-items'
      }
    }
  })
})

// 监听props变化，初始展开所有节点
watch(
  () => props.indicatorTreeData,
  (newData) => {
    if (newData && newData.length > 0) {
      // 只在无搜索时设置初始展开
      if (!searchKeyword.value.trim()) {
        expandedKeys.value = newData
          .filter(group => 
            (group.children && group.children.length > 0) || 
            (group.items && group.items.length > 0)
          )
          .map((item) => item.key)
      }
    }
  },
  { immediate: true }
)

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
  console.log('拖拽开始:', info)
  const { event, node } = info

  if (!node.items || node.items.length === 0) {
    // items为空，完全禁止拖拽
    console.log('items为空，拒绝拖拽')
    
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

  console.log('设置拖拽数据:', dragData)
  emit('dragStart', dragData)
  return true
}

// 拖拽进入树组件时的处理
const onDragEnter = (info: any) => {
  console.log('拖拽进入树组件:', info)
  // 禁止在树组件内部放置
  return false
}

// 拖拽悬停在树组件上时的处理
const onDragOver = (info: any) => {
  console.log('拖拽悬停在树组件上:', info)
  // 设置禁止放置的鼠标样式
  document.body.style.cursor = 'not-allowed'
  return false
}

// 拖拽结束事件，重置状态
const onDragEnd = () => {
  console.log('拖拽结束')
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

    .indicator-tree {
      // 指标树样式
      :deep(.ant-tree-treenode) {
        padding: 6px 0; // 增加节点上下间距
        
        .ant-tree-node-content-wrapper {
          padding: 8px 12px; // 增加节点内容内边距
          border-radius: 6px; // 圆角效果
          transition: all 0.2s ease;
          cursor: default; // 默认指针
          
          &:hover {
            background-color: #f5f5f5;
            transform: translateX(2px); // 轻微的悬停偏移效果
          }
          
          &.ant-tree-node-selected {
            background-color: #e6f7ff;
            border: 1px solid #91d5ff;
          }
        }
        
        .ant-tree-title {
          font-size: 15px; // 增大字体
          line-height: 1.6; // 增加行高
          font-weight: 500; // 稍微加粗
          color: #262626;
          white-space: nowrap; // 防止文字换行
          overflow: hidden;
          text-overflow: ellipsis; // 文字溢出显示省略号
          cursor: default; // 明确设置默认指针
        }
        
        // 图标样式优化
        .ant-tree-switcher {
          width: 24px;
          height: 24px;
          line-height: 24px;
          margin-right: 8px;
          
          .ant-tree-switcher-icon {
            font-size: 14px;
            color: #8c8c8c;
            transition: transform 0.2s ease;
          }
          
          &.ant-tree-switcher_open .ant-tree-switcher-icon {
            transform: rotate(90deg);
          }
        }
        
        .ant-tree-iconEle {
          margin-right: 8px;
          font-size: 16px;
        }
      }
      
      // 不同层级的缩进优化
      :deep(.ant-tree-child-tree) {
        .ant-tree-treenode {
          .ant-tree-title {
            font-size: 14px; // 子节点字体稍小
            color: #595959;
          }
        }
      }
      
      // 拖拽相关样式
      :deep(.ant-tree-treenode) {
        // 默认所有节点都使用默认指针
        .ant-tree-node-content-wrapper {
          cursor: default !important;
        }
        
        .ant-tree-title {
          cursor: default !important;
        }
        
        // 只有在有items且鼠标悬停时才显示grab指针
        &:not(.no-items) {
          .ant-tree-node-content-wrapper:hover {
            cursor: grab !important;
          }
          
          .ant-tree-node-content-wrapper:active {
            cursor: grabbing !important;
          }
        }
        
        // 不可拖拽的节点样式（只有class包含no-items的节点）
        &.no-items {
          .ant-tree-node-content-wrapper {
            opacity: 0.8;
            cursor: default !important;
            
            &:hover {
              background-color: #f5f5f5;
              cursor: default !important;
            }
            
            &:active {
              cursor: default !important;
            }
          }
          
          .ant-tree-title {
            color: #8c8c8c;
            cursor: default !important;
          }
          
          .ant-tree-switcher,
          .ant-tree-iconEle {
            opacity: 0.6;
          }
        }
      }
    }
  }
}


</style>