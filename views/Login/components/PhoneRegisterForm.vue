<template>
  <div class="login-content-wrapper">
    <div class="register-header">
      <div class="register-title">
        注册账号
      </div>
    </div>
    <msg-code
      v-model:form-data="formData"
      :finish="handleSubmit"
      :phone-number-existed="false"
      :show-label="false"
      form-class="register-form"
      sms-type="REGISTER_MSG_CODE"
      submit-text="注册并登录"
    >
      <a-form-item
        :rules="[
          { required: true, message: '请输入用户名!', trigger: 'change' },
          { validator: userNameValidator, trigger: 'blur' },
        ]"
        name="userName"
      >
        <a-input
          v-model:value="formData.loginId"
          autocomplete="off"
          name="username-register-msg"
          placeholder="请输入用户名"
          readonly
          size="large"
          @focus="removeReadonly"
        >
          <template #prefix>
            <user-outlined />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item
        :rules="[{ validator: passwordValidator, trigger: 'change' }]"
        has-feedback
        name="password"
      >
        <a-input-password
          v-model:value="formData.password"
          autocomplete="new-password"
          name="password-register-msg"
          placeholder="至少8位，需含数字和字母"
          readonly
          size="large"
          type="password"
          @focus="removeReadonly"
        >
          <template #prefix>
            <SafetyOutlined />
          </template>
        </a-input-password>
      </a-form-item>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; margin-top: -5px">
          <a-button
            class="login-mode-btn"
            type="text"
            @click="$emit('to-login')"
          >
            已有账号
          </a-button>
        </div>
      </template>
    </msg-code>
  </div>
</template>

<script lang="ts" setup>
import { SafetyOutlined, UserOutlined } from '@ant-design/icons-vue'
import { reactive } from 'vue'

import { validatePassword } from '../../../utils/passwordValidator'

import { userAlreadyExisted } from '@/framework/apis/admin/user'
import MsgCode from '@/framework/components/common/msgCode/index.vue'
import { isNotEmpty } from '@/framework/utils/common'


interface Emits {
  (e: 'submit', data: any): void
  (e: 'to-login'): void
}

const emit = defineEmits<Emits>()

let formData = reactive({
  phoneNumber: '',
  msgCode: '',
  captcha: '',
  loginId: '',
  password: '',
})

// 移除 readonly 属性以阻止浏览器自动填充
const removeReadonly = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement
  if (target) {
    target.removeAttribute('readonly')
  }
}

const passwordValidator = () => {
  return validatePassword(formData.password)
}

const userNameValidator = () => {
  if (isNotEmpty(formData.loginId)) {
    return userAlreadyExisted(
      undefined,
      undefined,
      formData.loginId,
      undefined,
      undefined
    )
  } else {
    return Promise.reject('请输入用户名!')
  }
}

const handleSubmit = (data: any) => {
  emit('submit', data)
}
</script>

<style scoped>
.register-header {
  margin-bottom: 20px;
}

.register-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1f36;
  text-align: center;
}

.login-content-wrapper {
  padding: 20px 0;
}
</style>
