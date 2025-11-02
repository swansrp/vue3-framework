<script setup lang="ts">
import { ref } from 'vue'

import GridDraggableForm, { type FormFieldItem } from './GridDraggableForm.vue'

import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

// 示例：模拟表单字段配置
const formFields = ref<FormFieldItem[]>([
  {
    id: 1,
    name: 'productName',
    label: '产品名称',
    fieldType: FIELD_TYPE.INPUT,
    isRequired: '1',
    width: 2,
    height: 1,
    positionX: 0,
    positionY: 0,
    validationRule: '^[\\u4e00-\\u9fa5a-zA-Z0-9]{2,50}$',
    description: '请输入2-50个字符'
  },
  {
    id: 2,
    name: 'productCode',
    label: '产品编号',
    fieldType: FIELD_TYPE.INPUT,
    isRequired: '1',
    width: 2,
    height: 1,
    positionX: 2,
    positionY: 0,
    validationRule: '^[A-Z0-9]{6,20}$',
    description: '大写字母和数字，6-20位'
  },
  {
    id: 3,
    name: 'price',
    label: '价格',
    fieldType: FIELD_TYPE.NUMBER,
    isRequired: '1',
    width: 1,
    height: 1,
    positionX: 0,
    positionY: 1,
    minValue: '0',
    maxValue: '999999',
    unit: '元',
    defaultValue: '0'
  },
  {
    id: 4,
    name: 'stock',
    label: '库存',
    fieldType: FIELD_TYPE.NUMBER,
    isRequired: '1',
    width: 1,
    height: 1,
    positionX: 1,
    positionY: 1,
    minValue: '0',
    unit: '件',
    defaultValue: '0'
  },
  {
    id: 5,
    name: 'category',
    label: '分类',
    fieldType: FIELD_TYPE.SELECT,
    isRequired: '1',
    width: 2,
    height: 1,
    positionX: 2,
    positionY: 1
  },
  {
    id: 6,
    name: 'publishDate',
    label: '发布日期',
    fieldType: FIELD_TYPE.DATE,
    isRequired: '0',
    width: 2,
    height: 1,
    positionX: 0,
    positionY: 2
  },
  {
    id: 7,
    name: 'isActive',
    label: '是否启用',
    fieldType: FIELD_TYPE.SWITCH,
    isRequired: '0',
    width: 2,
    height: 1,
    positionX: 2,
    positionY: 2,
    defaultValue: '1'
  },
  {
    id: 8,
    name: 'description',
    label: '产品描述',
    fieldType: FIELD_TYPE.TEXT_AREA,
    isRequired: '0',
    width: 4,
    height: 2,
    positionX: 0,
    positionY: 3,
    description: '详细描述产品特性和用途'
  }
])

const formRef = ref()

// 提交表单
const handleSubmit = async () => {
  try {
    const values = await formRef.value?.submit()
    console.log('表单提交成功:', values)
  } catch (error) {
    console.error('表单验证失败')
  }
}

// 验证表单
const handleValidate = async () => {
  const result = await formRef.value?.validate()
  console.log('表单验证结果:', result)
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
}

// 获取表单值
const handleGetValues = () => {
  const values = formRef.value?.getFieldsValue()
  console.log('当前表单值:', values)
}

// 设置表单值
const handleSetValues = () => {
  formRef.value?.setFieldsValue({
    productName: '测试产品',
    productCode: 'TEST001',
    price: '99.99',
    stock: '100'
  })
}
</script>

<template>
  <div class="grid-form-example">
    <div class="action-bar">
      <a-space>
        <a-button
          type="primary"
          @click="handleSubmit"
        >
          提交表单
        </a-button>
        <a-button @click="handleValidate">
          验证表单
        </a-button>
        <a-button @click="handleReset">
          重置表单
        </a-button>
        <a-button @click="handleGetValues">
          获取表单值
        </a-button>
        <a-button @click="handleSetValues">
          设置表单值
        </a-button>
      </a-space>
    </div>

    <GridDraggableForm
      ref="formRef"
      :fields="formFields"
      :grid-size="60"
      :gap="12"
      :min-height="600"
      @submit="(values) => console.log('提交:', values)"
      @validate="(isValid, values) => console.log('验证:', isValid, values)"
    />
  </div>
</template>

<style scoped lang="less">
.grid-form-example {
  padding: 20px;

  .action-bar {
    margin-bottom: 20px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 4px;
  }
}
</style>
