<script setup lang="ts" generic="T extends FormFieldItem">
import { message } from 'ant-design-vue'
import { ref, computed, watch } from 'vue'

import GridDraggableLayout, { type GridItem } from './GridDraggableLayout.vue'

import DynamicFormItem from '@/framework/components/common/DragGrid/DynamicFormItem.vue'
import { evaluateVisibility } from '@/framework/components/common/DragGrid/visibilityCondition'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
import { strRemoveLF } from '@/framework/utils/common'

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
  parentAttributeId?: string // 父属性ID（级联字典用）
  visibilityCondition?: string // 显示条件（JSON字符串）
  data: any                // 真正的数值
  [key: string]: any        // 允许其他扩展字段
}

interface Props<T extends FormFieldItem> {
  items: T[]                   // 字段列表
  gridSize?: number             // 每格像素大小，默认60
  gap?: number                  // 格子间距，默认12
  minHeight?: number            // 最小高度，默认600
  defaultItemWidth?: number     // 默认项宽度百分比，默认30
  defaultItemHeight?: number    // 默认项高度（格数），默认1
  labelCol?: object             // 标签布局
  wrapperCol?: object           // 控件布局
  readonly?: boolean            // 只读模式
  dictTranslateFn?: (dictName: string, value: string) => Promise<string>  // 字典翻译函数
  hasChildGroups?: boolean      // 是否有子分组（如果有子分组，则不显示空状态）
}

const props = withDefaults(defineProps<Props<T>>(), {
  gridSize: 60,
  gap: 12,
  minHeight: 600,
  defaultItemWidth: 30,
  defaultItemHeight: 1,
  labelCol: () => ({ style: { width: '100px' } }),
  wrapperCol: () => ({ flex: 1 }),
  readonly: false,
  hasChildGroups: false
})

const emit = defineEmits<{
  (e: 'submit', values: Record<string, any>): void
  (e: 'validate', isValid: boolean, values: Record<string, any>): void
  (e: 'fieldChange', fieldId: string | number, value: any): void  // 字段值变化事件
}>()

// 表单实例
const formRef = ref()

// 表单数据模型
const formModel = ref<Record<string, any>>({})

// 记录用户是否主动编辑过某个字段（key: fieldName）
const userTouchedFields = new Set<string>()

// 初始化表单数据
const initFormData = () => {
  const data: Record<string, any> = {}
  props.items.forEach(field => {
    // Switch 类型默认值为 undefined（未选中状态），用户必须主动选择是或否
    if (field.fieldType === FIELD_TYPE.SWITCH) {
      data[field.name] = field.data || field.defaultValue || undefined
    } else {
      // 如果用户主动清空过该字段，不再用默认值回填
      if (userTouchedFields.has(field.name)) {
        data[field.name] = field.data ?? undefined
      } else {
        data[field.name] = field.data || field.defaultValue || undefined
      }
    }
  })
  formModel.value = data
}

// 监听字段变化，重新初始化表单
watch(() => props.items, () => {
  initFormData()
}, { immediate: true, deep: true })

// 字段名称到 ID 的映射
const fieldNameToId = computed(() => {
  const map = new Map<string, string | number>()
  props.items.forEach(field => {
    map.set(field.name, field.id)
  })
  return map
})

// 属性 ID 到值的映射（用于级联字典）
const attributeIdToValue = computed(() => {
  const map: Record<string, any> = {}
  props.items.forEach(field => {
    const value = formModel.value[field.name]
    map[String(field.id)] = value
  })
  return map
})

// 字段可见性映射（响应式）
const fieldVisibilityMap = computed(() => {
  const map = new Map<string | number, boolean>()
  props.items.forEach(field => {
    const visible = !field.visibilityCondition 
      ? true 
      : evaluateVisibility(field.visibilityCondition, attributeIdToValue.value)
    map.set(field.id, visible)
  })
  return map
})

// 可见字段列表（过滤后传给 GridDraggableLayout）
const visibleItems = computed(() => {
  return props.items.filter(field => fieldVisibilityMap.value.get(field.id) !== false)
})

// 记录上一次的可见性状态（用于检测隐藏）
const lastVisibilityMap = ref<Map<string | number, boolean>>(new Map())

// 监听字段可见性变化，隐藏时清空值
watch(fieldVisibilityMap, (newMap) => {
  props.items.forEach(field => {
    const wasVisible = lastVisibilityMap.value.get(field.id) ?? true
    const isNowVisible = newMap.get(field.id) ?? true
    
    // 从可见变为不可见时，清空字段值
    if (wasVisible && !isNowVisible) {
      formModel.value[field.name] = undefined
    }
  })
  
  // 更新上一次的可见性状态
  lastVisibilityMap.value = new Map(newMap)
}, { deep: true })

// 计算字段是否可见（基于显示条件）
const isFieldVisible = (field: T): boolean => {
  return fieldVisibilityMap.value.get(field.id) ?? true
}

// 记录上一次的表单值（用于比较变化）
const lastFormModel = ref<Record<string, any>>({})

// 构建 parentAttributeId -> childFieldNames 的映射（级联字典用）
const parentToChildrenMap = computed(() => {
  const map = new Map<string, string[]>()
  props.items.forEach(field => {
    if (field.parentAttributeId) {
      const children = map.get(field.parentAttributeId) || []
      children.push(field.name)
      map.set(field.parentAttributeId, children)
    }
  })
  return map
})

// 监听表单数据变化，触发 fieldChange 事件
watch(formModel, (newModel) => {
  // 遍历所有字段，找出变化的字段
  for (const fieldName of Object.keys(newModel)) {
    const newValue = newModel[fieldName]
    const oldValue = lastFormModel.value[fieldName]
    
    // 只在值真正变化时触发
    if (newValue !== oldValue) {
      // 标记该字段已被用户交互过（用于阻止默认值回填）
      userTouchedFields.add(fieldName)
      
      const fieldId = fieldNameToId.value.get(fieldName)
      if (fieldId !== undefined) {
        emit('fieldChange', fieldId, newValue)
        
        // 检查是否有子属性需要清空（级联字典）
        const children = parentToChildrenMap.value.get(String(fieldId))
        if (children && children.length > 0) {
          // 清空所有子属性的值
          children.forEach(childFieldName => {
            formModel.value[childFieldName] = undefined
            userTouchedFields.add(childFieldName)
          })
        }
      }
    }
  }
  
  // 更新上一次的值
  lastFormModel.value = { ...newModel }
}, { deep: true })

// 判断是否为文件类型
const isFileType = (fieldType: string) => {
  return [
    FIELD_TYPE.IMAGE,
    FIELD_TYPE.AUDIO,
    FIELD_TYPE.VIDEO,
    FIELD_TYPE.FILE
  ].includes(fieldType as any)
}

// 生成表单验证规则
const getFieldRules = (field: T) => {
  const rules: any[] = []

  // 必填验证
  if (field.isRequired === '1') {
    // 移除 label 中的换行符，用于错误提示信息
    const labelWithoutLF = strRemoveLF(field.label)
    // Switch 类型的必填校验：'0' 和 '1' 都是有效值
    if (field.fieldType === FIELD_TYPE.SWITCH) {
      rules.push({
        required: true,
        message: `请选择${labelWithoutLF}`,
        trigger: ['blur', 'change'],
        validator: (_rule: any, value: any) => {
          // Switch 的值为 '0' 或 '1' 都算有效
          if (value === '0' || value === '1') {
            return Promise.resolve()
          }
          return Promise.reject(`请选择${labelWithoutLF}`)
        }
      })
    } else if (isFileType(field.fieldType)) {
      // 文件类型的必填校验：必须有实际的 URL 值
      rules.push({
        required: true,
        message: `请上传${labelWithoutLF}`,
        trigger: ['blur', 'change'],
        validator: (_rule: any, value: any) => {
          // 有值且不是空字符串即为有效
          if (value && value.trim() !== '') {
            return Promise.resolve()
          }
          return Promise.reject(`请上传${labelWithoutLF}`)
        }
      })
    } else {
      rules.push({
        required: true,
        message: `请输入${labelWithoutLF}`,
        trigger: ['blur', 'change']
      })
    }
  } else if (isFileType(field.fieldType)) {
    // 非必填文件类型：NO_FILE 也算有效值，不需要额外校验
    // 此处不添加规则，表示可以为空
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

// 处理文件上传确认完成
const handleUploadConfirmed = (fieldName: string) => {
  // 清除该字段的验证错误
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate(fieldName)
      
      // 立即重新验证该字段，确保UI显示正确
      formRef.value.validateFields(fieldName).catch(() => {
        // 忽略验证错误
      })
    }
  })
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
      :items="visibleItems"
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
        <div
          v-if="field.fieldType === FIELD_TYPE.DIVIDER || field.fieldType === FIELD_TYPE.SECTION_TITLE"
          v-show="isFieldVisible(field)"
          class="field-wrapper"
        >
          <DynamicFormItem
            :attribute="{
              ...field,
              id: String(field.id),
              isRequired: '0'
            }"
            :readonly="readonly"
            :show-label="false"
          />
        </div>

        <!-- 普通字段：需要表单验证 -->
        <a-form-item
          v-else
          v-show="isFieldVisible(field)"
          :name="field.name"
          :data-attribute-id="field.id"
          class="form-field-item-wrapper"
        >
          <DynamicFormItem
            v-model="formModel[field.name]"
            :attribute="{
              ...field,
              id: String(field.id),
              isRequired: field.isRequired || '1'
            }"
            :readonly="readonly || field.readonly === '1'"
            :show-label="true"
            :dict-translate-fn="dictTranslateFn"
            :all-fields-value="attributeIdToValue"
            @upload-confirmed="handleUploadConfirmed"
          >
            <!-- 字段级 slot：只在有实际 slot 时才传递 -->
            <template
              v-if="$slots[`field:${field.name}`] || $slots['field']"
              #field="slotProps"
            >
              <slot
                v-if="$slots[`field:${field.name}`]"
                :name="`field:${field.name}`"
                v-bind="slotProps"
              ></slot>
              <slot
                v-else-if="$slots['field']"
                name="field"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 select 插槽 -->
            <template
              v-if="$slots['select']"
              #select="slotProps"
            >
              <slot
                name="select"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 selectMulti 插槽 -->
            <template
              v-if="$slots['selectMulti']"
              #selectMulti="slotProps"
            >
              <slot
                name="selectMulti"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 tree 插槽 -->
            <template
              v-if="$slots['tree']"
              #tree="slotProps"
            >
              <slot
                name="tree"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 treeMulti 插槽 -->
            <template
              v-if="$slots['treeMulti']"
              #treeMulti="slotProps"
            >
              <slot
                name="treeMulti"
                v-bind="slotProps"
              ></slot>
            </template>
          </DynamicFormItem>
        </a-form-item>
      </template>

      <!-- 自定义尺寸标识（表单模式不显示） -->
      <template #badge>
        <span></span>
      </template>

      <!-- 空状态（仅在没有字段且没有子分组时显示） -->
      <template #empty>
        <a-empty
          v-if="!hasChildGroups"
          description="暂无表单字段"
        />
      </template>
    </GridDraggableLayout>
  </a-form>
</template>

<style scoped lang="less">
.grid-draggable-form {
  width: 100%;

  .field-wrapper {
    width: 100%;
    height: 100%;
  }

  .form-field-item-wrapper {
    margin-bottom: 0;
    height: 100%;

    :deep(.ant-form-item-control) {
      height: 100%;
    }

    // 确保验证错误信息完整显示
    :deep(.ant-form-item-explain) {
      font-size: 12px;
      line-height: 1;
      position: absolute;
      bottom: 2px;
      left: 0;
      z-index: 10;

      .ant-form-item-explain-error {
        white-space: nowrap;
        overflow: visible;
      }
    }
  }
}
</style>
