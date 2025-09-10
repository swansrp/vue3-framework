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
            :data-is-leaf="isLeaf"
            :data-items="JSON.stringify(items || [])"
            :data-key="key"
            :data-title="title"
            v-html="isLeaf ? getHighlightedText(title) : title"
          >
          </span>
        </template>
      </a-directory-tree>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
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

// 搜索过滤 - 只搜索指标层级，不搜索指标项
const filteredTreeData = computed(() => {
  if (!searchKeyword.value.trim()) {
    return props.indicatorTreeData
  }

  const keyword = searchKeyword.value.toLowerCase()
  const filtered: IndicatorGroup[] = []

  props.indicatorTreeData.forEach((group) => {
    const matchedChildren: IndicatorGroup[] = []

    group.children?.forEach((indicator) => {
      // 只检查指标名称是否匹配，不检查指标项
      const indicatorMatches = indicator.title.toLowerCase().includes(keyword)

      // 只有指标名称匹配才包含该指标
      if (indicatorMatches) {
        matchedChildren.push(indicator)
      }
    })

    if (matchedChildren.length > 0) {
      filtered.push({
        ...group,
        children: matchedChildren
      })
    }
  })

  return filtered
})

// 将树数据转换为Ant Design Vue Tree组件格式，只显示两层结构（分组-指标）
const treeDataFormatted = computed(() => {
  return filteredTreeData.value.map(group => ({
    key: group.key,
    title: group.title,
    isLeaf: false,
    children: group.children?.map(indicator => ({
      key: indicator.key,
      title: indicator.title,
      isLeaf: indicator.isLeaf,
      items: indicator.items
    }))
  }))
})

// 监听搜索关键词变化，自动展开匹配的节点 - 只展开到指标层级
watch(
  searchKeyword,
  (newKeyword) => {
    if (!newKeyword.trim()) {
      // 如果搜索框为空，展开所有一级节点
      expandedKeys.value = props.indicatorTreeData.map((item) => item.key)
      return
    }

    const keyword = newKeyword.toLowerCase()
    const newExpandedKeys: string[] = []

    props.indicatorTreeData.forEach((group) => {
      // 检查该分组下是否有匹配的指标
      const hasMatchedChildren = group.children?.some((indicator) => {
        return indicator.title.toLowerCase().includes(keyword)
      })

      if (hasMatchedChildren) {
        newExpandedKeys.push(group.key)
      }
    })

    expandedKeys.value = newExpandedKeys
  },
  { immediate: true }
)

// 监听props变化，初始展开所有节点
watch(
  () => props.indicatorTreeData,
  (newData) => {
    if (newData && newData.length > 0) {
      expandedKeys.value = newData.map((item) => item.key)
    }
  },
  { immediate: true }
)

// 生成高亮文本（仅对叶子节点）
const getHighlightedText = (text: string) => {
  if (!searchKeyword.value.trim()) {
    return text
  }

  const keyword = searchKeyword.value.trim()
  // 使用正则表达式匹配关键字，忽略大小写
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span style="color: #ff4d4f; font-weight: 600;">$1</span>')
}

// 拖拽事件处理
const onDragStart = (info: any) => {
  console.log('拖拽开始:', info)
  const { node } = info

  if (isEmpty(node.items)) {
    // 只允许拖拽叶子节点（指标）
    console.log('非叶子节点，拒绝拖拽')
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

// 拖拽结束事件，重置鼠标指针
const onDragEnd = () => {
  console.log('拖拽结束，重置鼠标指针')
  document.body.style.cursor = 'default'
  dragData = null
  emit('dragEnd')
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
    }
  }
}
</style>