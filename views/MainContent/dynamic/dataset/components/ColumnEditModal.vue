<template>
  <a-modal
    :open="open"
    :title="title"
    width="600px"
    :confirm-loading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formState"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item
        label="SQL表达式"
        name="columnSql"
        :rules="[{ required: true, message: '请输入SQL表达式' }]"
      >
        <a-textarea
          v-model:value="formState.columnSql"
          :rows="3"
          placeholder="如: SUM(amount) 或 o.order_no"
        />
      </a-form-item>

      <a-form-item
        label="字段别名"
        name="columnAlias"
        :rules="[
          { required: true, message: '请输入字段别名' },
          { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '别名只能包含字母、数字和下划线，且以字母开头' }
        ]"
      >
        <a-input
          v-model:value="formState.columnAlias"
          placeholder="如: totalAmount 或 orderNo"
        />
      </a-form-item>

      <a-form-item
        label="是否聚合字段"
        name="isAggregate"
      >
        <a-checkbox
          :checked="formState.isAggregate === '1'"
          @change="(e: any) => formState.isAggregate = e.target.checked ? '1' : '0'"
        />
        <div class="form-hint">
          聚合字段的条件会放入HAVING子句，非聚合字段放入WHERE子句
        </div>
      </a-form-item>

      <a-form-item
        label="显示顺序"
        name="displayOrder"
      >
        <a-input-number
          v-model:value="formState.displayOrder"
          :min="1"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item
        label="是否显示"
        name="isVisible"
      >
        <a-checkbox
          :checked="formState.isVisible === '1'"
          @change="(e: any) => formState.isVisible = e.target.checked ? '1' : '0'"
        />
      </a-form-item>

      <a-form-item
        label="备注"
        name="remark"
      >
        <a-textarea
          v-model:value="formState.remark"
          :rows="3"
          placeholder="列的说明信息"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'

import type { DatasetColumnInfo } from '../types'

const props = defineProps<{
  open: boolean
  title: string
  tableId: string
  columnInfo?: DatasetColumnInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok', data: DatasetColumnInfo): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)

const formState = reactive<DatasetColumnInfo>({
  tableId: props.tableId,
  columnSql: '',
  columnAlias: '',
  isAggregate: '0',
  displayOrder: 1,
  isVisible: '1',
  remark: '',
})

watch(() => props.open, (val) => {
  if (val) {
    if (props.columnInfo) {
      // 编辑模式
      Object.assign(formState, props.columnInfo)
      // 显示时去掉别名的单引号
      if (formState.columnAlias && formState.columnAlias.startsWith("'") && formState.columnAlias.endsWith("'")) {
        formState.columnAlias = formState.columnAlias.slice(1, -1)
      }
    } else {
      // 新增模式
      resetForm()
    }
  }
})

const resetForm = () => {
  formState.id = undefined
  formState.tableId = props.tableId
  formState.columnSql = ''
  formState.columnAlias = ''
  formState.isAggregate = '0'
  formState.displayOrder = 1
  formState.isVisible = '1'
  formState.remark = ''
  formRef.value?.clearValidate()
}

const handleOk = async () => {
  try {
    await formRef.value?.validate()
    confirmLoading.value = true
    
    // 准备提交的数据
    const submitData = { ...formState }
    
    // 保存时自动添加别名的单引号
    if (submitData.columnAlias && !submitData.columnAlias.startsWith("'")) {
      submitData.columnAlias = `'${submitData.columnAlias}'`
    }
    
    emit('ok', submitData)
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    confirmLoading.value = false
  }
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>

<style scoped lang="less">
.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
