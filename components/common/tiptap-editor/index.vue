<script setup lang="ts">
/**
 * Tiptap富文本编辑器主组件
 * 支持多人协作、代码高亮、Markdown等功能
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/vue-3'

import { getExtensions } from './extensions'
import TiptapToolbar from './TiptapToolbar.vue'
import type { EditorContent as EditorContentType } from './types'

const props = withDefaults(
  defineProps<{
    /** 初始内容(JSON格式) */
    content?: string | JSONContent
    /** 初始HTML内容 */
    contentHtml?: string
    /** 是否只读 */
    readonly?: boolean
    /** 占位符 */
    placeholder?: string
    /** 最小高度 */
    minHeight?: string
    /** 是否自动聚焦 */
    autofocus?: boolean
    /** 是否显示导出PDF按钮 */
    exportPdf?: boolean
    /** 导出PDF文件名（不含扩展名） */
    exportPdfFileName?: string
  }>(),
  {
    content: '',
    contentHtml: '',
    readonly: false,
    placeholder: '开始编写内容...',
    minHeight: '300px',
    autofocus: false,
    exportPdf: false,
    exportPdfFileName: 'document',
  }
)

const emit = defineEmits<{
  /** 内容更新 */
  (e: 'update', content: EditorContentType): void
  /** 编辑器就绪 */
  (e: 'ready', editor: ReturnType<typeof useEditor>): void
  /** 聚焦 */
  (e: 'focus'): void
  /** 失焦 */
  (e: 'blur'): void
}>()

const { content, contentHtml, readonly, placeholder } = toRefs(props)

// 解析内容
const parsedContent = computed(() => {
  if (!content.value && !contentHtml.value) return ''
  
  // 如果有 HTML 内容，优先使用
  if (contentHtml.value) return contentHtml.value
  
  // 如果 content 是字符串，尝试解析为 JSON
  if (typeof content.value === 'string' && content.value.trim()) {
    try {
      return JSON.parse(content.value)
    } catch (e) {
      // 如果解析失败，当作普通字符串
      return content.value
    }
  }
  
  return content.value
})

// 初始化编辑器
const editor = useEditor({
  content: parsedContent.value,
  extensions: getExtensions(placeholder.value),
  editable: !readonly.value,
  autofocus: false, // 关键：禁用自动聚焦，防止光标问题
  onUpdate: ({ editor: ed }) => {
    emit('update', {
      json: ed.getJSON(),
      html: ed.getHTML(),
      text: ed.getText(),
    })
  },
  onFocus: () => {
    emit('focus')
  },
  onBlur: () => {
    emit('blur')
  },
  onCreate: ({ editor: ed }) => {
    emit('ready', ed as any)
  },
})

// 监听内容变化
watch(
  () => parsedContent.value,
  (newContent) => {
    if (editor.value && newContent) {
      const currentJson = JSON.stringify(editor.value.getJSON())
      const newJson = typeof newContent === 'string' ? newContent : JSON.stringify(newContent)
      if (currentJson !== newJson) {
        // 保存当前光标位置
        const { from, to } = editor.value.state.selection
        
        // 关键：使用 emitUpdate: false 避免触发不必要的更新，防止光标跳转
        editor.value.commands.setContent(newContent, false)
        
        // 尝试恢复光标位置
        try {
          const docSize = editor.value.state.doc.content.size
          const safeFrom = Math.min(from, docSize)
          const safeTo = Math.min(to, docSize)
          if (safeFrom > 0 && safeFrom <= docSize) {
            editor.value.commands.setTextSelection({ from: safeFrom, to: safeTo })
          }
        } catch (e) {
          // 如果恢复失败，保持默认行为
          console.debug('Failed to restore selection:', e)
        }
      }
    }
  }
)

// 监听只读状态变化
watch(
  () => readonly.value,
  (isReadonly) => {
    editor.value?.setEditable(!isReadonly)
  }
)

// 暴露编辑器实例
defineExpose({
  editor,
  /** 获取JSON内容 */
  getJSON: () => editor.value?.getJSON(),
  /** 获取HTML内容 */
  getHTML: () => editor.value?.getHTML(),
  /** 获取纯文本 */
  getText: () => editor.value?.getText(),
  /** 设置内容 */
  setContent: (newContent: string | JSONContent) => {
    editor.value?.commands.setContent(newContent)
  },
  /** 清空内容 */
  clearContent: () => {
    editor.value?.commands.clearContent()
  },
  /** 聚焦 */
  focus: () => {
    editor.value?.commands.focus()
  },
  /** 判断是否为空 */
  isEmpty: () => editor.value?.isEmpty,
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="tiptap-editor-container">
    <!-- 工具栏 -->
    <tiptap-toolbar
      v-if="!readonly"
      :editor="editor"
      :export-pdf="exportPdf"
      :export-pdf-file-name="exportPdfFileName"
    />

    <!-- 编辑器内容 -->
    <div class="tiptap-editor-content">
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<style scoped lang="less">
.tiptap-editor-container {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;

  &:focus-within {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

.tiptap-editor-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  max-height: 100%;

  :deep(.ProseMirror) {
    outline: none;
    min-height: auto;

    &.is-editor-empty::before {
      content: attr(data-placeholder);
      float: left;
      color: #bfbfbf;
      pointer-events: none;
      height: 0;
    }

    // 标题样式
    h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1em 0 0.5em;
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.8em 0 0.4em;
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
      text-decoration: underline;
      cursor: pointer;
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

      // hljs 语法高亮样式已集中到 design-tokens.css 全局规则
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
      margin: 1em 0;
      padding: 12px 16px;
      color: #666;
      background: #f0f5ff;
      border-radius: 0 4px 4px 0;

      p {
        color: inherit;
        margin: 0.3em 0;
      }
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
          margin-top: 4px;

          input[type='checkbox'] {
            margin: 0;
            cursor: pointer;
            width: 16px;
            height: 16px;
          }
        }

        > div {
          flex: 1;
          min-width: 0;
          line-height: 1.75;

          p {
            margin: 0;
          }
        }
      }
    }

    // 表格
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      table-layout: fixed;
      overflow: hidden;

      th, td {
        border: 1px solid #d9d9d9;
        padding: 8px 12px;
        position: relative;
        vertical-align: top;
        min-width: 100px;
      }

      th {
        background: #fafafa;
        font-weight: 600;
      }

      .selectedCell::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: rgba(24, 144, 255, 0.1);
        pointer-events: none;
      }

      .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: 0;
        width: 4px;
        background: #1890ff;
        cursor: col-resize;
      }
    }

    // 图片
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;

      &.ProseMirror-selectednode {
        outline: 2px solid #1890ff;
      }
    }

    // 分割线
    hr {
      border: none;
      border-top: 2px solid #e8e8e8;
      margin: 1.5em 0;
    }

    // 高亮
    mark {
      padding: 2px 0;
    }

    // 分栏样式
    .column-block {
      width: 100%;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 16px;
      margin: 1em 0;
      padding: 8px 0;
      white-space: normal; // 重置 ProseMirror 的 pre-wrap，否则 grid 布局异常
    }

    .column {
      overflow: hidden;
      padding: 12px;
      margin: 0;
      min-width: 0;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      background: #fafafa;
      white-space: normal; // 同上

      &:hover {
        border-color: #1890ff;
        background: #f0f7ff;
      }
    }
  }
}
</style>
