<template>
  <div
    v-if="visible"
    class="password-expired-overlay"
  >
    <div class="password-expired-container">
      <div class="password-expired-header">
        <h2 class="password-expired-title">
          密码已过期，请更换密码
        </h2>
        <button
          class="close-btn"
          @click="handleCancel"
        >
          ×
        </button>
      </div>
      <a-form
        :model="formData"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
        layout="vertical"
        class="password-expired-form"
        autocomplete="off"
        @finish="handleSubmit"
      >
        <div class="form-content">
          <a-form-item
            :rules="[{ validator: passwordValidator, trigger: 'change' }]"
            has-feedback
            label="输入新密码："
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
                  @click="$emit('update-captcha', 'RESET_PASSWORD_CAPTCHA')"
                />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <div class="button-group">
              <a-button
                size="large"
                @click="handleCancel"
              >
                取消
              </a-button>
              <a-button
                :loading="loading"
                type="primary"
                html-type="submit"
                size="large"
              >
                确认
              </a-button>
            </div>
          </a-form-item>
        </div>
      </a-form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, computed } from 'vue'

import { validatePassword } from '../../../utils/passwordValidator'

interface Props {
  modelValue: boolean
  captchaUrl: string
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: { password: string; passwordConfirm: string; captcha: string }): void
  (e: 'update-captcha', type: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

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

const handleCancel = () => {
  visible.value = false
  formData.password = ''
  formData.passwordConfirm = ''
  formData.captcha = ''
}
</script>

<style scoped>
.password-expired-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.password-expired-container {
  width: 90%;
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
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.password-expired-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.password-expired-header::before {
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
  z-index: 0; /* 确保在标题和按钮下方 */
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

.password-expired-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 180, 120, 0.2);
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1; /* 确保在动画上方 */
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1; /* 确保在动画上方 */
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 180, 120, 1);
  transform: rotate(90deg);
}

.password-expired-form {
  padding: 2rem;
}

.form-content {
  margin-top: 20px;
  width: 100%;
}

.password-expired-form :deep(.ant-form-item-label > label) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 0.95rem;
}

.password-expired-form :deep(.ant-form-item) {
  margin-bottom: 20px; /* 减小表单项之间的间距 */
}

.password-expired-form :deep(.ant-form-item-label) {
  padding-bottom: 4px; /* 减小标签和输入框之间的间距 */
}

.password-expired-form :deep(.ant-input),
.password-expired-form :deep(.ant-input-password) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 180, 120, 0.3);
  color: #ffffff;
  transition: all 0.3s ease;
}

.password-expired-form :deep(.ant-input:hover),
.password-expired-form :deep(.ant-input-password:hover) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 180, 120, 0.5);
}

.password-expired-form :deep(.ant-input:focus),
.password-expired-form :deep(.ant-input-password:focus),
.password-expired-form :deep(.ant-input-affix-wrapper-focused) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 180, 120, 0.8);
  box-shadow: 0 0 0 2px rgba(255, 180, 120, 0.2);
}

.password-expired-form :deep(.ant-input::placeholder) {
  color: rgba(255, 255, 255, 0.4);
}

.password-expired-form :deep(.ant-input-password-icon) {
  color: rgba(255, 255, 255, 0.6);
}

.password-expired-form :deep(.ant-input-password-icon:hover) {
  color: rgba(255, 180, 120, 1);
}

.password-expired-form :deep(.ant-form-item-explain-error) {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.button-group .ant-btn {
  min-width: 100px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.button-group .ant-btn:not(.ant-btn-primary) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 180, 120, 0.3);
  color: rgba(255, 255, 255, 0.9);
}

.button-group .ant-btn:not(.ant-btn-primary):hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 180, 120, 0.5);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 180, 120, 0.2);
}

.button-group .ant-btn-primary {
  background: linear-gradient(135deg, rgba(255, 180, 120, 0.9), rgba(255, 160, 100, 0.9));
  border: none;
  color: #1a2332;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 180, 120, 0.4);
}

.button-group .ant-btn-primary:hover {
  background: linear-gradient(135deg, rgba(255, 200, 140, 1), rgba(255, 180, 120, 1));
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 180, 120, 0.5);
}

@media (max-width: 768px) {
  .password-expired-container {
    max-width: 95%;
    margin: 1rem;
  }

  .password-expired-header {
    padding: 1.25rem 1.5rem;
  }

  .password-expired-title {
    font-size: 1.1rem;
  }

  .password-expired-form {
    padding: 1.5rem;
  }
}
</style>
