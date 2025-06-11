import {ConditionListType} from './type'

let currentConditionArrayIndex = 0
export const genEmptyCondition = (): ConditionListType => ({
  id: ++currentConditionArrayIndex,
  property: null,
  relation: null,
  value: [],
  conditionList: [],
  andOr: AND,
  isShow: true
})

export const AND = '0'
export const OR = '1'
