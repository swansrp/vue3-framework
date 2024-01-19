<template>
  <div :style="{width: width + 'px', display: 'inline-block'}">
    <a-input
      size="small"
      v-if="type === +FIELD_TYPE.INPUT"
      v-model:value="type1value"
      placeholder="请输入属性值"
      @change="$emit('update:conditionValue', type1value)" />
    <a-input-number
      type="number"
      size="small"
      v-else-if="type === +FIELD_TYPE.NUMBER"
      v-model:value="type2value"
      placeholder="请输入属性值"
      class="full-width"
      @change="$emit('update:conditionValue', type2value)" />
    <a-switch
      size="small"
      v-else-if="type === +FIELD_TYPE.SWITCH"
      v-model:checked="type3value"
      placeholder="请输入属性值"
      @change="$emit('update:conditionValue', type3value)" />
    <a-select
      size="small"
      v-else-if="type === +FIELD_TYPE.SELECT"
      class="full-width"
      v-model:value="type4value"
      :options="type4Options"
      placeholder="请选择属性值"
      @change="$emit('update:conditionValue', type4value)" />

    <a-range-picker
      size="small"
      v-else-if="type === +FIELD_TYPE.DATE"
      v-model:value="type6value"
      @change="onDayChange"
      :locale="locale"
      class="full-width"
      valueFormat="YYYY-MM-DD HH:mm:ss"
    />
    <a-range-picker
      size="small"
      v-else-if="type === +FIELD_TYPE.DATETIME"
      :show-time="true"
      :locale="locale"
      class="full-width"
      v-model:value="type7value"
      @change="onDayChange"
      valueFormat="YYYY-MM-DD HH:mm:ss"
    />
    <a-textarea
      size="small"
      class="full-width"
      v-else-if="type === +FIELD_TYPE.HREF"
      v-model:value="type8value"
      placeholder="请输入属性值"
      :rows="1"
      @change="$emit('update:conditionValue', type8value)" />

    <a-input v-else disabled placeholder="选择属性字段后再填写" size="small" />
  </div>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import type { Dayjs } from 'dayjs'
import {ValueLabel} from "@/framework/utils/type"
import {SelectValue} from "ant-design-vue/es/select"
import {FIELD_TYPE} from "@/framework/components/common/portal/type"
import locale from 'ant-design-vue/es/date-picker/locale/zh_CN'


type RangeValue = [Dayjs, Dayjs]

const type1value: Ref<string | undefined> = ref()
const type2value: Ref<number | undefined> = ref()
const type3value: Ref<boolean | undefined> = ref()
const type4value: Ref<SelectValue> = ref()
const type6value: Ref<RangeValue | undefined> = ref()
const type7value: Ref<RangeValue | undefined> = ref()
const type8value: Ref<string | undefined> = ref()

const type4Options: Ref<ValueLabel[]> = ref([])
const props = defineProps<{type: number, reference?: Array<ValueLabel>, width: number, conditionValue: string | undefined | number}>()
const {type, reference} = toRefs(props)

const emit = defineEmits(['update:conditionValue'])

const onDayChange = (day: [any, any]) => emit('update:conditionValue', day)

const getOption = () => {
  if (type.value === 4 && reference && reference.value) {
    type4Options.value = reference.value
  }
}


watch(() => props.type, getOption, {immediate: true})
watch(() => props.reference, getOption, {immediate: true})

</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
