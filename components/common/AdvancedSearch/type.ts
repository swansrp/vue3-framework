import { ConditionListType } from './ConditionList/type'

export interface ConditionType {
    conditionList: Array<ConditionListType>
    andOr: '0' | '1'
}

