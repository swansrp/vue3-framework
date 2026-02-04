/**
 * URL 参数解析工具函数
 * 用于从 URL 中提取查询参数并映射到组件的查询字段
 */

/**
 * 解析 URL 中的查询参数
 * @returns 返回包含所有 URL 参数的对象
 */
export function parseUrlParams(): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  
  // 处理 hash 模式和 history 模式
  let search = window.location.search
  
  // 如果 search 为空，尝试从 hash 中提取（Vue Router hash 模式）
  if (!search && window.location.hash) {
    const hashParts = window.location.hash.split('?')
    if (hashParts.length > 1) {
      search = '?' + hashParts.slice(1).join('?')
    }
  }
  
  const searchParams = new URLSearchParams(search)

  searchParams.forEach((value, key) => {
    // 检查是否已存在该参数（处理同名参数，如 ?key=a&key=b）
    if (params[key]) {
      // 如果已存在，转换为数组并追加
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value)
      } else {
        params[key] = [params[key] as string, value]
      }
    } else {
      // 如果参数值包含逗号，则分割为数组（支持多选，如 ?key=a,b,c）
      if (value.includes(',')) {
        params[key] = value.split(',').map(item => item.trim()).filter(item => item !== '')
      } else {
        params[key] = value
      }
    }
  })

  return params
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
