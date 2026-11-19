/**
 * 框架侧 markdown 渲染统一管线（两栈单源，纯函数、无 Vue 依赖）。
 *
 * 装配（marked 全局单例）：
 * - 语气波浪号防误伤（2026-11-18 真机截图）：marked v17 的 GFM 删除线连<b>单个 ~</b> 都会
 *   成对吞段——模型爱用中文语气波浪号（「拿~齐~三份素材」），两颗之间整句被划成
 *   <code>&lt;del&gt;</code>。覆写 <code>del</code> 词法器只认双波浪 <code>~~…~~</code>：
 *   单 ~ 回落普通字符，代码段/命令里的 ~（如 <code>ls ~</code>）不受影响。
 * - 🔴 marked.use 对全局单例<b>逐层包</b>词法器，必须在模块级跑一次（守卫位防重复装配，
 *   装一次全应用共享同一份行为——各业务组件无须各自装配）。
 *
 * 管线（markdownOf 全链）：unescapeText → clampLongUrls → marked.parse → sanitizeAgentHtml，
 * 同文本结果进模块级缓存（多消费方共享，键＝原文）。
 * 消费方：AgentPane（正文/决策问题/结论卡）／AgentConclusionCard（结论正文）／
 * agentChat（结论正文，经组件）／epc AiChat（终局正文）——业务页只 import，不自持副本。
 */
import { marked } from 'marked'

// marked v17：gfm 已含 tables，独立 tables 键已移除（TypeScript 选项校验）
marked.setOptions({ breaks: true, gfm: true })

let configured = false

export function configureAgentMarkdown(): void {
  if (configured) {
    return
  }
  configured = true
  marked.use({
    tokenizer: {
      del(src: string) {
        // 只匹配 GFM 严格口径的双波浪；单 ~ 返回 undefined＝本次不成删除线，
        // 也不落回默认词法器（那会恢复单波浪吞段）
        const match = /^~~(?=\S)([\s\S]*?\S)~~/.exec(src)
        if (!match) {
          return undefined
        }
        return {
          type: 'del',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1]),
        }
      },
    },
  })
}

// 模块级自执行装配（幂等守卫）：import 本模块即得统一行为（del 词法器守卫＋breaks/gfm），
// 消费方无须（也不应）各自再装配
configureAgentMarkdown()

/** 剥离脚本载体：script/iframe 等标签、on* 事件属性、javascript: 链接（LLM 输出不可信） */
export const sanitizeAgentHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.body.querySelectorAll('script,style,iframe,object,embed,link,meta,base').forEach(el => el.remove())
  doc.body.querySelectorAll('*').forEach(el => {
    // getAttributeNames 返回 string[]（NamedNodeMap 不可直接迭代）
    for (const name of el.getAttributeNames()) {
      const lower = name.toLowerCase()
      if (lower.startsWith('on') || ((lower === 'href' || lower === 'src') && (el.getAttribute(name) || '').trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(name)
      }
    }
  })
  return doc.body.innerHTML
}

/** 渲染缓存（items 全量重算每轮轮询都会重渲染；同文本只 parse 一次；多消费方共享，键＝原文） */
const markdownCache = new Map<string, string>()

/**
 * 超长 URL 折叠：模型会把工具返回的预签名下载地址复述进正文，长串会把正文撑爆、还很丑。
 * 去掉包裹用的 markdown 链接括号后，长 URL 统一折成「下载链接见下载卡片」（下载按钮由产物卡提供）。
 */
export const clampLongUrls = (text: string): string =>
  text.replace(/\]\((https?:\/\/[^\s)<>）】]{80,})\)/g, ']()')
    .replace(/https?:\/\/[^\s)<>）】]{80,}/g, '〔下载链接见下方下载卡片〕')

/**
 * 字面转义还原：落库的 summary / 某些工具返回会把换行存成两个字符「\n」，
 * 直接进 markdown 会整段挤成一行还带 \n 字样（U73 截图）。渲染前还原成真换行。
 */
export const unescapeText = (text: string): string =>
  text.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '\t')

/**
 * 圈号分条兜底（2026-11-18）：存量结论摘要是收口排版纪律之前落的库，①②③ 全挤一段
 * （Redis 实查无换行）。渲染前在圈号前补换行——圈号在这类简报里就是条目标记，视觉分行、
 * 不改写落库内容；圈号前已是行首/换行时不重复插（免出空行）。新会话自带换行，本兜底无感。
 */
export const breakBeforeCircledItems = (text: string): string =>
  text.replace(/([^\n])([①-⑳])/g, '$1\n$2')

/** markdown 全链渲染（unescape → 折 URL → parse → 净化 → 缓存） */
export const markdownOf = (text: string): string => {
  if (!text) return ''
  const cached = markdownCache.get(text)
  if (cached !== undefined) return cached
  const html = sanitizeAgentHtml(marked.parse(clampLongUrls(unescapeText(text))) as string)
  if (markdownCache.size > 200) markdownCache.clear()
  markdownCache.set(text, html)
  return html
}
