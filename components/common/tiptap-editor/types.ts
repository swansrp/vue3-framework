/**
 * Tiptap编辑器类型定义
 */

/** 编辑器模式 */
export type EditorMode = 'edit' | 'view'

/** 工具栏按钮配置 */
export interface ToolbarButton {
  /** 按钮名称 */
  name: string
  /** 图标 */
  icon: string
  /** 提示文字 */
  title: string
  /** 是否激活 */
  isActive?: () => boolean
  /** 点击处理 */
  action: () => void
  /** 是否禁用 */
  disabled?: boolean
}

/** 工具栏分组 */
export interface ToolbarGroup {
  name: string
  buttons: ToolbarButton[]
}

/** 编辑器内容 */
export interface EditorContent {
  /** JSON格式内容 */
  json: object | null
  /** HTML格式内容 */
  html: string
  /** 纯文本内容 */
  text: string
}

/** 协作者信息 */
export interface Collaborator {
  userId: string
  userName: string
  color: string
  cursor?: { x: number; y: number }
}

/** 代码块语言选项 */
export interface CodeLanguageOption {
  label: string
  value: string
}

/** 支持的代码语言列表 */
export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { label: 'Plain Text', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Java', value: 'java' },
  { label: 'Python', value: 'python' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'shell' },
  { label: 'YAML', value: 'yaml' },
  { label: 'XML', value: 'xml' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Scala', value: 'scala' },
  { label: 'R', value: 'r' },
  { label: 'Lua', value: 'lua' },
  { label: 'Perl', value: 'perl' },
  { label: 'Docker', value: 'dockerfile' },
  { label: 'Nginx', value: 'nginx' },
  { label: 'GraphQL', value: 'graphql' },
]

/** 文本对齐选项 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/** 标题级别 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** 链接属性 */
export interface LinkAttributes {
  href: string
  target?: string
  rel?: string
}

/** 图片属性 */
export interface ImageAttributes {
  src: string
  alt?: string
  title?: string
  width?: string | number
  height?: string | number
}

/** 表格属性 */
export interface TableAttributes {
  rows: number
  cols: number
  withHeaderRow?: boolean
}
