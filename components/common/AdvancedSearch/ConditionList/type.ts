export interface ConditionListType {
  id: number
  property: string
  value: string | Array<string>
  relation: number | string | undefined
  conditionList: Array<ConditionListType>
  andOr: string
  isShow: boolean
}
