<template>
  <div :style="{width: width + 'px', display: 'inline-block'}">
    <a-input
      v-if="type === FIELD_TYPE.INPUT"
      v-model:value="value"
      placeholder="请输入属性值"
      @change="$emit('update:conditionContentValue', value)" />
    <a-input-number
      v-else-if="type === FIELD_TYPE.NUMBER"
      v-model:value="value"
      class="full-width"
      placeholder="请输入属性值"
      type="number"
      @change="$emit('update:conditionContentValue', value)" />
    <a-switch
      v-else-if="type === FIELD_TYPE.SWITCH"
      v-model:checked="value"
      placeholder="请输入属性值"
      @change="$emit('update:conditionContentValue', value)" />
    <a-select
      v-else-if="type === FIELD_TYPE.SELECT"
      v-model:value="value"
      :options="type4Options"
      class="full-width"
      placeholder="请选择属性值"
      @change="$emit('update:conditionContentValue', value)" />

    <a-range-picker
      v-else-if="type === FIELD_TYPE.DATE"
      v-model:value="valueArray"
      :locale="locale"
      class="full-width"
      valueFormat="YYYY-MM-DD HH:mm:ss"
      @change="onDayChange"
    />
    <a-range-picker
      v-else-if="type === FIELD_TYPE.DATETIME"
      v-model:value="valueArray"
      :locale="locale"
      :show-time="true"
      class="full-width"
      valueFormat="YYYY-MM-DD HH:mm:ss"
      @change="onDayChange"
    />
    <a-textarea
      v-else-if="type === FIELD_TYPE.HREF"
      v-model:value="value"
      :rows="1"
      class="full-width"
      placeholder="请输入属性值"
      @change="$emit('update:conditionContentValue', value)" />
    <div v-else></div>
  </div>
</template>

<script lang="ts" setup>
import {Ref} from 'vue'
import {ValueLabel} from '@/framework/utils/type'
import {FIELD_TYPE} from '@/framework/components/common/Portal/type'
import locale from 'ant-design-vue/es/date-picker/locale/zh_CN'
import {isNotEmpty} from '@/framework/utils/common'


const value: Ref = ref()
const valueArray: Ref = ref([])

const type4Options: Ref<ValueLabel[]> = ref([])
const props = defineProps<{ type: string, reference?: Array<ValueLabel>, width: number, conditionContentValue?: Array<any> }>()
const {type, reference} = toRefs(props)

const emit = defineEmits(['update:conditionContentValue'])

const onDayChange = (day: [any, any]) => emit('update:conditionContentValue', day)

const getOption = () => {
  if (type.value === FIELD_TYPE.SELECT && reference && reference.value) {
    type4Options.value = reference.value
  }
}


watch(() => props.type, getOption, {immediate: true})
watch(() => props.reference, getOption, {immediate: true})
watch(() => props.conditionContentValue, () => {
  // console.log('props.conditionContentValue', props.conditionContentValue)
  if (type.value === FIELD_TYPE.DATE || type.value === FIELD_TYPE.DATETIME) {
    valueArray.value = props.conditionContentValue
  } else {
    if (isNotEmpty(props.conditionContentValue)) {
      value.value = props.conditionContentValue![0]
    } else {
      value.value = undefined
    }
  }
}, {immediate: true})

</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
