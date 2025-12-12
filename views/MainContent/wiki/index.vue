<script setup lang="ts">
/**
 * Wiki看板主页面
 * 功能：左侧目录树 + 右侧编辑/预览区域
 */
import { message } from 'ant-design-vue'

import {
  getWikiTree,
  getWikiPage,
  addWikiPage,
  updateWikiPage,
  deleteWikiPage,
  sortWikiPage,
  searchWikiPages
} from './api'
import WikiEditor from './components/WikiEditor.vue'
import WikiPreview from './components/WikiPreview.vue'
import WikiTree from './components/WikiTree.vue'
import type { WikiPage, WikiTreeNode, WikiFormData, WikiMode } from './types'

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
/** 保存中状态 */
const saving = ref(false)

// ========== 搜索相关 ==========

/** 搜索结果 */
const searchResults = ref<WikiPage[]>([])
/** 搜索关键词 */
const searchKeyword = ref('')
/** 搜索加载状态 */
const searchLoading = ref(false)
/** 是否显示搜索结果 */
const showSearchResults = ref(false)

// ========== 方法 ==========

/** 加载树形数据 */
const loadTreeData = async () => {
  treeLoading.value = true
  try {
    const data = await getWikiTree()
    treeData.value = data || []
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
  selectedKey.value = key
  loadPageDetail(key)
  showSearchResults.value = false
}

/** 新增页面 */
const handleAdd = (parentId: string | null) => {
  selectedKey.value = ''
  currentPage.value = null
  addParentId.value = parentId
  mode.value = 'add'
  showSearchResults.value = false
}

/** 编辑页面 */
const handleEdit = (key: string) => {
  if (selectedKey.value !== key) {
    selectedKey.value = key
    loadPageDetail(key).then(() => {
      mode.value = 'edit'
    })
  } else {
    mode.value = 'edit'
  }
  showSearchResults.value = false
}

/** 切换到编辑模式 */
const handleSwitchToEdit = () => {
  mode.value = 'edit'
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
const handleDrop = async (params: { id: string; parentId: string | null; sortOrder: number }) => {
  try {
    await sortWikiPage(params)
    message.success('排序成功')
    await loadTreeData()
  } catch (error) {
    console.error('排序失败:', error)
    message.error('排序失败')
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
      <a-spin :spinning="pageLoading">
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
        <wiki-editor
          v-show="!showSearchResults"
          :page-data="currentPage"
          :mode="mode"
          :parent-id="addParentId"
          :saving="saving"
          @save="handleSave"
          @cancel="handleCancel"
          @edit="handleSwitchToEdit"
        />
      </a-spin>
    </div>
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
  }
}
</style>