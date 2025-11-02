# GridDraggableForm 快速开始

## 一、基础用法

### 1. 导入组件

```typescript
import { GridDraggableForm, type FormFieldItem } from '@/framework/components/common/DragGrid'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'
```

### 2. 定义字段配置

```typescript
const fields: FormFieldItem[] = [
  {
    id: 1,
    name: 'username',
    label: '用户名',
    fieldType: FIELD_TYPE.INPUT,
    isRequired: '1',
    width: 2,
    height: 1,
    positionX: 0,
    positionY: 0
  }
]
```

### 3. 使用组件

```vue
<template>
  <GridDraggableForm :fields="fields" @submit="handleSubmit" />
</template>
```

## 二、集成后端数据

### 从 SchemaAttribute 转换

如果你的数据来自后端 `SchemaAttribute` 接口：

```typescript
import type { SchemaAttribute } from '@/apis/types/schemaAttributePortalControllerTypes'

// 转换函数
const convertToFormFields = (attributes: SchemaAttribute[]): FormFieldItem[] => {
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
  }))
}

// 使用
const formFields = ref<FormFieldItem[]>([])
const attributes = ref<SchemaAttribute[]>([]) // 从API获取

watch(() => attributes.value, (newAttrs) => {
  formFields.value = convertToFormFields(newAttrs)
})
```

## 三、表单操作

### 提交表单

```vue
<script setup>
const formRef = ref()

const handleSubmit = async () => {
  try {
    const values = await formRef.value?.submit()
    console.log('表单数据:', values)
    // 调用 API 提交
  } catch (error) {
    console.error('验证失败')
  }
}
</script>

<template>
  <GridDraggableForm ref="formRef" :fields="fields" />
  <a-button @click="handleSubmit">提交</a-button>
</template>
```

### 验证表单（不提交）

```typescript
const { isValid, values } = await formRef.value?.validate()
if (isValid) {
  console.log('验证通过:', values)
}
```

### 重置表单

```typescript
formRef.value?.resetFields()
```

### 获取表单值

```typescript
const values = formRef.value?.getFieldsValue()
```

### 设置表单值

```typescript
formRef.value?.setFieldsValue({
  username: 'admin',
  age: '25'
})
```

## 四、弹窗中使用

### 使用封装好的 Modal 组件

```vue
<script setup>
import { GridDraggableFormModal } from '@/framework/components/common/DragGrid'
import type { SchemaAttribute } from '@/apis/types/schemaAttributePortalControllerTypes'

const visible = ref(false)
const attributes = ref<SchemaAttribute[]>([])

const handleSubmit = (values: Record<string, any>) => {
  console.log('提交数据:', values)
  // 调用 API
  visible.value = false
}
</script>

<template>
  <a-button @click="visible = true">打开表单</a-button>
  
  <GridDraggableFormModal
    :visible="visible"
    :attributes="attributes"
    @submit="handleSubmit"
    @cancel="visible = false"
  />
</template>
```

## 五、验证规则配置

### 必填验证

```typescript
{
  name: 'username',
  label: '用户名',
  isRequired: '1'  // '1' 为必填，'0' 为非必填
}
```

### 正则验证

```typescript
{
  name: 'phone',
  label: '手机号',
  validationRule: '^1[3-9]\\d{9}$'  // 手机号正则
}
```

### 数值范围验证

```typescript
{
  name: 'age',
  label: '年龄',
  fieldType: FIELD_TYPE.NUMBER,
  minValue: '0',
  maxValue: '150'
}
```

### 组合验证

```typescript
{
  name: 'email',
  label: '邮箱',
  fieldType: FIELD_TYPE.INPUT,
  isRequired: '1',  // 必填
  validationRule: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',  // 格式验证
  description: '请输入有效的邮箱地址'
}
```

## 六、常用字段类型示例

### 文本输入

```typescript
{
  id: 1,
  name: 'title',
  label: '标题',
  fieldType: FIELD_TYPE.INPUT,
  isRequired: '1',
  width: 2,
  height: 1,
  positionX: 0,
  positionY: 0
}
```

### 数值输入

```typescript
{
  id: 2,
  name: 'price',
  label: '价格',
  fieldType: FIELD_TYPE.NUMBER,
  isRequired: '1',
  width: 1,
  height: 1,
  positionX: 0,
  positionY: 1,
  minValue: '0',
  unit: '元'
}
```

### 日期选择

```typescript
{
  id: 3,
  name: 'startDate',
  label: '开始日期',
  fieldType: FIELD_TYPE.DATE,
  isRequired: '1',
  width: 2,
  height: 1,
  positionX: 0,
  positionY: 2
}
```

### 文本域

```typescript
{
  id: 4,
  name: 'description',
  label: '描述',
  fieldType: FIELD_TYPE.TEXT_AREA,
  isRequired: '0',
  width: 4,
  height: 2,
  positionX: 0,
  positionY: 3
}
```

### 开关

```typescript
{
  id: 5,
  name: 'isActive',
  label: '是否启用',
  fieldType: FIELD_TYPE.SWITCH,
  isRequired: '0',
  width: 1,
  height: 1,
  positionX: 0,
  positionY: 5,
  defaultValue: '1'
}
```

## 七、布局技巧

### 响应式布局

```typescript
// 第一行：4列布局
[
  { positionX: 0, positionY: 0, width: 1, height: 1 },
  { positionX: 1, positionY: 0, width: 1, height: 1 },
  { positionX: 2, positionY: 0, width: 1, height: 1 },
  { positionX: 3, positionY: 0, width: 1, height: 1 }
]

// 第二行：2列布局
[
  { positionX: 0, positionY: 1, width: 2, height: 1 },
  { positionX: 2, positionY: 1, width: 2, height: 1 }
]
```

### 跨行字段

```typescript
// 文本域占据 4列×2行
{
  name: 'content',
  label: '内容',
  fieldType: FIELD_TYPE.TEXT_AREA,
  width: 4,
  height: 2,
  positionX: 0,
  positionY: 2
}
```

## 八、完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { GridDraggableForm, type FormFieldItem } from '@/framework/components/common/DragGrid'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

const formRef = ref()
const loading = ref(false)

const fields = ref<FormFieldItem[]>([
  {
    id: 1,
    name: 'name',
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
    name: 'price',
    label: '价格',
    fieldType: FIELD_TYPE.NUMBER,
    isRequired: '1',
    width: 1,
    height: 1,
    positionX: 2,
    positionY: 0,
    minValue: '0',
    unit: '元'
  },
  {
    id: 3,
    name: 'stock',
    label: '库存',
    fieldType: FIELD_TYPE.NUMBER,
    isRequired: '1',
    width: 1,
    height: 1,
    positionX: 3,
    positionY: 0,
    minValue: '0',
    unit: '件'
  },
  {
    id: 4,
    name: 'description',
    label: '产品描述',
    fieldType: FIELD_TYPE.TEXT_AREA,
    isRequired: '0',
    width: 4,
    height: 2,
    positionX: 0,
    positionY: 1
  }
])

const handleSubmit = async () => {
  try {
    loading.value = true
    const values = await formRef.value?.submit()
    
    // 调用 API 提交数据
    // await submitProductData(values)
    
    message.success('提交成功')
    console.log('表单数据:', values)
  } catch (error) {
    message.error('请检查表单填写')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div class="form-wrapper">
      <GridDraggableForm
        ref="formRef"
        :fields="fields"
        @submit="handleSubmit"
      />
    </div>
    
    <div class="action-bar">
      <a-space>
        <a-button @click="formRef?.resetFields()">
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
    </div>
  </div>
</template>

<style scoped lang="less">
.page-container {
  padding: 24px;
  
  .form-wrapper {
    background: #fff;
    padding: 24px;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  
  .action-bar {
    text-align: right;
  }
}
</style>
```

## 九、注意事项

1. **字段 name 必须唯一**：每个字段的 `name` 在表单中必须是唯一的
2. **正则表达式转义**：validationRule 中的反斜杠需要双重转义
3. **数值类型**：minValue 和 maxValue 为字符串类型
4. **必填标识**：isRequired 使用字符串 '0' 或 '1'
5. **布局避免重叠**：确保字段的位置和尺寸不会导致重叠
