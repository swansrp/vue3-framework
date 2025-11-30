<template>
  <a-form
    :model="formData"
    layout="horizontal"
    autocomplete="off"
    @finish="handleSubmit"
  >
    <a-form-item
      :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }]"
      name="userName"
    >
      <a-input
        v-model:value="formData.userName"
        autocomplete="off"
        name="username-login"
        placeholder="用户名"
        size="large"
      >
        <template #prefix>
          <user-outlined />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item
      :rules="[{ required: true, message: '请输入密码!', trigger: 'change' }]"
      name="password"
    >
      <a-input-password
        v-model:value="formData.password"
        autocomplete="new-password"
        name="password-login"
        placeholder="密码"
        size="large"
        type="password"
      >
        <template #prefix>
          <lock-outlined />
        </template>
      </a-input-password>
    </a-form-item>
    <a-form-item
      :rules="[{ required: true, message: '请输入验证码!', trigger: 'change' }]"
      name="captcha"
    >
      <a-input
        v-model:value="formData.captcha"
        :maxlength="4"
        autocomplete="off"
        placeholder="验证码"
        size="large"
      >
        <template #prefix>
          <SafetyOutlined />
        </template>
        <template #suffix>
          <img
            :height="40"
            :src="captchaUrl"
            alt="验证码"
            class="absolute right-0 h-full cursor-pointer"
            @click="$emit('update-captcha', 'LOGIN_CAPTCHA')"
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
        type="primary"
      >
        登录
      </a-button>
    </a-form-item>
  </a-form>
</template>

<script lang="ts" setup>
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons-vue'
import { reactive } from 'vue'

interface Props {
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { userName: string; password: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const formData = reactive({
  userName: '',
  password: '',
  captcha: ''
})

const handleSubmit = () => {
  emit('submit', { ...formData })
}
</script>
