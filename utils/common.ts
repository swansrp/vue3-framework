import {Ref} from 'vue'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear'
import isLeapYear from 'dayjs/plugin/isLeapYear'

import {name} from '../../../package.json'

const localStoragePrefix = name + '-'

dayjs.extend(weekOfYear)
dayjs.extend(isLeapYear)
dayjs.extend(isoWeeksInYear)

const localStorageMethods = {
    getLocalStorage(key: string) {
        const value = window.localStorage.getItem(localStoragePrefix + key)
        if (!value || value === '') {
            return ''
        }
        return value
    },
    removeLocalStorage(key: string) {
        window.localStorage.removeItem(localStoragePrefix + key)
    },
    setLocalStorage(key: string, value: string) {
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
    }
    if (data instanceof Array) {
        if (data.length === 0) {
            return true
        }
    }
    if (data instanceof Map) {
        if (data.size === 0) {
            return true
        }
    }
    if (typeof data === 'string') {
        if (data.length === 0 || data === '') {
            return true
        }
    }
    return false
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
        if (tableWidth && w_bias)
            tableWidth.value = tableWrapper.value.offsetWidth - w_bias
        if (tableHeight && h_bias)
            tableHeight.value = tableWrapper.value.offsetHeight - h_bias
    }
}

const _getWeekStartEndDay = (day: string) => {
    const start = dayjs(day).subtract(dayjs(day).day() ? dayjs(day).day() - 1 : 6, 'day').format('YYYY-MM-DD')
    const end = dayjs(start).add(6, 'day').format('YYYY-MM-DD')
    return {start, end}
}

const clearFromField = (form: any, formRef: Ref) => {
    // 二者顺序不能交换，否则会失效
    formRef.value && formRef.value.resetFields()
    Object.keys(form).forEach(key => {
        if (key === 'version' || key === 'id' || key === 'type') return
        else if (key === 'partnerList' || key === 'competitorList' || key === 'financingMode') form[key] = []
        else if (key === 'customer') form[key] = {value: ''}
        else form[key] = ''
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
    console.log(...a)
    return true
}


export {
    localStorageMethods,
    isEmpty,
    isNotEmpty,
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
    log
}
