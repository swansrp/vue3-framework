<script setup lang="ts">
/**
 * Wiki目录树组件
 * 功能：展示Wiki页面树形结构，支持选择、拖拽排序、右键菜单
 */
import {
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  FileTextOutlined,
  FolderAddOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { Key } from 'ant-design-vue/es/table/interface'
import type { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'

import type { WikiTreeNode } from '../types'

const props = withDefaults(
  defineProps<{
    /** 树形数据 */
    treeData: WikiTreeNode[]
    /** 当前选中的节点key */
    selectedKey?: string
    /** 加载状态 */
    loading?: boolean
  }>(),
  {
    loading: false,
    selectedKey: ''
  }
)

const emit = defineEmits<{
  /** 选中节点 */
  (e: 'select', key: string, node: WikiTreeNode): void
  /** 新增页面 */
  (e: 'add', parentId: string | null): void
  /** 编辑页面 */
  (e: 'edit', key: string): void
  /** 删除页面 */
  (e: 'delete', key: string, title: string): void
  /** 拖拽排序 */
  (e: 'drop', info: AntTreeNodeDropEvent): void
  /** 搜索 */
  (e: 'search', keyword: string): void
}>()

const { treeData, selectedKey, loading } = toRefs(props)

// 搜索关键词
const searchKeyword = ref('')
// 展开的节点
const expandedKeys = ref<Key[]>([])
// 自动展开父节点
const autoExpandParent = ref(true)
// 右键菜单相关
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({ top: '0px', left: '0px' })
const contextMenuNode = ref<WikiTreeNode | null>(null)

/** 选中节点 */
const handleSelect = (keys: Key[], info: any) => {
  if (keys.length > 0 && info.node) {
    emit('select', keys[0] as string, info.node as WikiTreeNode)
  }
}

/** 展开/收起节点 */
const handleExpand = (keys: Key[]) => {
  expandedKeys.value = keys
  autoExpandParent.value = false
}

/** 搜索防抖处理 */
let searchTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', value)
  }, 300)
}

/** 点击搜索按钮 */
const handleSearchClick = () => {
  emit('search', searchKeyword.value)
}

/** 右键菜单 */
const handleRightClick = ({ event, node }: { event: MouseEvent; node: any }) => {
  event.preventDefault()
  contextMenuNode.value = node as WikiTreeNode
  contextMenuStyle.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  }
  contextMenuVisible.value = true
}

/** 关闭右键菜单 */
const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuNode.value = null
}

/** 新增子页面 */
const handleAddChild = () => {
  if (contextMenuNode.value) {
    emit('add', contextMenuNode.value.key)
  }
  closeContextMenu()
}

/** 新增同级页面 */
const handleAddSibling = () => {
  if (contextMenuNode.value) {
    emit('add', contextMenuNode.value.parentId)
  }
  closeContextMenu()
}

/** 编辑页面 */
const handleEdit = () => {
  if (contextMenuNode.value) {
    emit('edit', contextMenuNode.value.key)
  }
  closeContextMenu()
}

/** 删除页面 */
const handleDelete = () => {
  if (contextMenuNode.value) {
    const node = contextMenuNode.value
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除页面 "${node.title}" 吗？子页面也会一并删除。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        emit('delete', node.key, node.title)
      }
    })
  }
  closeContextMenu()
}

/** 拖拽放置 */
const handleDrop = (info: AntTreeNodeDropEvent) => {
  emit('drop', info)
}

/** 新增顶级页面 */
const handleAddRoot = () => {
  emit('add', null)
}

// 监听点击事件关闭右键菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

// 初始化时展开所有节点
watch(
  () => treeData.value,
  (data) => {
    if (data && data.length > 0) {
      const getAllKeys = (nodes: WikiTreeNode[]): Key[] => {
        let keys: Key[] = []
        nodes.forEach((node) => {
          keys.push(node.key)
          if (node.children && node.children.length > 0) {
            keys = keys.concat(getAllKeys(node.children))
          }
        })
        return keys
      }
      expandedKeys.value = getAllKeys(data)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="wiki-tree">
    <!-- 搜索框 -->
    <div class="wiki-tree-header">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索Wiki页面"
        allow-clear
        @input="handleSearch"
        @search="handleSearchClick"
      />
      <a-button
        type="primary"
        size="small"
        class="add-root-btn"
        @click="handleAddRoot"
      >
        <template #icon>
          <plus-outlined />
        </template>
        新增
      </a-button>
    </div>

    <!-- 树形结构 -->
    <div class="wiki-tree-content">
      <a-spin :spinning="loading">
        <a-tree
          v-if="treeData.length > 0"
          v-model:expanded-keys="expandedKeys"
          :tree-data="treeData"
          :selected-keys="selectedKey ? [selectedKey] : []"
          :auto-expand-parent="autoExpandParent"
          :field-names="{ key: 'key', title: 'title', children: 'children' }"
          draggable
          block-node
          show-icon
          @select="handleSelect"
          @expand="handleExpand"
          @right-click="handleRightClick"
          @drop="handleDrop"
        >
          <template #icon>
            <file-text-outlined />
          </template>
        </a-tree>
        <a-empty
          v-else
          description="暂无Wiki页面"
        >
          <a-button
            type="primary"
            @click="handleAddRoot"
          >
            创建第一个页面
          </a-button>
        </a-empty>
      </a-spin>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <div
        class="context-menu-item"
        @click="handleAddChild"
      >
        <folder-add-outlined />
        <span>新增子页面</span>
      </div>
      <div
        class="context-menu-item"
        @click="handleAddSibling"
      >
        <file-add-outlined />
        <span>新增同级页面</span>
      </div>
      <div
        class="context-menu-item"
        @click="handleEdit"
      >
        <edit-outlined />
        <span>编辑</span>
      </div>
      <a-divider style="margin: 4px 0" />
      <div
        class="context-menu-item danger"
        @click="handleDelete"
      >
        <delete-outlined />
        <span>删除</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.wiki-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-right: 1px solid #f0f0f0;

  &-header {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;

    .add-root-btn {
      flex-shrink: 0;
    }
  }

  &-content {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }
}

.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);

  &-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background: #f5f5f5;
    }

    &.danger {
      color: #ff4d4f;

      &:hover {
        background: #fff1f0;
      }
    }
  }
}
</style>
