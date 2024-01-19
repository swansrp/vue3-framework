import { defineStore } from 'pinia'
import {ValueLabel} from "@/framework/utils/type"


interface SelectConditionMapType { [key: string]: ValueLabel }
interface ConditionLabelValueType extends ValueLabel { fieldType: string | number}

export const useAdvancedSearch = defineStore('AdvancedSearchStore', {
  state: () => {
    return {
      selectConditionMap: {} as SelectConditionMapType,
      ConditionLabelValueTypeOption: [] as ConditionLabelValueType[]
    }
  },
  actions: {
    setSelectConditionMap(key: string, value: ValueLabel){ this.selectConditionMap[key] = value },
    getSelectConditionMap(key: string): ValueLabel { return this.selectConditionMap[key] },
    setConditionLabelValueTypeOption(option: ConditionLabelValueType[]) { this.ConditionLabelValueTypeOption = option },
    getConditionLabelValueTypeOption() { return this.ConditionLabelValueTypeOption }
  }
})
