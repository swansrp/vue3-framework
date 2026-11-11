<template>
  <div :style="{width: width + 'px', display: 'inline-block'}">
    <template v-if="type === FIELD_TYPE.INPUT || type === FIELD_TYPE.ENTITY">
      <a-input
        v-model:value="value"
        placeholder="请输入属性值"
        @change="$emit('update:conditionContentValue', value)"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.NUMBER || type === FIELD_TYPE.MONEY">
      <a-input-number
        v-if="+(relation ?? 0) !== FILTER_TYPE.BETWEEN && +(relation ?? 0) !== FILTER_TYPE.IN"
        v-model:value="value"
        class="full-width"
        placeholder="请输入属性值"
        type="number"
        @change="$emit('update:conditionContentValue', value)"
      />
      <a-input-group
        v-else-if="+(relation ?? 0) === FILTER_TYPE.BETWEEN"
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
        v-else-if="+(relation ?? 0) === FILTER_TYPE.IN"
        v-model:value="value"
        placeholder="输入属性值(逗号隔开)"
        @change="$emit('update:conditionContentValue', value.split(','))"
      />
    </template>
    <template v-else-if="type === FIELD_TYPE.SWITCH">
      <a-radio-group
        v-model:value="value"
        @change="$emit('update:conditionContentValue', [value])"
      >
        <a-radio value="1">
          是
        </a-radio>
        <a-radio value="0">
          否
        </a-radio>
      </a-radio-group>
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
    <template v-else-if="type === FIELD_TYPE.DATE || type === FIELD_TYPE.DATETIME">
      <div class="date-value-wrapper">
        <!-- 占位符模式：$1/$2/${变量} 不是合法日期，日期控件会显示 Invalid Date 且无法输入，
             配置态改用文本输入原样展示/编辑；「占位」按钮可手动切入，供大于/小于等单值关系填 $1 -->
        <template v-if="placeholderMode">
          <a-input-group
            v-if="isBetweenRelation"
            compact
            class="full-width"
          >
            <a-input
              v-model:value="valueArray[0]"
              placeholder="如 $1"
              style="width: calc(50% - 15px)"
              @change="onPlaceholderRangeChange"
            />
            <a-input
              disabled
              placeholder="~"
              style="width: 30px; border-left: 0; pointer-events: none"
            />
            <a-input
              v-model:value="valueArray[1]"
              placeholder="如 $2"
              style="width: calc(50% - 15px)"
              @change="onPlaceholderRangeChange"
            />
          </a-input-group>
          <a-input
            v-else
            v-model:value="value"
            class="full-width"
            placeholder="占位符，如 $1"
            @change="emit('update:conditionContentValue', value)"
          />
        </template>
        <a-range-picker
          v-else-if="isBetweenRelation"
          v-model:value="valueArray"
          :locale="locale"
          :show-time="type === FIELD_TYPE.DATETIME"
          class="full-width"
          value-format="YYYY-MM-DD HH:mm:ss"
          @change="onRangeChange"
        />
        <a-date-picker
          v-else
          v-model:value="value"
          :show-time="type === FIELD_TYPE.DATETIME"
          :value-format="type === FIELD_TYPE.DATETIME ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
          @change="emit('update:conditionContentValue', value)"
        />
        <a-tooltip :title="placeholderMode ? '切换回日期选择' : '切换为文本输入，可填 $1/$2 占位符'">
          <a-button
            class="placeholder-toggle"
            size="small"
            type="text"
            @click="placeholderMode = !placeholderMode"
          >
            {{ placeholderMode ? '日期' : '占位' }}
          </a-button>
        </a-tooltip>
      </div>
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

// 占位符（$1/$2/${变量}）识别：配置态条件值可能是占位符而非真实日期
const PLACEHOLDER_PATTERN = /^\$(?:\d+|\{[^}]*\})$/
const isPlaceholderValue = (v: any) => typeof v === 'string' && PLACEHOLDER_PATTERN.test(v)
const hasPlaceholder = (values: any) =>
  (Array.isArray(values) ? values : [values]).some(isPlaceholderValue)

const placeholderMode = ref(false)
const isBetweenRelation = computed(() =>
  +(relation.value ?? 0) === FILTER_TYPE.BETWEEN || +(relation.value ?? 0) === FILTER_TYPE.NOT_BETWEEN
)

const onPlaceholderRangeChange = () => {
  emit('update:conditionContentValue', [valueArray.value[0], valueArray.value[1]])
}

const onRangeChange = (day: [any, any]) => {
  if (type.value === FIELD_TYPE.DATETIME) {
    onDayTimeChange(day)
  } else {
    onDayChange(day)
  }
}

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
  let val = Array.isArray(props.conditionContentValue) ? (props.conditionContentValue[0]) : undefined
  // Switch 类型：布尔值转换为 "1"/"0"
  if (type.value === FIELD_TYPE.SWITCH) {
    if (val === true || val === 'true' || val === 1 || val === '1') {
      val = '1'
    } else if (val === false || val === 'false' || val === 0 || val === '0') {
      val = '0'
    }
  }
  value.value = val
  // 只自动切入、不自动切出：文本模式里边打字边回传，'$' 半成品不匹配占位符，
  // 若随值变化自动关闭会把用户正敲到一半的输入框闪回日期控件
  if (hasPlaceholder(props.conditionContentValue)) {
    placeholderMode.value = true
  }
}, { immediate: true })

// 换关系/换字段时按新值重新判定模式（值编辑过程中的回传不重置）
watch(() => props.relation, () => {
  placeholderMode.value = hasPlaceholder(props.conditionContentValue)
})

</script>

<style scoped>
.full-width {
  width: 100%;
}

.date-value-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
}

.date-value-wrapper > :first-child {
  flex: 1;
  min-width: 0;
}

.placeholder-toggle {
  flex-shrink: 0;
  margin-left: 4px;
  padding: 0 4px;
  font-size: 12px;
}
</style>
