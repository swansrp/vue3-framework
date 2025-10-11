<template>
  <a-form
    ref="formRef"
    :model="roleData"
    :label-col="{ span: 6 }"
    :wrapper-col="{ span: 14 }"
    @finish="formFinish"
  >
    <a-form-item
      label="角色名称"
      name="roleName"
      :rules="[{ required: true, message: '请输入角色名称!' }]"
    >
      <a-input v-model:value="roleData['roleName']" />
    </a-form-item>
    <a-form-item :wrapper-col="{ span: 14, offset: 6 }">
      <div class="form-button-list">
        <a-button @click="resetForm()">
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
</template>

<script lang="ts" setup>
import _ from 'lodash'
import { Ref } from 'vue'

import { initRoleData, RoleDataType } from '../../type'

import { clearFromField } from '@/framework/utils/common'

let formRef = ref()
const props = defineProps<{ formData?: RoleDataType }>()
let roleData: Ref<RoleDataType> = ref(_.cloneDeep(initRoleData))

const emit = defineEmits(['callback'])
const formFinish = () => emit('callback', roleData.value)
const resetForm = () => clearFromField(initRoleData, formRef)

onMounted(() => {
  resetForm()
  roleData.value.roleName = props.formData?.roleName || ''
  roleData.value.roleId = props.formData?.roleId || ''
})

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
