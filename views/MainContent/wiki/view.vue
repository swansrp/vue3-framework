<script setup lang="ts">
/**
 * Wiki公开查看页面
 * 根据URL中的id参数展示页面内容
 */
import { EditOutlined, LockOutlined, ShareAltOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'

import { getPublicWikiPage, requestCollaboratorAccess, updateWikiPage, getPublicWikiTree, searchPublicWikiPages } from './api'
import WikiMarkdownEditor from './components/WikiMarkdownEditor.vue'
import WikiPreview from './components/WikiPreview.vue'
import WikiTree from './components/WikiTree.vue'
import type { WikiPage, CollaboratorRequestParams, WikiFormData, EditorMode, WikiTreeNode } from './types'

import TiptapEditor from '@/framework/components/common/tiptap-editor/index.vue'
import TiptapViewer from '@/framework/components/common/tiptap-editor/TiptapViewer.vue'
import type { EditorContent } from '@/framework/components/common/tiptap-editor/types'
import { useCommonStore } from '@/framework/store/common'

const route = useRoute()
const router = useRouter()
const common = useCommonStore()
// ========== 状态 ==========

/** 页面数据 */
const pageData = ref<WikiPage | null>(null)
/** 加载状态 */
const loading = ref(false)
/** 错误信息 */
const errorMsg = ref('')
/** 编辑模式 */
const isEditMode = ref(false)
/** 保存中状态 */
const saving = ref(false)

// ========== 树形目录相关 ==========
/** 树形数据 */
const treeData = ref<WikiTreeNode[]>([])
/** 树加载状态 */
const treeLoading = ref(false)
/** 当前选中的页面ID */
const selectedKey = ref<string>('')

// ========== 搜索相关 ==========
/** 搜索结果 */
const searchResults = ref<WikiPage[]>([])
/** 搜索关键词 */
const searchKeyword = ref('')
/** 搜索加载状态 */
const searchLoading = ref(false)
/** 是否显示搜索结果 */
const showSearchResults = ref(false)

/** 编辑器内容 */
const editTitle = ref('')
const editContent = ref('')
const editContentHtml = ref('')
const editMarkdown = ref('')

/** 编辑器模式（根据页面的 mode 字段决定） */
const editorMode = ref<EditorMode>('rich')

/** Markdown 编辑器引用 */
const markdownEditorRef = ref<InstanceType<typeof WikiMarkdownEditor> | null>(null)
/** 富文本编辑器引用 */
const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)

/** 申请权限弹窗 */
const requestModalVisible = ref(false)
/** 申请说明 */
const requestMsg = ref('')
/** 申请权限类型 */
const requestPermission = ref('2')
/** 申请中状态 */
const requesting = ref(false)

// ========== 计算属性 ==========

/** 页面ID */
const pageId = computed(() => route.query.id as string)

/** 是否为树形目录模式（无 id 参数时） */
const isTreeMode = computed(() => !pageId.value)

// ========== 方法 ==========

/** 加载树形数据 */
const loadTreeData = async () => {
  treeLoading.value = true
  try {
    const data = await getPublicWikiTree()
    
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
          key: nodeKey,
          title: node.title,
          parentId: parentKey,
          sortOrder: node.sortOrder,
          authorId: node.authorId,
          isLeaf: !node.children || node.children.length === 0
        }
        if (node.children && node.children.length > 0) {
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

/** 加载页面 */
const loadPage = async () => {
  if (!pageId.value) {
    // 无 id 参数时，加载树形目录
    await loadTreeData()
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await getPublicWikiPage(pageId.value)
    if (data) {
      pageData.value = data
      selectedKey.value = pageId.value
    } else {
      errorMsg.value = '页面不存在或无权访问'
    }
  } catch (error: any) {
    console.error('加载页面失败:', error)
    errorMsg.value = error.message || '加载页面失败'
  } finally {
    loading.value = false
  }
}

/** 复制分享链接 */
const handleCopyShareLink = () => {
  const shareUrl = window.location.href
  navigator.clipboard.writeText(shareUrl).then(() => {
    message.success('链接已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

/** 跳转到编辑页 */
const handleGoEdit = () => {
  if (!pageData.value) return
  
  // 进入编辑模式，根据页面的 mode 字段决定使用哪种编辑器
  editTitle.value = pageData.value.title
  editContent.value = pageData.value.content
  editContentHtml.value = pageData.value.contentHtml
  
  // 根据保存的 mode 字段决定编辑器模式（编辑时不允许切换）
  if (pageData.value.mode === '1') {
    // Markdown 模式
    editorMode.value = 'markdown'
    editMarkdown.value = pageData.value.contentMarkdown || ''
  } else {
    // 富文本模式（默认）
    editorMode.value = 'rich'
    editMarkdown.value = ''
  }
  
  isEditMode.value = true
}

/** 打开申请权限弹窗 */
const openRequestModal = () => {
  requestMsg.value = ''
  requestPermission.value = '2'
  requestModalVisible.value = true
}

/** 提交权限申请 */
const handleRequestAccess = async () => {
  if (!pageId.value) return

  requesting.value = true
  try {
    const params: CollaboratorRequestParams = {
      pageId: pageId.value,
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

/** 保存编辑 */
const handleSave = async () => {
  if (!pageData.value || !pageId.value) return
  
  if (!editTitle.value.trim()) {
    message.warning('请输入页面标题')
    return
  }
  
  // 检查内容是否为空
  const isEmpty = editorMode.value === 'markdown'
    ? markdownEditorRef.value?.isEmpty()
    : editorRef.value?.isEmpty()
  
  if (isEmpty) {
    message.warning('请输入页面内容')
    return
  }
  
  saving.value = true
  try {
    const formData: WikiFormData = {
      id: pageId.value,
      title: editTitle.value,
      content: editContent.value,
      contentHtml: editContentHtml.value,
      parentId: pageData.value.parentId,
      isPublic: pageData.value.isPublic,
      mode: pageData.value.mode  // 保持原有的 mode，不允许更改
    }
    
    // 如果是 Markdown 模式，保存 Markdown 内容
    if (editorMode.value === 'markdown') {
      formData.contentMarkdown = editMarkdown.value
    }
    
    const updatedPage = await updateWikiPage(pageId.value, formData)
    message.success('保存成功')
    pageData.value = updatedPage
    isEditMode.value = false
  } catch (error: any) {
    console.error('保存失败:', error)
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 取消编辑 */
const handleCancelEdit = () => {
  isEditMode.value = false
  editTitle.value = ''
  editContent.value = ''
  editContentHtml.value = ''
  editMarkdown.value = ''
}

/** 富文本编辑器内容更新 */
const handleEditorUpdate = (editorContent: EditorContent) => {
  // 将JSON对象转换为字符串存储
  editContent.value = JSON.stringify(editorContent.json)
  editContentHtml.value = editorContent.html
}

/** Markdown 编辑器内容更新 */
const handleMarkdownUpdate = (content: EditorContent & { markdown: string }) => {
  editContent.value = JSON.stringify(content.json)
  editContentHtml.value = content.html
  editMarkdown.value = content.markdown
}

// ========== 树形目录操作 ==========

/** 选中节点（只读模式） */
const handleSelect = async (key: string, _node: WikiTreeNode) => {
  selectedKey.value = key
  showSearchResults.value = false
  
  // 加载页面详情
  loading.value = true
  try {
    const data = await getPublicWikiPage(key)
    if (data) {
      pageData.value = data
    } else {
      message.error('页面不存在或无权访问')
    }
  } catch (error: any) {
    console.error('加载页面详情失败:', error)
    message.error(error.message || '加载页面详情失败')
  } finally {
    loading.value = false
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
    const data = await searchPublicWikiPages(keyword)
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
  pageData.value = page
  showSearchResults.value = false
}

/** 关闭搜索结果 */
const handleCloseSearchResults = () => {
  showSearchResults.value = false
}

// ========== 生命周期 ==========

onMounted(() => {
  loadPage()
})

// 监听路由变化
watch(() => pageId.value, () => {
  // 重置状态
  pageData.value = null
  selectedKey.value = ''
  showSearchResults.value = false
  errorMsg.value = ''
  isEditMode.value = false
  
  loadPage()
})
</script>

<template>
  <div class="wiki-view-page">
    <!-- 树形目录模式（无 id 参数） -->
    <div
      v-if="isTreeMode"
      class="wiki-tree-container"
    >
      <!-- 左侧目录树 -->
      <div class="wiki-sidebar">
        <wiki-tree
          :tree-data="treeData"
          :selected-key="selectedKey"
          :loading="treeLoading"
          :readonly="true"
          @select="handleSelect"
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

        <!-- 页面内容 -->
        <a-spin
          v-show="!showSearchResults"
          :spinning="loading"
          style="height: 100%;"
        >
          <div
            v-if="pageData"
            class="wiki-content"
          >
            <h1 class="page-title">
              {{ pageData.title }}
            </h1>
            <div class="page-meta">
              <span>作者：{{ pageData.authorName }}</span>
              <span>更新时间：{{ pageData.modifyAt }}</span>
              <span>浏览：{{ pageData.viewCount }} 次</span>
              <a-tag
                v-if="pageData.isPublic === '1'"
                color="green"
              >
                公开
              </a-tag>
            </div>
            <a-divider />
            <div class="page-content">
              <tiptap-viewer
                :content="pageData.content"
                :content-html="pageData.contentHtml"
              />
            </div>
          </div>
          <a-empty
            v-else
            description="请选择或搜索一个Wiki页面"
            style="margin-top: 100px;"
          />
        </a-spin>
      </div>
    </div>

    <!-- 单页面模式（有 id 参数） -->
    <a-spin
      v-else
      :spinning="loading"
    >
      <!-- 错误状态 -->
      <div
        v-if="errorMsg"
        class="error-container"
      >
        <a-result
          status="404"
          title="无法访问"
          :sub-title="errorMsg"
        >
          <template #extra>
            <a-button 
              v-if="common.hasLogin"
              type="primary"
              @click="router.push('/wiki')"
            >
              返回Wiki首页
            </a-button>
          </template>
        </a-result>
      </div>

      <!-- 内容展示 -->
      <div
        v-else-if="pageData"
        class="content-container"
      >
        <!-- 查看模式 -->
        <template v-if="!isEditMode">
          <!-- 顶部操作栏 -->
          <div class="page-header">
            <div class="page-info">
              <h1 class="page-title">
                {{ pageData.title }}
              </h1>
              <div class="page-meta">
                <span>作者：{{ pageData.authorName }}</span>
                <span>更新时间：{{ pageData.modifyAt }}</span>
                <span>浏览：{{ pageData.viewCount }} 次</span>
                <a-tag
                  v-if="pageData.isPublic === '1'"
                  color="green"
                >
                  公开
                </a-tag>
              </div>
            </div>
            <div class="page-actions">
              <a-button @click="handleCopyShareLink">
                <template #icon>
                  <share-alt-outlined />
                </template>
                分享
              </a-button>
              <template v-if="pageData.isPublic !== '1'">
                <a-button
                  v-if="pageData.canEdit"
                  type="primary"
                  @click="handleGoEdit"
                >
                  <template #icon>
                    <edit-outlined />
                  </template>
                  编辑
                </a-button>
                <a-button
                  v-else-if="!pageData.isAuthor"
                  @click="openRequestModal"
                >
                  <template #icon>
                    <lock-outlined />
                  </template>
                  申请编辑权限
                </a-button>
              </template>
            </div>
          </div>

          <a-divider />

          <!-- 页面内容 -->
          <div class="page-content">
            <!-- 始终使用渲染后的 HTML 显示，不区分模式 -->
            <tiptap-viewer
              :content="pageData.content"
              :content-html="pageData.contentHtml"
            />
          </div>
        </template>

        <!-- 编辑模式 -->
        <template v-else>
          <div class="edit-header">
            <a-input
              v-model:value="editTitle"
              placeholder="请输入页面标题"
              size="large"
              class="title-input"
            />
            <div class="edit-actions">
              <a-button
                @click="handleCancelEdit"
              >
                <template #icon>
                  <close-outlined />
                </template>
                取消
              </a-button>
              <a-button
                type="primary"
                :loading="saving"
                @click="handleSave"
              >
                <template #icon>
                  <save-outlined />
                </template>
                保存
              </a-button>
            </div>
          </div>

          <a-divider style="margin: 16px 0" />

          <!-- 编辑器：根据 mode 字段选择 Markdown 或富文本 -->
          <div class="editor-container">
            <!-- Markdown 编辑器 -->
            <wiki-markdown-editor
              v-if="editorMode === 'markdown'"
              ref="markdownEditorRef"
              :markdown="editMarkdown"
              :readonly="false"
              min-height="500px"
              @update="handleMarkdownUpdate"
            />
            <!-- 富文本编辑器 -->
            <tiptap-editor
              v-else
              ref="editorRef"
              :content="editContent"
              @update="handleEditorUpdate"
            />
          </div>
        </template>
      </div>

      <!-- 空状态 -->
      <a-empty
        v-else-if="!loading && !errorMsg"
        description="正在加载..."
      />
    </a-spin>

    <!-- 申请权限弹窗 -->
    <a-modal
      v-model:open="requestModalVisible"
      title="申请编辑权限"
      :confirm-loading="requesting"
      @ok="handleRequestAccess"
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
.wiki-view-page {
  min-height: calc(100vh - 60px);
  background: #fff;
  // 树形目录模式需要 padding，单页面模式不需要
  padding: 0;

  // 树形目录模式
  .wiki-tree-container {
    display: flex;
    height: calc(100vh - 110px);
    gap: 12px;
    padding: 24px;

    .wiki-sidebar {
      width: 280px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      background: #fff;
    }

    .wiki-main {
      flex: 1;
      position: relative;
      border-radius: 8px;
      overflow-y: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      background: #fff;
      display: flex;
      flex-direction: column;
    }
  }

  // 树形模式下的页面内容
  .wiki-content {
    padding: 32px;
    flex: 1;
    overflow-y: auto;

    .page-title {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 600;
      color: #262626;
    }

    .page-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      color: #8c8c8c;
      font-size: 14px;
    }

    .page-content {
      margin-top: 16px;
      line-height: 1.8;
    }
  }
}

  // 单页面模式样式
  .error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  background: #fff;
  border-radius: 8px;
}

.content-container {
  width: 100%;
  min-height: calc(100vh - 60px);
  background: #fff;
  padding: 32px 48px;
  box-shadow: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;

  .page-info {
    flex: 1;

    .page-title {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 600;
      color: #262626;
    }

    .page-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      color: #8c8c8c;
      font-size: 14px;
    }
  }

  .page-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.page-content {
  margin-top: 16px;
  line-height: 1.8;
}

.edit-header {
  display: flex;
  gap: 16px;
  align-items: center;

  .title-input {
    flex: 1;
    font-size: 20px;
    font-weight: 600;
  }

  .edit-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.editor-container {
  margin-top: 16px;
  min-height: 500px;
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
</style>
