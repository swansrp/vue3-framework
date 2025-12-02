<template>
  <div class="password-reset-overlay">
    <div class="password-reset-container">
      <div class="password-reset-header">
        <h2 class="password-reset-title">
          首次登录，请设置密码
        </h2>
      </div>
      <a-form
        :model="formData"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
        layout="vertical"
        class="password-reset-form"
        autocomplete="off"
        @finish="handleSubmit"
      >
        <div class="form-content">
          <!-- 隐藏的用户名字段，用于浏览器自动填充和无障碍访问 -->
          <input
            type="text"
            name="username"
            autocomplete="username"
            style="position: absolute; opacity: 0; pointer-events: none; height: 0; width: 0;"
            tabindex="-1"
            aria-hidden="true"
          />
          <a-form-item
            :rules="[{ validator: passwordValidator, trigger: 'change' }]"
            has-feedback
            label="输入密码："
            name="password"
          >
            <a-input-password
              v-model:value="formData.password"
              autocomplete="new-password"
              placeholder="至少8位，需含数字和字母"
              size="large"
              type="password"
            />
          </a-form-item>
          <a-form-item
            :rules="[
              {
                required: true,
                message: '两次密码不一致',
                pattern: new RegExp('^' + formData.password + '$'),
              },
            ]"
            has-feedback
            label="确认密码："
            name="passwordConfirm"
          >
            <a-input-password
              v-model:value="formData.passwordConfirm"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              size="large"
              type="password"
            />
          </a-form-item>
          <a-form-item
            :rules="[{ required: true, message: '请输入验证码' }]"
            label="验证码："
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
                  @click="$emit('update-captcha', 'INIT_PASSWORD_CAPTCHA')"
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
              设置密码并登录
            </a-button>
          </a-form-item>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

import { validatePassword } from '../../../utils/passwordValidator'

interface Props {
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { password: string; passwordConfirm: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const formData = reactive({
  password: '',
  passwordConfirm: '',
  captcha: ''
})

const passwordValidator = () => {
  return validatePassword(formData.password)
}

const handleSubmit = () => {
  emit('submit', { ...formData })
}
</script>

<style scoped>
.password-reset-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.password-reset-container {
  width: 100%;
  max-width: 450px;
  background: linear-gradient(
    145deg,
    rgba(30, 45, 70, 0.95) 0%,
    rgba(40, 55, 80, 0.92) 50%,
    rgba(35, 50, 75, 0.94) 100%
  );
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 2px solid;
  border-image: linear-gradient(
      145deg,
      rgba(255, 180, 120, 0.6) 0%,
      rgba(255, 200, 140, 0.4) 25%,
      rgba(255, 220, 160, 0.3) 50%,
      rgba(255, 200, 140, 0.4) 75%,
      rgba(255, 180, 120, 0.6) 100%
    )
    1;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 180, 120, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(255, 180, 120, 0.3);
  position: relative;
  overflow: hidden; /* 防止动画超出框体 */
}

.password-reset-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(
    135deg,
    rgba(20, 35, 60, 0.9) 0%,
    rgba(30, 45, 70, 0.85) 50%,
    rgba(25, 40, 65, 0.88) 100%
  );
  border-bottom: 1px solid rgba(255, 180, 120, 0.3);
  border-radius: 18px 18px 0 0;
  position: relative;
  overflow: hidden; /* 防止动画超出框体 */
}

.password-reset-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg,
  transparent 0%,
  rgba(255, 180, 120, 0.15) 25%,
  rgba(255, 200, 140, 0.2) 50%,
  rgba(255, 180, 120, 0.15) 75%,
  transparent 100%);
  animation: scanLine 4s linear infinite;
  z-index: -1; /* 确保在底层 */
  pointer-events: none; /* 禁止鼠标事件 */
}

@keyframes scanLine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.password-reset-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 180, 120, 0.2);
  letter-spacing: 0.5px;
}

.password-reset-form {
  padding: 2rem;
}

.form-content {
  margin-top: 20px;
  width: 100%;
}

.password-reset-form :deep(.ant-form-item-label > label) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 0.95rem;
}

.password-reset-form :deep(.ant-input),
.password-reset-form :deep(.ant-input-password) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 180, 120, 0.3);
  color: #ffffff;
  transition: all 0.3s ease;
}

.password-reset-form :deep(.ant-input:hover),
.password-reset-form :deep(.ant-input-password:hover) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 180, 120, 0.5);
}

.password-reset-form :deep(.ant-input:focus),
.password-reset-form :deep(.ant-input-password:focus),
.password-reset-form :deep(.ant-input-affix-wrapper-focused) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 180, 120, 0.8);
  box-shadow: 0 0 0 2px rgba(255, 180, 120, 0.2);
}

.password-reset-form :deep(.ant-input::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

.password-reset-form :deep(.ant-input-password-icon) {
  color: rgba(255, 255, 255, 0.6);
}

.password-reset-form :deep(.ant-input-password-icon:hover) {
  color: rgba(255, 180, 120, 1);
}

.password-reset-form :deep(.ant-form-item-explain-error) {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.password-reset-form :deep(.ant-btn-primary) {
  background: linear-gradient(135deg, rgba(255, 180, 120, 0.9), rgba(255, 160, 100, 0.9));
  border: none;
  color: #1a2332;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 180, 120, 0.4);
  transition: all 0.3s ease;
}

.password-reset-form :deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, rgba(255, 200, 140, 1), rgba(255, 180, 120, 1));
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 180, 120, 0.5);
}

@media (max-width: 768px) {
  .password-reset-container {
    max-width: 95%;
    margin: 1rem;
  }

  .password-reset-header {
    padding: 1.25rem 1.5rem;
  }

  .password-reset-title {
    font-size: 1.1rem;
  }

  .password-reset-form {
    padding: 1.5rem;
  }
}
</style>
