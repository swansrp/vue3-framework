<script lang="ts" setup>
import { ExclamationCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import type { Key } from 'ant-design-vue/es/_util/type'
import type { AntTreeNodeDropEvent, DataNode, EventDataNode } from 'ant-design-vue/es/tree'
import { h, onMounted, ref, watch } from 'vue'

import { buildGetApiByType, buildPostApiByType } from '@/framework/apis'
import { getDroppedData } from '@/framework/hooks/antTreeDropSort'
import { request } from '@/framework/network/request'
import { getAllParentNodes, getBrotherNodes } from '@/framework/utils/common'

interface TreeNode {
  id: string
  key: string
  title: string
  pid?: string
  children?: TreeNode[]

  [key: string]: any
}

interface Props {
  /** API URL前缀，如 '/eval/production' */
  urlPrefix: string
  /** 树的标题 */
  title?: string
  /** 是否只读模式 */
  readonly?: boolean
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 是否启用搜索功能 */
  searchable?: boolean
  /** 是否启用拖拽排序 */
  draggable?: boolean
  /** 是否显示连接线 */
  showLine?: boolean
  /** 是否允许选择有子节点的节点 */
  allowSelectParent?: boolean
  /** 树节点数据接口路径后缀，默认 '/tree/data' */
  treeDataApi?: string
  /** 新增接口路径后缀，默认 '/insert' */
  insertApi?: string
  /** 更新接口路径后缀，默认 '/update' */
  updateApi?: string
  /** 删除接口路径后缀，默认 '/delete' */
  deleteApi?: string
  /** 排序更新接口路径后缀，默认 '/order/update' */
  orderUpdateApi?: string
  /** 父节点更新接口路径后缀，默认 '/pid' */
  pidUpdateApi?: string
  /** 新增时的默认表单数据 */
  defaultFormData?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  title: '树型结构数据标题',
  readonly: false,
  showRefresh: true,
  searchable: true,
  draggable: true,
  showLine: true,
  allowSelectParent: false,
  treeDataApi: '/tree/data',
  insertApi: '/insert',
  updateApi: '/update',
  deleteApi: '/delete',
  orderUpdateApi: '/order/update',
  pidUpdateApi: '/pid',
  defaultFormData: () => ({})
})

const emit = defineEmits<{
  (e: 'select', nodeId: string, nodeInfo: any): void
  (e: 'refresh'): void
  (e: 'loaded', treeData: TreeNode[]): void
}>()

// 树数据
const treeData = ref<TreeNode[]>([])
const loading = ref(false)
const selectedKeys = ref<Key[]>([])
const expandedKeys = ref<Key[]>([])

// 搜索
const searchValue = ref('')
const autoExpandParent = ref(true)

// 编辑对话框
const editModalVisible = ref(false)
const editingNode = ref<TreeNode | null>(null)
const formData = ref<Record<string, any>>({
  id: '',
  title: '',
  pid: ''
})

// 表单引用（用于校验）
const formRef = ref<any>(null)

// 根据key查找节点
const findNodeByKey = (nodes: TreeNode[], key: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.key === key || node.id === key) return node
    if (node.children) {
      const found = findNodeByKey(node.children, key)
      if (found) return found
    }
  }
  return null
}

// 加载树数据
const loadTreeData = async () => {
  loading.value = true
  try {
    const api = buildGetApiByType(`${ props.urlPrefix }${ props.treeDataApi }`, '')
    const res = await request(api, {}, {}, false, false)
    if (res?.payload) {
      treeData.value = res.payload
      // 自动展开第一层
      if (res.payload.length > 0) {
        expandedKeys.value = res.payload.map((item: any) => item.key || item.id)
      }
      emit('loaded', res.payload)
    }
  } catch (error) {
    message.error('加载树数据失败')
  } finally {
    loading.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  loadTreeData,
  getSelectedNode: () => {
    const key = selectedKeys.value[0]
    return findNodeByKey(treeData.value, String(key))
  },
  refresh: loadTreeData
})

// 处理树节点选择
const handleSelect = (keys: Key[], info: {
  event: 'select'
  selected: boolean
  node: EventDataNode
  selectedNodes: DataNode[]
  nativeEvent: MouseEvent
}) => {
  if (keys.length > 0) {
    const node = info.node
    // 根据配置决定是否允许选择有子节点的节点
    const hasChildren = node.children && node.children.length > 0
    if (!hasChildren || props.allowSelectParent) {
      selectedKeys.value = keys
      emit('select', String(keys[0]), node)
    } else {
      // 如果点击的是有子节点的节点，清空选择
      selectedKeys.value = []
    }
  }
}

// 刷新树
const handleRefresh = () => {
  loadTreeData()
  emit('refresh')
}

// 新增节点
const handleAdd = (parentNode?: TreeNode) => {
  editingNode.value = null
  const pidValue = parentNode?.key || parentNode?.id || null
  formData.value = {
    id: '',
    title: '',
    pid: pidValue,
    ...props.defaultFormData
  }
  editModalVisible.value = true
}

// 编辑节点
const handleEdit = (node: TreeNode) => {
  editingNode.value = node
  formData.value = {
    ...props.defaultFormData,
    id: node.key || node.id,
    title: node.title,
    pid: node.pid || '',
    ...node
  }
  editModalVisible.value = true
}

// 保存节点
const handleSave = async () => {
  // 先尝试表单校验（如果插槽中使用了表单）
  if (formRef.value?.validate) {
    try {
      await formRef.value.validate()
    } catch {
      // 校验失败，表单会自动显示错误信息
      return
    }
  } else {
    // 兼容旧逻辑：只检查 title
    if (!formData.value.title) {
      message.error('请输入名称')
      return
    }
  }

  try {
    // 确保 pid 为 null 而不是空字符串
    const submitData = {
      ...formData.value,
      pid: formData.value.pid || null
    }
    
    if (editingNode.value) {
      // 更新
      const api = buildPostApiByType(`${ props.urlPrefix }${ props.updateApi }`, '')
      await request(api, {}, submitData, true, true)
    } else {
      // 新增
      const api = buildPostApiByType(`${ props.urlPrefix }${ props.insertApi }`, '')
      await request(api, {}, submitData, true, true)
    }

    editModalVisible.value = false
    await loadTreeData()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 删除节点
const handleDelete = (node: TreeNode) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除"${ node.title }"吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        const api = buildPostApiByType(`${ props.urlPrefix }${ props.deleteApi }`, '')
        // 使用 key 字段，通过 params 传递 id
        const nodeId = node.key || node.id
        await request(api, { id: nodeId }, { id: nodeId }, true, true)
        await loadTreeData()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// 拖拽更新顺序和父节点
const handleDrop = async (info: AntTreeNodeDropEvent) => {
  const dragKey = info.dragNode.key

  try {
    // 更新本地树数据结构
    treeData.value = getDroppedData(info, treeData)

    // 获取拖拽后的兄弟节点（同级节点）
    const brotherNodes = getBrotherNodes(treeData.value, dragKey, 'key')

    // 获取父节点
    const parentNodes = getAllParentNodes(treeData.value, dragKey, 'key')
    const pid = parentNodes && parentNodes.length ? parentNodes[0].key : ''

    // 更新所有兄弟节点的顺序
    if (brotherNodes && brotherNodes.length > 0) {
      const updateOrderData: any[] = []
      brotherNodes.forEach((node: any, index: number) => {
        updateOrderData.push({
          id: node.key || node.id,
          showOrder: index
        })
      })

      // 调用更新顺序接口
      const orderApi = buildPostApiByType(`${ props.urlPrefix }${ props.orderUpdateApi }`, '')
      await request(orderApi, {}, updateOrderData, false, false)
    }

    // 如果父节点发生变化，更新父节点
    const oldPid = (info.dragNode as any).pid || ''
    if (oldPid !== pid) {
      const pidApi = buildPostApiByType(`${ props.urlPrefix }${ props.pidUpdateApi }`, '')
      await request(pidApi, {}, { id: dragKey, pid }, false, false)
    }

    message.success('更新成功')
    // 重新加载数据以确保一致性
    await loadTreeData()
  } catch (error) {
    message.error('更新失败')
    console.error('拖拽更新失败:', error)
    // 失败后重新加载数据
    await loadTreeData()
  }
}

// 搜索相关
const getParentKey = (key: string, tree: TreeNode[]): string | undefined => {
  let parentKey: string | undefined
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (node.children) {
      if (node.children.some((item) => item.key === key)) {
        parentKey = node.key
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children)
      }
    }
  }
  return parentKey
}

// 搜索功能
const onSearch = () => {
  const value = searchValue.value.trim()
  if (!value) {
    expandedKeys.value = treeData.value.map((item) => item.key)
    return
  }

  const keys: string[] = []
  const findMatchingKeys = (nodes: TreeNode[]) => {
    nodes.forEach((node) => {
      if (node.title.toLowerCase().includes(value.toLowerCase())) {
        keys.push(node.key)
        // 添加所有父节点的 key
        const parentKey = getParentKey(node.key, treeData.value)
        if (parentKey && !keys.includes(parentKey)) {
          let currentParentKey = parentKey
          while (currentParentKey) {
            keys.push(currentParentKey)
            currentParentKey = getParentKey(currentParentKey, treeData.value) || ''
          }
        }
      }
      if (node.children) {
        findMatchingKeys(node.children)
      }
    })
  }

  findMatchingKeys(treeData.value)
  expandedKeys.value = keys
  autoExpandParent.value = true
}

const onExpand = (keys: Key[]) => {
  expandedKeys.value = keys
  autoExpandParent.value = false
}

// 高亮匹配的文本
const highlightText = (text: string) => {
  const value = searchValue.value.trim()
  if (!value) return text

  const index = text.toLowerCase().indexOf(value.toLowerCase())
  if (index === -1) return text

  return (
      text.substring(0, index) +
      `<span style="color: #ff4d4f; font-weight: 700;">${ text.substring(index, index + value.length) }</span>` +
      text.substring(index + value.length)
  )
}

// 处理右键菜单点击
const handleMenuContext = (node: TreeNode, menuKey: string | number) => {
  const key = String(menuKey)
  switch (key) {
    case 'add':
      handleAdd(node)
      break
    case 'edit':
      handleEdit(node)
      break
    case 'delete':
      handleDelete(node)
      break
    default:
      break
  }
}

// 初始化
onMounted(() => {
  loadTreeData()
})

// 监听 urlPrefix 变化
watch(() => props.urlPrefix, () => {
  loadTreeData()
})
</script>

<template>
  <div class="common-tree-panel">
    <div class="tree-header">
      <!-- 标题插槽 -->
      <slot name="headerTitle">
        <h3 class="tree-title">
          {{ title }}
        </h3>
      </slot>
      <div class="tree-actions">
        <!-- 操作按钮插槽 -->
        <slot
          name="headerActions"
          :loading="loading"
          :handle-add="handleAdd"
          :handle-refresh="handleRefresh"
        >
          <a-button
            v-if="!readonly"
            size="small"
            type="primary"
            @click="handleAdd()"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
          <a-button
            v-if="showRefresh"
            :loading="loading"
            size="small"
            type="text"
            @click="handleRefresh"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
          </a-button>
        </slot>
      </div>
    </div>

    <!-- 搜索框 -->
    <div
      v-if="searchable"
      class="tree-search"
    >
      <a-input
        v-model:value="searchValue"
        allow-clear
        placeholder="请输入关键字搜索"
        @change="onSearch"
        @press-enter="onSearch"
      >
        <template #prefix>
          <SearchOutlined style="color: #bfbfbf" />
        </template>
      </a-input>
    </div>

    <div class="tree-content">
      <a-spin :spinning="loading">
        <a-tree
          v-if="treeData && treeData.length > 0"
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          :auto-expand-parent="autoExpandParent"
          :draggable="!readonly && draggable"
          :field-names="{ children: 'children', title: 'title', key: 'key' }"
          :show-line="showLine"
          :tree-data="treeData"
          block-node
          @drop="handleDrop"
          @expand="onExpand"
          @select="handleSelect"
        >
          <template #icon="slotProps">
            <slot
              name="icon"
              v-bind="slotProps"
            ></slot>
          </template>
          <template #title="{ dataRef }">
            <!-- 右键菜单（无论插槽如何自定义，都会显示） -->
            <a-dropdown :trigger="['contextmenu']">
              <!-- 使用插槽让父组件可以自定义节点显示方式 -->
              <div class="tree-node-wrapper">
                <slot
                  :highlight-text="highlightText"
                  :node="dataRef"
                  name="title"
                >
                  <!-- 默认显示方式 -->
                  <div class="tree-node">
                    <span
                      class="tree-node-title"
                      v-html="highlightText(dataRef.title)"
                    ></span>
                  </div>
                </slot>
              </div>

              <!-- 右键菜单 -->
              <template #overlay>
                <a-menu @click="({ key: menuKey }) => handleMenuContext(dataRef, menuKey)">
                  <template v-if="!readonly">
                    <!-- 右键菜单插槽 -->
                    <slot
                      :data-ref="dataRef"
                      :handle-add="handleAdd"
                      :handle-delete="handleDelete"
                      :handle-edit="handleEdit"
                      name="contextMenu"
                    >
                      <a-menu-item key="add">
                        新增子节点
                      </a-menu-item>
                      <a-menu-item key="edit">
                        编辑节点
                      </a-menu-item>
                      <a-menu-item
                        key="delete"
                        style="color: #ff4d4f;"
                      >
                        删除节点
                      </a-menu-item>
                    </slot>
                  </template>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </a-tree>
        <a-empty
          v-else
          description="暂无数据"
        />
      </a-spin>
    </div>

    <!-- 编辑对话框 -->
    <a-modal
      v-model:open="editModalVisible"
      :title="editingNode ? '编辑' : '新增'"
      @ok="handleSave"
    >
      <!-- 插槽：供父组件自定义表单内容 -->
      <slot
        :editing-node="editingNode"
        :form-data="formData"
        :is-edit="!!editingNode"
        :form-ref="formRef"
        name="form"
      >
        <!-- 默认表单 -->
        <a-form
          :model="formData"
          layout="vertical"
        >
          <a-form-item
            label="名称"
            required
          >
            <a-input
              v-model:value="formData.title"
              placeholder="请输入名称"
            />
          </a-form-item>
        </a-form>
      </slot>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.common-tree-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f9ff 0%, #ffffff 100%);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.15);

  .tree-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1890ff;
    letter-spacing: 0.5px;
    padding: 0;
  }

  .tree-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 0;
    padding: 0;
  }
}

.tree-search {
  padding: 12px 0;
  margin-bottom: 12px;
}

.tree-content {
  flex: 1;
  overflow: auto;
  background: #ffffff;
  border-radius: 6px;
  padding: 4px;

  :deep(.ant-tree) {
    .ant-badge:not(.ant-badge-status) {
      vertical-align: baseline;
    }

    .ant-tree-treenode {
      padding: 2px 4px;
      margin: 1px 0;
      border-radius: 4px;
      transition: all 0.3s ease;
      position: relative;
      display: flex;
      align-items: center;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 3px;
        background: transparent;
        border-radius: 3px;
        transition: all 0.3s ease;
      }

      &:hover {
        background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
        transform: translateX(2px);
        box-shadow: 0 2px 6px rgba(24, 144, 255, 0.12);
        
        &::before {
          background: linear-gradient(180deg, #1890ff 0%, #40a9ff 100%);
        }
      }
    }

    .ant-tree-treenode-selected {
      background: linear-gradient(135deg, #bae7ff 0%, #d6f0ff 100%);
      box-shadow: 0 3px 8px rgba(24, 144, 255, 0.2);
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 3px;
        background: linear-gradient(180deg, #0050b3 0%, #1890ff 100%);
        border-radius: 3px;
      }
    }

    .ant-tree-node-content-wrapper {
      border-radius: 4px;
      padding: 4px 8px;
      transition: all 0.3s ease;
      line-height: 22px;
      vertical-align: middle;
      
      &:hover {
        background-color: transparent;
      }
    }

    .ant-tree-switcher {
      color: #1890ff;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      
      &:hover {
        color: #40a9ff;
      }
      
      .ant-tree-switcher-line-icon {
        vertical-align: middle;
      }
    }

    .ant-tree-iconEle {
      color: #1890ff;
      transition: all 0.3s ease;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      
      svg {
        vertical-align: middle;
      }
    }
  }

  .tree-node-wrapper {
    width: 100%;
    display: inline-block;
    vertical-align: middle;
    line-height: 22px;
  }

  .tree-node {
    display: inline-block;
    width: 100%;
    vertical-align: middle;
    line-height: 22px;

    .tree-node-title {
      font-size: 14px;
      color: #262626;
      font-weight: 500;
      transition: all 0.3s ease;
      vertical-align: baseline;
      line-height: 22px;
    }
  }

  :deep(.ant-tree-treenode:hover) .tree-node-title {
    color: #1890ff;
  }

  :deep(.ant-tree-treenode-selected) .tree-node-title {
    color: #0050b3;
    font-weight: 600;
  }
}
</style>
