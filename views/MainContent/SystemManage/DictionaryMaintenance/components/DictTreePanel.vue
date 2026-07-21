<template>
  <div class="dict-tree-panel">
    <!-- 左侧：树形字典列表 -->
    <div class="tree-dict-sidebar">
      <div class="sidebar-header">
        <div class="header-top">
          <h3>树形字典</h3>
          <a-space :size="4">
            <a-button
              type="primary"
              size="small"
              @click="openCreateTreeModal"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              新增树
            </a-button>
            <a-button
              type="text"
              size="small"
              @click="loadTreeDictList"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
            </a-button>
          </a-space>
        </div>
        <a-input-search
          v-model:value="treeDictSearch"
          placeholder="搜索字典名称/编码"
          :loading="treeDictListLoading"
          allow-clear
          style="margin-top: 12px;"
        />
      </div>
      <div class="sidebar-body">
        <div
          v-for="item in treeDictList"
          :key="item.value"
          class="sidebar-item"
          :class="{ 'sidebar-item-active': currentDictCode === item.value }"
          @click="selectTreeDict(item)"
        >
          <div class="sidebar-item-info">
            <span class="sidebar-item-name">{{ item.label }}</span>
            <span class="sidebar-item-code">{{ item.value }}</span>
          </div>
          <DeleteOutlined
            class="sidebar-item-delete"
            @click.stop="confirmDeleteTree(item)"
          />
        </div>
        <a-empty
          v-if="treeDictList.length === 0"
          :image="simpleImage"
          :description="treeDictSearch ? '无匹配结果' : '暂无数据'"
          class="sidebar-empty"
        />
      </div>
    </div>

    <!-- 右侧：树形结构展示 -->
    <div class="tree-content">
      <template v-if="currentDictCode">
        <div class="tree-toolbar">
          <span class="tree-title">{{ currentDictName }}</span>
          <a-space>
            <a-button
              size="small"
              @click="handleRefreshCache"
            >
              刷新缓存
            </a-button>
            <a-button
              size="small"
              @click="expandAll"
            >
              全部展开
            </a-button>
            <a-button
              size="small"
              @click="collapseAll"
            >
              全部收起
            </a-button>
          </a-space>
        </div>

        <div class="tree-body">
          <a-spin :spinning="treeLoading">
            <a-tree
              v-if="treeData.length > 0"
              v-model:expanded-keys="expandedKeys"
              :tree-data="treeData"
              :field-names="{ key: 'key', title: 'label', children: 'children' }"
              draggable
              block-node
              :allow-drop="handleAllowDrop"
              class="tree-display"
              @drop="handleDrop"
            >
              <template #title="nodeData">
                <span
                  class="tree-node-title"
                  @contextmenu.prevent="onContextMenu($event, nodeData)"
                >
                  <span class="node-label">{{ nodeData.label }}</span>
                  <span class="node-value">({{ nodeData.value }})</span>
                </span>
              </template>
            </a-tree>
            <a-empty
              v-else
              description="暂无树形数据，右键或点击上方按钮新增"
            />
          </a-spin>
        </div>
      </template>
      <template v-else>
        <a-empty description="请从左侧选择一个树形字典" />
      </template>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div
        class="context-menu-item"
        @click="handleContextAdd"
      >
        <PlusOutlined /> 新增子节点
      </div>
      <div
        class="context-menu-item"
        @click="handleContextEdit"
      >
        <EditOutlined /> 编辑
      </div>
      <div
        v-if="!isRootNode"
        class="context-menu-item context-menu-danger"
        @click="handleContextDelete"
      >
        <DeleteOutlined /> 删除
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalMode === 'add' ? '新增节点' : '编辑节点'"
      :confirm-loading="modalLoading"
      @ok="handleModalOk"
    >
      <a-form
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item
          label="节点值"
          required
        >
          <a-input
            v-model:value="modalForm.value"
            placeholder="节点唯一标识"
            :disabled="modalMode === 'edit'"
          />
        </a-form-item>
        <a-form-item
          label="节点名称"
          required
        >
          <a-input
            v-model:value="modalForm.label"
            placeholder="显示名称"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 创建树形字典弹窗 -->
    <a-modal
      v-model:open="createTreeModalVisible"
      title="新建树形字典"
      :confirm-loading="createTreeLoading"
      @ok="handleCreateTree"
    >
      <a-form
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item
          label="字典编码"
          required
        >
          <a-input
            v-model:value="createTreeForm.dictCode"
            placeholder="如 tree_region"
          />
        </a-form-item>
        <a-form-item
          label="字典名称"
          required
        >
          <a-input
            v-model:value="createTreeForm.dictName"
            placeholder="如 区域树"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { Empty, message, Modal } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import {
  getBizTreeDict,
  getBizTreeDictList,
  refreshBizTreeDict,
  addTreeDictNode,
  updateTreeDictNode,
  deleteTreeDictNode,
  moveTreeDictNode,
  createTreeDict,
  deleteTreeDict
} from '@/framework/apis/dict/dict'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

interface TreeDictItem {
  key: string
  value: string
  label: string
  isLeaf: boolean
  id?: number
  pid?: string | null
  sort?: number
  children?: TreeDictItem[]
}

interface DictListItem {
  value: string
  label: string
}

const treeDictList = ref<DictListItem[]>([])
const treeDictSearch = ref('')
const treeDictListLoading = ref(false)
const currentDictCode = ref('')
const currentDictName = ref('')
const treeData = ref<TreeDictItem[]>([])
const treeLoading = ref(false)
const expandedKeys = ref<string[]>([])

// ==================== 创建树形字典 ====================
const createTreeModalVisible = ref(false)
const createTreeLoading = ref(false)
const createTreeForm = reactive({ dictCode: '', dictName: '' })

const openCreateTreeModal = () => {
  createTreeForm.dictCode = ''
  createTreeForm.dictName = ''
  createTreeModalVisible.value = true
}

const handleCreateTree = async () => {
  if (!createTreeForm.dictCode) { message.warning('请输入字典编码'); return }
  if (!createTreeForm.dictName) { message.warning('请输入字典名称'); return }
  createTreeLoading.value = true
  try {
    await createTreeDict({ dictCode: createTreeForm.dictCode, dictName: createTreeForm.dictName })
    createTreeModalVisible.value = false
    await loadTreeDictList()
  } finally {
    createTreeLoading.value = false
  }
}

const confirmDeleteTree = (item: DictListItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除整棵树「${item.label}」？所有节点将被移除。`,
    okType: 'danger',
    onOk: async () => {
      await deleteTreeDict({ dictCode: item.value })
      // 如果删除的是当前选中的树，清空右侧
      if (currentDictCode.value === item.value) {
        currentDictCode.value = ''
        currentDictName.value = ''
        treeData.value = []
      }
      await loadTreeDictList()
    }
  })
}

// ==================== 右键菜单 ====================
const contextMenu = reactive({ visible: false, x: 0, y: 0, node: null as TreeDictItem | null })

// 根节点不允许通过右键删除（只能在左侧删除整棵树）
const isRootNode = computed(() => {
  const node = contextMenu.node
  return !node || node.pid === null || node.pid === undefined
})

const onContextMenu = (e: MouseEvent, nodeData: any) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.node = nodeData
}

const closeContextMenu = () => { contextMenu.visible = false }

const handleContextAdd = () => {
  const parent = contextMenu.node
  closeContextMenu()
  openAddModal(parent)
}

const handleContextEdit = () => {
  const node = contextMenu.node
  closeContextMenu()
  if (node) openEditModal(node)
}

const handleContextDelete = () => {
  const node = contextMenu.node
  closeContextMenu()
  if (node) confirmDelete(node)
}

// ==================== 新增/编辑弹窗 ====================
const modalVisible = ref(false)
const modalLoading = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalParentNode = ref<TreeDictItem | null>(null)
const modalForm = reactive({ id: null as number | null, value: '', label: '' })

const openAddModal = (parentNode: TreeDictItem | null) => {
  modalMode.value = 'add'
  modalParentNode.value = parentNode
  modalForm.id = null
  modalForm.value = ''
  modalForm.label = ''
  modalVisible.value = true
}

const openEditModal = (node: TreeDictItem) => {
  modalMode.value = 'edit'
  modalParentNode.value = null
  modalForm.id = node.id || null
  modalForm.value = node.value
  modalForm.label = node.label
  modalVisible.value = true
}

const handleModalOk = async () => {
  if (!modalForm.value) { message.warning('请输入节点值'); return }
  if (!modalForm.label) { message.warning('请输入节点名称'); return }

  modalLoading.value = true
  try {
    if (modalMode.value === 'add') {
      await addTreeDictNode({
        dictCode: currentDictCode.value,
        dictName: currentDictName.value,
        value: modalForm.value,
        label: modalForm.label,
        parentValue: modalParentNode.value?.value || null
      })
    } else {
      await updateTreeDictNode({
        id: modalForm.id,
        dictCode: currentDictCode.value,
        value: modalForm.value,
        label: modalForm.label
      })
    }
    modalVisible.value = false
    await loadTreeData()
  } finally {
    modalLoading.value = false
  }
}

// ==================== 删除 ====================
const confirmDelete = (node: TreeDictItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除节点「${node.label}」？子节点也将被移除。`,
    okType: 'danger',
    onOk: async () => {
      await deleteTreeDictNode({ id: node.id!, dictCode: currentDictCode.value })
      await loadTreeData()
    }
  })
}

// ==================== 拖拽 ====================
const handleAllowDrop = (_info: any) => {
  // 允许拖入任何节点下方或作为子节点
  return true
}

const handleDrop = async (info: any) => {
  const dragKey = info.dragNode.key
  const dropKey = info.node.key
  const dropPos = info.node.pos.split('-')
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

  // 找到拖拽节点和目标节点
  const dragNode = findNode(treeData.value, dragKey)
  const dropNode = findNode(treeData.value, dropKey)
  if (!dragNode || !dropNode) return

  let newParentValue: string | null = null
  if (info.dropToGap) {
    // 放到目标节点旁边（同级）
    newParentValue = dropNode.pid || null
  } else {
    // 放到目标节点内部（成为子节点）
    newParentValue = dropNode.value
  }

  await moveTreeDictNode({
    id: dragNode.id,
    dictCode: currentDictCode.value,
    parentValue: newParentValue,
    sort: dropPosition
  })
  await loadTreeData()
}

const findNode = (nodes: TreeDictItem[], key: string): TreeDictItem | null => {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children) {
      const found = findNode(node.children, key)
      if (found) return found
    }
  }
  return null
}

// ==================== 基础操作 ====================
const loadTreeDictList = async () => {
  treeDictListLoading.value = true
  try {
    const keyword = treeDictSearch.value.trim() || undefined
    const res = await getBizTreeDictList({ keyword })
    treeDictList.value = res.payload || []
  } catch (e) {
    console.error('加载树形字典列表失败:', e)
  } finally {
    treeDictListLoading.value = false
  }
}

let treeDictSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(treeDictSearch, () => {
  if (treeDictSearchTimer) clearTimeout(treeDictSearchTimer)
  treeDictSearchTimer = setTimeout(() => {
    loadTreeDictList()
  }, 300)
})

const selectTreeDict = async (item: DictListItem) => {
  currentDictCode.value = item.value
  currentDictName.value = item.label
  await loadTreeData()
}

const loadTreeData = async () => {
  if (!currentDictCode.value) return
  treeLoading.value = true
  try {
    const res = await getBizTreeDict({ dictCode: currentDictCode.value })
    treeData.value = res.payload || []
    expandedKeys.value = collectAllKeys(treeData.value)
  } catch (e) {
    console.error('加载树形字典数据失败:', e)
    treeData.value = []
  } finally {
    treeLoading.value = false
  }
}

const handleRefreshCache = async () => {
  if (!currentDictCode.value) return
  try {
    const res = await refreshBizTreeDict({ dictCode: currentDictCode.value })
    treeData.value = res.payload || []
    expandedKeys.value = collectAllKeys(treeData.value)
    message.success('缓存刷新成功')
  } catch (e) {
    console.error('刷新缓存失败:', e)
  }
}

const collectAllKeys = (nodes: TreeDictItem[]): string[] => {
  const keys: string[] = []
  const traverse = (list: TreeDictItem[]) => {
    for (const node of list) {
      keys.push(node.key)
      if (node.children?.length) traverse(node.children)
    }
  }
  traverse(nodes)
  return keys
}

const expandAll = () => { expandedKeys.value = collectAllKeys(treeData.value) }
const collapseAll = () => { expandedKeys.value = [] }

// 全局点击关闭右键菜单
const onDocClick = () => { closeContextMenu() }
onMounted(() => {
  loadTreeDictList()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped lang="less">
.dict-tree-panel {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  gap: 16px;
  padding: 16px;
}

.tree-dict-sidebar {
  width: 320px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: #f0f5ff;

    .sidebar-item-delete {
      opacity: 1;
    }
  }
}

.sidebar-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.sidebar-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-item-code {
  font-size: 12px;
  color: #8c8c8c;
}

.sidebar-item-delete {
  opacity: 0;
  color: #ff4d4f;
  font-size: 12px;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: 4px;

  &:hover {
    color: #cf1322;
  }
}

.sidebar-item-active {
  background: #e6f4ff;
  border-left: 3px solid #1677ff;
  padding-left: 11px;
}

.sidebar-empty {
  padding: 40px 0;
}

.tree-content {
  flex: 1;
  min-width: 0;
  background: var(--bg-elevated);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .tree-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}

.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.tree-display {
  :deep(.ant-tree-treenode) {
    padding: 4px 0;
  }

  :deep(.ant-tree-node-content-wrapper) {
    flex: 1;
  }
}

.tree-node-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;

  .node-label {
    font-weight: 500;
  }

  .node-value {
    color: #8c8c8c;
    font-size: 12px;
  }
}

// 右键菜单
.context-menu {
  position: fixed;
  z-index: 1000;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 140px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }
}

.context-menu-danger {
  color: #ff4d4f;

  &:hover {
    background: #fff2f0;
  }
}
</style>
