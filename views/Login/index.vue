<template>
  <div class="login-box fullscreen-bg">
    <div
      style="width: 425px; height: 550px; box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5); background: rgba(255,255,255,0.3)">
      <div class="login-logo">
        <img :width="40" alt="登录图案" src="../../../assets/image/login/logo.png" style="margin-top: 8px" />
        <h1 class="mb-0 ml-2 text-3xl font-bold" style="padding-top: 10px; margin-left: 5px">{{ title }}</h1>
      </div>
      <a-form v-if="passwordResetMode" :model="passwordResetForm" layout="horizontal" @finish="handleInitPassword">
        <a-form-item
          :rules="[{ validator: passwordResetValidator, trigger: 'change' }]"
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
            style="height: 50px;">
            <template #suffix>
              <img
                :height="40" :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
                @click="updateCaptchaUrl('INIT_PASSWORD_CAPTCHA')" />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item>
          <a-button :loading="loading" block html-type="submit" size="large" type="primary">设置密码并登录
          </a-button>
        </a-form-item>
      </a-form>
      <template v-else-if="registerMode">
        <msg-code
          v-if="registerWithPhoneNumber" v-model:form-data="registerForm" :finish="handleMsgRegister"
          :phone-number-existed="false"
          sms-type="REGISTER_MSG_CODE"
          submit-text="注册并登录">
          <a-form-item
            :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }, { validator: userNameValidator, trigger: 'blur' }]"
            name="userName">
            <a-input
              v-model:value="registerForm.loginId" autocomplete="off" placeholder="用户名" size="large"
              style="height: 50px;">
              <template #prefix>
                <user-outlined />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item
            :rules="[{ validator: passwordLoginValidator, trigger: 'change' }]"
            has-feedback
            name="password">
            <a-input-password
              v-model:value="registerForm.password" autocomplete="off" placeholder="密码" size="large"
              type="password">
              <template #prefix>
                <SafetyOutlined />
              </template>
            </a-input-password>
          </a-form-item>
          <template #footer>
            <div style="display: flex;justify-content: flex-end; margin-top: -5px">
              <a-button style="color: rgba(0,125,255,0.7)" type="text" @click="changeToLoginMode">已有账号</a-button>
            </div>
          </template>
        </msg-code>
        <a-form v-else :model="registerForm" layout="horizontal" @finish="handleRegister">
          <a-form-item
            :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }, { validator: userNameValidator, trigger: 'blur' }]"
            name="loginId">
            <a-input
              v-model:value="registerForm.loginId" autocomplete="off" placeholder="用户名" size="large"
              style="height: 50px;">
              <template #prefix>
                <user-outlined />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item
            :rules="[{ validator: passwordLoginValidator, trigger: 'change' }]"
            has-feedback
            name="password">
            <a-input-password
              v-model:value="registerForm.password" autocomplete="off" placeholder="密码" size="large"
              style="height: 50px;" type="password">
              <template #prefix>
                <SafetyOutlined />
              </template>
            </a-input-password>
          </a-form-item>
          <a-form-item :rules="[{ required: true, message: '请输入验证码' }]" name="captcha">
            <a-input
              v-model:value="registerForm.captcha" :maxlength="4" placeholder="验证码" size="large"
              style="height: 50px;">
              <template #suffix>
                <img
                  :height="40" :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
                  @click="updateCaptchaUrl('REGISTER_CAPTCHA')" />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <a-button :loading="loading" block html-type="submit" size="large" style="margin-top: 60px" type="primary">
              注册并登录
            </a-button>
          </a-form-item>
        </a-form>
        <div style="display: flex;justify-content: flex-end; margin-top: -5px">
          <a-button style="color: rgba(0,125,255,0.7)" type="text" @click="changeToLoginMode">已有账号</a-button>
        </div>
      </template>
      <a-badge-ribbon
        v-else class="register-badge" color="rgba(145,190,255,55)" style="margin-top: -20px"
        text="还没有账号">
        <a-tabs v-model:activeKey="activeKey" style="padding:0 20px ">
          <a-tab-pane key="1" tab="账号登录">
            <a-form :model="formInline" layout="horizontal" @finish="handleSubmit">
              <a-form-item :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }]" name="userName">
                <a-input
                  v-model:value="formInline.userName" autocomplete="off" placeholder="用户名" size="large"
                  style="height: 50px;">
                  <template #prefix>
                    <user-outlined />
                  </template>
                </a-input>
              </a-form-item>
              <a-form-item :rules="[{ required: true, message: '请输入密码!', trigger: 'change' }]" name="password">
                <a-input-password
                  v-model:value="formInline.password" autocomplete="off" placeholder="密码" size="large"
                  style="height: 50px;"
                  type="password">
                  <template #prefix>
                    <lock-outlined />
                  </template>
                </a-input-password>
              </a-form-item>
              <a-form-item :rules="[{ required: true, message: '请输入验证码!', trigger: 'change' }]" name="captcha">
                <a-input
                  v-model:value="formInline.captcha" :maxlength="4" placeholder="验证码" size="large"
                  style="height: 50px;">
                  <template #prefix>
                    <SafetyOutlined />
                  </template>
                  <template #suffix>
                    <img
                      :height="40" :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
                      @click="updateCaptchaUrl('LOGIN_CAPTCHA')" />
                  </template>
                </a-input>
              </a-form-item>
              <a-form-item>
                <a-button :loading="loading" block html-type="submit" size="large" type="primary">登录</a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
          <a-tab-pane key="2" tab="手机登录">
            <msg-code
              :key="msgCodeKey" v-model:form-data="msgLoginForm" :finish="handleMsgLogin"
              :phone-number-existed="registerWithPhoneNumber?undefined:true"
              sms-type="LOGIN_MSG_CODE" />
          </a-tab-pane>
        </a-tabs>
      </a-badge-ribbon>
    </div>
    <copyright-icp />
  </div>
</template>

<script lang="ts" setup>
import { Md5 } from 'ts-md5'
import { reactive, Ref } from 'vue'
import { message } from 'ant-design-vue'
import { checkLoginState } from '@/framework/network/login'
import MsgCode from '@/framework/components/common/msgCode/index.vue'
import {
  getToken,
  initPasswordAndLogin,
  login,
  msgCodeLogin,
  msgCodeRegister,
  passwordRegister
} from '@/framework/apis/login/login'
import { localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN } from '@/framework/utils/constant'
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import { baseURL } from '@/framework/network/request'
import CopyrightIcp from '@/framework/components/common/copyrightIcp/index.vue'
import { userAlreadyExisted } from '@/framework/apis/admin/user'
import { parameterStore } from '@/framework/store/common'

const activeKey = ref('1')

const title: Ref<string> = ref(document.title)
const router = useRouter()
let captchaUrl: Ref<string> = ref('')
let loading: Ref<boolean> = ref(false)
const formInline = reactive({userName: '', password: '', captcha: ''})
const passwordResetMode: Ref<Boolean> = ref(false)
const passwordResetForm = reactive({password: '', passwordConfirm: '', captcha: ''})
const registerMode: Ref<Boolean> = ref(false)
let registerForm = reactive({phoneNumber: '', msgCode: '', captcha: '', loginId: '', password: ''})
const registerWithPhoneNumber: Ref<boolean> = ref(false)
let msgLoginForm = reactive({phoneNumber: '', msgCode: '', captcha: ''})
const msgCodeKey = ref(true)
const getCaptchaUrl = (captchaType: string) => baseURL + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + captchaType
const updateCaptchaUrl = (captchaType: string) => captchaUrl.value = getCaptchaUrl(captchaType) + '&r=' + Math.random()

const recoveryFun = (captchaType: string) => {
  registerMode.value = false
  updateCaptchaUrl(captchaType)
  loading.value = false
}

const userNameValidator = () => {
  if (isNotEmpty(registerForm.loginId)) {
    return userAlreadyExisted(undefined, undefined, registerForm.loginId, undefined, undefined)
  } else {
    return Promise.reject('请输入用户名!')
  }
}

const handleSubmit = () => {
  const {userName, password, captcha} = formInline
  let captchaType = 'LOGIN_CAPTCHA'
  message.loading('登录中...', 0)
  loading.value = true
  login(captcha, userName, Md5.hashStr(password)).then(res => {
    afterLogin(res)
  }).catch(err => {
    if (err.message === 'AC_PASSWORD_NOT_EXISTED') {
      passwordResetMode.value = true
      title.value = '首次登录-设置密码'
      captchaType = 'INIT_PASSWORD_CAPTCHA'
    }
    recoveryFun(captchaType)
  })
}
const handleRegister = () => {
  const {loginId, password, captcha} = registerForm
  message.loading('登录中...', 0)
  loading.value = true
  return passwordRegister(captcha, loginId, Md5.hashStr(password)).then(res => {
    afterLogin(res)
  }).catch(() => {
    recoveryFun('LOGIN_CAPTCHA')
  })
}
const handleMsgRegister = (data: any) => {
  message.loading('登录中...', 0)
  loading.value = true
  return msgCodeRegister(data).then(res => {
    afterLogin(res)
  }).catch(() => {
    recoveryFun('LOGIN_CAPTCHA')
  })
}
const handleMsgLogin = (data: any) => {
  message.loading('登录中...', 0)
  loading.value = true
  return msgCodeLogin(data.phoneNumber, data.msgCode).then(res => {
    afterLogin(res)
  }).catch(() => {
    msgCodeKey.value = !msgCodeKey.value
  })
}

const afterLogin = (res: any) => {
  const route = router.currentRoute.value
  const redirect_uri = route.query ? route.query.redirect_uri ? '/' + route.query.redirect_uri : undefined : undefined
  message.success({content: () => '登录成功！正在继续转跳，请稍后...', style: {marginTop: '10vh'}})
  const {accessToken, refreshToken} = res.payload
  localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken)
  localStorageMethods.setLocalStorage(REFRESH_TOKEN, refreshToken)
  loading.value = false
  checkLoginState().then(() => router.replace(redirect_uri || '/'))
}

const handleInitPassword = () => {
  message.loading('登录中...', 0)
  loading.value = true
  const {password, passwordConfirm, captcha} = passwordResetForm
  const {userName} = formInline
  initPasswordAndLogin(userName, Md5.hashStr(password), Md5.hashStr(passwordConfirm), captcha).then(res => {
    afterLogin(res)
  }).catch(() => {
    passwordResetMode.value = false
    title.value = document.title
    recoveryFun('LOGIN_CAPTCHA')
  })
}

const passwordResetValidator = () => {
  return lxStr(passwordResetForm.password)
}

const passwordLoginValidator = () => {
  return lxStr(registerForm.password)
}

// 判断密码是否为连续的数字或字母
const lxStr = (password: string) => {
  console.log('lxStr', password)
  if (isEmpty(password)) {
    return Promise.reject('请输入密码')
  }
  if (!password.match('^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{5,}$')) {
    return Promise.reject('请输入5位以上数字和字母')
  }
  let arr = password.split('')
  for (let i = 1; i < arr.length - 1; i++) {
    let firstIndex = arr[i - 1].charCodeAt()
    let secondIndex = arr[i].charCodeAt()
    let thirdIndex = arr[i + 1].charCodeAt()
    if ((thirdIndex === secondIndex) && (secondIndex === firstIndex)) {
      return Promise.reject('3位相同的字母或数字')
    }
    if ((thirdIndex - secondIndex === 1) && (secondIndex - firstIndex === 1)) {
      return Promise.reject('3位连续的字母或数字')
    }
    if ((firstIndex - secondIndex === 1) && (secondIndex - thirdIndex === 1)) {
      return Promise.reject('3位连续的字母或数字')
    }
  }
  return Promise.resolve()
}

const changeToLoginMode = () => {
  registerMode.value = false
  nextTick(setRegisterButtonStyle)
  updateCaptchaUrl('LOGIN_CAPTCHA')
}
const setRegisterButtonStyle = () => {
  const registerButton = document.querySelector('.register-badge') as HTMLElement
  registerButton?.addEventListener('click', function () {
    registerMode.value = true
    updateCaptchaUrl('REGISTER_CAPTCHA')
  });
  // 鼠标悬停事件监听器
  registerButton?.addEventListener('mouseover', () => {
    registerButton.style.cursor = 'pointer'
  });
  // 鼠标移开事件监听器
  registerButton?.addEventListener('mouseout', function () {
    registerButton.style.cursor = 'auto'
  });
}

onBeforeMount(() => getToken().then((res) => {
  const {token} = res.payload
  localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
  updateCaptchaUrl('LOGIN_CAPTCHA')
}))
onMounted(() => {
  setRegisterButtonStyle()
  parameterStore().getParameter('PHONE_NUMBER_REGISTER').then(resp => {
    registerWithPhoneNumber.value = resp === '1'
  })

})
</script>

<style lang="less" scoped>
.fullscreen-bg {
  background-image: url('../../../assets/image/login/backgroud.jpg');
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-size: cover;
  height: 100%;
}

.login-box {
  display: flex;
  padding-top: 10vh;
  flex-direction: column;
  align-items: center;

  .login-logo {
    display: flex;
    margin-bottom: 15px;
    align-items: center;
    justify-content: center;
    background-image: url('../../../assets/image/login/titleBackground.png');

    .svg-icon {
      font-size: 48px;
    }
  }

  :deep(.ant-form) {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
