<template>
  <div class="condition-wrapper">
    <a-select
      size="small"
      style="width: 200px;"
      placeholder="选择属性字段"
      v-model:value="propertyValue"
      :options="propertySelectOptions"
      @change="onPropertyChange" />
    <a-select
      size="small"
      style="width: 130px;"
      placeholder="选择比较关系"
      v-model:value="conditionValue"
      :options="conditionSelectOptions"
      @change="onConditionChange" />
    <ConditionValueComponent
      :width="350"
      :reference="conditionReference"
      :type="conditionType"
      v-model:condition-value="conditionContentValue" />
  </div>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import {ValueLabel} from "@/framework/utils/type"
import {SelectValue} from "ant-design-vue/es/select"
import {useAdvancedSearch} from "@/framework/store/AdvancedSearch"
import ConditionValueComponent from "../ConditionValueComponent/index.vue"
import {getRelation} from "@/framework/components/common/AdvancedSearch/funs";


const useAdvancedSearchStore = useAdvancedSearch()
const emit = defineEmits(['update:property', 'update:relation', 'update:value'])

const props = defineProps<{
  property: string | number,
  relation: string | number | undefined,
  value: string | undefined,
  propertySelectOptions: ValueLabel[]}>()

const { propertySelectOptions } = toRefs(props)
const propertyValue: Ref<number| string | undefined> = ref()
const conditionValue: Ref<number| string| undefined> = ref()
const conditionSelectOptions: Ref<ValueLabel[]> = ref([])
const conditionReference: Ref<ValueLabel[]> = ref([])
const conditionType: Ref<number> = ref(-1)
const conditionTypeTemp: Ref<number> = ref(-1)
const conditionContentValue: Ref<string| undefined | number> = ref()


const onPropertyChange = (_property: SelectValue, option: any) => {
  const { fieldType, referenceDictOption } = option
  const relations = getRelation(fieldType)
  conditionReference.value = referenceDictOption
  conditionTypeTemp.value = +fieldType
  conditionValue.value = undefined
  conditionContentValue.value = undefined
  emit('update:property', propertyValue.value)
  conditionSelectOptions.value = relations.map((item: string) => useAdvancedSearchStore.getSelectConditionMap(item))
}

const onConditionChange = () => {
  conditionType.value = conditionTypeTemp.value
  emit('update:relation', +conditionValue.value!)
}

// 由于ConditionValueComponent是自定义组件，没有 change 事件，所以需要单独监听
watch(conditionContentValue, (value: string | undefined | number | Array<any>) => {
  if (Array.isArray(value)) emit('update:value', value)
  else emit('update:value', [value])
})

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
