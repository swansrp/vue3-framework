<script setup lang="ts">
import { message } from 'ant-design-vue'
import { ref } from 'vue'

import type { SchemaAttribute } from '@/apis/types/schemaAttributePortalControllerTypes'
import { GridDraggableForm, type FormFieldItem } from '@/framework/components/common/DragGrid'

interface Props {
  sectionId?: number        // 区块ID
  attributes?: SchemaAttribute[]  // 属性列表（来自后端）
  visible?: boolean         // 是否显示
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

const emit = defineEmits<{
  (e: 'submit', values: Record<string, any>): void
  (e: 'cancel'): void
}>()

const formRef = ref()
const loading = ref(false)

// 转换后端数据为表单字段配置
const formFields = ref<FormFieldItem[]>([])

const convertAttributesToFields = (attributes: SchemaAttribute[]) => {
  return attributes.map(attr => ({
    id: attr.id!,
    name: attr.name!,
    label: attr.label!,
    fieldType: attr.fieldType!,
    isRequired: attr.isRequired || '0',
    width: attr.width || 2,
    height: attr.height || 1,
    positionX: attr.positionX || 0,
    positionY: attr.positionY || 0,
    validationRule: attr.validationRule,
    unit: attr.unit,
    defaultValue: attr.defaultValue,
    minValue: attr.minValue,
    maxValue: attr.maxValue,
    description: attr.description,
    dict: attr.dict
  } as FormFieldItem))
}

// 监听属性变化
watch(() => props.attributes, (newAttrs) => {
  if (newAttrs && newAttrs.length > 0) {
    formFields.value = convertAttributesToFields(newAttrs)
  }
}, { immediate: true })

// 处理表单提交
const handleSubmit = async () => {
  try {
    loading.value = true
    const values = await formRef.value?.submit()
    emit('submit', values)
    message.success('提交成功')
  } catch (error) {
    message.error('请检查表单填写是否正确')
  } finally {
    loading.value = false
  }
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
}

// 暴露方法
defineExpose({
  submit: handleSubmit,
  reset: handleReset,
  validate: () => formRef.value?.validate(),
  getFieldsValue: () => formRef.value?.getFieldsValue(),
  setFieldsValue: (values: Record<string, any>) => formRef.value?.setFieldsValue(values)
})
</script>

<template>
  <a-modal
    :open="visible"
    title="填写表单"
    width="900px"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          取消
        </a-button>
        <a-button @click="handleReset">
          重置
        </a-button>
        <a-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          提交
        </a-button>
      </a-space>
    </template>

    <div class="form-modal-content">
      <a-spin :spinning="loading">
        <GridDraggableForm
          ref="formRef"
          :fields="formFields"
          :grid-size="60"
          :gap="12"
          :min-height="400"
          @submit="handleSubmit"
        />
      </a-spin>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.form-modal-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 20px 0;
}
</style>
