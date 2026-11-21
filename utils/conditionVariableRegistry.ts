/**
 * 条件动态变量注册表。
 *
 * 【唯一正源 = 后端】erp-api/framework/core/base/kernel/.../utils/ConditionVariableUtil.catalog()，
 * 经 /web/admin/portal/condition-variable/catalog 暴露。下拉选项应调 loadConditionVariableGroups()
 * 动态拉取（带缓存），后端新增 token 前端零改动自动可见。
 *
 * 本文件内置的 CONDITION_VARIABLE_GROUPS 只是【本地兜底表】：首屏占位 / 接口失败时回落，
 * 须与后端对齐但不再是选项的权威来源。后端 validateTokens() 仍在保存时拦截非法 ${}。
 *
 * 注意：主体类变量（currentDeptId 等）前端 resolveDynamicVariable 不取值，
 * 原样传后端由 authorization 层按当前登录人解析，故组内标注 subject=true。
 */
import { getConditionVariableCatalog } from '@/framework/apis/portal/config'

export interface ConditionVariableOption {
  /** 完整书写形态，如 '${currentYear}'；选中后直接作为条件值 */
  token: string
  /** 下拉里展示的中文名 */
  label: string
  /** 示例输出 / 说明 */
  hint: string
  /** 主体类变量：前端不解析，后端按登录人取值 */
  subject?: boolean
}

export interface ConditionVariableGroup {
  key: string
  title: string
  options: ConditionVariableOption[]
}

/** 时间变量（与后端 SUPPORTED_TOKENS 一一对应） */
const TIME_OPTIONS: ConditionVariableOption[] = [
  { token: '${currentYear}', label: '当前年', hint: '如 2026' },
  { token: '${currentMonth}', label: '当前月', hint: 'yyyyMM，如 202611' },
  { token: '${currentDay}', label: '当前日', hint: 'yyyy-MM-dd' },
  { token: '${currentDateTime}', label: '当前日期时间', hint: 'yyyy-MM-dd HH:mm:ss' },
  { token: '${lastYear}', label: '上一年', hint: '如 2025' },
  { token: '${nextYear}', label: '下一年', hint: '如 2027' },
  { token: '${lastMonth}', label: '上一月', hint: 'yyyyMM' },
  { token: '${nextMonth}', label: '下一月', hint: 'yyyyMM' },
  { token: '${lastDay}', label: '昨天', hint: 'yyyy-MM-dd' },
  { token: '${nextDay}', label: '明天', hint: 'yyyy-MM-dd' }
]

/** 同期日（月/年粒度的「今天」，与后端 lastMonthDay 等对齐） */
const SAME_DAY_OPTIONS: ConditionVariableOption[] = [
  { token: '${lastMonthDay}', label: '上月今天', hint: 'yyyy-MM-dd，月末溢出自动钳制' },
  { token: '${nextMonthDay}', label: '下月今天', hint: 'yyyy-MM-dd' },
  { token: '${lastYearDay}', label: '去年今天', hint: 'yyyy-MM-dd' },
  { token: '${nextYearDay}', label: '明年今天', hint: 'yyyy-MM-dd' }
]

/** 主体变量（后端 authorization 层解析，前端仅登记名称） */
const SUBJECT_OPTIONS: ConditionVariableOption[] = [
  { token: '${currentCustomerNumber}', label: '当前客户编号', hint: '后端按登录人解析', subject: true },
  { token: '${currentDeptId}', label: '当前部门 ID', hint: '后端按登录人解析', subject: true },
  { token: '${currentGroupId}', label: '当前集团 ID', hint: '后端按登录人解析', subject: true },
  { token: '${currentDeptIds}', label: '当前部门 ID 集', hint: '后端按登录人解析', subject: true },
  { token: '${currentGroupIds}', label: '当前集团 ID 集', hint: '后端按登录人解析', subject: true }
]

/** ${now:pattern} 常用预设（pattern 可自由扩展，这里只给高频项） */
const NOW_PRESET_OPTIONS: ConditionVariableOption[] = [
  { token: '${now:yyyyMMdd}', label: '紧凑日期', hint: '如 20261120' },
  { token: '${now:yyyy-MM-dd}', label: '标准日期', hint: '如 2026-11-20' },
  { token: '${now:yyyyMM}', label: '年月', hint: '如 202611' },
  { token: '${now:yyyy}', label: '四位年', hint: '如 2026' },
  { token: '${now:yyyy-MM-dd HH:mm:ss}', label: '日期时间', hint: '如 2026-11-20 13:55:13' },
  { token: '${now:HH:mm:ss}', label: '时分秒', hint: '如 13:55:13' }
]

/** 本地兜底表：仅用于首屏/接口失败时占位，正常渲染以 loadConditionVariableGroups() 拉取的后端清单为准 */
export const CONDITION_VARIABLE_GROUPS: ConditionVariableGroup[] = [
  { key: 'time', title: '时间变量', options: TIME_OPTIONS },
  { key: 'sameDay', title: '同期日（上月/下月/去年/明年今天）', options: SAME_DAY_OPTIONS },
  { key: 'subject', title: '主体变量（后端解析）', options: SUBJECT_OPTIONS },
  { key: 'now', title: '自定义格式 ${now:…}', options: NOW_PRESET_OPTIONS }
]

/** 全部合法 token 平铺（供校验 / 快速查找） */
export const ALL_CONDITION_VARIABLES: ConditionVariableOption[] =
  CONDITION_VARIABLE_GROUPS.flatMap(g => g.options)

/** 判断一个值是否是本表登记过的合法变量（不含自由 now:pattern 的编译校验，那由后端兜底） */
export const isRegisteredVariable = (value: string): boolean =>
  ALL_CONDITION_VARIABLES.some(o => o.token === value)

/** 取变量展示信息（用于输入框回显 label） */
export const findVariable = (value: string): ConditionVariableOption | undefined =>
  ALL_CONDITION_VARIABLES.find(o => o.token === value)

// ============ 动态拉取后端清单（选项唯一正源） ============
let catalogCache: ConditionVariableGroup[] | null = null
let catalogPending: Promise<ConditionVariableGroup[]> | null = null

/** 后端 flat 清单 → 前端分组结构（保持后端返回顺序） */
const toGroups = (rows: any[]): ConditionVariableGroup[] => {
  const groups: ConditionVariableGroup[] = []
  const byKey = new Map<string, ConditionVariableGroup>()
  rows.forEach((r: any) => {
    if (!r || !r.token) return
    let g = byKey.get(r.group)
    if (!g) {
      g = { key: r.group, title: r.groupTitle || r.group, options: [] }
      byKey.set(r.group, g)
      groups.push(g)
    }
    g.options.push({ token: r.token, label: r.label || r.token, hint: r.hint || '', subject: !!r.subject })
  })
  return groups
}

/**
 * 拉取变量清单（带缓存 + 并发去重）。成功缓存后端清单；失败回落本地兜底表且不缓存（下次重试）。
 * 组件 onMounted 调一次即可，选项随后端正源更新。
 */
export const loadConditionVariableGroups = (): Promise<ConditionVariableGroup[]> => {
  if (catalogCache) return Promise.resolve(catalogCache)
  if (catalogPending) return catalogPending
  catalogPending = getConditionVariableCatalog()
    .then((resp: any) => {
      const rows = resp?.payload ?? resp?.data ?? resp
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty condition-variable catalog')
      catalogCache = toGroups(rows)
      return catalogCache
    })
    .catch(() => CONDITION_VARIABLE_GROUPS)
    .finally(() => { catalogPending = null })
  return catalogPending
}
