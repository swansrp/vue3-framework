<script setup lang="ts">
/**
 * Wiki Markdown 双栏编辑器
 * 左侧：Markdown 源码编辑
 * 右侧：Tiptap 实时预览
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { debounce } from 'lodash'
import MarkdownIt from 'markdown-it'

import { getExtensions } from '@/framework/components/common/tiptap-editor/extensions'
import type { EditorContent as EditorContentType } from '@/framework/components/common/tiptap-editor/types'

const props = withDefaults(
  defineProps<{
    /** Markdown 内容 */
    markdown?: string
    /** 是否只读 */
    readonly?: boolean
    /** 最小高度 */
    minHeight?: string
  }>(),
  {
    markdown: '',
    readonly: false,
    minHeight: '500px'
  }
)

const emit = defineEmits<{
  /** 内容更新 */
  (e: 'update', data: EditorContentType & { markdown: string }): void
}>()

const { markdown, readonly } = toRefs(props)

// 左侧 Markdown 输入框内容
const markdownContent = ref('')
// 是否正在从右侧编辑器同步
const isSyncingFromEditor = ref(false)
// 是否正在从 Markdown 同步
const isSyncingFromMarkdown = ref(false)

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true, // 允许HTML标签
  linkify: true, // 自动转换URL为链接
  breaks: true, // 转换换行符为<br>
  typographer: true, // 启用排版优化
})

// 初始化右侧预览编辑器
const previewEditor = useEditor({
  content: '',
  extensions: getExtensions('右侧预览区域...'),
  editable: !readonly.value,
  autofocus: false,
  onUpdate: debounce(({ editor: ed }) => {
    if (isSyncingFromMarkdown.value) return
    
    // 从右侧编辑器更新时，尝试转换回 Markdown（可选功能）
    // 这里暂时不做双向同步，避免复杂度，只做单向：Markdown -> Preview
    const content = {
      json: ed.getJSON(),
      html: ed.getHTML(),
      text: ed.getText(),
      markdown: markdownContent.value
    }
    emit('update', content)
  }, 300),
})

/**
 * Markdown 转 HTML，并更新右侧预览
 */
const updatePreview = debounce(() => {
  if (!previewEditor.value || isSyncingFromEditor.value) return
  
  try {
    isSyncingFromMarkdown.value = true
    const html = md.render(markdownContent.value)
    
    // 关键：使用 emitUpdate: false 避免触发 onUpdate，防止循环更新
    previewEditor.value.commands.setContent(html, false)
    
    // 触发外部更新
    emit('update', {
      json: previewEditor.value.getJSON(),
      html: previewEditor.value.getHTML(),
      text: previewEditor.value.getText(),
      markdown: markdownContent.value
    })
  } catch (error) {
    console.error('Markdown 解析失败:', error)
  } finally {
    // 延迟重置标记，避免立即触发
    setTimeout(() => {
      isSyncingFromMarkdown.value = false
    }, 50)
  }
}, 300)

/**
 * 处理 Markdown 输入
 */
const handleMarkdownInput = () => {
  updatePreview()
}

/**
 * 初始化内容
 */
const initContent = () => {
  markdownContent.value = markdown.value || ''
  updatePreview()
}

// 监听外部 markdown 变化
watch(
  () => markdown.value,
  (newMarkdown) => {
    if (newMarkdown !== markdownContent.value) {
      markdownContent.value = newMarkdown || ''
      updatePreview()
    }
  }
)

// 监听只读状态
watch(
  () => readonly.value,
  (isReadonly) => {
    previewEditor.value?.setEditable(!isReadonly)
  }
)

// 暴露方法
defineExpose({
  /** 获取 Markdown 内容 */
  getMarkdown: () => markdownContent.value,
  /** 获取 HTML 内容 */
  getHTML: () => previewEditor.value?.getHTML() || '',
  /** 获取 JSON 内容 */
  getJSON: () => previewEditor.value?.getJSON(),
  /** 设置 Markdown 内容 */
  setMarkdown: (md: string) => {
    markdownContent.value = md
    updatePreview()
  },
  /** 清空内容 */
  clearContent: () => {
    markdownContent.value = ''
    previewEditor.value?.commands.clearContent()
  },
  /** 判断是否为空 */
  isEmpty: () => !markdownContent.value.trim(),
})

onMounted(() => {
  initContent()
})

onBeforeUnmount(() => {
  previewEditor.value?.destroy()
})
</script>

<template>
  <div class="wiki-markdown-editor">
    <!-- 左侧 Markdown 编辑区 -->
    <div class="markdown-input-panel">
      <div class="panel-header">
        <span class="panel-title">📝 Markdown 编辑</span>
        <a-tag color="blue">
          源码模式
        </a-tag>
      </div>
      <div class="panel-content">
        <a-textarea
          v-model:value="markdownContent"
          :readonly="readonly"
          :auto-size="{ minRows: 20, maxRows: 50 }"
          placeholder="# 开始编写 Markdown 文档

## 支持的语法

- **粗体** 和 *斜体*
- [链接](https://example.com)
- 代码块
- 表格
- 任务列表

```javascript
console.log('Hello Wiki!')
```

> 引用块

---

| 列1 | 列2 |
|-----|-----|
| 内容 | 内容 |
"
          class="markdown-textarea"
          @input="handleMarkdownInput"
        />
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="panel-divider"></div>

    <!-- 右侧 Tiptap 预览区 -->
    <div class="markdown-preview-panel">
      <div class="panel-header">
        <span class="panel-title">👁️ 实时预览</span>
        <a-tag color="green">
          渲染结果
        </a-tag>
      </div>
      <div class="panel-content">
        <editor-content
          :editor="previewEditor"
          class="preview-editor"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.wiki-markdown-editor {
  display: flex;
  height: 100%;
  gap: 0;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;

  .markdown-input-panel,
  .markdown-preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .panel-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
    
    .panel-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .panel-divider {
    width: 1px;
    background: #e8e8e8;
    flex-shrink: 0;
  }

  // 左侧 Markdown 输入框
  .markdown-textarea {
    width: 100%;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    border: none;
    resize: none;
    
    &:focus {
      box-shadow: none;
    }

    :deep(textarea) {
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
  }

  // 右侧预览编辑器
  .preview-editor {
    min-height: 100%;

    :deep(.ProseMirror) {
      outline: none;
      min-height: 100%;
      padding: 0;

      // 标题样式
      h1 {
        font-size: 2em;
        font-weight: 600;
        margin: 1em 0 0.5em;
        padding-bottom: 0.3em;
        border-bottom: 1px solid #e8e8e8;
      }

      h2 {
        font-size: 1.5em;
        font-weight: 600;
        margin: 0.8em 0 0.4em;
        padding-bottom: 0.3em;
        border-bottom: 1px solid #f0f0f0;
      }

      h3 {
        font-size: 1.25em;
        font-weight: 600;
        margin: 0.6em 0 0.3em;
      }

      h4, h5, h6 {
        font-weight: 600;
        margin: 0.5em 0 0.25em;
      }

      // 段落
      p {
        margin: 0.5em 0;
        line-height: 1.75;
      }

      // 链接
      a {
        color: #1890ff;
        text-decoration: none;
        cursor: pointer;
        
        &:hover {
          text-decoration: underline;
        }
      }

      // 代码块
      pre {
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
        padding: 16px;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1em 0;

        code {
          color: inherit;
          background: none;
          font-size: 14px;
          line-height: 1.6;
        }
      }

      // 行内代码
      code {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.9em;
        color: #d63384;
      }

      // 引用
      blockquote {
        border-left: 4px solid #1890ff;
        padding-left: 16px;
        margin: 1em 0;
        color: #666;
        background: #f9f9f9;
        padding: 12px 16px;
        border-radius: 0 4px 4px 0;
      }

      // 列表
      ul, ol {
        padding-left: 24px;
        margin: 0.5em 0;

        li {
          margin: 4px 0;
        }
      }

      // 任务列表
      ul[data-type='taskList'] {
        list-style: none;
        padding: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 4px 0;

          > label {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            height: 1.75em;

            input[type='checkbox'] {
              margin: 0;
              cursor: pointer;
            }
          }

          > div {
            flex: 1;
            min-width: 0;
          }
        }
      }

      // 表格
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
        table-layout: auto;
        overflow: hidden;

        th, td {
          border: 1px solid #d9d9d9;
          padding: 8px 12px;
          text-align: left;
        }

        th {
          background: #fafafa;
          font-weight: 600;
        }

        tr:hover {
          background: #f5f5f5;
        }
      }

      // 图片
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 1em 0;
      }

      // 分割线
      hr {
        border: none;
        border-top: 2px solid #e8e8e8;
        margin: 1.5em 0;
      }

      // 高亮
      mark {
        background: #fff3cd;
        padding: 2px 4px;
        border-radius: 2px;
      }
    }
  }
}
</style>
