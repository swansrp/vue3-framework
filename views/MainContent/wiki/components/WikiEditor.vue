<script setup lang="ts">
/**
 * Wiki编辑器组件
 * 功能：使用Tiptap编辑Wiki页面内容
 */
import { EditOutlined, SaveOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import TurndownService from 'turndown'

import type { WikiFormData, WikiMode, WikiPage, EditorMode } from '../types'
import WikiMarkdownEditor from './WikiMarkdownEditor.vue'

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
  /** 内容变化 */
  (e: 'contentChange', changed: boolean): void
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
// 富文本编辑器引用
const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)
// Markdown 编辑器引用
const markdownEditorRef = ref<InstanceType<typeof WikiMarkdownEditor> | null>(null)

// 内容变更标记
const isContentChanged = ref(false)
// 编辑模式：'rich' | 'markdown'（默认富文本）
const editorMode = ref<EditorMode>('rich')
// 是否允许切换模式（新增时允许，编辑时禁止）
const canSwitchMode = ref(true)
// Markdown 源码内容
const markdownContent = ref('')
// 保存富文本编辑器的原始内容（切换模式时不丢失）
const richEditorContent = ref('')
const richEditorContentHtml = ref('')

// 初始化 HTML 转 Markdown 的服务
const turndownService = new TurndownService({
  headingStyle: 'atx',        // # 风格的标题
  codeBlockStyle: 'fenced',   // ``` 风格的代码块
  emDelimiter: '*',           // *斜体*
  strongDelimiter: '**',      // **粗体**
  hr: '---',                  // 分割线
})

/** 处理富文本编辑器内容更新 */
const handleEditorUpdate = (content: EditorContent) => {
  formData.content = JSON.stringify(content.json)
  formData.contentHtml = content.html
  // 保存富文本编辑器的内容
  richEditorContent.value = formData.content
  richEditorContentHtml.value = formData.contentHtml
  
  isContentChanged.value = true
  emit('contentChange', true)
}

/** 处理 Markdown 编辑器内容更新 */
const handleMarkdownUpdate = (content: EditorContent & { markdown: string }) => {
  // 更新 formData（Markdown 渲染后的内容）
  formData.content = JSON.stringify(content.json)
  formData.contentHtml = content.html
  markdownContent.value = content.markdown
  
  // 同步更新备份的富文本内容（用于切换回富文本时显示）
  richEditorContent.value = formData.content
  richEditorContentHtml.value = formData.contentHtml
  
  isContentChanged.value = true
  emit('contentChange', true)
}

/** 切换编辑模式 */
const handleModeChange = (mode: EditorMode) => {
  // 编辑时禁止切换模式(已通过 canSwitchMode 控制)
  if (!canSwitchMode.value) {
    return
  }
  
  // 如果模式没有变化,直接返回
  if (editorMode.value === mode) {
    return
  }
  
  // 只在新增模式下才需要处理模式切换
  // 从富文本切换到 Markdown 时,转换内容
  if (mode === 'markdown' && editorMode.value === 'rich') {
    // 保存当前富文本编辑器的内容
    richEditorContent.value = formData.content
    richEditorContentHtml.value = formData.contentHtml
    
    // 将富文本内容转换为 Markdown
    if (formData.contentHtml) {
      try {
        markdownContent.value = turndownService.turndown(formData.contentHtml)
      } catch (error) {
        console.error('HTML 转 Markdown 失败:', error)
        // 备用方案:提取纯文本,保留换行
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = formData.contentHtml
        tempDiv.querySelectorAll('br').forEach(br => {
          br.replaceWith(document.createTextNode('\n'))
        })
        tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach(el => {
          el.appendChild(document.createTextNode('\n'))
        })
        markdownContent.value = tempDiv.innerText || tempDiv.textContent || ''
      }
    }
  }
  
  // 从 Markdown 切换回富文本时,恢复原始内容
  if (mode === 'rich' && editorMode.value === 'markdown') {
    if (richEditorContent.value || richEditorContentHtml.value) {
      formData.content = richEditorContent.value
      formData.contentHtml = richEditorContentHtml.value
    }
  }
  
  editorMode.value = mode
}

/** 保存页面 */
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    
    // 根据编辑模式判断是否为空
    const isEmpty = editorMode.value === 'markdown' 
      ? markdownEditorRef.value?.isEmpty()
      : editorRef.value?.isEmpty()
      
    if (isEmpty) {
      message.warning('请输入页面内容')
      return
    }
    
    // 准备保存的数据
    const saveData = { ...formData }
    
    // 根据当前编辑模式设置 mode 字段
    if (editorMode.value === 'markdown') {
      saveData.mode = '1'  // Markdown 模式
      saveData.contentMarkdown = markdownContent.value
    } else {
      saveData.mode = '0'  // 富文本模式
      saveData.contentMarkdown = undefined
    }
    
    emit('save', saveData)
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
    formData.mode = '0'  // 默认富文本模式
    markdownContent.value = ''
    richEditorContent.value = ''
    richEditorContentHtml.value = ''
    // 新增时默认富文本模式
    editorMode.value = 'rich'
    // 新增时允许切换模式
    canSwitchMode.value = true
    
    // 主动清空编辑器内容
    nextTick(() => {
      editorRef.value?.clearContent()
      markdownEditorRef.value?.clearContent()
    })
  } else if (pageData.value) {
    
    formData.id = pageData.value.id
    formData.title = pageData.value.title
    formData.content = pageData.value.content
    formData.contentHtml = pageData.value.contentHtml
    formData.parentId = pageData.value.parentId
    formData.isPublic = pageData.value.isPublic
    formData.mode = pageData.value.mode
    
    // 保存富文本编辑器的原始内容
    richEditorContent.value = pageData.value.content
    richEditorContentHtml.value = pageData.value.contentHtml
    
    // 编辑时禁止切换模式
    canSwitchMode.value = false
    
    // 根据保存的 mode 字段决定编辑模式
    if (pageData.value.mode === '1') {
      // Markdown 模式
      if (pageData.value.contentMarkdown) {
        markdownContent.value = pageData.value.contentMarkdown
      }
      editorMode.value = 'markdown'
    } else {
      // 富文本模式（mode === '0' 或 undefined）
      markdownContent.value = ''
      editorMode.value = 'rich'
    }
  }
  
  isContentChanged.value = false
  emit('contentChange', false)
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
          style="margin-bottom: 0; margin-left: auto;"
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
        <div class="wiki-form">
          <a-form
            ref="formRef"
            :model="formData"
            layout="vertical"
            :wrapper-col="{ span: 24 }"
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
            <a-form-item name="content">
              <template #label>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span>页面内容</span>
                  <!-- 只在新增模式下显示切换控件 -->
                  <a-segmented
                    v-if="canSwitchMode"
                    :value="editorMode"
                    :options="[
                      { label: '🎨 富文本编辑', value: 'rich' },
                      { label: '📝 Markdown 双栏', value: 'markdown' }
                    ]"
                    size="small"
                    @change="(value) => handleModeChange(value as EditorMode)"
                  />
                </div>
              </template>
              <!-- Markdown 双栏编辑器 -->
              <wiki-markdown-editor
                v-if="editorMode === 'markdown'"
                ref="markdownEditorRef"
                :markdown="markdownContent"
                :readonly="false"
                @update="handleMarkdownUpdate"
              />
              <!-- 富文本编辑器 -->
              <tiptap-editor
                v-else
                ref="editorRef"
                :content="formData.content"
                :content-html="formData.contentHtml"
                :placeholder="'开始编写Wiki内容...'"
                @update="handleEditorUpdate"
              />
            </a-form-item>
          </a-form>
        </div>
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
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }

  &-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
}

.wiki-view-content {
  width: 100%;
  max-width: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
  overflow-y: auto;
  height: 100%;

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
  padding: 16px 20px 0 20px;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;

  // ant-form 本身也要支持 flex 布局
  :deep(.ant-form) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  // 标题表单项固定高度
  :deep(.ant-form-item) {
    flex-shrink: 0;
    margin-bottom: 16px;
  }

  // 内容表单项占据剩余空间
  :deep(.ant-form-item:has(.tiptap-editor-container)),
  :deep(.ant-form-item:has(.wiki-markdown-editor)) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-bottom: 0;
    min-height: 0;

    // 🔧 强制 label 不占用额外高度(在 vertical 布局下)
    > .ant-row {
      flex-direction: column !important;
    }

    // 关键:修复 ant-row 的高度问题
    .ant-row,
    .ant-form-item-row {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      
      // 🔧 强制所有列占满宽度(移除 flex:1,避免垂直方向被挤压)
      > .ant-col {
        max-width: 100% !important;
      }
    }

    // 标签列 - 固定高度
    .ant-col.ant-form-item-label {
      flex-shrink: 0;
      max-width: 100% !important; // 🔧 label 也要占满宽度
    }

    // 控制列 - 占据剩余空间
    .ant-col.ant-form-item-control {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .ant-form-item-label {
      flex-shrink: 0;
    }

    .ant-form-item-control {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .ant-form-item-control-input {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .ant-form-item-control-input-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100% !important;        // 🔧 强制宽度100%
      max-width: 100% !important;    // 🔧 强制最大宽度100%
      
      // 🔧 编辑器容器也要100%宽度
      > .tiptap-editor-container,
      > .wiki-markdown-editor {
        width: 100% !important;
        max-width: 100% !important;
      }
    }
  }
}
</style>
