<script setup lang="ts">
/**
 * Wiki编辑器组件
 * 功能：使用TinyMCE编辑Wiki页面内容
 */
import { EditOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import type { WikiFormData, WikiMode, WikiPage } from '../types'

import TinyMceEditor from '@/framework/components/common/tiny-mce/index.vue'

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
}>()

const { pageData, mode, parentId, saving } = toRefs(props)

// 表单数据
const formData = reactive<WikiFormData>({
  id: undefined,
  title: '',
  content: '',
  parentId: null
})

// 表单引用
const formRef = ref()

// 内容变更标记
const isContentChanged = ref(false)

/** 获取富文本内容 */
const handleGetContent = (html: string) => {
  formData.content = html
  isContentChanged.value = true
}

/** 保存页面 */
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    if (!formData.content || formData.content.trim() === '' || formData.content === '<p></p>') {
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

/** 初始化表单数据 */
const initFormData = () => {
  if (mode.value === 'add') {
    formData.id = undefined
    formData.title = ''
    formData.content = ''
    formData.parentId = parentId.value
  } else if (pageData.value) {
    formData.id = pageData.value.id
    formData.title = pageData.value.title
    formData.content = pageData.value.content
    formData.parentId = pageData.value.parentId
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
          type="primary"
          @click="handleEdit"
        >
          <template #icon>
            <edit-outlined />
          </template>
          编辑
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
            <span>创建时间：{{ pageData.createTime }}</span>
            <span>更新时间：{{ pageData.updateTime }}</span>
            <span>作者：{{ pageData.createBy }}</span>
          </div>
          <a-divider />
          <div
            class="wiki-body"
            v-html="pageData.content"
          ></div>
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
              :maxlength="100"
              show-count
            />
          </a-form-item>
          <a-form-item
            label="页面内容"
            name="content"
          >
            <tiny-mce-editor
              :value="formData.content"
              :plugins="'lists advlist table image'"
              :toolbar="'bold italic underline | formatselect | fontselect | fontsizeselect | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table code | undo redo | removeformat'"
              @get-content="handleGetContent"
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
