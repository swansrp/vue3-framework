/**
 * PDF 生成工具
 * 通用 PDF 渲染引擎:将内容块按 A4 页面逐页渲染,支持可拆分块跨页断
 *
 * 使用示例:
 * ```ts
 * import { generatePdfBlob, formatContent, extractParas, extractHtmlBlocks, createSplittableBlock } from '@/framework/utils/pdf-generator'
 *
 * const blocks: (string | SplittableBlock)[] = [
 *   `<h1>标题</h1>`,
 *   createSplittableBlock(
 *     `<div class="card">...<div class="content">`,
 *     extractHtmlBlocks(richTextHtml),
 *     `</div></div>`
 *   )
 * ]
 * const blob = await generatePdfBlob(blocks)
 * ```
 */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ==================== 类型定义 ====================

/** 可拆分跨页的块(如form-item,卡片内容等) */
export interface SplittableBlock {
  /** 块开头HTML(标签、标题、备注等,在本页且不拆分) */
  head: string
  /** 可独立分拆的段落列表,每个元素是完整的HTML片段(如 <p>...</p>) */
  paras: string[]
  /** 块结尾HTML(闭合标签) */
  tail: string
}

/** 内容块:字符串 = 不可拆分原子块 | SplittableBlock = 在页面溢出时可拆分 */
export type ContentBlock = string | SplittableBlock

/** PDF 生成配置 */
export interface PdfGenerateConfig {
  /** 纸张格式,默认 'a4' */
  format?: 'a4' | 'letter'
  /** 方向,默认 'portrait' */
  orientation?: 'portrait' | 'landscape'
  /** 页边距(mm),默认 10 */
  margin?: number
  /** HTML 渲染总宽度(px),默认 800 */
  htmlContentWidth?: number
  /** 内边距(px),默认 20 */
  htmlContentPadding?: number
  /** html2canvas 缩放倍率,默认 2 */
  renderScale?: number
  /** 背景色,默认 '#ffffff' */
  backgroundColor?: string
  /** 额外 CSS 样式(<style>标签内容,注入每一页) */
  extraStyles?: string
  /** 基础字体系列,默认 'Microsoft YaHei','SimHei',sans-serif */
  baseFontFamily?: string
  /** 基础字号,默认 '12px' */
  baseFontSize?: string
  /** 基础行高,默认 '1.8' */
  baseLineHeight?: string
  /** 基础文字颜色,默认 '#333' */
  baseColor?: string
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: Required<PdfGenerateConfig> = {
  format: 'a4',
  orientation: 'portrait',
  margin: 10,
  htmlContentWidth: 800,
  htmlContentPadding: 20,
  renderScale: 2,
  backgroundColor: '#ffffff',
  extraStyles: '',
  baseFontFamily: "'Microsoft YaHei','SimHei',sans-serif",
  baseFontSize: '12px',
  baseLineHeight: '1.8',
  baseColor: '#333'
}

// ==================== 格式化工具 ====================

/**
 * 将内容中的换行符统一转换为 <p> 段落标签
 * 支持 <br>、\n、\r\n 等换行格式
 */
export function formatContent(content: string): string {
  if (!content) return '<span style="color: #999; font-style: italic;">暂无内容</span>'
  const normalized = content.replace(/<br\s*\/?>/gi, '\n')
  const paragraphs = normalized.split(/\n/)
  return paragraphs.map(p => {
    const trimmed = p.trim()
    return `<p>${trimmed || '&nbsp;'}</p>`
  }).join('')
}

/**
 * 从 formatContent 产出的 HTML 中提取所有 <p> 段落
 */
export function extractParas(htmlContent: string): string[] {
  const paras: string[] = []
  const regex = /<p>.*?<\/p>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(htmlContent)) !== null) {
    paras.push(match[0])
  }
  return paras
}

// ==================== 富文本 HTML 拆分 ====================

/**
 * 从 HTML 字符串开头提取一个完整的配对标签（处理同名嵌套）
 * @param html 源字符串（必须以 `<tagName` 开头）
 * @param tagName 标签名（如 'div', 'ul', 'table'）
 * @returns 完整的 `<tag...>...content...</tag>` 字符串，失败返回 null
 */
function extractFullTag(html: string, tagName: string): string | null {
  const openRegex = new RegExp(`<\\s*${tagName}(?:\\s[^>]*)?\\s*>`, 'i')
  const closeRegex = new RegExp(`<\\/\\s*${tagName}\\s*>`, 'i')

  const openMatch = html.match(openRegex)
  if (!openMatch || openMatch.index !== 0) return null

  let depth = 0
  let pos = 0

  while (pos < html.length) {
    const openIdx = html.slice(pos).search(openRegex)
    const closeIdx = html.slice(pos).search(closeRegex)
    if (openIdx === -1 && closeIdx === -1) break

    const adjustedOpen = openIdx === -1 ? Infinity : openIdx + pos
    const adjustedClose = closeIdx === -1 ? Infinity : closeIdx + pos

    if (adjustedOpen < adjustedClose) {
      depth++
      pos = adjustedOpen + html.slice(adjustedOpen).match(openRegex)![0].length
    } else {
      depth--
      const closeTagMatch = html.slice(adjustedClose).match(closeRegex)!
      pos = adjustedClose + closeTagMatch[0].length
      if (depth === 0) return html.slice(0, pos)
    }
  }
  return null
}

/**
 * 将富文本 HTML 按顶级块级元素拆分为数组
 *
 * 用于将一整段富文本 HTML 转为 SplittableBlock 的 paras，使 PDF 引擎
 * 可以逐段检测溢出并自动分页，避免超高块被 overflow:hidden 裁剪。
 *
 * 拆分规则:
 * - <p>, <h1>-<h6>, <blockquote>, <pre>, <ul>, <ol>, <hr>, <img> 等顶级块级元素单独成项
 * - <table> 整体不拆分（单独成项）
 * - <div class="column-block"> 分栏整体不拆分
 * - 裸文本 / 内联元素自动包装为 <p>
 */
export function extractHtmlBlocks(html: string): string[] {
  if (!html || !html.trim()) return []

  const blocks: string[] = []
  const selfClosingTags = new Set(['hr', 'img', 'br'])
  const anyBlockRegex = /<\s*(table|pre|blockquote|ul|ol|h[1-6]|hr|img|p|div)\b/i

  let remaining = html.trim()

  while (remaining.length > 0) {
    remaining = remaining.replace(/^\s+/, '')
    if (!remaining) break

    const headMatch = remaining.match(new RegExp(`^${anyBlockRegex.source}`))
    if (!headMatch) {
      // 非块级元素开头 → 裸文本或内联，收集到下一个块级元素
      const nextIdx = remaining.search(anyBlockRegex)
      if (nextIdx > 0) {
        const text = remaining.slice(0, nextIdx).trim()
        if (text) blocks.push(`<p>${text}</p>`)
        remaining = remaining.slice(nextIdx)
      } else {
        const text = remaining.trim()
        if (text) blocks.push(`<p>${text}</p>`)
        break
      }
      continue
    }

    const tagName = headMatch[1].toLowerCase()

    // div 特殊处理：只拆分 column-block，其他 div 跳过开标签继续
    if (tagName === 'div') {
      if (/class\s*=\s*["'][^"']*column-block[^"']*["']/i.test(remaining.slice(0, 200))) {
        const fullBlock = extractFullTag(remaining, 'div')
        if (fullBlock) {
          blocks.push(fullBlock)
          remaining = remaining.slice(fullBlock.length)
          continue
        }
      }
      const tagEnd = remaining.indexOf('>')
      if (tagEnd !== -1) {
        remaining = remaining.slice(tagEnd + 1)
        continue
      }
      break
    }

    // 自闭合标签
    if (selfClosingTags.has(tagName)) {
      const selfCloseMatch = remaining.match(new RegExp(`<\\s*${tagName}\\b[^>]*\\/?\\s*>`, 'i'))
      if (selfCloseMatch) {
        blocks.push(selfCloseMatch[0])
        remaining = remaining.slice(selfCloseMatch.index! + selfCloseMatch[0].length)
        continue
      }
    }

    // 配对标签
    const fullBlock = extractFullTag(remaining, tagName)
    if (fullBlock) {
      blocks.push(fullBlock)
      remaining = remaining.slice(fullBlock.length)
    } else {
      // 提取失败，跳过当前开标签
      const tagEnd = remaining.indexOf('>')
      if (tagEnd !== -1) remaining = remaining.slice(tagEnd + 1)
      else break
    }
  }

  return blocks.length > 0 ? blocks : [html]
}

// ==================== 块构造 ====================

/**
 * 创建可拆分块
 * @param head 块开头(head + label + note + content容器开头)
 * @param paras 段落数组
 * @param tail 块结尾(闭合标签)
 */
export function createSplittableBlock(
  head: string,
  paras: string[],
  tail: string
): SplittableBlock {
  return { head, paras, tail }
}

// ==================== 计算 ====================

/** A4/Letter 纸张标准尺寸(mm) */
const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4]
}

/** 取页面宽高(mm),根据配置的方向 */
function getPageDimensions(
  format: string,
  orientation: string
): [number, number] {
  const [w, h] = PAGE_SIZES[format] || PAGE_SIZES.a4
  return orientation === 'landscape' ? [h, w] : [w, h]
}

// ==================== 核心渲染引擎 ====================

/**
 * 生成 PDF Blob
 *
 * @param blocks 内容块数组: string(不可拆分) | SplittableBlock(可拆分跨页)
 * @param config 配置
 * @returns PDF Blob,失败返回 null
 *
 * 渲染策略:
 * 1. 建立固定A4尺寸的离屏容器
 * 2. 逐块追加到容器,通过 scrollHeight 检测是否溢出页面
 * 3. 简单块溢出 → 整块移到下页
 * 4. 可拆分块溢出 → 按 paras 逐一检测,能放多少放多少,
 *    当前页放入含已放段落的完整块(带 tail),下页从续篇开始
 * 5. 空页保护时,原子块超高会自动用 extractHtmlBlocks 尝试拆分
 * 6. SplittableBlock 续篇在新页面仍溢出时会继续递归拆分
 */
export async function generatePdfBlob(
  blocks: ContentBlock[],
  config?: PdfGenerateConfig
): Promise<Blob | null> {
  try {
    const cfg = { ...DEFAULT_CONFIG, ...config } as Required<PdfGenerateConfig>

    // ---- 尺寸计算 ----
    const [pageWidth, pageHeight] = getPageDimensions(cfg.format, cfg.orientation)
    const margin = cfg.margin
    const imgWidth = pageWidth - margin * 2
    const contentAreaWidthPx = cfg.htmlContentWidth - cfg.htmlContentPadding * 2
    const pxPerMm = contentAreaWidthPx / imgWidth
    const pageContentHeightMm = pageHeight - margin * 2
    const pageContentPxHeight = Math.floor(pageContentHeightMm * pxPerMm)

    // ---- 样式 ----
    const baseCss = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: ${cfg.baseFontFamily};
        font-size: ${cfg.baseFontSize};
        line-height: ${cfg.baseLineHeight};
        color: ${cfg.baseColor};
      }
    `
    const styleHtml = cfg.extraStyles
      ? `<style>${baseCss}\n${cfg.extraStyles}</style>`
      : `<style>${baseCss}</style>`

    // ---- 离屏容器 ----
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;top:0;z-index:-1;'
    document.body.appendChild(container)

    const styleEl = document.createElement('style')
    styleEl.textContent = baseCss
    container.appendChild(styleEl)

    const outerEl = document.createElement('div')
    outerEl.style.cssText =
      `width:${cfg.htmlContentWidth}px;padding:${cfg.htmlContentPadding}px;background:#fff;box-sizing:border-box;`
    container.appendChild(outerEl)

    const pageDiv = document.createElement('div')
    pageDiv.style.width = contentAreaWidthPx + 'px'
    pageDiv.style.height = pageContentPxHeight + 'px'
    pageDiv.style.overflow = 'hidden'
    pageDiv.style.fontFamily = cfg.baseFontFamily
    pageDiv.style.fontSize = cfg.baseFontSize
    pageDiv.style.lineHeight = cfg.baseLineHeight
    pageDiv.style.color = cfg.baseColor
    outerEl.appendChild(pageDiv)

    // ---- jsPDF ----
    const pdf = new jsPDF({
      orientation: cfg.orientation as 'portrait' | 'landscape',
      unit: 'mm',
      format: cfg.format
    })

    // ---- 逐页渲染 ----
    const pageBlocks: string[] = []
    let pageNumber = 0
    let blockIdx = 0

    while (blockIdx < blocks.length) {
      pageDiv.innerHTML = ''
      pageBlocks.length = 0

      let canAddMore = true

      while (blockIdx < blocks.length && canAddMore) {
        const block = blocks[blockIdx]

        if (typeof block === 'string') {
          // 简单块:整体测试
          const testHtml = pageBlocks.concat(block).join('\n')
          pageDiv.innerHTML = testHtml + styleHtml

          if (pageDiv.scrollHeight > pageContentPxHeight) {
            canAddMore = false
            break
          }

          pageBlocks.push(block)
          blockIdx++
        } else {
          // 可拆分块:先尝试整体
          const fullHtml = block.head + block.paras.join('\n') + block.tail
          let testHtml = pageBlocks.concat(fullHtml).join('\n')
          pageDiv.innerHTML = testHtml + styleHtml

          if (pageDiv.scrollHeight <= pageContentPxHeight) {
            pageBlocks.push(fullHtml)
            blockIdx++
            continue
          }

          // 整体放不下 → 按 paras 逐段拆分
          const fittedParas: string[] = []

          for (const para of block.paras) {
            const partialHtml = block.head + fittedParas.concat(para).join('\n') + block.tail
            testHtml = pageBlocks.concat(partialHtml).join('\n')
            pageDiv.innerHTML = testHtml + styleHtml

            if (pageDiv.scrollHeight > pageContentPxHeight) {
              break
            }
            fittedParas.push(para)
          }

          if (fittedParas.length === 0) {
            // 连第一段都放不下 → 本页已满
            canAddMore = false
            break
          }

          // 当前页:放入含 fittedParas 的完整块
          pageBlocks.push(block.head + fittedParas.join('\n') + block.tail)

          // 续篇:剩余段落替换原块
          const remainingParas = block.paras.slice(fittedParas.length)
          blocks[blockIdx] = {
            head: block.head,
            paras: remainingParas,
            tail: block.tail
          }

          canAddMore = false
          break
        }
      }

      // 重置 DOM
      pageDiv.innerHTML = pageBlocks.join('\n') + styleHtml

      // 空页保护:强制放入一个块
      if (pageBlocks.length === 0 && blockIdx < blocks.length) {
        const block = blocks[blockIdx]
        if (typeof block === 'string') {
          // string 原子块:尝试用 extractHtmlBlocks 拆分，避免超高被裁剪
          const htmlBlocks = extractHtmlBlocks(block)
          if (htmlBlocks.length > 1) {
            // 拆分成功，替换为 SplittableBlock，让下一轮循环处理
            blocks[blockIdx] = { head: '', paras: htmlBlocks, tail: '' }
            continue // 不渲染当前空页，直接进入下一轮
          }
          // 无法拆分，强制放入
          pageBlocks.push(block)
          pageDiv.innerHTML = block + styleHtml
          blockIdx++
        } else {
          // SplittableBlock:尝试放入尽可能多的 paras
          const fitted: string[] = []
          for (const para of block.paras) {
            const testHtml = block.head + fitted.concat(para).join('\n') + block.tail
            pageDiv.innerHTML = testHtml + styleHtml
            if (pageDiv.scrollHeight > pageContentPxHeight && fitted.length > 0) break
            fitted.push(para)
          }
          if (fitted.length > 0) {
            pageBlocks.push(block.head + fitted.join('\n') + block.tail)
            pageDiv.innerHTML = pageBlocks.join('\n') + styleHtml
            // 续篇
            const remaining = block.paras.slice(fitted.length)
            if (remaining.length > 0) {
              blocks[blockIdx] = { head: block.head, paras: remaining, tail: block.tail }
            } else {
              blockIdx++
            }
          } else {
            // 连一段都放不下，强制放入全部
            const fullHtml = block.head + block.paras.join('\n') + block.tail
            pageBlocks.push(fullHtml)
            pageDiv.innerHTML = fullHtml + styleHtml
            blockIdx++
          }
        }
      }

      // 渲染当前页
      const canvas = await html2canvas(outerEl, {
        scale: cfg.renderScale,
        useCORS: true,
        logging: false,
        backgroundColor: cfg.backgroundColor
      })

      const canvasImgHeight = (canvas.height * imgWidth) / canvas.width

      if (pageNumber > 0) {
        pdf.addPage()
      }
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        margin, margin,
        imgWidth, canvasImgHeight
      )

      pageNumber++
    }

    // ---- 清理 ----
    document.body.removeChild(container)
    return pdf.output('blob')
  } catch (error) {
    console.error('PDF生成失败:', error)
    return null
  }
}
