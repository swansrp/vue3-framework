/**
 * Tiptap 富文本内容导出为 PDF
 * 复用 @/utils/pdf-generator 的 generatePdfBlob 引擎，支持完整分页逻辑
 */

import { common, createLowlight } from 'lowlight'

import { generatePdfBlob } from '@/utils/pdf-generator'

/** 导出配置 */
export interface ExportPdfOptions {
  /** 文件名（不含扩展名），默认 'document' */
  fileName?: string
  /** 纸张格式，默认 'a4' */
  format?: 'a4' | 'letter'
  /** 方向，默认 'portrait' */
  orientation?: 'portrait' | 'landscape'
  /** 页边距(mm)，默认 10 */
  margin?: number
}

/**
 * 富文本内容在 PDF 中需要的样式常量
 * 供组件导出、HR 业务 PDF 等场景共用
 *
 * 包含：标题、段落、列表、引用、表格、图片、代码块、hljs 语法高亮、分栏
 */
export const RICH_TEXT_PDF_STYLES = `
  /* 标题 */
  h1 { font-size: 24px; font-weight: bold; margin: 16px 0 12px; color: #262626; }
  h2 { font-size: 20px; font-weight: bold; margin: 14px 0 10px; color: #262626; }
  h3 { font-size: 16px; font-weight: bold; margin: 12px 0 8px; color: #262626; }
  h4 { font-size: 14px; font-weight: bold; margin: 10px 0 6px; color: #262626; }
  h5 { font-size: 13px; font-weight: bold; margin: 8px 0 4px; }
  h6 { font-size: 12px; font-weight: bold; margin: 8px 0 4px; }

  /* 段落 */
  p { margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; line-height: 1.75; }
  p:last-child { margin-bottom: 0; }

  /* 列表 */
  ul, ol { padding-left: 24px; margin-bottom: 8px; }
  li { margin-bottom: 4px; }

  /* 引用 */
  blockquote {
    border-left: 4px solid #1890ff;
    margin: 12px 0;
    padding: 12px 16px;
    color: #666;
    background: #f0f5ff;
    border-radius: 0 4px 4px 0;
  }
  blockquote p { color: inherit; margin: 0.3em 0; }

  /* 链接 */
  a { color: #1890ff; text-decoration: underline; }

  /* 表格 */
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 600; }

  /* 图片 */
  img { max-width: 100%; height: auto; }

  /* 代码块 */
  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }
  pre code { color: inherit; background: none; }

  /* 行内代码 */
  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
    color: #d63384;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  /* 分割线 */
  hr { border: none; border-top: 1px solid #e8e8e8; margin: 16px 0; }

  /* hljs 语法高亮（与 design-tokens.css 中 --hljs-* 变量同值） */
  .hljs-comment, .hljs-quote { color: #6a9955; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-section { color: #569cd6; }
  .hljs-string, .hljs-addition, .hljs-template-tag, .hljs-template-variable { color: #ce9178; }
  .hljs-number, .hljs-literal, .hljs-symbol, .hljs-bullet { color: #b5cea8; }
  .hljs-built_in, .hljs-type, .hljs-class { color: #4ec9b0; }
  .hljs-function, .hljs-title { color: #dcdcaa; }
  .hljs-params, .hljs-attr, .hljs-variable, .hljs-attribute, .hljs-property { color: #9cdcfe; }
  .hljs-selector-class, .hljs-selector-id { color: #d7ba7d; }
  .hljs-meta, .hljs-tag, .hljs-name { color: #569cd6; }
  .hljs-regexp { color: #d16969; }
  .hljs-deletion { color: #ce9178; background: rgba(255,0,0,0.1); }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: bold; }

  /* 分栏 */
  .column-block {
    width: 100%;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 12px;
    margin: 8px 0;
    white-space: normal;
  }
  .column {
    overflow: hidden;
    min-width: 0;
    padding: 12px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #fafafa;
    white-space: normal;
  }
`

/**
 * 为 CSS 样式字符串的所有选择器添加命名空间前缀
 * 用于将通用富文本样式限定到指定容器（如 .form-content）下
 *
 * @param styles CSS 字符串（如 RICH_TEXT_PDF_STYLES）
 * @param prefix 选择器前缀（如 '.form-content'）
 * @returns 添加前缀后的 CSS 字符串
 */
export function prefixStyles(styles: string, prefix: string): string {
  // 移除注释块 /* ... */
  const cleaned = styles.replace(/\/\*[\s\S]*?\*\//g, '')
  // 按规则块拆分：selector { ... }
  return cleaned
    .split('}')
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      const braceIdx = trimmed.indexOf('{')
      if (braceIdx === -1) return ''
      const selectors = trimmed.slice(0, braceIdx).trim()
      const declarations = trimmed.slice(braceIdx + 1).trim()
      if (!selectors || !declarations) return ''
      // 多选择器分别加前缀（如 h1, h2 → .prefix h1, .prefix h2）
      const prefixed = selectors
        .split(',')
        .map(s => `${prefix} ${s.trim()}`)
        .join(', ')
      return `${prefixed} { ${declarations} }`
    })
    .filter(Boolean)
    .join('\n  ')
}

// ================== 代码块服务端高亮 ==================

const lowlight = createLowlight(common)

/** 将 lowlight HAST 树转换为 HTML 字符串 */
const hastToHtml = (node: any): string => {
  if (node.type === 'text') {
    return node.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
  if (node.type === 'element') {
    const cls = node.properties?.className
    const classAttr = cls && cls.length ? ` class="${cls.join(' ')}"` : ''
    const children = (node.children || []).map(hastToHtml).join('')
    return `<${node.tagName}${classAttr}>${children}</${node.tagName}>`
  }
  if (node.type === 'root') {
    return (node.children || []).map(hastToHtml).join('')
  }
  return ''
}

/**
 * 对 HTML 内容中的 <pre><code> 代码块进行服务端语法高亮
 * Tiptap 存储的 HTML 不含 hljs span（仅运行时 decoration），
 * 导出 PDF 前需用 lowlight 重新生成高亮 span。
 */
export function highlightCodeBlocks(html: string): string {
  const codeBlockRegex = /<pre[^>]*>\s*<code(?:\s+class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi
  return html.replace(codeBlockRegex, (match, lang, codeText) => {
    const plainText = codeText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    try {
      const language = lang && lowlight.listLanguages().includes(lang) ? lang : null
      const tree = language
        ? lowlight.highlight(language, plainText)
        : lowlight.highlightAuto(plainText)
      const highlighted = hastToHtml(tree)
      const preMatch = match.match(/<pre([^>]*)>/)
      const codeMatch = match.match(/<code([^>]*)>/)
      const preAttrs = preMatch?.[1] || ''
      const codeAttrs = codeMatch?.[1] || ''
      return `<pre${preAttrs}><code${codeAttrs}>${highlighted}</code></pre>`
    } catch {
      return match
    }
  })
}

/**
 * 将富文本 HTML 内容导出为 PDF 文件并触发下载
 *
 * 使用 generatePdfBlob 引擎，支持：
 * - 自动 A4 分页
 * - 内容块溢出检测
 * - 高保真 html2canvas 渲染
 *
 * @param html 编辑器产出的 HTML 字符串
 * @param options 导出配置
 * @returns 成功返回 true，失败返回 false
 */
export async function exportTiptapToPdf(
  html: string,
  options?: ExportPdfOptions
): Promise<boolean> {
  const {
    fileName = 'document',
    format = 'a4',
    orientation = 'portrait',
    margin = 10,
  } = options || {}

  if (!html || !html.trim()) {
    console.warn('[exportTiptapToPdf] 内容为空，跳过导出')
    return false
  }

  // 对代码块进行服务端语法高亮（Tiptap 存储的 HTML 不含 hljs span）
  const highlightedHtml = highlightCodeBlocks(html)

  try {
    const blob = await generatePdfBlob([highlightedHtml], {
      format,
      orientation,
      margin,
      extraStyles: RICH_TEXT_PDF_STYLES,
      baseFontSize: '14px',
      baseLineHeight: '1.75',
    })

    if (!blob) {
      return false
    }

    // 触发下载
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error('[exportTiptapToPdf] 导出失败:', error)
    return false
  }
}
