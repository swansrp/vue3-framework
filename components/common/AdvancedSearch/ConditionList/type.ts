export interface ConditionListType {
    id?: number
    property?: string | null
    value?: Array<any> | null
    relation?: number | string | null
    conditionList: Array<ConditionListType>
    andOr?: string
    isShow?: boolean
}
