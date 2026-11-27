/**
 * 框架侧嵌入壳判定（epc/InkHub 双宿主共享件，🔴 不引业务侧 @/utils/embedded——
 * 业务模块在别的宿主里可能不存在，import 会把对方构建带崩）。
 *
 * 口径与 URL 约定一致：`embedded=1`（none 无壳）或 `embedded=nav`（nav 壳）均算嵌入态；
 * search 与 hash 双查（hash 路由下参数可能落在 # 之后）。
 */
export const isEmbeddedChrome = (): boolean => {
  if (typeof window === 'undefined') return false
  const search = window.location.search || ''
  const hash = window.location.hash || ''
  return /[?&]embedded=(?:1|nav)(?:$|[&#])/.test(search)
    || /[?&]embedded=(?:1|nav)(?:$|[&#])/.test(hash)
}