import { isNotEmpty } from '@/framework/utils/common'

export const json = (log: string): any => {
  try {
    if (isNotEmpty(log)) {
      return JSON.parse(log)
    }
    return false
  } catch (e) {
    return json(log.substring(1))
  }
}
export const isJson = (log: string) => {
  const res = json(log)
  if (res) {
    return JSON.stringify(res, null, 2)
  }
  return false
}

export const isSQL = (log: string) => {
  return log.startsWith('==>  Preparing: ')
}

// 格式化日期
export const formatDate = (date: Date) => {
  return date?.toLocaleString() // 可以根据需求调整日期格式
}
export const expandLog = (info: any) => {
  if (info && info.expand !== null) {
    info.expand = !info.expand
  }
}
//设置日期查询默认值
export const getLogLevelClass = (logLevel: string) => {
  return logLevel.toLowerCase()
}
