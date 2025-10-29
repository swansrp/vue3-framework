import Mock from 'mockjs'

export async function setupProdMock() {
  console.log('[Mock] setupProdMock start')

  const modules = import.meta.glob('/src/mock/*.{ts,js}', { eager: true })
  const allMocks: any[] = []

  Object.entries(modules).forEach(([path, mod]: [string, any]) => {
    const mockModule = mod.default || mod
    if (Array.isArray(mockModule)) {
      allMocks.push(...mockModule)
      console.log(`[Mock] Loaded mock file: ${path} with ${mockModule.length} mocks`)
    }
  })

  if (allMocks.length === 0) {
    console.log('[Mock] No mock files found, skipping')
    return
  }

  allMocks.forEach((item: any) => {
    const method = (item.method || 'get').toLowerCase()
    // 转成正则，匹配 query 参数或完整域名
    const url = item.url instanceof RegExp
      ? item.url
      : new RegExp(item.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?.*)?$')

    Mock.mock(url, method, (...args: any[]) => {
      const result = item.response(...args)
      console.log(`[Mock] ${method.toUpperCase()} ${item.url} response:`, result)
      return result
    })

    console.log(`[Mock] Intercept setup: ${method.toUpperCase()} ${item.url}`)
  })

  console.log(`[Mock] Production mock initialized with ${allMocks.length} mocks`)
}

export const parseQuery = (url: string) => {
  const query: Record<string, string> = {}
  const searchIndex = url.indexOf('?')
  if (searchIndex !== -1) {
    const queryString = url.substring(searchIndex + 1)
    queryString.split('&').forEach((item) => {
      const [key, value] = item.split('=')
      if (key) query[key] = decodeURIComponent(value)
    })
  }
  return query
}

export const enableMock = async () => {
  // 1️⃣ 初始化生产 Mock
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    console.log('[Mock] 生产 mock 手动启动')
    await setupProdMock()
  }
}
