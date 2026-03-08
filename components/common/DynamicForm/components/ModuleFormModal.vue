<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form'
import { ref, watch } from 'vue'

interface ModuleFormData {
  id: string
  productionId: string
  title: string
  description?: string
  multi: string
  sort: number
}

interface Props {
  visible: boolean
  formData: ModuleFormData
  isEdit: boolean
  productId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: ModuleFormData): void
}>()

const formRef = ref()
const localFormData = ref<ModuleFormData>({ ...props.formData })

const formRules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入模块名称', trigger: 'blur' }],
  multi: [{ required: true, message: '请选择数据类型', trigger: 'change' }]
}

const multiOptions = [
  { label: '单组数据', value: '0' },
  { label: '多组数据', value: '1' }
]

watch(() => props.formData, (newVal) => {
  localFormData.value = { ...newVal }
}, { deep: true })

const handleOk = async () => {
  try {
    await formRef.value.validate()
    emit('save', localFormData.value)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑模块' : '新增模块'"
    :width="600"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="localFormData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <a-form-item
        v-if="!isEdit"
        label="产品ID"
      >
        <a-input
          :value="productId"
          disabled
          style="color: #1890ff; font-weight: 600"
        />
      </a-form-item>
      
      <a-form-item
        label="模块名称"
        name="title"
      >
        <a-input
          v-model:value="localFormData.title"
          placeholder="请输入模块名称"
        />
      </a-form-item>
      
      <a-form-item
        label="模块描述"
        name="description"
      >
        <a-textarea 
          v-model:value="localFormData.description" 
          placeholder="请输入模块描述"
          :rows="3"
        />
      </a-form-item>
      
      <a-form-item
        label="数据类型"
        name="multi"
      >
        <a-radio-group
          v-model:value="localFormData.multi"
          :options="multiOptions"
        />
      </a-form-item>
      
      <a-form-item
        label="排序"
        name="sort"
      >
        <a-input-number 
          v-model:value="localFormData.sort" 
          :min="1"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
:deep(.ant-form-item-label) {
  label {
    color: #1890ff;
    font-weight: 600;
  }
}
</style>
