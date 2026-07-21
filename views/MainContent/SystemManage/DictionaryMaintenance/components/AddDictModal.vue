<template>
  <dialog-box
    v-model:visible="dialogVisible"
    title="新增字典"
  >
    <a-form
      ref="addDictFormRef"
      :model="addDictForm"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 14 }"
      @finish="onFinish"
    >
      <a-form-item
        label="字典名称"
        name="dictTitle"
        :rules="[{ required: true, message: '请输入字典名称!' }]"
      >
        <a-input v-model:value="addDictForm['dictTitle']" />
      </a-form-item>
      <a-form-item
        label="字典值"
        name="dictName"
        required
        :rules="[{ required: true, message: '请填写字典值!' }]"
      >
        <a-input v-model:value="addDictForm['dictName']" />
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

import { addDict } from '@/framework/apis/dict/dict'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const addDictFormRef = ref<any>()
const addDictForm = ref({ dictName: '', dictTitle: '' })

const resetForm = () => addDictFormRef.value?.resetFields()

const onFinish = () => {
  addDict(addDictForm.value).then(() => {
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
