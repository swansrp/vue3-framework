/**
 * Tiptap编辑器扩展配置
 */
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import Gapcursor from '@tiptap/extension-gapcursor'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { ColumnsExtension } from '@tiptap-extend/columns'
import { common, createLowlight } from 'lowlight'

// 创建lowlight实例用于代码高亮
const lowlight = createLowlight(common)

/**
 * 获取编辑器扩展配置
 * @param placeholder 占位符文本
 */
export const getExtensions = (placeholder?: string) => [
  // 基础套件（已包含 Markdown 快捷输入支持）
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: false, // 使用CodeBlockLowlight替代
    gapcursor: false, // 使用独立的Gapcursor扩展
    // Markdown 快捷输入已默认启用：
    // # 标题1, ## 标题2
    // ** 粗体 **, * 斜体 *
    // - 无序列表, 1. 有序列表
    // ``` 代码块
    // > 引用
    // --- 分割线
  }),
  
  // Gap cursor - 改善光标导航（需要在表格之前加载）
  Gapcursor.configure({
    priority: 1000, // 提高优先级确保在表格之前加载
  }),
  
  // 代码块高亮
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
    HTMLAttributes: {
      class: 'tiptap-code-block',
    },
  }),
  
  // 占位符
  Placeholder.configure({
    placeholder: placeholder || '开始编写内容...',
    emptyEditorClass: 'is-editor-empty',
  }),
  
  // 文本样式
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Underline,
  Subscript,
  Superscript,
  
  // Typography - 支持 Markdown 语法转换
  Typography,
  
  // 文本对齐
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  
  // 链接
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'tiptap-link',
    },
  }),
  
  // 图片
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'tiptap-image',
    },
  }),
  
  // 表格
  Table.configure({
    resizable: true,
    lastColumnResizable: true, // 允许最后一列调整大小
    HTMLAttributes: {
      class: 'tiptap-table',
    },
    cellMinWidth: 50,
  }),
  TableRow,
  TableHeader,
  TableCell,
  
  // 任务列表
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  
  // 分栏
  ColumnsExtension,
]

/**
 * 获取只读模式扩展配置
 */
export const getViewerExtensions = () => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: false,
    gapcursor: false,
  }),
  Gapcursor.configure({
    priority: 1000,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Underline,
  Subscript,
  Superscript,
  Typography,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Link.configure({
    openOnClick: true,
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'tiptap-image',
    },
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  ColumnsExtension,
]
