<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

interface Attribute {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  isRequired: string;
  unit?: string;
  defaultValue?: string;
  description?: string;
  minValue?: string;
  maxValue?: string;
  [key: string]: any;
}

interface Props {
  attribute: Attribute;
  modelValue?: any; // v-model 绑定值
  readonly?: boolean;
  showLabel?: boolean; // 是否显示标签
  dictTranslateFn?: (dictName: string, value: string) => Promise<string>; // 字典翻译函数
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showLabel: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
}>()

// 计算当前值：优先使用 modelValue，如果为 undefined 则使用 defaultValue
const currentValue = computed({
  get() {
    return props.modelValue !== undefined
      ? props.modelValue
      : props.attribute.defaultValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

// 开关类型的值计算（与 currentValue 同步）
const switchChecked = computed({
  get() {
    // Switch 类型默认值为 '0'（未选中）
    const value = props.modelValue !== undefined
      ? props.modelValue
      : (props.attribute.defaultValue || '0')
    return value
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

// 字段类型映射
const fieldTypeMap: Record<string, string> = {
  [FIELD_TYPE.DIVIDER]: '分割线',
  [FIELD_TYPE.INPUT]: '文本输入',
  [FIELD_TYPE.SWITCH]: '开关',
  [FIELD_TYPE.NUMBER]: '数值',
  [FIELD_TYPE.SELECT]: '下拉选择',
  [FIELD_TYPE.TREE]: '树形选择',
  [FIELD_TYPE.DATE]: '日期',
  [FIELD_TYPE.DATETIME]: '日期时间',
  [FIELD_TYPE.HREF]: '超链接',
  [FIELD_TYPE.HTML]: 'HTML',
  [FIELD_TYPE.TEXT_AREA]: '文本域',
  [FIELD_TYPE.IMAGE]: '图片',
  [FIELD_TYPE.AUDIO]: '音频',
  [FIELD_TYPE.VIDEO]: '视频',
  [FIELD_TYPE.FILE]: '文件',
}

const getFieldTypeName = (fieldType: string) => {
  return fieldTypeMap[fieldType] || '文本输入'
}

// 判断是否为文本域类型
const isTextAreaType = (fieldType: string) => {
  return (
    fieldType === FIELD_TYPE.TEXT_AREA ||
    fieldType === FIELD_TYPE.HREF ||
    fieldType === FIELD_TYPE.HTML
  )
}

// 判断是否为分割线（兼容数字和字符串类型）
const isDivider = (fieldType: string) => {
  return String(fieldType) === String(FIELD_TYPE.DIVIDER)
}

// 格式化显示值
const formatDisplayValue = (value: any, fieldType: string) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  
  // 开关类型
  if (fieldType === FIELD_TYPE.SWITCH) {
    return value === '1' ? '是' : '否'
  }
  
  // 其他类型直接返回
  return value
}

// 翻译后的显示值（用于 readonly 模式）
const translatedDisplayValue = ref<string>('')

// 当 readonly 模式下，且是 SELECT 类型且有 dictTranslateFn 时，进行翻译
watch(
  () => [props.readonly, currentValue.value, props.attribute.dict, props.dictTranslateFn],
  async () => {
    // 检查 dict 是否有效（不为空字符串）
    const hasValidDict = props.attribute.dict && props.attribute.dict.trim() !== ''
    
    if (
      props.readonly &&
      (props.attribute.fieldType === FIELD_TYPE.SELECT || 
       props.attribute.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE) &&
      hasValidDict &&
      currentValue.value &&
      props.dictTranslateFn
    ) {
      try {
        const label = await props.dictTranslateFn(props.attribute.dict, String(currentValue.value))
        translatedDisplayValue.value = label
      } catch (error) {
        console.error('翻译失败:', error)
        translatedDisplayValue.value = formatDisplayValue(currentValue.value, props.attribute.fieldType)
      }
    } else {
      translatedDisplayValue.value = formatDisplayValue(currentValue.value, props.attribute.fieldType)
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- 分割线 -->
  <div
    v-if="isDivider(attribute.fieldType)"
    class="form-divider-card"
  >
    <a-divider>
      <span
        v-if="attribute.label"
        class="divider-label"
      >
        {{ attribute.label }}
      </span>
    </a-divider>
  </div>

  <!-- 普通表单项 -->
  <div
    v-else
    class="form-item-card"
  >
    <!-- 水平布局：标签和控件 -->
    <div
      class="field-row"
      :class="{ 'is-textarea': isTextAreaType(attribute.fieldType) }"
    >
      <div
        v-if="showLabel"
        class="field-label-inline"
      >
        <span
          :style="{
            color: attribute.isRequired === '1' ? '#1890ff' : '#262626',
            fontWeight: attribute.isRequired === '1' ? 700 : 600,
          }"
        >
          {{ attribute.isRequired === "1" ? "* " : "" }}{{ attribute.label }}
          <span
            v-if="attribute.unit"
            class="field-unit"
          >（{{ attribute.unit }}）</span>
        </span>
      </div>

      <div class="field-control-inline">
        <!-- readonly 模式：使用 span 显示值 -->
        <span
          v-if="readonly"
          class="readonly-value"
        >
          {{ translatedDisplayValue }}
        </span>

        <!-- 编辑模式：显示表单组件 -->
        <template v-else>
          <!-- 文本输入 -->
          <a-input
            v-if="attribute.fieldType === FIELD_TYPE.INPUT"
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :disabled="readonly"
          />

          <!-- 开关 -->
          <div
            v-else-if="attribute.fieldType === FIELD_TYPE.SWITCH"
            style="height: 32px; display: flex; align-items: center"
          >
            <a-switch
              v-model:checked="switchChecked"
              :disabled="readonly"
              style="width: 40px"
              checked-value="1"
              un-checked-value="0"
              @change="(val) => emit('update:modelValue', val)"
            />
          </div>

          <!-- 数值输入 -->
          <a-input-number
            v-else-if="attribute.fieldType === FIELD_TYPE.NUMBER"
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :max="attribute.maxValue ? Number(attribute.maxValue) : undefined"
            :min="attribute.minValue ? Number(attribute.minValue) : undefined"
            :disabled="readonly"
            string-mode
            style="width: 100%"
          />

          <!-- 下拉选择 -->
          <slot
            v-else-if="
              attribute.fieldType === FIELD_TYPE.SELECT ||
                attribute.fieldType === FIELD_TYPE.SELECT_MULTI_IN_ONE
            "
            name="select"
            :attribute="attribute"
            :value="currentValue"
            :readonly="readonly"
            :update-value="(val: any) => emit('update:modelValue', val)"
          >
            <a-select
              v-model:value="currentValue"
              :placeholder="`请选择${attribute.label}`"
              :disabled="readonly"
              style="width: 100%"
            />
          </slot>

          <!-- 树形选择 -->
          <slot
            v-else-if="
              attribute.fieldType === FIELD_TYPE.TREE ||
                attribute.fieldType === FIELD_TYPE.TREE_MULTI_IN_ONE
            "
            name="tree"
            :attribute="attribute"
            :value="currentValue"
            :readonly="readonly"
            :update-value="(val: any) => emit('update:modelValue', val)"
          >
            <a-tree-select
              v-model:value="currentValue"
              :placeholder="`请选择${attribute.label}`"
              :disabled="readonly"
              allow-clear
              tree-default-expand-all
              tree-node-filter-prop="label"
              style="width: 100%"
            />
          </slot>

          <!-- 日期 -->
          <a-date-picker
            v-else-if="attribute.fieldType === FIELD_TYPE.DATE"
            v-model:value="currentValue"
            :placeholder="`请选择${attribute.label}`"
            :disabled="readonly"
            allow-clear
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />

          <!-- 日期时间 -->
          <a-date-picker
            v-else-if="attribute.fieldType === FIELD_TYPE.DATETIME"
            v-model:value="currentValue"
            :placeholder="`请选择${attribute.label}`"
            :disabled="readonly"
            allow-clear
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />

          <!-- 文本域（超链接、HTML、文本域） -->
          <a-textarea
            v-else-if="isTextAreaType(attribute.fieldType)"
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :auto-size="{ minRows: 3 }"
            :disabled="readonly"
            style="width: 100%"
          />

          <!-- 多媒体类型（图片、音频、视频、文件） -->
          <div
            v-else-if="
              attribute.fieldType === FIELD_TYPE.IMAGE ||
                attribute.fieldType === FIELD_TYPE.AUDIO ||
                attribute.fieldType === FIELD_TYPE.VIDEO ||
                attribute.fieldType === FIELD_TYPE.FILE
            "
            style="display: flex; justify-content: center; width: 100%"
          >
            <a-button
              type="dashed"
              :disabled="readonly"
            >
              {{ "点击上传" + getFieldTypeName(attribute.fieldType) }}
            </a-button>
          </div>

          <!-- 默认：文本输入 -->
          <a-input
            v-else
            v-model:value="currentValue"
            :placeholder="`请输入${attribute.label}`"
            :disabled="readonly"
          />
        </template>
      </div>

      <!-- 尾部操作插槽 -->
      <slot
        name="action"
        :attribute="attribute"
      ></slot>
    </div>

    <!-- 描述信息 -->
    <div
      v-if="attribute.description && !readonly"
      class="field-description"
    >
      {{ attribute.description }}
    </div>
  </div>
</template>

<style scoped lang="less">
// 样式已在 GridDraggableLayout 中统一定义
// 这里不需要重复定义，通过 .form-item-card 类名自动应用样式

.readonly-value {
  display: inline-block;
  min-height: 32px;
  line-height: 32px;
  color: #262626;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}

.form-divider-card {
  position: relative;
  height: 100%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  padding: 0 8px;

  :deep(.ant-divider) {
    margin: 0;
    border-top-color: #1890ff;
    border-top-width: 2px;

    .ant-divider-inner-text {
      padding: 0 12px;
    }
  }

  .divider-label {
    font-size: 14px;
    font-weight: 600;
    color: #1890ff;
  }
}
</style>
