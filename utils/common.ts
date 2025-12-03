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
  getTextWidth
}
