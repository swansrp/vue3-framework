import { EmptyObjectType } from '@/framework/utils/type'

/**
 * URL 参数解析工具函数
 * 用于从 URL 中提取查询参数并映射到组件的查询字段
 */

/**
 * 解析 URL 中的查询参数
 * @returns 返回包含所有 URL 参数的对象
 */
export type ParseQueryOptions = {
  splitComma?: boolean
  allowArray?: boolean
}

const normalizeSearch = (url?: string): string => {
  if (url) {
    if (url.indexOf('?') === -1) return ''
    const rawSearch = url.substring(url.indexOf('?') + 1).split('#')[0]
    return rawSearch.replace(/\?/g, '&')
  }

  // 处理 hash 模式和 history 模式
  let search = window.location.search

  // 如果 search 为空，尝试从 hash 中提取（Vue Router hash 模式）
  if (!search && window.location.hash) {
    const hashParts = window.location.hash.split('?')
    if (hashParts.length > 1) {
      search = '?' + hashParts.slice(1).join('?')
    }
  }

  if (!search) return ''

  // 处理未 encode 的多余 '?'，避免污染参数值
  return search.startsWith('?')
    ? search.slice(1).replace(/\?/g, '&')
    : search.replace(/\?/g, '&')
}

/**
 * 平台 SSO 回跳的「粘连 token」修复（2026-11-24 pre 真机）。
 *
 * 主系统 SSO 落地页（portal.bidr.com.cn/sso）把 `?id_token=` 直接拼在 target_url 末尾，
 * 而本族 SPA 是 hash 路由、参数在 `#` 之后 ⇒ token 会粘在 hash query 最后一个参数值上：
 *   #/app-frame?app=epc-ai-local?id_token=eyJ...
 * Vue Router 解析时 `?` 既不编码也不是分隔符 ⇒ route.query.app＝'epc-ai-local?id_token=eyJ...'，
 * 守卫随后 next({ path, query }) 又把它原样写回地址栏：登录其实已成功（checkLoginState 靠
 * getQueryObject 的 ?→& 兜底换到了票），页面却拿脏 appCode 查子系统注册表，报
 * 「未找到子系统注册信息（appCode=epc-ai-local?id_token=…）」。
 *
 * 修法：路由解析前把粘连点拆成独立参数（`?id_token=` → `&id_token=`），之后走的仍是既有
 * id_token 分支（换本地会话＋清参）。幂等；只认 id_token 这一个平台回跳固定键，不做全局
 * `?`→`&` 替换（会误伤值里合法带 `?` 的参数）。
 * 🔴 必须在 createRouter/首屏导航之前调用（见 framework/router/index.ts 模块顶部）。
 */
export const normalizeGluedIdTokenInHash = (): void => {
  if (typeof window === 'undefined') return
  const href = window.location.href
  const hashIdx = href.indexOf('#')
  if (hashIdx === -1) return
  const hash = href.substring(hashIdx)
  const firstQ = hash.indexOf('?')
  const GLUED = '?id_token='
  // 第一个 ? 之后才可能是粘连（第一个 ? 就是 id_token 自己＝本就合法，无需修）
  if (firstQ === -1 || hash.indexOf(GLUED, firstQ + 1) === -1) return
  let repaired = hash
  let glued = repaired.indexOf(GLUED, firstQ + 1)
  while (glued !== -1) {
    // `?`→`&` 等长替换，下标不需要重算
    repaired = repaired.substring(0, glued) + '&id_token=' + repaired.substring(glued + GLUED.length)
    glued = repaired.indexOf(GLUED, firstQ + 1)
  }
  try {
    // replaceState：不新增历史、不触发导航（路由随后按修好的 hash 解析）
    window.history.replaceState(window.history.state, '', href.substring(0, hashIdx) + repaired)
  } catch {
    // 极端环境不支持时按原 URL 继续：换票仍靠 getQueryObject 的字符串兜底，只是 route.query 会脏
  }
}

const parseQueryString = (search: string, options: ParseQueryOptions = {}): Record<string, string | string[]> => {
  const params: Record<string, string | string[]> = {}
  const splitComma = options.splitComma ?? true
  const allowArray = options.allowArray ?? true
  const searchParams = new URLSearchParams(search ? `?${search}` : '')

  searchParams.forEach((value, key) => {
    const values = splitComma && value.includes(',')
      ? value.split(',').map(item => item.trim()).filter(item => item !== '')
      : [value]

    if (!allowArray) {
      params[key] = values.length > 1 ? values.join(',') : values[0]
      return
    }

    if (params[key]) {
      const existing = Array.isArray(params[key]) ? params[key] as string[] : [params[key] as string]
      params[key] = existing.concat(values)
    } else {
      params[key] = values.length > 1 ? values : values[0]
    }
  })

  return params
}

export function parseUrlParams(url?: string, options: ParseQueryOptions = {}): Record<string, string | string[]> {
  const search = normalizeSearch(url)
  return parseQueryString(search, { splitComma: true, allowArray: true, ...options })
}


/**
 * 从 URL 参数中获取指定字段的值
 * @param paramName URL 参数名
 * @param defaultValue 默认值
 * @returns 参数值或默认值
 */
export function getUrlParam<T = any>(paramName: string, defaultValue?: T): T {
  const params = parseUrlParams()
  const value = params[paramName]
  
  if (value === undefined || value === null || value === '') {
    return defaultValue as T
  }
  
  return value as T
}

/**
 * 批量映射 URL 参数到组件的 ref 变量
 * @param mapping 映射关系对象，key 为 URL 参数名，value 为对应的 ref 对象
 * 
 * @example
 * ```ts
 * const pmpCode = ref('')
 * const phaseCode = ref([])
 * 
 * // 从 URL ?pmpCode=xxx&phaseCode=a,b 中解析参数
 * mapUrlParamsToRefs({
 *   pmpCode: pmpCode,
 *   phaseCode: phaseCode
 * })
 * ```
 */
export function mapUrlParamsToRefs(mapping: Record<string, any>): void {
  const urlParams = parseUrlParams()

  Object.keys(mapping).forEach(paramName => {
    const refValue = mapping[paramName]
    const urlValue = urlParams[paramName]
    
    if (urlValue !== undefined && urlValue !== null && urlValue !== '') {
      // 智能类型转换：如果 ref 初始值是数组，但 URL 参数是字符串，则转为数组
      if (Array.isArray(refValue.value) && typeof urlValue === 'string') {
        refValue.value = [urlValue]
      } 
      // 如果 ref 初始值是字符串，但 URL 参数是数组，则取第一个元素
      else if (typeof refValue.value === 'string' && Array.isArray(urlValue)) {
        refValue.value = urlValue.length > 0 ? urlValue[0] : ''
      } 
      // 类型一致，直接赋值
      else {
        refValue.value = urlValue
      }
    }
  })
}

/**
 * @deprecated 请直接使用 parseUrlParams(url, { splitComma: false, allowArray: false })
 */
export const getQueryObject = function (url: string) {
  return parseUrlParams(url, { splitComma: false, allowArray: false }) as EmptyObjectType
}


export const removeURLParameter = function (url: string, parameter: string) {
  const firstQ = url.indexOf('?')
  if (firstQ === -1) return url
  const base = url.substring(0, firstQ)
  // 取第一个 ? 之后、第一个 # 之前的所有内容（包含后续的 ? 都在 query 部分）
  const queryAndHash = url.substring(firstQ + 1)
  const hashIdx = queryAndHash.indexOf('#')
  const queryStr = hashIdx !== -1 ? queryAndHash.substring(0, hashIdx) : queryAndHash
  const hash = hashIdx !== -1 ? queryAndHash.substring(hashIdx) : ''
  // 替换 query 中所有多余的 ? 为 &
  const normalized = queryStr.replace(/\?/g, '&')
  const prefix = encodeURIComponent(parameter) + '='
  const pars = normalized.split(/[&;]/g)
  for (let i = pars.length; i-- > 0;) {
    if (pars[i].lastIndexOf(prefix, 0) !== -1) {
      pars.splice(i, 1)
    }
  }
  return base + (pars.length > 0 ? '?' + pars.join('&') : '') + hash
}
