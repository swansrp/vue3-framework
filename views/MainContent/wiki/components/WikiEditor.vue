<script setup lang="ts">
/**
 * Wiki编辑器组件
 * 功能：使用Tiptap编辑Wiki页面内容
 */
import { EditOutlined, SaveOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import type { WikiFormData, WikiMode, WikiPage } from '../types'


import TiptapEditor from '@/framework/components/common/tiptap-editor/index.vue'
import TiptapViewer from '@/framework/components/common/tiptap-editor/TiptapViewer.vue'
import type { EditorContent } from '@/framework/components/common/tiptap-editor/types'

const props = withDefaults(
  defineProps<{
    /** 当前页面数据 */
    pageData?: WikiPage | null
    /** 操作模式 */
    mode: WikiMode
    /** 父级页面ID（新增时使用） */
    parentId?: string | null
    /** 保存中状态 */
    saving?: boolean
  }>(),
  {
    pageData: null,
    parentId: null,
    saving: false
  }
)

const emit = defineEmits<{
  /** 保存页面 */
  (e: 'save', data: WikiFormData): void
  /** 取消编辑 */
  (e: 'cancel'): void
  /** 切换到编辑模式 */
  (e: 'edit'): void
  /** 管理协作者 */
  (e: 'manageCollaborators'): void
  /** 申请编辑权限 */
  (e: 'requestAccess'): void
}>()

const { pageData, mode, parentId, saving } = toRefs(props)

// 表单数据
const formData = reactive<WikiFormData>({
  id: undefined,
  title: '',
  content: '',
  contentHtml: '',
  parentId: null,
  isPublic: '1'
})

// 表单引用
const formRef = ref()
// 编辑器引用
const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)

// 内容变更标记
const isContentChanged = ref(false)

/** 处理编辑器内容更新 */
const handleEditorUpdate = (content: EditorContent) => {
  formData.content = JSON.stringify(content.json)
  formData.contentHtml = content.html
  isContentChanged.value = true
}

/** 保存页面 */
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    const isEmpty = editorRef.value?.isEmpty()
    if (isEmpty) {
      message.warning('请输入页面内容')
      return
    }
    emit('save', { ...formData })
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

/** 取消编辑 */
const handleCancel = () => {
  if (isContentChanged.value) {
    // 可以添加确认弹窗
  }
  emit('cancel')
}

/** 切换到编辑模式 */
const handleEdit = () => {
  emit('edit')
}

/** 打开协作者管理 */
const handleManageCollaborators = () => {
  emit('manageCollaborators')
}

/** 申请编辑权限 */
const handleRequestAccess = () => {
  emit('requestAccess')
}

/** 复制分享链接 */
const handleCopyShareLink = () => {
  if (!pageData.value) return
  const shareUrl = `${window.location.origin}/#/wiki/view?id=${pageData.value.id}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    message.success('分享链接已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

/** 初始化表单数据 */
const initFormData = () => {
  if (mode.value === 'add') {
    formData.id = undefined
    formData.title = ''
    formData.content = ''
    formData.contentHtml = ''
    formData.parentId = parentId.value
    formData.isPublic = '1'
  } else if (pageData.value) {
    formData.id = pageData.value.id
    formData.title = pageData.value.title
    formData.content = pageData.value.content
    formData.contentHtml = pageData.value.contentHtml
    formData.parentId = pageData.value.parentId
    formData.isPublic = pageData.value.isPublic
  }
  isContentChanged.value = false
}

// 监听页面数据和模式变化
watch([() => pageData.value, () => mode.value], () => {
  initFormData()
}, { immediate: true })

// 监听parentId变化（新增模式）
watch(() => parentId.value, (newVal) => {
  if (mode.value === 'add') {
    formData.parentId = newVal
  }
})
</script>

<template>
  <div class="wiki-editor">
    <!-- 工具栏 -->
    <div class="wiki-editor-toolbar">
      <template v-if="mode === 'view'">
        <a-button
          v-if="pageData?.canEdit"
          type="primary"
          @click="handleEdit"
        >
          <template #icon>
            <edit-outlined />
          </template>
          编辑
        </a-button>
        <a-button
          v-else-if="pageData && !pageData.isAuthor"
          @click="handleRequestAccess"
        >
          <template #icon>
            <team-outlined />
          </template>
          申请编辑权限
        </a-button>
        <a-button
          v-if="pageData"
          @click="handleCopyShareLink"
        >
          <template #icon>
            <share-alt-outlined />
          </template>
          分享
        </a-button>
        <a-button
          v-if="pageData?.isAuthor"
          @click="handleManageCollaborators"
        >
          <template #icon>
            <team-outlined />
          </template>
          协作者
        </a-button>
      </template>
      <template v-else>
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
        <a-button @click="handleCancel">
          取消
        </a-button>
        <a-form-item
          label="公开"
          style="margin-bottom: 0; margin-left: 16px;"
        >
          <a-switch
            v-model:checked="formData.isPublic"
            checked-value="1"
            un-checked-value="0"
          />
        </a-form-item>
      </template>
    </div>

    <!-- 编辑区域 -->
    <div class="wiki-editor-content">
      <template v-if="mode === 'view'">
        <!-- 查看模式 -->
        <div
          v-if="pageData"
          class="wiki-view-content"
        >
          <h1 class="wiki-title">
            {{ pageData.title }}
          </h1>
          <div class="wiki-meta">
            <span>浏览：{{ pageData.viewCount }} 次</span>
            <span>版本：v{{ pageData.version }}</span>
            <span>更新时间：{{ pageData.modifyAt }}</span>
            <span>作者：{{ pageData.authorName }}</span>
            <span>
              <a-tag
                v-if="pageData.isPublic === '1'"
                color="green"
              >
                公开
              </a-tag>
              <a-tag
                v-else
                color="orange"
              >
                私有
              </a-tag>
            </span>
          </div>
          <a-divider />
          <tiptap-viewer
            :content="pageData.content"
            :content-html="pageData.contentHtml"
          />
        </div>
        <a-empty
          v-else
          description="请选择或创建一个Wiki页面"
        />
      </template>
      <template v-else>
        <!-- 编辑/新增模式 -->
        <a-form
          ref="formRef"
          :model="formData"
          layout="vertical"
          class="wiki-form"
        >
          <a-form-item
            label="页面标题"
            name="title"
            :rules="[{ required: true, message: '请输入页面标题' }]"
          >
            <a-input
              v-model:value="formData.title"
              placeholder="请输入页面标题"
              :maxlength="200"
              show-count
            />
          </a-form-item>
          <a-form-item
            label="页面内容"
            name="content"
          >
            <tiptap-editor
              ref="editorRef"
              :content="formData.content"
              :content-html="formData.contentHtml"
              :placeholder="'开始编写Wiki内容...'"
              min-height="400px"
              @update="handleEditorUpdate"
            />
          </a-form-item>
        </a-form>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.wiki-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  &-toolbar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }

  &-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }
}

.wiki-view-content {
  width: 100%;
  max-width: 100%;
  padding: 0 20px;
  box-sizing: border-box;

  .wiki-title {
    margin-bottom: 8px;
    font-size: 24px;
    font-weight: 600;
    color: #262626;
  }

  .wiki-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    color: #8c8c8c;
    font-size: 12px;
  }

  .wiki-body {
    line-height: 1.8;
    color: #595959;

    :deep(img) {
      max-width: 100%;
      height: auto;
    }

    :deep(table) {
      width: 100%;
      border-collapse: collapse;

      td,
      th {
        border: 1px solid #f0f0f0;
        padding: 8px 12px;
      }

      th {
        background: #fafafa;
      }
    }

    :deep(pre) {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }

    :deep(blockquote) {
      margin: 16px 0;
      padding: 12px 16px;
      border-left: 4px solid #1890ff;
      background: #f5f5f5;
    }
  }
}

.wiki-form {
  width: 100%;
  max-width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}
</style>
