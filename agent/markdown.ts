/**
 * 框架侧 markdown 渲染统一装配（marked 全局单例）。
 *
 * 语气波浪号防误伤（2026-11-18 真机截图）：marked v17 的 GFM 删除线连<b>单个 ~</b> 都会
 * 成对吞段——模型爱用中文语气波浪号（「拿~齐~三份素材」），两颗之间整句被划成
 * <code>&lt;del&gt;</code>。覆写 <code>del</code> 词法器只认双波浪 <code>~~…~~</code>：
 * 单 ~ 回落普通字符，代码段/命令里的 ~（如 <code>ls ~</code>）不受影响。
 *
 * 🔴 marked.use 对全局单例<b>逐层包</b>词法器，必须在模块级跑一次（守卫位防重复装配，
 * 装一次全应用共享同一份行为——各业务组件无须各自装配）。
 */
import { marked } from 'marked'

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
