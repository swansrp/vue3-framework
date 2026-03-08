/**
 * 显示条件计算工具
 * 用于在运行时计算字段是否应该显示
 */

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

/**
 * 将值标准化为字符串，处理布尔值的语义转换
 * - true / "true" / "1" / 1 -> "1"
 * - false / "false" / "0" / 0 -> "0"
 */
const normalizeValue = (v: any): string => {
  if (v === true || v === 'true' || v === 1 || v === '1') return '1'
  if (v === false || v === 'false' || v === 0 || v === '0') return '0'
  return String(v ?? '')
}

/**
 * 计算单个条件是否满足
 * @param fieldValue 当前字段的值
 * @param relation 操作符 (FILTER_TYPE)
 * @param targetValue 目标值数组
 */
export const evaluateCondition = (
  fieldValue: any,
  relation: number | string,
  targetValue?: any[]
): boolean => {
  const relationNum = Number(relation)
  
  // 获取字段值（处理空值）
  const value = fieldValue ?? null
  const isEmpty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0)

  switch (relationNum) {
    case FILTER_TYPE.EQUAL:
      // 等于（支持布尔值语义转换）
      if (isEmpty) return false
      return targetValue?.some(v => normalizeValue(v) === normalizeValue(value)) ?? false

    case FILTER_TYPE.NOT_EQUAL:
      // 不等于（支持布尔值语义转换）
      if (isEmpty) return true
      return !targetValue?.some(v => normalizeValue(v) === normalizeValue(value)) ?? true

    case FILTER_TYPE.GREATER:
      // 大于
      if (isEmpty) return false
      return Number(value) > Number(targetValue?.[0])

    case FILTER_TYPE.GREATER_EQUAL:
      // 大于等于
      if (isEmpty) return false
      return Number(value) >= Number(targetValue?.[0])

    case FILTER_TYPE.LESS:
      // 小于
      if (isEmpty) return false
      return Number(value) < Number(targetValue?.[0])

    case FILTER_TYPE.LESS_EQUAL:
      // 小于等于
      if (isEmpty) return false
      return Number(value) <= Number(targetValue?.[0])

    case FILTER_TYPE.NULL:
      // 为空
      return isEmpty

    case FILTER_TYPE.NOT_NULL:
      // 不为空
      return !isEmpty

    case FILTER_TYPE.LIKE:
      // 模糊匹配（包含）
      if (isEmpty) return false
      return String(value).includes(String(targetValue?.[0] ?? ''))

    case FILTER_TYPE.NOT_LIKE:
      // 不匹配（不包含）
      if (isEmpty) return true
      return !String(value).includes(String(targetValue?.[0] ?? ''))

    case FILTER_TYPE.IN:
      // 在列表中（支持布尔值语义转换）
      if (isEmpty) return false
      return targetValue?.some(v => normalizeValue(v) === normalizeValue(value)) ?? false

    case FILTER_TYPE.NOT_IN:
      // 不在列表中（支持布尔值语义转换）
      if (isEmpty) return true
      return !targetValue?.some(v => normalizeValue(v) === normalizeValue(value)) ?? true

    case FILTER_TYPE.BETWEEN:
      // 区间
      if (isEmpty) return false
      const numValue = Number(value)
      const left = targetValue?.[0] !== undefined ? Number(targetValue[0]) : -Infinity
      const right = targetValue?.[1] !== undefined ? Number(targetValue[1]) : Infinity
      return numValue >= left && numValue <= right

    case FILTER_TYPE.NOT_BETWEEN:
      // 不在区间
      if (isEmpty) return true
      const numVal = Number(value)
      const l = targetValue?.[0] !== undefined ? Number(targetValue[0]) : -Infinity
      const r = targetValue?.[1] !== undefined ? Number(targetValue[1]) : Infinity
      return numVal < l || numVal > r

    case FILTER_TYPE.CONTAIN:
    case FILTER_TYPE.CONTAIN_IN_OR:
      // 多选字段：包含其中之一
      if (isEmpty) return false
      const multiValue = String(value).split(',').filter(v => v !== '')
      return targetValue?.some(tv => multiValue.includes(String(tv))) ?? false

    case FILTER_TYPE.CONTAIN_IN_AND:
      // 多选字段：包含全部
      if (isEmpty) return false
      const multiVal = String(value).split(',').filter(v => v !== '')
      return targetValue?.every(tv => multiVal.includes(String(tv))) ?? false

    default:
      // 未知操作符，默认返回 true
      return true
  }
}

/**
 * 递归计算条件列表
 * @param condition 条件对象
 * @param allFieldsValue 所有字段值的映射 { attributeId: value }
 */
export const evaluateConditionList = (
  condition: ConditionListType,
  allFieldsValue: Record<string, any>
): boolean => {
  // 如果有嵌套条件列表，递归计算
  if (condition.conditionList && condition.conditionList.length > 0) {
    const results = condition.conditionList.map(c => 
      evaluateConditionList(c, allFieldsValue)
    )
    
    // 根据 andOr 决定组合方式
    // '0' = AND, '1' = OR
    const logic = condition.andOr ?? '0'
    return logic === '0' ? results.every(Boolean) : results.some(Boolean)
  }

  // 单个条件
  if (condition.property) {
    const fieldValue = allFieldsValue[condition.property]
    return evaluateCondition(fieldValue, condition.relation ?? 0, condition.value)
  }

  // 无效条件，默认返回 true
  return true
}

/**
 * 计算字段是否应该显示
 * @param condition 显示条件配置（可以是对象或 JSON 字符串）
 * @param allFieldsValue 所有字段值的映射 { attributeId: value }
 * @returns 是否显示该字段
 */
export const evaluateVisibility = (
  condition: ConditionType | string | null | undefined,
  allFieldsValue: Record<string, any>
): boolean => {
  // 无条件配置，默认显示
  if (!condition) return true

  // 如果是字符串，尝试解析为 JSON
  let parsedCondition: ConditionType | null = null
  if (typeof condition === 'string') {
    try {
      parsedCondition = JSON.parse(condition)
    } catch (e) {
      console.error('解析显示条件失败:', e)
      return true
    }
  } else {
    parsedCondition = condition
  }

  // 无条件列表，默认显示
  if (!parsedCondition.conditionList || parsedCondition.conditionList.length === 0) return true

  // 检查是否有有效条件（至少有一个 property 不为空）
  const hasValidCondition = parsedCondition.conditionList.some(c => 
    c.property || (c.conditionList && c.conditionList.length > 0)
  )
  if (!hasValidCondition) return true

  // 计算条件
  const results = parsedCondition.conditionList.map(c => 
    evaluateConditionList(c, allFieldsValue)
  )

  // 根据 andOr 决定组合方式
  // '0' = AND, '1' = OR
  const logic = parsedCondition.andOr ?? '0'
  return logic === '0' ? results.every(Boolean) : results.some(Boolean)
}

export default evaluateVisibility
