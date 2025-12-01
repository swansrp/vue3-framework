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
import { userAlreadyExisted } from '@/framework/apis/admin/user'
import { isNotEmpty } from '@/framework/utils/common'
import { validatePassword } from '../../../utils/passwordValidator'

interface Props {
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { loginId: string; password: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
  (e: 'to-login'): void
}

const props = withDefaults(defineProps<Props>(), {
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
  color: #1a1f36;
  text-align: center;
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
  margin-top: 10px;
}

.login-mode-btn {
  padding: 0;
}
</style>
