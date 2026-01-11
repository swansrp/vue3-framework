<script setup lang="ts" generic="T extends FormFieldItem">
import { message } from 'ant-design-vue'
import { ref, computed, watch } from 'vue'

import GridDraggableLayout, { type GridItem } from './GridDraggableLayout.vue'

import DynamicFormItem from '@/framework/components/common/dynamicFormItem/index.vue'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

/**
 * 表单字段项接口
 */
export interface FormFieldItem extends GridItem {
  id: string | number
  name: string              // 字段名称
  label: string             // 字段标签
  fieldType: string         // 字段类型
  isRequired?: string       // 是否必填 '0'否 '1'是
  width?: number            // 网格宽度
  height?: number           // 网格高度
  positionX?: number        // X坐标
  positionY?: number        // Y坐标
  validationRule?: string   // 正则表达式
  group?: string            // 分组名称
  unit?: string             // 单位
  defaultValue?: string     // 默认值
  minValue?: string         // 最小值
  maxValue?: string         // 最大值
  description?: string      // 描述
  dict?: string             // 字典
  data: any                // 真正的数值
  [key: string]: any        // 允许其他扩展字段
}

interface Props<T extends FormFieldItem> {
  items: T[]                   // 字段列表
  gridSize?: number             // 每格像素大小，默认60
  gap?: number                  // 格子间距，默认12
  minHeight?: number            // 最小高度，默认600
  defaultItemWidth?: number     // 默认项宽度（格数），默认2
  defaultItemHeight?: number    // 默认项高度（格数），默认1
  labelCol?: object             // 标签布局
  wrapperCol?: object           // 控件布局
  readonly?: boolean            // 只读模式
}

const props = withDefaults(defineProps<Props<T>>(), {
  gridSize: 60,
  gap: 12,
  minHeight: 600,
  defaultItemWidth: 2,
  defaultItemHeight: 1,
  labelCol: () => ({ style: { width: '100px' } }),
  wrapperCol: () => ({ flex: 1 }),
  readonly: false
})

const emit = defineEmits<{
  (e: 'submit', values: Record<string, any>): void
  (e: 'validate', isValid: boolean, values: Record<string, any>): void
}>()

// 表单实例
const formRef = ref()

// 表单数据模型
const formModel = ref<Record<string, any>>({})

// 初始化表单数据
const initFormData = () => {
  const data: Record<string, any> = {}
  props.items.forEach(field => {
    // Switch 类型默认值为 '0'（未选中）
    if (field.fieldType === FIELD_TYPE.SWITCH) {
      data[field.name] = field.data || field.defaultValue || '0'
    } else {
      data[field.name] = field.data || field.defaultValue || undefined
    }
  })
  formModel.value = data
}

// 监听字段变化，重新初始化表单
watch(() => props.items, () => {
  initFormData()
}, { immediate: true, deep: true })

// 生成表单验证规则
const getFieldRules = (field: T) => {
  const rules: any[] = []

  // 必填验证
  if (field.isRequired === '1') {
    // Switch 类型的必填校验：'0' 和 '1' 都是有效值
    if (field.fieldType === FIELD_TYPE.SWITCH) {
      rules.push({
        required: true,
        message: `请选择${field.label}`,
        trigger: ['blur', 'change'],
        validator: (_rule: any, value: any) => {
          // Switch 的值为 '0' 或 '1' 都算有效
          if (value === '0' || value === '1') {
            return Promise.resolve()
          }
          return Promise.reject(`请选择${field.label}`)
        }
      })
    } else {
      rules.push({
        required: true,
        message: `请输入${field.label}`,
        trigger: ['blur', 'change']
      })
    }
  }

  // 数值范围验证
  if (field.fieldType === FIELD_TYPE.NUMBER) {
    if (field.minValue !== undefined && field.minValue !== '') {
      rules.push({
        type: 'number',
        min: Number(field.minValue),
        message: `${field.label}不能小于${field.minValue}`,
        trigger: 'blur',
        transform: (value: any) => Number(value)
      })
    }
    if (field.maxValue !== undefined && field.maxValue !== '') {
      rules.push({
        type: 'number',
        max: Number(field.maxValue),
        message: `${field.label}不能大于${field.maxValue}`,
        trigger: 'blur',
        transform: (value: any) => Number(value)
      })
    }
  }

  // 正则表达式验证
  if (field.validationRule) {
    try {
      const pattern = new RegExp(field.validationRule)
      rules.push({
        pattern,
        message: `${field.label}格式不正确`,
        trigger: 'blur'
      })
    } catch (e) {
      console.warn(`字段 ${field.name} 的正则表达式无效:`, field.validationRule)
    }
  }

  return rules
}

// 表单验证规则（计算属性）
const formRules = computed(() => {
  const rules: Record<string, any[]> = {}
  props.items.forEach(field => {
    const fieldRules = getFieldRules(field)
    if (fieldRules.length > 0) {
      rules[field.name] = fieldRules
    }
  })
  return rules
})

// 表单提交
const handleSubmit = async () => {
  try {
    const values = await formRef.value?.validate()
    emit('submit', values)
    return values
  } catch (error) {
    message.error('表单验证失败，请检查必填项')
    throw error
  }
}

// 表单验证（不提交）
const validate = async () => {
  try {
    const values = await formRef.value?.validate()
    emit('validate', true, values)
    return { isValid: true, values }
  } catch (error) {
    emit('validate', false, formModel.value)
    return { isValid: false, values: formModel.value }
  }
}

// 重置表单
const resetFields = () => {
  formRef.value?.resetFields()
  initFormData()
}

// 获取表单值
const getFieldsValue = () => {
  return { ...formModel.value }
}

// 设置表单值
const setFieldsValue = (values: Record<string, any>) => {
  formModel.value = { ...formModel.value, ...values }
}

// 暴露方法给父组件
defineExpose({
  submit: handleSubmit,
  validate,
  resetFields,
  getFieldsValue,
  setFieldsValue
})
</script>

<template>
  <a-form
    ref="formRef"
    :model="formModel"
    :rules="formRules"
    :label-col="labelCol"
    :wrapper-col="wrapperCol"
    class="grid-draggable-form"
  >
    <GridDraggableLayout
      :items="items"
      :grid-size="gridSize"
      :gap="gap"
      :show-grid="false"
      readonly
      :min-height="minHeight"
      :default-item-width="defaultItemWidth"
      :default-item-height="defaultItemHeight"
    >
      <!-- 自定义字段内容 -->
      <template #item="{ item: field }">
        <!-- 分割线：不需要表单验证 -->
        <template v-if="field.fieldType === FIELD_TYPE.DIVIDER">
          <DynamicFormItem
            :attribute="{
              ...field,
              id: String(field.id),
              isRequired: field.isRequired || '0'
            }"
            :readonly="readonly"
            :show-label="false"
          />
        </template>

        <!-- 普通字段：需要表单验证 -->
        <a-form-item
          v-else
          :name="field.name"
          class="form-field-item-wrapper"
        >
          <DynamicFormItem
            v-model="formModel[field.name]"
            :attribute="{
              ...field,
              id: String(field.id),
              isRequired: field.isRequired || '0'
            }"
            :readonly="readonly"
            :show-label="true"
          />
        </a-form-item>
      </template>

      <!-- 自定义尺寸标识（表单模式不显示） -->
      <template #badge>
        <span></span>
      </template>

      <!-- 空状态 -->
      <template #empty>
        <a-empty description="暂无表单字段" />
      </template>
    </GridDraggableLayout>
  </a-form>
</template>

<style scoped lang="less">
.grid-draggable-form {
  width: 100%;

  .form-field-item-wrapper {
    margin-bottom: 0;
    height: 100%;

    :deep(.ant-form-item-control) {
      height: 100%;
    }
  }
}
</style>
