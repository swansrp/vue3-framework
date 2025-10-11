<template>
  <div class="condition-wrapper">
    <a-select
      v-model:value="propertyValue"
      :options="propertySelectOptions"
      placeholder="选择属性字段"
      style="width: 200px;"
      @change="onPropertyChange"
    />
    <a-select
      v-model:value="relationValue"
      :options="conditionSelectOptions"
      placeholder="选择比较关系"
      style="width: 130px;"
      @change="onConditionChange"
    />
    <ConditionValueComponent
      v-model:condition-content-value="conditionContentValue"
      :reference="conditionReference"
      :type="conditionType"
      :relation="relationValue"
      :width="350"
    />
  </div>
</template>

<script lang="ts" setup>
import { SelectValue } from 'ant-design-vue/es/select'
import { Ref } from 'vue'


import ConditionValueComponent from '../ConditionValueComponent/index.vue'

import { getRelation } from '@/framework/components/common/AdvancedSearch/funs'
import { useAdvancedSearch } from '@/framework/store/AdvancedSearch'
import { isNotEmpty } from '@/framework/utils/common'
import { ValueLabel } from '@/framework/utils/type'


const useAdvancedSearchStore = useAdvancedSearch()
const emit = defineEmits(['update:property', 'update:relation', 'update:value'])

const props = defineProps<{
  property?: string | null,
  relation?: number | string | null,
  value: Array<any>,
  propertySelectOptions: Array<any>
}>()

// 字段选择值
const propertyValue: Ref<any> = ref()
// 字段下拉列表
const { propertySelectOptions } = toRefs(props)

// 关系选择值
const relationValue: Ref<number | string | undefined | null> = ref()
// 关系下拉列表内容
const conditionSelectOptions: Ref<ValueLabel[]> = ref([])

// 内容值
const conditionContentValue: Ref = ref()
// 内容下拉列表
const conditionReference: Ref<ValueLabel[]> = ref([])
// 内容类型
const conditionType: Ref = ref('')
const conditionTypeTemp: Ref = ref('')

const propertySelectMap = computed(() => {
  const map = new Map()
  propertySelectOptions.value?.forEach((item: any) => map.set(item.value, item))
  return map
})

const onPropertyChange = (_property: SelectValue, option: any) => {
  console.log('onPropertyChange', option)
  const { fieldType, referenceDictOption } = option
  const relations = getRelation(fieldType)
  conditionReference.value = referenceDictOption
  conditionTypeTemp.value = fieldType
  relationValue.value = null
  conditionContentValue.value = null
  emit('update:property', propertyValue.value)
  conditionSelectOptions.value = relations.map((item: string) => useAdvancedSearchStore.getSelectConditionMap(item))
}

const onConditionChange = () => {
  console.log('onConditionChange')
  if (isNotEmpty(conditionTypeTemp.value)) {
    conditionType.value = conditionTypeTemp.value
  } else {
    conditionType.value = propertyValue.value && propertySelectMap.value.get(propertyValue.value)?.fieldType
  }
  emit('update:relation', relationValue.value)
}

const render = () => {
  if (isNotEmpty(props.propertySelectOptions)) {
    const propertySelectArray = props.propertySelectOptions.filter((item) => item.value === propertyValue.value)
    if (isNotEmpty(propertySelectArray)) {
      const { fieldType, referenceDictOption } = propertySelectArray[0]
      const relations = getRelation(fieldType)
      // 内容下拉列表
      conditionReference.value = referenceDictOption
      // 内容类型
      conditionType.value = fieldType

      // 关系下拉列表内容
      conditionSelectOptions.value = relations.map((item: string) => useAdvancedSearchStore.getSelectConditionMap(item))
    }
  }
}

// 由于ConditionValueComponent是自定义组件，没有 change 事件，所以需要单独监听
watch(conditionContentValue, (value: string | undefined | number | Array<any> | null) => {
  if (Array.isArray(value)) emit('update:value', value)
  else if (isNotEmpty(value)) emit('update:value', [value])
  else emit('update:value', [])
})

watch(() => props.property,
  () => {
    propertyValue.value = props.property
    render()
  },
  { immediate: true }
)
watch(() => props.relation, () => {
  // 关系选择值
  relationValue.value = props.relation && String(props.relation)
}, { immediate: true })
watch(() => props.value, () => {
  // console.log('props.value', props.value)
  // 内容值
  conditionContentValue.value = props.value
}, { immediate: true })
watch(() => props.propertySelectOptions, () => {
  // console.log(' props.propertySelectOptions', props.propertySelectOptions)
  render()
}, { immediate: true })

</script>

<style scoped>
.condition-wrapper {
  padding: 2px 0 0 0;
  display: flex;
  align-items: center;
}

.condition-wrapper > * {
  margin-right: 10px;
}
</style>
