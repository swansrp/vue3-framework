/**
 * 私有存储媒体的「引用串 ↔ 可展示地址」通道。
 *
 * 为什么要有这个机制：私有桶的图片凭登录态才取到字节，`<img src=存储地址>` 直连带不上鉴权头；
 * 换成限时预签名地址写进正文，过一会儿正文就满屏裂图。所以正文只存**不会过期的引用串**，
 * 渲染前现取现换成 objectURL，写回前再还原成引用串——正源与后端之间永远只走引用串。
 *
 * 框架只提供机制、不认具体协议：引用串的判定与取字节方式由调用方注入（`isRef` / `load`），
 * 接自有对象存储的前端页都复用同一份会话缓存与写出口守卫。
 */

export interface MediaResolverOptions {
  /** 这个地址是否属于本通道（调用方按自己的占位符形态判定） */
  isRef: (src: string) => boolean
  /** 取字节：失败或空体返回 null——resolve 原样返回引用串，不伪造成功 */
  load: (ref: string) => Promise<Blob | null>
  /** 临时地址前缀，写出口守卫据此判残留；缺省 `blob:` */
  ephemeralPrefix?: string
  /** 守卫命中时抛出的文案（调用方给用户看的那句人话） */
  staleGuardMessage?: string
}

export interface MediaResolver {
  /** 引用串 → 可直接喂 `<img>` 的地址；同一条引用整个会话只取一次字节 */
  resolve: (ref: string) => Promise<string>
  /** 展示地址 → 引用串（还原正源用；非本通道产物返回 undefined） */
  toRef: (display: string) => string | undefined
  /** 写出口守卫：文本里仍残留临时地址＝有内容绕过本通道，那种地址一刷新就失效，禁止落库 */
  assertNoStaleUrl: (text: string) => void
  /** 释放全部 objectURL 并清缓存（页面卸载时调用；之后重进会重新取字节） */
  release: () => void
}

const DEFAULT_EPHEMERAL_PREFIX = 'blob:'

export function createMediaResolver(options: MediaResolverOptions): MediaResolver {
  const { isRef, load } = options
  const ephemeralPrefix = options.ephemeralPrefix || DEFAULT_EPHEMERAL_PREFIX
  const staleGuardMessage = options.staleGuardMessage
    || `内容含无法还原的临时地址（${ephemeralPrefix}），已阻止写入`

  /** 引用串 → 取字节的任务：并发请求同一条引用也只发一次，失败不留缓存好让下次重试 */
  const tasks = new Map<string, Promise<string>>()
  /** 展示地址 → 引用串：写出口还原用 */
  const refs = new Map<string, string>()

  const resolve = (ref: string): Promise<string> => {
    const hit = tasks.get(ref)
    if (hit) {
      return hit
    }
    if (!isRef(ref)) {
      return Promise.resolve(ref)
    }
    const task = load(ref).then(blob => {
      if (!blob || blob.size === 0) {
        tasks.delete(ref)
        return ref
      }
      const display = URL.createObjectURL(blob)
      refs.set(display, ref)
      return display
    })
    tasks.set(ref, task)
    return task
  }

  return {
    resolve,
    toRef: (display: string) => refs.get(display),
    assertNoStaleUrl: (text: string) => {
      if (text && text.indexOf(ephemeralPrefix) >= 0) {
        throw new Error(staleGuardMessage)
      }
    },
    release: () => {
      refs.forEach((_ref, display) => URL.revokeObjectURL(display))
      refs.clear()
      tasks.clear()
    }
  }
}
