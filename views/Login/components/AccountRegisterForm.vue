<template>
  <div class="login-content-wrapper">
    <div class="register-header">
      <div class="register-title">
        注册账号
      </div>
    </div>
    <a-form
      :model="formData"
      layout="horizontal"
      class="register-form"
      autocomplete="off"
      @finish="handleSubmit"
    >
      <a-form-item
        :rules="[
          { required: true, message: '请输入用户名!', trigger: 'change' },
          { validator: userNameValidator, trigger: 'blur' },
        ]"
        name="loginId"
      >
        <a-input
          v-model:value="formData.loginId"
          autocomplete="off"
          name="username-new"
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
          name="password-new"
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
      <a-form-item
        :rules="[{ required: true, message: '请输入验证码' }]"
        name="captcha"
      >
        <a-input
          v-model:value="formData.captcha"
          :maxlength="4"
          autocomplete="off"
          placeholder="验证码"
          size="large"
        >
          <template #suffix>
            <img
              :height="40"
              :src="captchaUrl"
              alt="验证码"
              class="absolute right-0 h-full cursor-pointer"
              @click="$emit('update-captcha', 'REGISTER_CAPTCHA')"
            />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-button
          :loading="loading"
          block
          html-type="submit"
          size="large"
          class="register-submit-btn"
          type="primary"
        >
          注册并登录
        </a-button>
      </a-form-item>
    </a-form>
    <div class="login-footer-links">
      <a-button
        class="login-mode-btn"
        type="text"
        @click="$emit('to-login')"
      >
        已有账号
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { SafetyOutlined, UserOutlined } from '@ant-design/icons-vue'
import { reactive } from 'vue'

import { validatePassword } from '../../../utils/passwordValidator'

import { userAlreadyExisted } from '@/framework/apis/admin/user'
import { isNotEmpty } from '@/framework/utils/common'

interface Props {
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { loginId: string; password: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
  (e: 'to-login'): void
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const formData = reactive({
  loginId: '',
  password: '',
  captcha: ''
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

const handleSubmit = () => {
  emit('submit', { ...formData })
}
</script>

<style scoped>
.register-header {
  margin-bottom: 20px;
}

.register-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 10px rgba(255, 180, 120, 0.4);
}

.login-content-wrapper {
  padding: 20px 0;
}

.register-form {
  width: 100%;
}

.login-footer-links {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
  padding: 0 25px 15px;
}

.login-mode-btn {
  height: auto !important;
  padding: 8px 16px !important;
  color: #ffffff !important;
  background: linear-gradient(135deg,
  rgba(255, 180, 120, 0.15) 0%,
  rgba(255, 200, 140, 0.1) 50%,
  rgba(255, 220, 160, 0.15) 100%) !important;
  border: 1px solid rgba(255, 180, 120, 0.4) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(255, 180, 120, 0.2),
  inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: all 0.15s ease !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(8px) !important;

  &:hover {
    color: #ffffff !important;
    background: linear-gradient(135deg,
    rgba(255, 200, 140, 0.25) 0%,
    rgba(255, 220, 160, 0.2) 50%,
    rgba(255, 240, 180, 0.25) 100%) !important;
    border-color: rgba(255, 200, 140, 0.6) !important;
    box-shadow: 0 3px 10px rgba(255, 180, 120, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 8px rgba(255, 180, 120, 0.4) !important;
  }

  &:active {
    transform: translateY(1px) !important;
    box-shadow: 0 1px 4px rgba(255, 180, 120, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  }
}

@media (max-width: 480px) {
  .login-footer-links {
    padding: 0 25px 15px;
    margin-top: 0;
  }

  .login-mode-btn {
    font-size: 12px !important;
    padding: 6px 12px !important;
  }
}
</style>
