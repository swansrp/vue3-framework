<template>
  <div class="login-box">
    <div class="login-logo">
      <img :width="45" alt="登录图案" src="../../assets/imgs/login/logo.png" />
      <h1 class="mb-0 ml-2 text-3xl font-bold">权限配置系统</h1>
    </div>
    <a-form :model="formInline" layout="horizontal" @finish="handleSubmit">
      <a-form-item :rules="[{ required: true, message: '请输入用户名!' }]" name="username">
        <a-input v-model:value="formInline.username" autocomplete="off" placeholder="用户名" size="large">
          <template #prefix>
            <user-outlined />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item :rules="[{ required: true, message: '请输入密码!' }]" name="password">
        <a-input v-model:value="formInline.password" autocomplete="off" placeholder="密码" size="large" type="password">
          <template #prefix>
            <lock-outlined />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item :rules="[{ required: true, message: '请输入验证码!' }]" name="captcha">
        <a-input v-model:value="formInline.captcha" :maxlength="4" placeholder="验证码" size="large">
          <template #prefix>
            <SafetyOutlined />
          </template>
          <template #suffix>
            <img
              :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
              @click="updateCaptchaUrl" />
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
import {Md5} from "ts-md5"
import {reactive, Ref} from 'vue'
import {message} from 'ant-design-vue'
import {baseUrl} from "@/framework/apis"
import 'ant-design-vue/lib/message/style/index.css'
import {checkLoginState} from "@/framework/network/login"
import {login} from "@/framework/apis/login/login"
import {localStorageMethods} from "@/framework/utils/common"
import {AUTHORIZATION_TOKEN, REFRESH_TOKEN} from "@/framework/utils/constant"
import {LockOutlined, SafetyOutlined, UserOutlined} from '@ant-design/icons-vue'

const router = useRouter()
let captchaUrl: Ref<string> = ref('')
let loading: Ref<boolean> = ref(false)
const formInline = reactive({username: '', password: '', captcha: ''})

const getCaptchaUrl = (captchaType: string) => baseUrl + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + captchaType
const updateCaptchaUrl = () => captchaUrl.value = getCaptchaUrl('LOGIN_CAPTCHA') + '&r=' + Math.random()

const recoveryFun = () => {
  updateCaptchaUrl()
  message.destroy()
  loading.value = false
}
const handleSubmit = () => {
  const {username, password, captcha} = formInline;
  message.loading('登录中...', 0)
  loading.value = true
  login(captcha, username, Md5.hashStr(password)).then(res => {
    message.destroy()
    message.success({content: () => '登录成功！正在继续转跳，请稍后...', style: {marginTop: '10vh'}})
    const {accessToken, refreshToken} = res.payload
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken)
    localStorageMethods.setLocalStorage(REFRESH_TOKEN, refreshToken)
    checkLoginState().then(() => router.replace('/')).then(recoveryFun)
  }).catch(recoveryFun)
}

onBeforeMount(updateCaptchaUrl)
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

    .ant-col {
      width: 100%;
    }

    .ant-form-item-label {
      padding-right: 6px;
    }
  }
}
</style>
