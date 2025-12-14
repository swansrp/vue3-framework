<script setup lang="ts">
/**
 * Wiki看板主页面
 * 功能：左侧目录树 + 右侧编辑/预览区域 + 协作者管理
 */
import { message, Modal } from 'ant-design-vue'
import type { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'


import {
  getWikiTree,
  getWikiPage,
  addWikiPage,
  updateWikiPage,
  deleteWikiPage,
  sortWikiPage,
  pidWikiPage,
  searchWikiPages,
  getCollaborators,
  getPendingRequests,
  approveCollaborator,
  removeCollaborator,
  updateCollaboratorPermission,
  requestCollaboratorAccess
} from './api'
import CollaboratorManager from './components/CollaboratorManager.vue'
import WikiEditor from './components/WikiEditor.vue'
import WikiPreview from './components/WikiPreview.vue'
import WikiTree from './components/WikiTree.vue'
import type { WikiPage, WikiTreeNode, WikiFormData, WikiMode, WikiCollaborator, WikiSortParams, CollaboratorRequestParams } from './types'

import { getDroppedData } from '@/framework/hooks/antTreeDropSort'
import { getAllParentNodes, getBrotherNodes } from '@/framework/utils/common'

// ========== 状态管理 ==========

/** 树形数据 */
const treeData = ref<WikiTreeNode[]>([])
/** 树加载状态 */
const treeLoading = ref(false)
/** 当前选中的页面ID */
const selectedKey = ref<string>('')
/** 当前页面数据 */
const currentPage = ref<WikiPage | null>(null)
/** 页面加载状态 */
const pageLoading = ref(false)
/** 操作模式 */
const mode = ref<WikiMode>('view')
/** 新增时的父级ID */
const addParentId = ref<string | null>(null)
// 保存中状态
const saving = ref(false)
// 内容是否已修改（用于判断是否需要提示）
const isContentChanged = ref(false)

// ========== 搜索相关 ==========

/** 搜索结果 */
const searchResults = ref<WikiPage[]>([])
/** 搜索关键词 */
const searchKeyword = ref('')
/** 搜索加载状态 */
const searchLoading = ref(false)
/** 是否显示搜索结果 */
const showSearchResults = ref(false)

// ========== 协作者管理相关 ==========

/** 协作者管理弹窗可见性 */
const collaboratorModalVisible = ref(false)
/** 协作者列表 */
const collaborators = ref<WikiCollaborator[]>([])
/** 待审批申请列表 */
const pendingRequests = ref<WikiCollaborator[]>([])
/** 协作者加载状态 */
const collaboratorLoading = ref(false)

// ========== 申请权限相关 ==========

/** 申请权限弹窗可见性 */
const requestModalVisible = ref(false)
/** 申请说明 */
const requestMsg = ref('')
/** 申请权限类型 */
const requestPermission = ref('2')
/** 申请中状态 */
const requesting = ref(false)

// ========== 方法 ==========

/** 加载树形数据 */
const loadTreeData = async () => {
  treeLoading.value = true
  try {
    const data = await getWikiTree()
    
    // 将扁平数组转换为树形结构
    const buildTree = (flatList: any[]): any[] => {
      const map = new Map()
      const roots: any[] = []
      
      // 第一遍遍历，创建所有节点的映射
      flatList.forEach(item => {
        map.set(item.id, { ...item, children: [] })
      })
      
      // 第二遍遍历，建立父子关系
      flatList.forEach(item => {
        const node = map.get(item.id)
        if (item.parentId === null || item.parentId === undefined) {
          // 顶级节点
          roots.push(node)
        } else {
          // 子节点，添加到父节点的 children
          const parent = map.get(item.parentId)
          if (parent) {
            parent.children.push(node)
          } else {
            // 如果找不到父节点，当作顶级节点处理
            roots.push(node)
          }
        }
      })
      
      return roots
    }
    
    // 确保树节点使用 id 作为 key，并正确设置 parentId
    const processTreeData = (nodes: any[], parentKey: string | null = null): WikiTreeNode[] => {
      return nodes.map(node => {
        const nodeKey = String(node.id || node.key)
        const processed: WikiTreeNode = {
          key: nodeKey, // 使用 id 作为 key
          title: node.title,
          parentId: parentKey, // 使用传入的 parentKey
          sortOrder: node.sortOrder,
          authorId: node.authorId,
          isLeaf: !node.children || node.children.length === 0
        }
        if (node.children && node.children.length > 0) {
          // 递归处理子节点，传入当前节点的 key 作为 parentId
          processed.children = processTreeData(node.children, nodeKey)
        }
        return processed
      })
    }
    
    // 先构建树形结构，再处理节点属性
    const treeStructure = buildTree(data || [])
    treeData.value = processTreeData(treeStructure, null)
  } catch (error) {
    console.error('加载Wiki树失败:', error)
    message.error('加载Wiki目录失败')
  } finally {
    treeLoading.value = false
  }
}

/** 加载页面详情 */
const loadPageDetail = async (id: string) => {
  pageLoading.value = true
  try {
    const data = await getWikiPage(id)
    currentPage.value = data
    mode.value = 'view'
  } catch (error) {
    console.error('加载页面详情失败:', error)
    message.error('加载页面详情失败')
  } finally {
    pageLoading.value = false
  }
}

/** 选中节点 */
const handleSelect = (key: string, _node: WikiTreeNode) => {
  const stringKey = String(key) // 确保转换为字符串
  
  // 如果当前正在编辑且内容已修改，提示用户确认
  if ((mode.value === 'edit' || mode.value === 'add') && isContentChanged.value) {
    Modal.confirm({
      title: '提示',
      content: '当前页面有未保存的修改，是否放弃修改并查看其他页面？',
      okText: '放弃修改',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        performSelect(stringKey)
      }
    })
  } else {
    performSelect(stringKey)
  }
}

/** 执行选中操作 */
const performSelect = (stringKey: string) => {
  selectedKey.value = stringKey
  loadPageDetail(stringKey)
  showSearchResults.value = false
  isContentChanged.value = false
}

/** 新增页面 */
const handleAdd = (parentId: string | null) => {
  // 如果当前正在编辑且内容已修改，提示用户确认
  if ((mode.value === 'edit' || mode.value === 'add') && isContentChanged.value) {
    Modal.confirm({
      title: '提示',
      content: '当前页面有未保存的修改，是否放弃修改并进入新增模式？',
      okText: '放弃修改',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        performAdd(parentId)
      }
    })
  } else {
    performAdd(parentId)
  }
}

/** 执行新增操作 */
const performAdd = (parentId: string | null) => {
  selectedKey.value = ''
  currentPage.value = null
  addParentId.value = parentId
  mode.value = 'add'
  showSearchResults.value = false
  isContentChanged.value = false
}

/** 编辑页面 */
const handleEdit = (key: string) => {
  const stringKey = String(key) // 确保转换为字符串
  
  // 如果当前正在编辑且内容已修改，提示用户确认
  if ((mode.value === 'edit' || mode.value === 'add') && isContentChanged.value) {
    Modal.confirm({
      title: '提示',
      content: '当前页面有未保存的修改，是否放弃修改并编辑其他页面？',
      okText: '放弃修改',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        performEdit(stringKey)
      }
    })
  } else {
    performEdit(stringKey)
  }
}

/** 执行编辑操作 */
const performEdit = (stringKey: string) => {
  if (selectedKey.value !== stringKey) {
    selectedKey.value = stringKey
    loadPageDetail(stringKey).then(() => {
      mode.value = 'edit'
      isContentChanged.value = false
    })
  } else {
    mode.value = 'edit'
    isContentChanged.value = false
  }
  showSearchResults.value = false
}

/** 切换到编辑模式 */
const handleSwitchToEdit = () => {
  mode.value = 'edit'
  isContentChanged.value = false
}

/** 监听内容变化 */
const handleContentChange = (changed: boolean) => {
  isContentChanged.value = changed
}

/** 删除页面 */
const handleDelete = async (key: string, title: string) => {
  try {
    await deleteWikiPage(key)
    message.success(`页面 "${title}" 删除成功`)
    // 如果删除的是当前页面，清空选中
    if (selectedKey.value === key) {
      selectedKey.value = ''
      currentPage.value = null
      mode.value = 'view'
    }
    // 重新加载树
    await loadTreeData()
  } catch (error) {
    console.error('删除页面失败:', error)
    message.error('删除页面失败')
  }
}

/** 拖拽排序 */
const handleDrop = async (info: AntTreeNodeDropEvent) => {
  try {
    const dragKey = info.dragNode.key
    // 获取原始父节点ID
    const originalParentId = (info.dragNode as any).parentId
    
    // 更新本地树数据
    treeData.value = getDroppedData(info, treeData)
    
    // 获取兄弟节点（同一层级的所有节点）
    const brotherNodes = getBrotherNodes(treeData.value, dragKey, 'key')
    // 获取所有父节点
    const parentNodes = getAllParentNodes(treeData.value, dragKey, 'key')
    // 新的父节点ID
    const newParentId = parentNodes.length ? parentNodes[0].key : null

    // 更新排序
    let updateOrderData: WikiSortParams[] = []
    brotherNodes.forEach((node: any, index: number) => {
      updateOrderData.push({ id: node.key, showOrder: index })
    })
    await sortWikiPage(updateOrderData)
    
    // 如果父节点发生变化，更新父节点
    if (originalParentId !== newParentId) {
      await pidWikiPage(dragKey as string, newParentId as string)
    }
    
    message.success('排序成功')
    // 重新加载树数据以确保同步
    await loadTreeData()
  } catch (error) {
    console.error('排序失败:', error)
    message.error('排序失败')
    // 失败时重新加载树数据恢复状态
    await loadTreeData()
  }
}

/** 搜索 */
const handleSearch = async (keyword: string) => {
  searchKeyword.value = keyword
  if (!keyword || keyword.trim() === '') {
    showSearchResults.value = false
    searchResults.value = []
    return
  }
  searchLoading.value = true
  showSearchResults.value = true
  try {
    const data = await searchWikiPages(keyword)
    searchResults.value = data || []
  } catch (error) {
    console.error('搜索失败:', error)
    message.error('搜索失败')
  } finally {
    searchLoading.value = false
  }
}

/** 选中搜索结果 */
const handleSelectSearchResult = (page: WikiPage) => {
  selectedKey.value = page.id
  currentPage.value = page
  mode.value = 'view'
  showSearchResults.value = false
}

/** 关闭搜索结果 */
const handleCloseSearchResults = () => {
  showSearchResults.value = false
}

/** 保存页面 */
const handleSave = async (data: WikiFormData) => {
  saving.value = true
  try {
    if (mode.value === 'add') {
      const newPage = await addWikiPage(data)
      message.success('页面创建成功')
      selectedKey.value = newPage.id
      currentPage.value = newPage
      mode.value = 'view'
    } else {
      const updatedPage = await updateWikiPage(data.id!, data)
      message.success('页面保存成功')
      currentPage.value = updatedPage
      mode.value = 'view'
    }
    // 保存成功后重置修改标记
    isContentChanged.value = false
    // 重新加载树
    await loadTreeData()
  } catch (error) {
    console.error('保存页面失败:', error)
    message.error('保存页面失败')
  } finally {
    saving.value = false
  }
}

/** 取消编辑 */
const handleCancel = () => {
  if (mode.value === 'add') {
    currentPage.value = null
    selectedKey.value = ''
  }
  mode.value = 'view'
  isContentChanged.value = false
}

// ========== 协作者管理方法 ==========

/** 打开协作者管理弹窗 */
const handleManageCollaborators = async () => {
  if (!currentPage.value) return
  collaboratorModalVisible.value = true
  await loadCollaborators()
}

/** 加载协作者数据 */
const loadCollaborators = async () => {
  if (!currentPage.value) return
  collaboratorLoading.value = true
  try {
    const [collabList, pendingList] = await Promise.all([
      getCollaborators(currentPage.value.id),
      getPendingRequests(currentPage.value.id)
    ])
    collaborators.value = collabList || []
    pendingRequests.value = pendingList || []
  } catch (error) {
    console.error('加载协作者失败:', error)
    message.error('加载协作者失败')
  } finally {
    collaboratorLoading.value = false
  }
}

/** 审批协作者申请 */
const handleApproveRequest = async (userId: string, approved: boolean) => {
  if (!currentPage.value) return
  try {
    await approveCollaborator({
      pageId: currentPage.value.id,
      userId,
      approved
    })
    message.success(approved ? '已通过申请' : '已拒绝申请')
    await loadCollaborators()
  } catch (error) {
    console.error('审批失败:', error)
    message.error('审批失败')
  }
}

/** 移除协作者 */
const handleRemoveCollaborator = async (userId: string) => {
  if (!currentPage.value) return
  try {
    await removeCollaborator(currentPage.value.id, userId)
    message.success('已移除协作者')
    await loadCollaborators()
  } catch (error) {
    console.error('移除失败:', error)
    message.error('移除失败')
  }
}

/** 更新协作者权限 */
const handleUpdatePermission = async (userId: string, permission: string) => {
  if (!currentPage.value) return
  try {
    await updateCollaboratorPermission(currentPage.value.id, userId, permission)
    message.success('权限已更新')
    await loadCollaborators()
  } catch (error) {
    console.error('更新权限失败:', error)
    message.error('更新权限失败')
  }
}

/** 打开申请权限弹窗 */
const handleRequestAccess = () => {
  if (!currentPage.value) return
  requestMsg.value = ''
  requestPermission.value = '2'
  requestModalVisible.value = true
}

/** 提交权限申请 */
const handleSubmitRequest = async () => {
  if (!currentPage.value) return
  
  requesting.value = true
  try {
    const params: CollaboratorRequestParams = {
      pageId: currentPage.value.id,
      permission: requestPermission.value,
      requestMsg: requestMsg.value
    }
    await requestCollaboratorAccess(params)
    message.success('申请已提交，请等待作者审批')
    requestModalVisible.value = false
  } catch (error: any) {
    console.error('申请失败:', error)
    message.error(error.message || '申请失败')
  } finally {
    requesting.value = false
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadTreeData()
})
</script>

<template>
  <div class="wiki-container">
    <!-- 左侧目录树 -->
    <div class="wiki-sidebar">
      <wiki-tree
        :tree-data="treeData"
        :selected-key="selectedKey"
        :loading="treeLoading"
        @select="handleSelect"
        @add="handleAdd"
        @edit="handleEdit"
        @delete="handleDelete"
        @drop="handleDrop"
        @search="handleSearch"
      />
    </div>

    <!-- 右侧内容区域 -->
    <div class="wiki-main">
      <!-- 搜索结果 -->
      <wiki-preview
        :search-results="searchResults"
        :keyword="searchKeyword"
        :loading="searchLoading"
        :visible="showSearchResults"
        @select="handleSelectSearchResult"
        @close="handleCloseSearchResults"
      />

      <!-- 编辑器/预览 -->
      <a-spin
        :spinning="pageLoading"
        style="height: 100%;"
      >
        <wiki-editor
          v-show="!showSearchResults"
          :page-data="currentPage"
          :mode="mode"
          :parent-id="addParentId"
          :saving="saving"
          @save="handleSave"
          @cancel="handleCancel"
          @edit="handleSwitchToEdit"
          @manage-collaborators="handleManageCollaborators"
          @request-access="handleRequestAccess"
          @content-change="handleContentChange"
        />
      </a-spin>
    </div>

    <!-- 协作者管理弹窗 -->
    <collaborator-manager
      v-model:visible="collaboratorModalVisible"
      :collaborators="collaborators"
      :pending-requests="pendingRequests"
      :loading="collaboratorLoading"
      @approve="handleApproveRequest"
      @remove="handleRemoveCollaborator"
      @update-permission="handleUpdatePermission"
    />

    <!-- 申请权限弹窗 -->
    <a-modal
      v-model:open="requestModalVisible"
      title="申请编辑权限"
      :confirm-loading="requesting"
      @ok="handleSubmitRequest"
    >
      <a-form layout="vertical">
        <a-form-item label="申请权限类型">
          <a-radio-group v-model:value="requestPermission">
            <a-radio value="1">
              只读权限
            </a-radio>
            <a-radio value="2">
              编辑权限
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="申请说明">
          <a-textarea
            v-model:value="requestMsg"
            placeholder="请简要说明申请原因（可选）"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.wiki-container {
  display: flex;
  height: calc(100vh - 110px);
  background: #f5f7fa;
  gap: 12px;
  padding: 12px;

  .wiki-sidebar {
    width: 280px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .wiki-main {
    flex: 1;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    background: #fff;
    min-height: 0;
    display: flex;
    flex-direction: column;

    // 确保 a-spin 和 wiki-editor 也参与 flex 布局
    :deep(.ant-spin-nested-loading),
    :deep(.ant-spin-container) {
      height: 100%;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  }
}
</style>