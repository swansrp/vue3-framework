<template>
  <div class="simple-indicator-tree">
    <a-tree
      v-if="treeData.length > 0"
      :tree-data="treeData"
      :expanded-keys="expandedKeys"
      :selected-keys="selectedKeys"
      :field-names="{ children: 'children', title: 'title', key: 'key' }"
      @expand="handleExpand"
      @select="handleNodeClick"
    >
      <template #title="{ title }">
        <div class="tree-node-title">
          <span class="node-text">{{ title }}</span>
        </div>
      </template>
    </a-tree>
    <div
      v-else
      class="empty-tree"
    >
      <a-empty description="暂无指标数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type'
import { computed, ref, watch } from 'vue'

import type { IndicatorNode } from '@/framework/components/common/chartConfig/types'

defineOptions({
  name: 'SimpleIndicatorTree'
})

// Props
interface Props {
  indicators: IndicatorNode[]
  selectedNodeKey?: string | null | number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'node-click', nodeKey: string, nodeData?: any): void
}>()

// 展开的节点keys
const expandedKeys = ref<Key[]>([])

// 选中的节点keys（从 props 中同步）
const selectedKeys = computed(() => {
  return props.selectedNodeKey ? [props.selectedNodeKey] : []
})

// 转换数据为树组件需要的格式
const treeData = computed(() => {
  return props.indicators || []
})

// 自动展开功能已禁用，保持所有节点初始折叠状态
watch(
  () => props.indicators,
  (newIndicators) => {
    if (newIndicators && newIndicators.length > 0) {
      expandedKeys.value = []
    }
  },
  { immediate: true }
)

// 手风琴模式：展开一个节点时关闭同级其他节点
const handleExpand = (keys: Key[], info: any) => {
  const { expanded, node } = info
  
  if (expanded) {
    // 展开操作：保留父节点路径 + 当前节点，关闭同级其他节点
    const currentKey = node.key
    const parentKeys: Key[] = []
    
    // 查找父节点路径
    const findParentKeys = (nodes: any[], targetKey: Key, parents: Key[] = []): Key[] | null => {
      for (const n of nodes) {
        if (n.key === targetKey) {
          return parents
        }
        if (n.children && n.children.length > 0) {
          const result = findParentKeys(n.children, targetKey, [...parents, n.key])
          if (result !== null) return result
        }
      }
      return null
    }
    
    const parents = findParentKeys(treeData.value, currentKey)
    if (parents) {
      parentKeys.push(...parents)
    }
    
    // 只保留父节点路径 + 当前节点，关闭同级其他节点
    expandedKeys.value = [...parentKeys, currentKey]
    
    // 展开节点时自动触发节点点击事件，显示该节点下的所有图表
    const nodeData = node.dataRef || node
    emit('node-click', currentKey, nodeData)
  } else {
    // 折叠操作
    expandedKeys.value = keys
  }
}

// 处理节点点击（所有节点均触发过滤逻辑）
const handleNodeClick = (selectedKeys: Key[], e: any) => {
  const clickedKey = e.node.key
  const nodeData = e.node.dataRef || e.node

  // 检查节点是否有子节点
  const hasChildren = e.node.children && e.node.children.length > 0

  if (hasChildren) {
    // 父节点：触发展开/折叠
    // 通过手动调用 handleExpand 来触发手风琴模式
    const isExpanded = expandedKeys.value.includes(clickedKey)
    handleExpand(
      isExpanded 
        ? expandedKeys.value.filter(key => key !== clickedKey)
        : [...expandedKeys.value, clickedKey],
      {
        expanded: !isExpanded,
        node: e.node
      }
    )
  }
  
  // 所有节点都发出点击事件
  emit('node-click', clickedKey, nodeData)
}
</script>

<style scoped lang="less">
.simple-indicator-tree {
  padding: 0;
  margin: 0;
  background: #fafafa;

  :deep(.ant-tree) {
    background: transparent;
    color: #333;
    padding: 0;
    margin: 0;

    .ant-tree-list {
      padding: 0;
      margin: 0;
    }

    .ant-tree-treenode {
      padding: 0 !important;
      margin: 0 !important;
      width: 100%;
      transition: all 0.3s;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 10px;
        right: 10px;
        height: 1px;
        background-color: #e8e8e8;
      }

      &:hover {
        background: transparent;
      }

      &:last-child::after {
        display: none;
      }
    }

    .ant-tree-indent {
      align-self: stretch;
    }

    .ant-tree-node-content-wrapper {
      display: flex;
      align-items: center;
      flex: 1;
      padding: 8px 12px 8px 25px;
      background: transparent !important;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: #e6f7ff;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }

      &:hover::before {
        opacity: 0.3;
      }

      &:active::before {
        opacity: 0.6;
        transition: opacity 0.1s;
      }

      &:hover {
        background: transparent !important;
      }
    }

    .ant-tree-title {
      flex: 1;
      overflow: visible;
    }

    .ant-tree-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8c8c8c;
      transition: color 0.3s;
      margin-left: 0;

      &:hover {
        color: #1890ff;
      }
    }

    // 选中状态样式
    .ant-tree-treenode-selected {
      background: transparent;

      .ant-tree-node-content-wrapper {
        background: transparent !important;
      }
    }
  }

  .tree-node-title {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 2px 0;
    position: relative;
    z-index: 1;

    .node-text {
      flex: 1;
      font-size: 15px;
      color: #262626;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.5;
      transition: color 0.3s, transform 0.1s;
    }
  }

  // 点击时文字效果
  :deep(.ant-tree-node-content-wrapper:active) {
    .tree-node-title .node-text {
      color: #1890ff;
      transform: scale(0.98);
    }
  }

  // 悬停时文字效果
  :deep(.ant-tree-node-content-wrapper:hover) {
    .tree-node-title .node-text {
      color: #1890ff;
    }
  }

  // 父节点样式
  :deep(.ant-tree-treenode) {
    &:not(.ant-tree-treenode-leaf-last) {
      .tree-node-title .node-text {
        font-weight: 500;
      }
    }
  }

  .empty-tree {
    padding: 40px 20px;
    text-align: center;

    :deep(.ant-empty-description) {
      color: #8c8c8c;
      font-size: 13px;
    }
  }
}
</style>
