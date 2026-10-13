<template>
  <!-- 框架「设置密码」弹层（从 TopHeader 抽出的共用件）：旧密码＋新密码＋确认，
       提交 changePassword（三段均 md5）。业务顶栏复用本件；入口是否显示由宿主按
       VITE_ssoDomain 闸门决定，本件不管入口 -->
  <a-modal
    :open="open"
    cancel-text="取消"
    ok-text="确认"
    title="设置密码"
    @cancel="emit('update:open', false)"
    @ok="modifyPassword"
  >
    <a-form
      :label-col="{ style: { width: '100px', marginTop: '4px' } }"
      :model="form"
      :wrapper-col="{ span: 16 }"
      layout="horizontal"
    >
      <a-form-item
        :rules="[
          { required: true, message: '请输入密码' }]"
        has-feedback
        label="输入旧密码"
        name="oldPassword"
      >
        <a-input-password
          v-model:value="form.oldPassword"
          autocomplete="off"
          placeholder="密码"
          size="large"
          type="password"
        />
      </a-form-item>
      <a-form-item
        :rules="[
          { required: true, message: '请输入密码' },
          { validator: (_rule, value) => validatePassword(value), trigger: 'change' }]"
        has-feedback
        label="输入新密码"
        name="password"
      >
        <a-input-password
          v-model:value="form.password"
          autocomplete="off"
          placeholder="密码"
          size="large"
          type="password"
        />
      </a-form-item>
      <a-form-item
        :rules="[{ validator: passwordConfirmValidator, trigger: 'change' }]"
        has-feedback
        label="确认密码"
        name="passwordConfirm"
      >
        <a-input-password
          v-model:value="form.passwordConfirm"
          autocomplete="off"
          placeholder="确认密码"
          size="large"
          type="password"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import { Md5 } from 'ts-md5'
import { reactive, watch } from 'vue'

import { changePassword } from '@/framework/apis/login/login'
import { validatePassword } from '@/framework/utils/passwordValidator'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const form = reactive({
  oldPassword: '',
  password: '',
  passwordConfirm: ''
})

// 每次打开都是全新三段（密码弹层不回显上次输入）
watch(() => props.open, v => {
  if (!v) return
  form.oldPassword = ''
  form.password = ''
  form.passwordConfirm = ''
})

const passwordConfirmValidator = (_rule: unknown, value: string) => {
  if (value !== form.password) {
    return Promise.reject('两次密码不一致')
  }
  return Promise.resolve()
}

const modifyPassword = () => {
  changePassword(Md5.hashStr(form.oldPassword), Md5.hashStr(form.password), Md5.hashStr(form.passwordConfirm)).then(() => {
    emit('update:open', false)
  })
}
</script>
