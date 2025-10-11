<template>
  <div
    id="advancedSearch"
    :style="{width}"
  >
    <Entity
      v-model:condition="advancedCondition"
      :advanced="advanced"
      class="search-item"
    />
  </div>
  <a-button
    style="margin-left: 15px"
    type="primary"
    @click="getCondition"
  >
    {{ okText }}
  </a-button>
  <a-button
    style="margin-left: 15px"
    type="primary"
    @click="resetCondition"
  >
    {{ resetText }}
  </a-button>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import Entity from './Entity/index.vue'

import { AND, genEmptyCondition } from '@/framework/components/common/AdvancedSearch/ConditionList/funs'
import { ConditionType } from '@/framework/components/common/AdvancedSearch/type'
import pinia from '@/framework/store'
import { useAdvancedSearch } from '@/framework/store/AdvancedSearch'
import { dictStore } from '@/framework/store/common'
import { isNotEmpty } from '@/framework/utils/common'
import { ValueLabel } from '@/framework/utils/type'


const useAdvancedSearchStore = useAdvancedSearch(pinia)
const dict = dictStore()
const props = withDefaults(defineProps<{
      width?: number
      columns: Array<any>,
      okText?: string,
      resetText?: string,
      condition?: ConditionType
      advanced?: boolean
    }>(),
    {
      okText: '查询',
      width: 1000,
      resetText: '重置',
      condition: () => ({ conditionList: [genEmptyCondition()], andOr: AND }),
      advanced: true
    }
)
const { okText, resetText, condition } = toRefs(props)
const width = computed(() => props.width ? props.width + 'px' : '1000px')
const advancedCondition:Ref = ref({ conditionList: [genEmptyCondition()], andOr: AND })
const emit = defineEmits(['getCondition'])
const getCondition = () => emit('getCondition', advancedCondition.value)
const resetCondition = () => {
  advancedCondition.value.conditionList = [genEmptyCondition()]
  advancedCondition.value.andOr = AND
}
const updateAdvancedConditionFromProps = () => {
  console.log('updateAdvancedConditionFromProps', condition.value)
  if(isNotEmpty(condition.value)) {
    advancedCondition.value = condition.value
  } else {
    resetCondition()
  }
}
onBeforeMount(async () => {
  const filterColumns = props.columns.map((item: any) => ({
    label: item.title,
    value: item.key,
    fieldType: item.fieldType,
    referenceDictOption: item.referenceDictOption
  })) as any
  useAdvancedSearchStore.setConditionLabelValueTypeOption(filterColumns)
  const conditionDict = await dict.getDict('PORTAL_CONDITION_DICT')
  conditionDict.forEach((item: ValueLabel) => useAdvancedSearchStore.setSelectConditionMap(item.value, item))
  updateAdvancedConditionFromProps()
})

watch(() => props.condition, () => updateAdvancedConditionFromProps, { immediate: true })

</script>

<style scoped>
#advancedSearch {
  max-height: calc(100% - 150px);
  height: auto;
  overflow: auto;
}
</style>
