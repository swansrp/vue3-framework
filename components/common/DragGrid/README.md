# GridDraggableForm 组件使用文档

## 概述

`GridDraggableForm` 是一个基于 `GridDraggableLayout` 的动态表单组件，它能够：
- 根据字段配置自动生成表单布局
- 支持多种字段类型（文本、数值、日期、下拉等）
- 自动进行表单验证（必填、正则、范围等）
- 使用网格布局自由定位表单字段

## 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GridDraggableForm, type FormFieldItem } from '@/framework/components/common/DragGrid'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

const formRef = ref()

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
    positionY: 0,
    validationRule: '^[a-zA-Z0-9]{4,20}$',
    description: '请输入4-20位字母或数字'
  }
]

const handleSubmit = async () => {
  try {
    const values = await formRef.value?.submit()
    console.log('表单数据:', values)
  } catch (error) {
    console.error('验证失败')
  }
}
</script>

<template>
  <GridDraggableForm
    ref="formRef"
    :fields="fields"
    @submit="handleSubmit"
  />
</template>
```

## Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| fields | FormFieldItem[] | [] | 表单字段配置列表 |
| gridSize | number | 60 | 每个网格单元的像素大小 |
| gap | number | 12 | 网格间距 |
| minHeight | number | 600 | 最小高度 |
| defaultItemWidth | number | 2 | 默认字段宽度（格数） |
| defaultItemHeight | number | 1 | 默认字段高度（格数） |
| labelCol | object | { style: { width: '100px' } } | 标签布局 |
| wrapperCol | object | { flex: 1 } | 控件布局 |
| readonly | boolean | false | 只读模式 |

## FormFieldItem 字段配置

```typescript
interface FormFieldItem {
  id: string | number       // 唯一标识（必填）
  name: string              // 字段名称（必填）
  label: string             // 字段标签（必填）
  fieldType: string         // 字段类型（必填）
  isRequired?: string       // 是否必填 '0'否 '1'是
  width?: number            // 网格宽度
  height?: number           // 网格高度
  positionX?: number        // X坐标（列）
  positionY?: number        // Y坐标（行）
  validationRule?: string   // 正则表达式验证
  unit?: string             // 单位
  defaultValue?: string     // 默认值
  minValue?: string         // 最小值
  maxValue?: string         // 最大值
  description?: string      // 描述信息
  dict?: string             // 字典配置
}
```

## 字段类型 (fieldType)

支持以下字段类型（来自 `FIELD_TYPE` 枚举）：

- `FIELD_TYPE.INPUT` - 文本输入
- `FIELD_TYPE.NUMBER` - 数值输入
- `FIELD_TYPE.SWITCH` - 开关
- `FIELD_TYPE.SELECT` - 下拉选择
- `FIELD_TYPE.TREE` - 树形选择
- `FIELD_TYPE.DATE` - 日期选择
- `FIELD_TYPE.DATETIME` - 日期时间选择
- `FIELD_TYPE.TEXT_AREA` - 文本域
- `FIELD_TYPE.HREF` - 超链接
- `FIELD_TYPE.HTML` - HTML编辑
- `FIELD_TYPE.IMAGE` - 图片上传
- `FIELD_TYPE.AUDIO` - 音频上传
- `FIELD_TYPE.VIDEO` - 视频上传
- `FIELD_TYPE.FILE` - 文件上传

## 验证规则

### 必填验证
设置 `isRequired: '1'` 即可启用必填验证：

```typescript
{
  name: 'username',
  label: '用户名',
  isRequired: '1'  // 必填
}
```

### 正则表达式验证
通过 `validationRule` 设置正则表达式：

```typescript
{
  name: 'email',
  label: '邮箱',
  validationRule: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
}
```

### 数值范围验证
对于 `FIELD_TYPE.NUMBER` 类型，可设置最大最小值：

```typescript
{
  name: 'age',
  label: '年龄',
  fieldType: FIELD_TYPE.NUMBER,
  minValue: '0',
  maxValue: '150'
}
```

## 方法

组件暴露以下方法供父组件调用：

### submit()
提交表单并验证，返回表单数据。

```typescript
const values = await formRef.value?.submit()
```

### validate()
验证表单，返回验证结果和表单数据。

```typescript
const { isValid, values } = await formRef.value?.validate()
```

### resetFields()
重置表单到初始状态。

```typescript
formRef.value?.resetFields()
```

### getFieldsValue()
获取当前表单值。

```typescript
const values = formRef.value?.getFieldsValue()
```

### setFieldsValue(values)
设置表单值。

```typescript
formRef.value?.setFieldsValue({
  username: 'test',
  age: '25'
})
```

## 事件

### @submit
表单提交成功时触发。

```vue
<GridDraggableForm
  @submit="(values) => console.log(values)"
/>
```

### @validate
表单验证时触发（无论成功或失败）。

```vue
<GridDraggableForm
  @validate="(isValid, values) => console.log(isValid, values)"
/>
```

## 布局说明

### 网格定位
- `positionX`: 字段在网格中的列位置（从0开始）
- `positionY`: 字段在网格中的行位置（从0开始）
- `width`: 字段占据的列数
- `height`: 字段占据的行数

### 示例
```typescript
{
  positionX: 0,  // 第1列
  positionY: 0,  // 第1行
  width: 2,      // 占2列
  height: 1      // 占1行
}
```

## 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GridDraggableForm, type FormFieldItem } from '@/framework/components/common/DragGrid'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

const formRef = ref()

const fields = ref<FormFieldItem[]>([
  {
    id: 1,
    name: 'name',
    label: '姓名',
    fieldType: FIELD_TYPE.INPUT,
    isRequired: '1',
    width: 2,
    height: 1,
    positionX: 0,
    positionY: 0,
    validationRule: '^[\\u4e00-\\u9fa5]{2,10}$',
    description: '请输入2-10个中文字符'
  },
  {
    id: 2,
    name: 'age',
    label: '年龄',
    fieldType: FIELD_TYPE.NUMBER,
    isRequired: '1',
    width: 1,
    height: 1,
    positionX: 2,
    positionY: 0,
    minValue: '0',
    maxValue: '150',
    unit: '岁'
  },
  {
    id: 3,
    name: 'email',
    label: '邮箱',
    fieldType: FIELD_TYPE.INPUT,
    isRequired: '1',
    width: 3,
    height: 1,
    positionX: 0,
    positionY: 1,
    validationRule: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
  },
  {
    id: 4,
    name: 'remark',
    label: '备注',
    fieldType: FIELD_TYPE.TEXT_AREA,
    isRequired: '0',
    width: 3,
    height: 2,
    positionX: 0,
    positionY: 2,
    description: '可选填写'
  }
])

const handleSubmit = async () => {
  try {
    const values = await formRef.value?.submit()
    console.log('提交成功:', values)
    // 调用API提交数据
  } catch (error) {
    console.error('验证失败')
  }
}
</script>

<template>
  <div>
    <GridDraggableForm
      ref="formRef"
      :fields="fields"
      :grid-size="60"
      :gap="12"
      @submit="handleSubmit"
    />
    
    <div style="margin-top: 20px;">
      <a-button type="primary" @click="handleSubmit">
        提交
      </a-button>
    </div>
  </div>
</template>
```

## 注意事项

1. **必须设置唯一的 id 和 name**：每个字段必须有唯一的 `id` 和 `name`
2. **验证规则的正则表达式**：需要正确转义反斜杠
3. **数值类型的范围**：`minValue` 和 `maxValue` 为字符串类型
4. **必填字段**：`isRequired` 使用字符串 `'0'` 或 `'1'`
5. **布局冲突**：确保字段位置不重叠

## 与 GridDraggableLayout 的关系

`GridDraggableForm` 内部使用 `GridDraggableLayout` 进行布局，但：
- 自动设置 `showGrid: false`（不显示网格背景）
- 自动设置 `readonly: true`（禁用拖拽功能）
- 添加了完整的表单验证逻辑
- 提供了表单专用的API方法
