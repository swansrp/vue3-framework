<template>
  <div class="login-box">
    <div class="login-logo">
      <img src="../../assets/imgs/login/logo.png" :width="45" alt="登录图案" />
      <h1 class="mb-0 ml-2 text-3xl font-bold">权限配置系统</h1>
    </div>
    <a-form layout="horizontal" :model="formInline" @finish="handleSubmit">
      <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名!' }]">
        <a-input v-model:value="formInline.username" size="large" placeholder="用户名" autocomplete="off">
          <template #prefix><user-outlined type="user" /></template>
        </a-input>
      </a-form-item>
      <a-form-item name="password" :rules="[{ required: true, message: '请输入密码!' }]">
        <a-input v-model:value="formInline.password" size="large" type="password" placeholder="密码" autocomplete="off">
          <template #prefix><lock-outlined type="user" /></template>
        </a-input>
      </a-form-item>
      <a-form-item name="captcha" :rules="[{ required: true, message: '请输入验证码!' }]">
        <a-input v-model:value="formInline.captcha" placeholder="验证码" :maxlength="4" size="large">
          <template #prefix><SafetyOutlined /></template>
          <template #suffix>
            <img :src="captchaUrl" class="absolute right-0 h-full cursor-pointer" @click="updateCaptchaUrl" alt="验证码" />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit" size="large" :loading="loading" block>登录</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import {Md5} from "ts-md5"
import {reactive, Ref} from 'vue'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {checkLoginState} from "@/framework/network/utils"
import {reserveLogin} from "@/framework/apis/login/login"
import {localStorageMethods} from "@/framework/utils/common"
import {AUTHORIZATION_TOKEN} from "@/framework/utils/constant"
import {baseUrl} from "@/framework/apis";
import 'ant-design-vue/lib/message/style/index.css'

const router = useRouter()
let captchaUrl: Ref<string> = ref('')
let loading:Ref<boolean> = ref(false)
const formInline = reactive({username: '', password: '', captcha: ''})

const getCaptchaUrl = (captchaType: string) => baseUrl + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + captchaType
const updateCaptchaUrl = () => captchaUrl.value = getCaptchaUrl('LOGIN_CAPTCHA') + '&r=' + Math.random()

const handleSubmit = () => {
  const { username, password, captcha } = formInline;
  message.loading('登录中...', 0)
  loading.value = true
  reserveLogin(captcha, username, Md5.hashStr(password)).then(res => {
    message.success('登录成功！正在继续转跳，请稍后...')
    const {accessToken} = res.payload
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken)
    checkLoginState(true).then(() => router.replace('/'))
  }).finally(() => {
    updateCaptchaUrl()
    message.destroy()
    loading.value = false
  })
}

onBeforeMount(updateCaptchaUrl)
</script>

<style lang="less" scoped>
  .login-box {
    display: flex;
    width: 100vw;
    height: 100vh;
    padding-top: 240px;
    background: url('../../assets/imgs/login/login.svg');
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
