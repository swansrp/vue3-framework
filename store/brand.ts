import { defineStore } from 'pinia'

import { apiType, baseDomain, buildGetApiByType } from '@/framework/apis'
import { request } from '@/framework/network/request'

/**
 * Title: brand
 * Description: 品牌运行时 store（T1.5 棒5）——应用启动经 ensureLoaded() 拉
 * `GET /web/branding`（免登录，棒 4 端点），给 Login logo/副标题、TopNav 品牌区、
 * SSO「返回X」、App.vue 浏览器标题四处接线供值。
 *
 * <p>回落纪律：端点不可达（dev 无后端）、超时、业务失败、字段 null/空串，一律本地回落
 * 墨枢默认——productName 恒非空；logo/theme/subtitle 置 null，消费方各自本地兜底。
 * 拉取全程静默（不转菊花、不弹错、不阻塞渲染）：品牌是装饰面，宁可默认快显也不许吊住启动。</p>
 */

/**
 * 缺省产品名：与后端 BrandingController.DEFAULT_PRODUCT_NAME、package.json title
 * （回落正源）三处一致，任何一处失联都回落到同一品牌。
 */
const DEFAULT_PRODUCT_NAME = '墨枢'

/**
 * 拉取超时（ms）：品牌值不在就 3s 内放弃，走本地默认。
 */
const BRAND_TIMEOUT = 3000

// 端点描述子：request() 自动拼 {VITE_baseURL}{baseDomain}/web 前缀 ⇒ 实际 GET /inkhub/web/branding，
// 与 apis/params 的 getConfig 同构（apiType.common='' 不追加类型前缀）
const brandingApi = buildGetApiByType('/branding', apiType.common, baseDomain)

/**
 * null/undefined/空白串统一折叠为 null（契约：空值视同缺失走前端回落）。
 */
const textOf = (value: unknown): string | null => {
  const text = value == null ? '' : String(value).trim()
  return text === '' ? null : text
}

/**
 * logoUrl scheme 白名单（D-4 纵深防御）：仅放行 data:image/、http(s) 外链、站内根相对路径；
 * 不匹配（javascript:、data:text 等异常形态）一律置 null，消费方走本地 logo。
 */
const LOGO_URL_ALLOWED = /^(data:image\/|https?:\/\/|\/)/
const normalizeLogoUrl = (value: unknown): string | null => {
  const text = textOf(value)
  return text !== null && LOGO_URL_ALLOWED.test(text) ? text : null
}

// 在途请求句柄（模块级，D-2 修复）：并发/重复调用方 await 同一在途 promise，
// 拉取到终态后清空（后续调用命中 loaded 闸门直接返回）
let inflight: Promise<void> | null = null

export const useBrandStore = defineStore('brandStore', {
  state: () => {
    return {
      productName: DEFAULT_PRODUCT_NAME, // 产品名，恒非空（拉取失败/缺失回落墨枢）
      logoUrl: null as string | null, // logo 地址（data URI 或完整 URL），null＝消费方用本地 logo
      themePrimary: null as string | null, // 主题主色（CSS 色值），null＝不做任何点缀
      loginSubtitle: null as string | null, // 登录页副标题，null＝不渲染副标题元素
      loaded: false, // ensureLoaded 已到终态（成功或回落）——幂等闸门
      loading: false // 防并发：多个消费方同帧调用只发一次请求
    }
  }, actions: {
    /**
     * 幂等拉取（语义参照 common.ts parameterStore 的 map 缓存先例）：首次调用发请求；
     * 并发/重复调用 await 同一在途 promise（D-2 修复：不再返回「已决但未装载」的空 promise，
     * await 后读到必是已装载的 state）；loaded 终态后直接返回。
     * 由 App.vue 启动时触发，其余消费方只读 state 不再拉。
     */
    async ensureLoaded() {
      if (this.loaded) {
        return
      }
      // 后到调用方跟进同一在途请求（loading 态也要等它落地，而不是空手返回）
      if (inflight) {
        return inflight
      }
      this.loading = true
      inflight = (async () => {
        let timer: NodeJS.Timeout | null = null
        try {
          // 三开关全关＋suppressErrorToast：端点 404/超时/网络异常都不弹全局错误条、不转菊花
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('branding 拉取超时')), BRAND_TIMEOUT)
          })
          const res = await Promise.race([
            request(brandingApi, {}, {}, false, false, false, undefined, { suppressErrorToast: true }) as Promise<any>,
            timeout
          ])
          // 逐字段回落：远端缺什么本地补什么，不用整个响应二选一
          this.productName = textOf(res?.payload?.productName) ?? DEFAULT_PRODUCT_NAME
          this.logoUrl = normalizeLogoUrl(res?.payload?.logoUrl)
          this.themePrimary = textOf(res?.payload?.themePrimary)
          this.loginSubtitle = textOf(res?.payload?.loginSubtitle)
        } catch {
          // 失败/超时静默回落：state 保持墨枢默认值，不弹错、不重试（刷新页面自然再探一次）
        } finally {
          if (timer) {
            clearTimeout(timer)
          }
          this.loading = false
          this.loaded = true
          inflight = null
        }
      })()
      return inflight
    }
  }, getters: {}
})
