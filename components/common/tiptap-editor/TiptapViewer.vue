<script setup lang="ts">
/**
 * Tiptap只读查看器组件
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/vue-3'

import { getViewerExtensions } from './extensions'

const props = withDefaults(
  defineProps<{
    /** 内容(JSON格式) */
    content?: string | JSONContent
    /** HTML内容 */
    contentHtml?: string
  }>(),
  {
    content: '',
    contentHtml: '',
  }
)

const { content, contentHtml } = toRefs(props)

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

// 初始化只读编辑器
const editor = useEditor({
  content: parsedContent.value,
  extensions: getViewerExtensions(),
  editable: false,
})

// 监听内容变化
watch(
  () => parsedContent.value,
  (newVal) => {
    if (editor.value && newVal) {
      editor.value.commands.setContent(newVal)
    }
  }
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="tiptap-viewer">
    <editor-content :editor="editor" />
  </div>
</template>

<style scoped lang="less">
.tiptap-viewer {
  :deep(.ProseMirror) {
    outline: none;

    // 标题样式
    h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1em 0 0.5em;
      color: #262626;
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 0.8em 0 0.4em;
      color: #262626;
    }

    h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 0.6em 0 0.3em;
      color: #262626;
    }

    h4, h5, h6 {
      font-weight: 600;
      margin: 0.5em 0 0.25em;
      color: #262626;
    }

    // 段落
    p {
      margin: 0.5em 0;
      line-height: 1.75;
      color: #595959;
    }

    // 链接
    a {
      color: #1890ff;
      text-decoration: underline;

      &:hover {
        color: #40a9ff;
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
        color: #595959;
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
            pointer-events: none;
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
      table-layout: fixed;

      th, td {
        border: 1px solid #d9d9d9;
        padding: 8px 12px;
        vertical-align: top;
      }

      th {
        background: #fafafa;
        font-weight: 600;
      }
    }

    // 图片
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
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
    }

    .column {
      overflow: hidden;
      min-width: 0;
      padding: 12px;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      background: #fafafa;
    }
  }
}
</style>
