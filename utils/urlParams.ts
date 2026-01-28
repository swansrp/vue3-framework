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
  const searchParams = new URLSearchParams(window.location.search)

  searchParams.forEach((value, key) => {
    // 如果参数值包含逗号，则分割为数组（支持多选）
    if (value.includes(',')) {
      params[key] = value.split(',').filter(item => item.trim())
    } else {
      params[key] = value
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
      refValue.value = urlValue
    }
  })
}
