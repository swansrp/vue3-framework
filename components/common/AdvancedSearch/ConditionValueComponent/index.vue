<template>
  <div
    class="cvc-root"
    :class="{ 'cvc-no-var': allowVariable === false }"
    :style="{ width: width + 'px' }"
  >
    <div class="cvc-main">
      <!-- 输入 / 关联实体 -->
      <template v-if="type === FIELD_TYPE.INPUT || type === FIELD_TYPE.ENTITY">
        <span class="cvc-slot">
          <VariableChip
            v-if="singleVar"
            :value="value"
            @update:value="setSingle"
          />
          <a-input
            v-else
            v-model:value="value"
            placeholder="请输入属性值"
            @change="$emit('update:conditionContentValue', value)"
          />
          <button
            class="cvc-fx"
            :class="{ on: singleVar }"
            title="切换普通值 / 变量"
            @click="toggleSingle"
          >
            ƒ
          </button>
        </span>
      </template>

      <!-- 数字 / 金额 -->
      <template v-else-if="type === FIELD_TYPE.NUMBER || type === FIELD_TYPE.MONEY">
        <!-- 区间：任一侧是变量 → 拆左右槽位，各侧独立；两侧都不是变量 → 走原区间控件 -->
        <span
          v-if="isBetweenRelation && rangeVar"
          class="cvc-slot"
        >
          <span class="cvc-range">
            <span class="cvc-range-side">
              <VariableChip
                v-if="leftVar"
                :value="valueArray[0]"
                @update:value="(t) => setRangeSide(0, t)"
              />
              <a-input-number
                v-else
                v-model:value="valueArray[0]"
                class="cvc-num"
                placeholder="大于等于"
                @change="onNumberChange"
              />
              <button
                class="cvc-fx"
                :class="{ on: leftVar }"
                title="切换普通值 / 变量"
                @click="toggleRangeSide(0)"
              >
                ƒ
              </button>
            </span>
            <span class="cvc-sep">~</span>
            <span class="cvc-range-side">
              <VariableChip
                v-if="rightVar"
                :value="valueArray[1]"
                @update:value="(t) => setRangeSide(1, t)"
              />
              <a-input-number
                v-else
                v-model:value="valueArray[1]"
                class="cvc-num"
                placeholder="小于等于"
                @change="onNumberChange"
              />
              <button
                class="cvc-fx"
                :class="{ on: rightVar }"
                title="切换普通值 / 变量"
                @click="toggleRangeSide(1)"
              >
                ƒ
              </button>
            </span>
          </span>
        </span>
        <span
          v-else-if="isBetweenRelation"
          class="cvc-slot"
        >
          <a-input-group
            compact
            class="cvc-flex1"
          >
            <a-input-number
              v-model:value="valueArray[0]"
              placeholder="大于等于"
              style="width: calc(50% - 15px); text-align: center"
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
              style="width: calc(50% - 15px); text-align: center"
              @change="onNumberChange"
            />
          </a-input-group>
          <button
            class="cvc-fx"
            title="切换普通值 / 变量"
            @click="toggleRangeSide(0)"
          >
            ƒ
          </button>
        </span>
        <span
          v-else-if="+(relation ?? 0) === FILTER_TYPE.IN"
          class="cvc-slot"
        >
          <a-input
            v-model:value="value"
            class="cvc-flex1"
            placeholder="输入属性值(逗号隔开)"
            @change="$emit('update:conditionContentValue', value.split(','))"
          />
        </span>
        <span
          v-else
          class="cvc-slot"
        >
          <VariableChip
            v-if="singleVar"
            :value="value"
            @update:value="setSingle"
          />
          <a-input-number
            v-else
            v-model:value="value"
            class="cvc-flex1"
            placeholder="请输入属性值"
            type="number"
            @change="$emit('update:conditionContentValue', value)"
          />
          <button
            class="cvc-fx"
            :class="{ on: singleVar }"
            title="切换普通值 / 变量"
            @click="toggleSingle"
          >
            ƒ
          </button>
        </span>
      </template>

      <!-- 开关（枚举，不支持变量） -->
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

      <!-- 字典（枚举，不支持变量） -->
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
      <template v-else-if="type === FIELD_TYPE.TREE || type === FIELD_TYPE.TREE_MULTI_IN_ONE">
        <!-- 树形字典：此前无分支（树形字段值框渲染空白），补齐 a-tree-select；树数据由调用方经 reference 传入 -->
        <a-tree-select
          v-model:value="valueArray"
          :tree-data="(reference as any)"
          class="full-width"
          placeholder="请选择属性值"
          allow-clear
          tree-default-expand-all
          @change="$emit('update:conditionContentValue', valueArray)"
        />
      </template>

      <!-- 日期 / 日期时间 -->
      <template v-else-if="type === FIELD_TYPE.DATE || type === FIELD_TYPE.DATETIME">
        <div class="date-value-wrapper">
          <!-- 区间：任一侧变量 → 左右槽位 -->
          <span
            v-if="isBetweenRelation && rangeVar"
            class="cvc-range"
          >
            <span class="cvc-range-side">
              <VariableChip
                v-if="leftVar"
                :value="valueArray[0]"
                @update:value="(t) => setDateRangeSide(0, t)"
              />
              <a-date-picker
                v-else
                v-model:value="valueArray[0]"
                :show-time="type === FIELD_TYPE.DATETIME"
                :value-format="type === FIELD_TYPE.DATETIME ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                class="cvc-num"
                @change="onDateSideChange"
              />
              <button
                class="cvc-fx"
                :class="{ on: leftVar }"
                title="切换普通值 / 变量"
                @click="toggleDateRangeSide(0)"
              >
                ƒ
              </button>
            </span>
            <span class="cvc-sep">~</span>
            <span class="cvc-range-side">
              <VariableChip
                v-if="rightVar"
                :value="valueArray[1]"
                @update:value="(t) => setDateRangeSide(1, t)"
              />
              <a-date-picker
                v-else
                v-model:value="valueArray[1]"
                :show-time="type === FIELD_TYPE.DATETIME"
                :value-format="type === FIELD_TYPE.DATETIME ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                class="cvc-num"
                @change="onDateSideChange"
              />
              <button
                class="cvc-fx"
                :class="{ on: rightVar }"
                title="切换普通值 / 变量"
                @click="toggleDateRangeSide(1)"
              >
                ƒ
              </button>
            </span>
          </span>
          <!-- 单值变量 → 芯片 -->
          <span
            v-else-if="!isBetweenRelation && singleVar"
            class="cvc-slot"
          >
            <VariableChip
              :value="value"
              @update:value="setSingle"
            />
            <button
              class="cvc-fx on"
              title="切换普通值 / 变量"
              @click="toggleSingle"
            >
              ƒ
            </button>
          </span>
          <!-- 占位符模式（$1/$2）保持原样 -->
          <template v-else-if="placeholderMode">
            <a-input-group
              v-if="isBetweenRelation"
              compact
              class="cvc-flex1"
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
              class="cvc-flex1"
              placeholder="占位符，如 $1"
              @change="emit('update:conditionContentValue', value)"
            />
          </template>
          <!-- 区间普通值：原生 range-picker + ƒ 进入槽位 -->
          <template v-else-if="isBetweenRelation">
            <a-range-picker
              v-model:value="valueArray"
              :locale="locale"
              :show-time="type === FIELD_TYPE.DATETIME"
              class="cvc-flex1"
              value-format="YYYY-MM-DD HH:mm:ss"
              @change="onRangeChange"
            />
            <button
              class="cvc-fx"
              title="切换普通值 / 变量"
              @click="toggleDateRangeSide(0)"
            >
              ƒ
            </button>
          </template>
          <!-- 单值普通日期 -->
          <template v-else>
            <a-date-picker
              v-model:value="value"
              class="cvc-flex1"
              :show-time="type === FIELD_TYPE.DATETIME"
              :value-format="type === FIELD_TYPE.DATETIME ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
              @change="emit('update:conditionContentValue', value)"
            />
            <button
              class="cvc-fx"
              title="切换普通值 / 变量"
              @click="toggleSingle"
            >
              ƒ
            </button>
          </template>
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

      <!-- 长文本 -->
      <template v-else-if="type === FIELD_TYPE.HREF">
        <span class="cvc-slot">
          <VariableChip
            v-if="singleVar"
            :value="value"
            @update:value="setSingle"
          />
          <a-textarea
            v-else
            v-model:value="value"
            :rows="1"
            class="cvc-flex1"
            placeholder="请输入属性值"
            @change="$emit('update:conditionContentValue', value)"
          />
          <button
            class="cvc-fx"
            :class="{ on: singleVar }"
            title="切换普通值 / 变量"
            @click="toggleSingle"
          >
            ƒ
          </button>
        </span>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import locale from 'ant-design-vue/es/date-picker/locale/zh_CN'
import { Ref } from 'vue'

import { FIELD_TYPE, FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { ValueLabel } from '@/framework/utils/type'

import VariableChip from './VariableChip.vue'


const value: Ref = ref()
const valueArray: Ref = ref([])

const type4Options: Ref<ValueLabel[]> = ref([])
const props = defineProps<{ type: string, relation: number | string | null, reference?: Array<ValueLabel>, width: number, conditionContentValue?: Array<any>, allowVariable?: boolean }>()
const { type, reference, relation } = toRefs(props)

const emit = defineEmits(['update:conditionContentValue'])

// 占位符（$1/$2/${变量}）识别：配置态条件值可能是占位符而非真实日期
const PLACEHOLDER_PATTERN = /^\$(?:\d+|\{[^}]*\})$/
const isPlaceholderValue = (v: any) => typeof v === 'string' && PLACEHOLDER_PATTERN.test(v)
const hasPlaceholder = (values: any) =>
  (Array.isArray(values) ? values : [values]).some(isPlaceholderValue)

// 变量识别：仅 ${...} 形态（与 $1 占位区分）
const isVarVal = (v: any) => typeof v === 'string' && /^\$\{[^}]*\}$/.test(v)

// allowVariable=false（筛选面板胶囊等纯值场景）：不进变量槽位态、隐藏 ƒ 切换钮，
// token 一律按普通值显示（上层负责把可解析的 ${} 先换成真值）
const allowVar = computed(() => props.allowVariable !== false)
const singleVar = computed(() => allowVar.value && isVarVal(value.value))
const leftVar = computed(() => allowVar.value && isVarVal(valueArray.value?.[0]))
const rightVar = computed(() => allowVar.value && isVarVal(valueArray.value?.[1]))
// 区间任一侧是变量即拆左右槽位（两侧都清空后自动回到原生区间控件）
const rangeVar = computed(() => leftVar.value || rightVar.value)

const placeholderMode = ref(false)
const isBetweenRelation = computed(() =>
  +(relation.value ?? 0) === FILTER_TYPE.BETWEEN || +(relation.value ?? 0) === FILTER_TYPE.NOT_BETWEEN
)

// ===== 变量态切换 =====
const DEFAULT_VAR = '${currentYear}'
// 单值：设置变量 → 直接回传（各单值分支原生 emit 就是一个值，保持一致）
const setSingle = (token: string) => {
  value.value = token
  emit('update:conditionContentValue', token)
}
const toggleSingle = () => {
  if (singleVar.value) {
    value.value = undefined
    placeholderMode.value = false
    emit('update:conditionContentValue', undefined)
  } else {
    setSingle(DEFAULT_VAR)
  }
}
// 数字区间单侧
const setRangeSide = (index: number, token: string) => {
  if (!Array.isArray(valueArray.value)) valueArray.value = []
  valueArray.value[index] = token
  onNumberChange()
}
const toggleRangeSide = (index: number) => {
  if (isVarVal(valueArray.value?.[index])) {
    valueArray.value[index] = undefined
    onNumberChange()
  } else {
    setRangeSide(index, DEFAULT_VAR)
  }
}
// 日期区间单侧
const setDateRangeSide = (index: number, token: string) => {
  if (!Array.isArray(valueArray.value)) valueArray.value = []
  valueArray.value[index] = token
  emit('update:conditionContentValue', [valueArray.value[0], valueArray.value[1]])
}
const toggleDateRangeSide = (index: number) => {
  if (isVarVal(valueArray.value?.[index])) {
    valueArray.value[index] = undefined
    emit('update:conditionContentValue', [valueArray.value[0], valueArray.value[1]])
  } else {
    setDateRangeSide(index, DEFAULT_VAR)
  }
}
// 槽位模式下单个日期侧变化：按类型补时间边界后回传
const onDateSideChange = () => {
  const arr = [valueArray.value?.[0], valueArray.value?.[1]]
  if (type.value !== FIELD_TYPE.DATETIME) {
    arr.forEach((v: any, i: number) => {
      if (typeof v === 'string' && v.includes(' ') === false && !isVarVal(v)) {
        arr[i] = v + (i === 0 ? ' 00:00:00' : ' 23:59:59')
      }
    })
  }
  emit('update:conditionContentValue', arr.filter((v: any) => v !== undefined && v !== null && v !== ''))
}

const onPlaceholderRangeChange = () => {
  // 清空过的格子留下 ''，与未填同义：剔除后再回传，避免把空槽存进条件值
  const slots = [valueArray.value[0], valueArray.value[1]].filter((v: any) => v !== '' && v !== undefined && v !== null)
  emit('update:conditionContentValue', slots)
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
  if (allowVar.value && hasPlaceholder(props.conditionContentValue)) {
    placeholderMode.value = true
  }
}, { immediate: true })

// 换关系/换字段时按新值重新判定模式（值编辑过程中的回传不重置）
watch(() => props.relation, () => {
  placeholderMode.value = allowVar.value && hasPlaceholder(props.conditionContentValue)
})

</script>

<style scoped>
.cvc-root {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cvc-main {
  flex: 1;
  min-width: 0;
}

.cvc-slot {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.cvc-flex1 {
  flex: 1;
  min-width: 0;
}

.cvc-range {
  display: flex;
  align-items: center;
  gap: 4px;
  /* 占满并让两侧等分 */
  width: 100%;
  min-width: 0;
}

.cvc-range-side {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.cvc-num {
  flex: 1;
  min-width: 0;
}

.cvc-sep {
  color: #bfbfbf;
  font-size: 12px;
  flex-shrink: 0;
}

/* 纯值场景（allowVariable=false）：隐藏全部 ƒ 变量切换钮 */
.cvc-root.cvc-no-var .cvc-fx {
  display: none;
}

/* 小 ƒ：主题色，未激活淡化，激活实心 */
.cvc-fx {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid var(--border-hover, #e0e0e0);
  border-radius: 5px;
  background: transparent;
  color: var(--text-tertiary, #c0c4cc);
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}

.cvc-fx:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.cvc-fx.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.full-width {
  width: 100%;
}

.date-value-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 4px;
}

.date-value-wrapper > :first-child {
  flex: 1;
  min-width: 0;
}

.placeholder-toggle {
  flex-shrink: 0;
  margin-left: 0;
  padding: 0 4px;
  font-size: 12px;
}
</style>