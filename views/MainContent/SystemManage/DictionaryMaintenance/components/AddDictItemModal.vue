<template>
  <dialog-box
    v-model:visible="dialogVisible"
    title="新增字典项"
  >
    <a-form
      ref="addDictItemFormRef"
      :model="addDictItemForm"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 14 }"
      @finish="onFinish"
    >
      <a-form-item
        label="字典项名称"
        name="dictLabel"
        :rules="[{ required: true, message: '请输入字典项名称!' }]"
      >
        <a-input v-model:value="addDictItemForm['dictLabel']" />
      </a-form-item>
      <a-form-item
        label="字典项值"
        name="dictValue"
        required
        :rules="[{ required: true, message: '请填写字典项值!' }]"
      >
        <a-input v-model:value="addDictItemForm['dictValue']" />
      </a-form-item>
      <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
        <div class="form-button-list">
          <a-button @click="resetForm">
            清空
          </a-button>
          <a-button
            type="primary"
            html-type="submit"
          >
            提交
          </a-button>
        </div>
      </a-form-item>
    </a-form>
  </dialog-box>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

import { addDictItem } from '@/framework/apis/dict/dict'

const props = defineProps<{
  visible: boolean
  dictName: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const addDictItemFormRef = ref<any>()
const addDictItemForm = ref({ dictLabel: '', dictValue: '', dictName: '' })

const resetForm = () => addDictItemFormRef.value?.resetFields()

const onFinish = () => {
  addDictItemForm.value.dictName = props.dictName
  addDictItem(addDictItemForm.value).then(() => {
    resetForm()
    dialogVisible.value = false
    emit('saved')
  })
}
</script>

<style scoped lang="less">
.form-button-list {
  display: flex;
  justify-content: space-between;

  button {
    width: 45%;
  }
}
</style>
