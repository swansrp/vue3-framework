<template>
  <a-form
    ref="formRef"
    :label-col="{ span: 6 }"
    :model="userGroupForm"
    :wrapper-col="{ span: 14 }"
    @finish="onAddAndEditFinish"
  >
    <a-form-item
      :rules="[{ required: true, message: '请输入用户组名称!' }]"
      label="用户组名称"
      name="name"
    >
      <a-input v-model:value="userGroupForm['name']" />
    </a-form-item>
    <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
      <div class="form-button-list">
        <a-button @click="resetForm()">
          清空
        </a-button>
        <a-button
          html-type="submit"
          type="primary"
        >
          提交
        </a-button>
      </div>
    </a-form-item>
  </a-form>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import { clearFromField } from '@/framework/utils/common'

let formRef = ref()
const props = defineProps<{ name?: string }>()
const emit = defineEmits(['callback'])
interface userGroupFormType {
  name: string
}
const userGroupForm:Ref<userGroupFormType> = ref({ name: props.name ||'' })
const onAddAndEditFinish = () => emit('callback', userGroupForm.value.name)
const resetForm = () => clearFromField(userGroupForm, formRef)

</script>

<style scoped>
.form-button-list {
    display: flex;
    justify-content: space-between;
}

.form-button-list button {
    width: 45%;
}
</style>
