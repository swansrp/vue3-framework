import dayjs from 'dayjs'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { Ref } from 'vue'

import { name } from '../../../package.json'

import { TimerType } from '@/framework/utils/type'

const localStoragePrefix = name + '-'

dayjs.extend(weekOfYear)
dayjs.extend(isLeapYear)
dayjs.extend(isoWeeksInYear)

const localStorageMethods = {
  getLocalStorage(key: string, defaultValue = '') {
    const value = window.localStorage.getItem(localStoragePrefix + key)
    if (!value || value === '') {
      return defaultValue
    }
    return value
  }, removeLocalStorage(key: string) {
    window.localStorage.removeItem(localStoragePrefix + key)
  }, setLocalStorage(key: string, value: string) {
    if (!value) {
      window.localStorage.setItem(localStoragePrefix + key, '')
    } else {
      window.localStorage.setItem(localStoragePrefix + key, value)
    }
  }
}

function isEmpty(data: any) {
  if (data === undefined || data == null) {
    return true
  } else if (data instanceof Array) {
    return data.length === 0
  } else if (data instanceof Map) {
    return data.size === 0
  } else if (typeof data === 'string') {
    return data.length === 0 || data === ''
  } else if (typeof data === 'object') {
    return Object.keys(data).length === 0
  } else {
    return false
  }
}

function isNotEmpty(data: any) {
  return !isEmpty(data)
}

// 树的遍历之查找所有的兄弟节点
// list为树, id为目标节点的id, key为id匹配的字段
function getBrotherNodes(list: any, id: any, key: any) {
  for (const i in list) {
    if (list[i][key] === id) return list
    if (list[i].children?.length > 0) {
      const node: any = getBrotherNodes(list[i].children, id, key)
      if (node) return node
    }
  }
}

// 树的遍历之查找所有的父节点
// list为树, id为目标节点的id, key为id匹配的字段
function getAllParentNodes(list: any, id: any, key: any) {
  for (const i in list) {
    if (list[i][key] === id) return [list[i]].filter(v => v[key] !== id)
    if (list[i].children?.length > 0) {
      const node: any = getAllParentNodes(list[i].children, id, key)
      if (node) return node.concat(list[i]).filter((v: any) => v[key] !== id)
    }
  }
}

// 树的遍历之查找所有的父节点
// list为树, id为目标节点的id, key为id匹配的字段
function getAllNodes(list: any, callBack: Function) {
  for (const i in list) {
    callBack(list[i])
    if (list[i].children) getAllNodes(list[i].children, callBack)
  }
}

const structureUrl = (url: string, id: string) => {
  return url + id
}

// 使用这个方法，才能直接使用Object.keys对formState赋值，否则会有TS类型检查错误
function setField<T, K extends keyof T>(o: T, key: K, value: T[K]) {
  // 由于需要把 0 和 1 转为boolean类型，所以先使用加号将字符串和数字转为数组，然后两次取反得到boolean数值
  if (key === 'isCache' || key === 'isFrame') {
    o[key] = !!(+value) as T[K]
  } else o[key] = value
}

const getLastWeekOrder = (currentWeekOrder: string) => {
  const [year, week] = currentWeekOrder.split('-').map(Number)
  const newWeek = week - 1
  if (newWeek === 0) {
    const weekOrder = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
    return (year - 1) + '-' + dayjs(weekOrder).isoWeeksInYear()
  } else return (year + '-' + newWeek)
}

const addPublicAttrs = (column: Array<Object>) => {
  column.forEach((item: any) => {
    item.align = item.align || 'center'
    item.resizable = true
  })
}

const batchAddPublicAttrs = (column_list: Array<Object>[]) => {
  column_list.forEach((column: any) => column.forEach((item: any) => {
    item.align = 'center'
    item.resizable = true
  }))
}

const customTableRowDblClickEvent = (projectId: string, lastExpandedRowKeys: Ref, expandedRowKeys: Ref): boolean => {
  if (lastExpandedRowKeys.value === projectId) {
    expandedRowKeys.value = []
    lastExpandedRowKeys.value = ''
    return false
  } else {
    lastExpandedRowKeys.value = projectId
    expandedRowKeys.value = [projectId]
    return true
  }
}

const updateTableSize = (tableWrapper: Ref, tableWidth?: Ref, w_bias?: number, tableHeight?: Ref, h_bias?: number) => {
  if (tableWrapper && tableWrapper.value) {
    if (tableWidth && w_bias) tableWidth.value = tableWrapper.value.offsetWidth - w_bias
    if (tableHeight && h_bias) tableHeight.value = tableWrapper.value.offsetHeight - h_bias
  }
}

const _getWeekStartEndDay = (day: string) => {
  const start = dayjs(day).subtract(dayjs(day).day() ? dayjs(day).day() - 1 : 6, 'day').format('YYYY-MM-DD')
  const end = dayjs(start).add(6, 'day').format('YYYY-MM-DD')
  return { start, end }
}

const clearFromField = (form: any, formRef: Ref) => {
  // 二者顺序不能交换，否则会失效
  formRef.value && formRef.value.resetFields()
  Object.keys(form).forEach(key => {
    if (key === 'version' || key === 'id' || key === 'type') {
      return
    } else if (key === 'partnerList' || key === 'competitorList' || key === 'financingMode') {
      form[key] = []
    } else if (key === 'customer') {
      form[key] = { value: '' }
    } else if (key === 'visitAt' || key === 'planAt') {
      form[key] = null
    } else {
      form[key] = ''
    }
  })
}

const clearFrom = (form: any, formRef?: Ref) => {
  formRef && formRef.value && formRef.value.resetFields()
  Object.keys(form).forEach(key => {
    form[key] = null
  })
}

const copyField = (src: any, dist: any) => {
  src && Object.keys(dist).forEach(key => {
    dist[key] = src[key]
  })
}

const strLF2HtmlLF = (str: string) => {
  if (isNotEmpty(str) && typeof str === 'string') {
    str = str.replace(/\n|\\n/g, '<br/>')
  }
  return str
}

const strRemoveLF = (str: string) => {
  if (isNotEmpty(str) && typeof str === 'string') {
    str = str.replace(/\n|\\n/g, '')
  }
  return str
}

const doFunctions = (...functions: Array<Function>) => {
  functions.forEach(func => {
    func()
  })
}
const log = (...a: Array<any>) => {
  const array = new Error().stack?.split(' at ')
  let fileName = array && array[2]
  if (fileName?.startsWith('app.config.globalProperties')) {
    fileName = array && array[3].split('?')[0].split('/').pop()
  } else {
    fileName = array && array[2].split('?')[0].split('/').pop()
  }
  console.log('[' + fileName + ']', ...a)
  return true
}

const stopTimer = (data: TimerType) => {
  return new Promise((resolve) => {
    if (data.timer != null) {
      window.cancelAnimationFrame(data.timer)
      data.timer = null
      resolve(data)
    }
  })
}
const startTimer = (data: TimerType, render: Function, immediate = true, replace = true) => {
  data.lastTime = 0
  return new Promise((resolve) => {
    const animLoop = () => {
      const now = Date.now()
      if (data.lastTime === 0 && !immediate) {
        data.lastTime = now
      }
      if (now - data.lastTime > data.diff) {
        data.lastTime = now
        render()
      }
      if (data.timer !== null) {
        data.timer = window.requestAnimationFrame(animLoop)
      }
    }
    if (data.timer != null) {
      if (replace) {
        stopTimer(data).then(() => {
          data.timer = window.requestAnimationFrame(animLoop)
          resolve(data)
        })
      }
    } else {
      data.timer = window.requestAnimationFrame(animLoop)
      resolve(data)
    }
  })
}

const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const parseCssValue = (value: string | number = 'auto', unit = 'px') => {
  return (value === 'auto') ? value : isNaN(Number(value)) ? value : Number(value) + unit
}

const scrollToBottom = (container: Ref, force = false) => {
  if (container.value) {
    const scrollContainer = container.value
    const scrollTop = scrollContainer.scrollTop
    const scrollHeight = scrollContainer.scrollHeight
    const offsetHeight = scrollContainer.offsetHeight
    if (scrollTop + offsetHeight === scrollHeight || force) {
      container.value.scrollTop = container.value.scrollHeight
    }
  }
}

// 内置时间变量统一按东八区(GMT+8)日历取值，与后端 ConditionVariableUtil（固定 GMT+8）对齐：
// 旧实现用 toISOString() 按 UTC 日历取值，东八区每天 08:00 前会取到「昨天」，属历史缺陷（已修）；
// ${currentDateTime} 同步改输出 "yyyy-MM-dd HH:mm:ss"（ISO 带 T 格式 MySQL DATETIME 列无法直接比较）。
const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_OFFSET_MS = 24 * 60 * 60 * 1000
// 平移 +8h 后用 getUTC* 读出的即东八区挂钟值，不随用户机器时区漂移
const gmt8Date = (offsetDays: number): Date =>
  new Date(Date.now() + GMT8_OFFSET_MS + offsetDays * DAY_OFFSET_MS)
const pad2 = (n: number): string => n.toString().padStart(2, '0')
const fmtDay = (d: Date): string => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
const fmtMonth = (y: number, m: number): string => `${y}${pad2(m)}`
const fmtDateTime = (d: Date): string =>
  `${fmtDay(d)} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
// 月份加减走 (年*12+月) 整数运算，避开 Date.setMonth 月末进位陷阱（3月31日 -1月 会变 3 月）
const shiftMonth = (y: number, m: number, delta: number): { y: number, m: number } => {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12 + 12) % 12 + 1 }
}

// 通用格式变量 ${now:pattern}：按 Java DateTimeFormatter 语义的常见 token 子集格式化东八区当前时刻，
// 与后端 ConditionVariableUtil.formatNow 对齐（注意不用 dayjs：dayjs 的年份/日期 token 是大写 YYYY/DD，与 Java 小写不一致）
const NOW_TOKEN_PREFIX = 'now:'
const formatNow = (pattern: string, d: Date): string => {
  const tokens: Record<string, string> = {
    yyyy: `${d.getUTCFullYear()}`,
    yy: pad2(d.getUTCFullYear() % 100),
    MM: pad2(d.getUTCMonth() + 1),
    M: `${d.getUTCMonth() + 1}`,
    dd: pad2(d.getUTCDate()),
    d: `${d.getUTCDate()}`,
    HH: pad2(d.getUTCHours()),
    H: `${d.getUTCHours()}`,
    mm: pad2(d.getUTCMinutes()),
    m: `${d.getUTCMinutes()}`,
    ss: pad2(d.getUTCSeconds()),
    s: `${d.getUTCSeconds()}`,
  }
  // 分支长短语优先（yyyy 先于 yy、HH 先于 H），未知 token 原样输出
  return pattern.replace(/yyyy|yy|MM|M|dd|d|HH|H|mm|m|ss|s/g, (t) => tokens[t] ?? t)
}

// 解析内置时间变量并返回实际时间值（兜底+专项双模式）
const resolveDynamicVariable = (value: string | undefined): string | undefined => {
  if (!value || value === '' || value === null || value === undefined) {
    return undefined
  }

  // 定义内置时间变量映射（每次调用现算，跨天/跨月自动跟随）
  const today = gmt8Date(0)
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const lastMonth = shiftMonth(year, month, -1)
  const nextMonth = shiftMonth(year, month, 1)
  const timeVariables: Record<string, string> = {
    '${currentYear}': `${year}`,
    '${currentMonth}': fmtMonth(year, month),
    '${currentDay}': fmtDay(today),
    '${currentDateTime}': fmtDateTime(today),
    '${lastYear}': `${year - 1}`,
    '${nextYear}': `${year + 1}`,
    '${lastMonth}': fmtMonth(lastMonth.y, lastMonth.m),
    '${nextMonth}': fmtMonth(nextMonth.y, nextMonth.m),
    '${lastDay}': fmtDay(gmt8Date(-1)),
    '${nextDay}': fmtDay(gmt8Date(1)),
  }

  // 检查是否是内置时间变量
  if (value.startsWith('${') && value.endsWith('}')) {
    const resolvedValue = timeVariables[value]
    if (resolvedValue !== undefined) {
      return resolvedValue
    }
    // 固定表未命中再试 ${now:pattern} 通用格式（与后端同口径，非法 pattern 原样保留）
    const inner = value.slice(2, -1)
    if (inner.startsWith(NOW_TOKEN_PREFIX)) {
      return formatNow(inner.slice(NOW_TOKEN_PREFIX.length), gmt8Date(0))
    }
  }

  // 返回原始值（专项值）
  return value
}

// 递归解析条件树中的内置时间变量('${currentYear}' 等, 见 resolveDynamicVariable)
// 提升自 Portal/index.vue 私有 resolve(), 供通用列表与透视(pivot.vue)共用同一份默认条件变量解析
const resolveConditionVariables = (condition: any) => {
  if (!condition) return

  // 处理 ConditionType 类型(递归子条件)
  if (Array.isArray(condition.conditionList)) {
    condition.conditionList.forEach((item: any) => resolveConditionVariables(item))
  }

  // 处理 ConditionListType 数组
  if (Array.isArray(condition)) {
    condition.forEach((item: any) => resolveConditionVariables(item))
  }

  // 处理单个条件节点的 value 数组
  if (Array.isArray(condition.value)) {
    condition.value = condition.value.map((v: any) => {
      if (typeof v === 'string') {
        return resolveDynamicVariable(v)
      }
      return v
    })
  }
}

const getTextWidth = (text: string, split = true, size = 1.6) => {
  const textArray = text?.toString().split(/\n|\\n/g) || []
  let maxWidth = 0
  textArray.forEach((item) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d') as any
    let width
    if(split) {
      if (item.length > 25) {
        width = context.measureText(item.substring(0, 14)).width * size
      } else {
        width = context.measureText(item.substring(0, 25)).width * size
      }
    } else {
      width = context.measureText(item).width * size
    }
    maxWidth = maxWidth > width ? maxWidth : width
  })
  return maxWidth
}


export {
  localStorageMethods,
  isEmpty,
  isNotEmpty,
  getAllNodes,
  getBrotherNodes,
  getAllParentNodes,
  structureUrl,
  setField,
  getLastWeekOrder,
  addPublicAttrs,
  batchAddPublicAttrs,
  customTableRowDblClickEvent,
  updateTableSize,
  _getWeekStartEndDay,
  clearFromField,
  strLF2HtmlLF,
  strRemoveLF,
  doFunctions,
  log,
  startTimer,
  stopTimer,
  uuid,
  copyField,
  clearFrom,
  parseCssValue,
  scrollToBottom,
  getTextWidth,
  resolveDynamicVariable,
  resolveConditionVariables
}
