/**
 * 流式对话的贴底跟随：只有用户自己停在底部时，流式增量才自动贴底；
 * 一旦上翻就解除跟随，直到他回到底部或主动动作（发消息/翻到最新页）。
 */
import { nextTick, ref } from 'vue'

/**
 * @param getEl      滚动容器取值（模板 ref 的 .value 随挂载变化，闭包现取）
 * @param stickPx    距底多少像素内算"停在底部"（留余量：行高/滚动条取整会让精确 0 永远差一两个像素）
 */
export function useStickScroll(getEl: () => HTMLElement | null, stickPx = 80) {
  const stickToBottom = ref(true)

  const onScroll = () => {
    const el = getEl()
    if (!el) return
    stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= stickPx
  }

  /**
   * 滚到底。force＝用户自己的动作（发消息/恢复会话/翻到最新页），无条件贴底并重新跟随；
   * 流式路径不带 force，用户上翻时直接不动。
   *
   * <p>用即时赋值而非 smooth：平滑滚动途中的中间 scroll 事件"距底"很大，会被侦听误判成
   * 用户上翻⇒跟随被解除，下一批增量就不再贴底（跟随反而被动画打断）。</p>
   */
  const scrollBottom = (force = false) => {
    if (!force && !stickToBottom.value) return
    stickToBottom.value = true
    void nextTick(() => {
      const el = getEl()
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  /** 用户点了「回到底部」：恢复跟随并立刻贴底 */
  const backToBottom = () => scrollBottom(true)

  return { stickToBottom, onScroll, scrollBottom, backToBottom }
}
