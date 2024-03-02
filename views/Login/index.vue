<template>
  <div class="login-box">
    <div class="login-logo">
      <img :width="45" alt="登录图案" src="../../assets/imgs/login/logo.png" />
      <h1 class="mb-0 ml-2 text-3xl font-bold">{{ title }}</h1>
    </div>
    <a-form v-if="passwordResetMode" :model="passwordResetForm" layout="horizontal" @finish="handleInitPassword">
      <a-form-item
        :rules="[
          { required: true, message: '请输入密码' },
          { message: '5位以上数字和字母', pattern: '^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{5,}$' },
          { validator: lxStr, trigger: 'change' }]"
        has-feedback
        label="输入密码"
        name="password">
        <a-input-password
          v-model:value="passwordResetForm.password" autocomplete="off" placeholder="密码" size="large"
          type="password" />
      </a-form-item>
      <a-form-item
        :rules="[{ required: true, message: '两次密码不一致', pattern: new RegExp('^'+ passwordResetForm.password + '$') }]"
        has-feedback
        label="确认密码"
        name="passwordConfirm">
        <a-input-password
          v-model:value="passwordResetForm.passwordConfirm" autocomplete="off" placeholder="确认密码"
          size="large" type="password" />
      </a-form-item>
      <a-form-item :rules="[{ required: true, message: '请输入验证码' }]" name="captcha">
        <a-input
          v-model:value="passwordResetForm.captcha" :maxlength="4" placeholder="验证码" size="large"
          style="height: 55px;">
          <template #suffix>
            <img
              :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
              @click="updateCaptchaUrl('INIT_PASSWORD_CAPTCHA')" />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-button :loading="loading" block html-type="submit" size="large" type="primary">设置密码并登录</a-button>
      </a-form-item>
    </a-form>
    <a-form v-else :model="formInline" layout="horizontal" @finish="handleSubmit">
      <a-form-item :rules="[{ required: true, message: '请输入用户名!' }]" name="username">
        <a-input
          v-model:value="formInline.username" autocomplete="off" placeholder="用户名" size="large"
          style="height: 55px;">
          <template #prefix>
            <user-outlined />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item :rules="[{ required: true, message: '请输入密码!' }]" name="password">
        <a-input-password
          v-model:value="formInline.password" autocomplete="off" placeholder="密码" size="large" style="height: 55px;"
          type="password">
          <template #prefix>
            <lock-outlined />
          </template>
        </a-input-password>
      </a-form-item>
      <a-form-item :rules="[{ required: true, message: '请输入验证码!' }]" name="captcha">
        <a-input
          v-model:value="formInline.captcha" :maxlength="4" placeholder="验证码" size="large"
          style="height: 55px;">
          <template #prefix>
            <SafetyOutlined />
          </template>
          <template #suffix>
            <img
              :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
              @click="updateCaptchaUrl('LOGIN_CAPTCHA')" />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-button :loading="loading" block html-type="submit" size="large" type="primary">登录</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
import {Md5} from 'ts-md5'
import {reactive, Ref} from 'vue'
import {message} from 'ant-design-vue'
import 'ant-design-vue/lib/message/style/index.css'
import {checkLoginState} from '@/framework/network/login'
import {initPasswordAndLogin, login} from '@/framework/apis/login/login'
import {localStorageMethods} from '@/framework/utils/common'
import {AUTHORIZATION_TOKEN, REFRESH_TOKEN} from '@/framework/utils/constant'
import {LockOutlined, SafetyOutlined, UserOutlined} from '@ant-design/icons-vue'
import {useRouter} from 'vue-router'
import {baseURL} from '@/framework/network/request'

const title: Ref<string> = ref(document.title)
const router = useRouter()
let captchaUrl: Ref<string> = ref('')
let loading: Ref<boolean> = ref(false)
const formInline = reactive({username: '', password: '', captcha: ''})

const passwordResetMode: Ref<Boolean> = ref(false)
const passwordResetForm = reactive({password: '', passwordConfirm: '', captcha: ''})

const getCaptchaUrl = (captchaType: string) => baseURL + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + captchaType
const updateCaptchaUrl = (captchaType: string) => captchaUrl.value = getCaptchaUrl(captchaType) + '&r=' + Math.random()

const recoveryFun = (captchaType: string) => {
  updateCaptchaUrl(captchaType)
  message.destroy()
  loading.value = false
}

const handleSubmit = () => {
  const route = router.currentRoute.value
  const redirect_uri = route.query ? route.query.redirect_uri ? '/' + route.query.redirect_uri : undefined : undefined
  const {username, password, captcha} = formInline
  let captchaType = 'LOGIN_CAPTCHA'
  message.loading('登录中...', 0)
  loading.value = true
  login(captcha, username, Md5.hashStr(password)).then(res => {
    message.destroy()
    message.success({content: () => '登录成功！正在继续转跳，请稍后...', style: {marginTop: '10vh'}})
    const {accessToken, refreshToken} = res.payload
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken)
    localStorageMethods.setLocalStorage(REFRESH_TOKEN, refreshToken)
    checkLoginState().then(() => router.replace(redirect_uri || '/')).then(() => loading.value = false)
  }).catch(err => {
    if (err.message === 'AC_PASSWORD_NOT_EXISTED') {
      passwordResetMode.value = true
      title.value = '首次登录-设置密码'
      captchaType = 'INIT_PASSWORD_CAPTCHA'
    }
    recoveryFun(captchaType)
  })
}

const handleInitPassword = () => {
  const route = router.currentRoute.value
  const redirect_uri = route.query ? route.query.redirect_uri ? '/' + route.query.redirect_uri : undefined : undefined
  const {password, passwordConfirm, captcha} = passwordResetForm
  const {username} = formInline
  initPasswordAndLogin(username, Md5.hashStr(password), Md5.hashStr(passwordConfirm), captcha).then(res => {
    message.destroy()
    message.success({content: () => '登录成功！正在继续转跳，请稍后...', style: {marginTop: '10vh'}})
    const {accessToken, refreshToken} = res.payload
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken)
    localStorageMethods.setLocalStorage(REFRESH_TOKEN, refreshToken)
    checkLoginState().then(() => router.replace(redirect_uri || '/')).then(() => loading.value = false)
  }).catch(() => {
    passwordResetMode.value = false
    title.value = document.title
    recoveryFun('LOGIN_CAPTCHA')
  })
}

// 判断密码是否为连续的数字或字母
const lxStr = () => {
  const {password} = passwordResetForm
  let arr = password.split('')
  for (let i = 1; i < arr.length - 1; i++) {
    let firstIndex = arr[i - 1].charCodeAt()
    let secondIndex = arr[i].charCodeAt()
    let thirdIndex = arr[i + 1].charCodeAt()
    if ((thirdIndex === secondIndex) && (secondIndex === firstIndex)) {
      return Promise.reject("3位相同的字母或数字")
    }
    if ((thirdIndex - secondIndex === 1) && (secondIndex - firstIndex === 1)) {
      return Promise.reject("3位连续的字母或数字")
    }
    if ((firstIndex - secondIndex === 1) && (secondIndex - thirdIndex === 1)) {
      return Promise.reject("3位连续的字母或数字")
    }
  }
  return Promise.resolve()
}

onBeforeMount(() => updateCaptchaUrl('LOGIN_CAPTCHA'))
</script>

<style lang="less" scoped>
.login-box {
  display: flex;
  width: 100vw;
  height: 100vh;
  padding-top: 240px;
  background: #fff url('../../assets/imgs/login/login.svg');
  background-size: 100%;
  flex-direction: column;
  align-items: center;

  .login-logo {
    display: flex;
    margin-bottom: 30px;
    align-items: center;

    .svg-icon {
      font-size: 48px;
    }
  }

  :deep(.ant-form) {
    width: 400px;


    .ant-form-item-label {
      padding-right: 6px;
    }
  }
}
</style>
