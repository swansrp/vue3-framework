<template>
  <a-form
    :model="formData"
    layout="horizontal"
    :autocomplete="rememberPassword ? 'on' : 'off'"
    @finish="handleSubmit"
  >
    <a-form-item
      :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }]"
      name="userName"
    >
      <a-input
        v-model:value="formData.userName"
        :autocomplete="rememberPassword ? 'username' : 'new-password'"
        :name="rememberPassword ? 'username' : 'username-' + randomSuffix"
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
        :autocomplete="rememberPassword ? 'current-password' : 'new-password'"
        :name="rememberPassword ? 'password' : 'password-' + randomSuffix"
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
    <a-form-item name="rememberPassword">
      <a-checkbox
        v-model:checked="rememberPassword"
        @change="handleRememberChange"
      >
        记住密码
      </a-checkbox>
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
import { onMounted, ref, reactive, watch, nextTick } from 'vue'

import { localStorageMethods } from '@/framework/utils/common'

interface Props {
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { userName: string; password: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const formData = reactive({
  userName: '',
  password: '',
  captcha: ''
})

// 记住密码选项
const rememberPassword = ref(false)

// 生成固定的随机后缀，避免每次渲染时变化导致输入框重新渲染
const randomSuffix = ref('')

// 从 localStorage 读取记住密码设置
onMounted(() => {
  const savedRememberPassword = localStorageMethods.getLocalStorage('REMEMBER_PASSWORD', 'false')
  rememberPassword.value = savedRememberPassword === 'true'
  
  // 生成固定的随机后缀
  randomSuffix.value = Date.now().toString()
  
  // 如果不记住密码，延迟清空表单（防止浏览器自动填充）
  if (!rememberPassword.value) {
    setTimeout(() => {
      formData.userName = ''
      formData.password = ''
    }, 100)
  }
})

// 监听记住密码选项变化，取消勾选时清空表单
watch(rememberPassword, (newVal) => {
  if (!newVal) {
    nextTick(() => {
      formData.userName = ''
      formData.password = ''
    })
  }
})

// 处理记住密码选项变化
const handleRememberChange = (e: any) => {
  const checked = e.target.checked
  localStorageMethods.setLocalStorage('REMEMBER_PASSWORD', checked ? 'true' : 'false')
}

const handleSubmit = () => {
  emit('submit', { ...formData })
}
</script>
