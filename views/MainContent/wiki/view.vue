<script setup lang="ts">
/**
 * Wiki公开查看页面
 * 根据URL中的id参数展示页面内容
 */
import { EditOutlined, LockOutlined, ShareAltOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'

import { getPublicWikiPage, requestCollaboratorAccess, updateWikiPage } from './api'
import type { WikiPage, CollaboratorRequestParams, WikiFormData } from './types'

import TiptapEditor from '@/framework/components/common/tiptap-editor/index.vue'
import TiptapViewer from '@/framework/components/common/tiptap-editor/TiptapViewer.vue'
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

/** 编辑器内容 */
const editTitle = ref('')
const editContent = ref('')
const editContentHtml = ref('')

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

// ========== 方法 ==========

/** 加载页面 */
const loadPage = async () => {
  if (!pageId.value) {
    errorMsg.value = '缺少页面ID参数'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await getPublicWikiPage(pageId.value)
    if (data) {
      pageData.value = data
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
  
  // 进入编辑模式
  editTitle.value = pageData.value.title
  editContent.value = pageData.value.content
  editContentHtml.value = pageData.value.contentHtml
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
  
  saving.value = true
  try {
    const formData: WikiFormData = {
      id: pageId.value,
      title: editTitle.value,
      content: editContent.value,
      contentHtml: editContentHtml.value,
      parentId: pageData.value.parentId,
      isPublic: pageData.value.isPublic
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
}

/** 编辑器内容更新 */
const handleEditorUpdate = (editorContent: { json: object | null; html: string; text: string }) => {
  // 将JSON对象转换为字符串存储
  editContent.value = JSON.stringify(editorContent.json)
  editContentHtml.value = editorContent.html
}

// ========== 生命周期 ==========

onMounted(() => {
  loadPage()
})

// 监听路由变化
watch(() => pageId.value, () => {
  loadPage()
})
</script>

<template>
  <div class="wiki-view-page">
    <a-spin :spinning="loading">
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

          <!-- 编辑器 -->
          <div class="editor-container">
            <tiptap-editor
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
  background: #f5f7fa;
  padding: 24px;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  background: #fff;
  border-radius: 8px;
}

.content-container {
  max-width: 1000px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
}
</style>
