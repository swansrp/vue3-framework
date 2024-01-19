import {ConditionListType} from "./ConditionList/type"

export interface QueryDataType {
  condition: ConditionType
}

export interface ConditionType {
  conditionList: ConditionListType[]
  andOr: string
}

