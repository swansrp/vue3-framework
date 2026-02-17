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
  const urlParts = url.split('?')
  if (urlParts.length >= 2) {
    // 参数名前缀
    const prefix = encodeURIComponent(parameter) + '='
    const pars = urlParts[1].split(/[&;]/g)
    // 循环查找匹配参数
    for (let i = pars.length; i-- > 0;) {
      if (pars[i].lastIndexOf(prefix, 0) !== -1) {
        // 存在则删除
        pars.splice(i, 1)
      }
    }
    return urlParts[0] + (pars.length > 0 ? '?' + pars.join('&') : '')
  }
  return url
}
