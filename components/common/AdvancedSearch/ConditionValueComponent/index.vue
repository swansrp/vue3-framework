<template>
  <div :style="{width: width + 'px', display: 'inline-block'}">
    <template v-if="type === FIELD_TYPE.INPUT">
      <a-input
        v-model:value="value"
        placeholder="请输入属性值"
        @change="$emit('update:conditionContentValue', value)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.NUMBER">
      <a-input-number
        v-if="+relation !== FILTER_TYPE.BETWEEN && +relation !== FILTER_TYPE.IN"
        v-model:value="value"
        class="full-width"
        placeholder="请输入属性值"
        type="number"
        @change="$emit('update:conditionContentValue', value)"
      />
      <a-input-group
        v-else-if="+relation === FILTER_TYPE.BETWEEN"
        compact
      >
        <a-input-number
          v-model:value="valueArray[0]"
          placeholder="大于等于"
          style="width: 100px; text-align: center"
          @change="onNumberChange"
        />
        <a-input
          class="site-input-split"
          disabled
          placeholder="~"
          style="width: 30px; border-left: 0; pointer-events: none"
        />
        <a-input-number
          v-model:value="valueArray[1]"
          class="site-input-right"
          placeholder="小于等于"
          style="width: 100px; text-align: center"
          @change="onNumberChange"
        />
      </a-input-group>
      <a-input
        v-else-if="+relation === FILTER_TYPE.IN"
        v-model:value="value"
        placeholder="输入属性值(逗号隔开)"
        @change="$emit('update:conditionContentValue', value.split(','))"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.SWITCH">
      <a-switch
        v-model:checked="value"
        placeholder="请输入属性值"
        @change="$emit('update:conditionContentValue', value)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.SELECT || type === FIELD_TYPE.SELECT_MULTI_IN_ONE">
      <a-select
        v-model:value="valueArray"
        :options="type4Options"
        class="full-width"
        mode="multiple"
        placeholder="请选择属性值"
        @change="$emit('update:conditionContentValue', valueArray)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.DATE">
      <a-range-picker
        v-if="+relation === FILTER_TYPE.BETWEEN || +relation === FILTER_TYPE.NOT_BETWEEN"
        v-model:value="value"
        :locale="locale"
        class="full-width"
        value-format="YYYY-MM-DD HH:mm:ss"
        @change="onDayChange"
      />
      <a-date-picker
        v-else
        v-model:value="value"
        @change="emit('update:conditionContentValue', value)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.DATETIME">
      <a-range-picker
        v-if="+relation === FILTER_TYPE.BETWEEN || +relation === FILTER_TYPE.NOT_BETWEEN"
        v-model:value="valueArray"
        :locale="locale"
        :show-time="true"
        class="full-width"
        value-format="YYYY-MM-DD HH:mm:ss"
        @change="onDayTimeChange"
      />
      <a-date-picker
        v-else
        v-model:value="value"
        show-time
        @change="emit('update:conditionContentValue', value)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.HREF">
      <a-textarea
        v-model:value="value"
        :rows="1"
        class="full-width"
        placeholder="请输入属性值"
        @change="$emit('update:conditionContentValue', value)"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import locale from 'ant-design-vue/es/date-picker/locale/zh_CN'
import { Ref } from 'vue'

import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { ValueLabel } from '@/framework/utils/type'


const value: Ref = ref()
const valueArray: Ref = ref([])

const type4Options: Ref<ValueLabel[]> = ref([])
const props = defineProps<{ type: string, relation: number | string | null, reference?: Array<ValueLabel>, width: number, conditionContentValue?: Array<any> }>()
const { type, reference, relation } = toRefs(props)

const emit = defineEmits(['update:conditionContentValue'])

const onDayChange = (day: [any, any]) => {
  if (day) {
    day[0] = day[0].split(' ')[0] + ' 00:00:00'
    day[1] = day[1].split(' ')[0] + ' 23:59:59'
  }
  emit('update:conditionContentValue', day)
}

const onDayTimeChange = (day: [any, any]) => {
  emit('update:conditionContentValue', day)
}

const onNumberChange = () => {
  const left = valueArray.value[0] === 0 ? 0 : valueArray.value[0]
  const right = valueArray.value[1] === 0 ? 0 : valueArray.value[1]
  emit('update:conditionContentValue', [left, right])
}

const getOption = () => {
  if ((type.value === FIELD_TYPE.SELECT || type.value === FIELD_TYPE.SELECT_MULTI_IN_ONE) && reference && reference.value) {
    type4Options.value = reference.value
  }
}

watch(() => props.type, getOption, { immediate: true })
watch(() => props.reference, getOption, { immediate: true })
watch(() => props.conditionContentValue, () => {
  valueArray.value = Array.isArray(props.conditionContentValue) ? props.conditionContentValue : []
  value.value = Array.isArray(props.conditionContentValue) ? (props.conditionContentValue[0]) : undefined
}, { immediate: true })

</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
