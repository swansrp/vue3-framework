<template>
  <a-form :model="formMsgLogin" layout="horizontal" @finish="onFinish">
    <a-form-item :rules="[{ required: true, message: '请输入手机号码!' }]" name="phoneNumber">
      <a-input
        v-model:value="formMsgLogin.phoneNumber" :maxlength="11" autocomplete="off" placeholder="手机号码" size="large"
        style="height: 50px;">
        <template #prefix>
          <PhoneOutlined />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item :rules="[{ required: true, message: '请输入验证码!' }]" name="captcha">
      <a-input
        v-model:value="formMsgLogin.captcha" :maxlength="4" placeholder="验证码" size="large"
        style="height: 50px;">
        <template #prefix>
          <SafetyOutlined />
        </template>
        <template #suffix>
          <img
            :height="40" :src="captchaUrl" alt="验证码" class="absolute right-0 h-full cursor-pointer"
            @click="updateCaptchaUrl" />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item :rules="[{ required: true, message: '请输入短信验证码!' }]" name="msgCode">
      <a-input
        v-model:value="formMsgLogin.msgCode" autocomplete="off" placeholder="短信验证码" size="large"
        style="height: 50px;"
        type="password">
        <template #prefix>
          <lock-outlined />
        </template>
        <template #suffix>
          <a-button
            v-if="countDown === -1"
            :disabled="getMsgCodeDisable" type="primary"
            @click="getLoginMsgCode(formMsgLogin.phoneNumber, formMsgLogin.captcha)">
            获取验证码
          </a-button>
          <span v-else>
            还剩{{ countDown }}秒
          </span>
        </template>
      </a-input>
    </a-form-item>
    <a-form-item>
      <a-button :disabled="!hasSend" :loading="loading" block html-type="submit" size="large" type="primary">登录
      </a-button>
    </a-form-item>
  </a-form>
</template>

<script lang="ts" setup>

import { reactive, Ref } from 'vue'
import { isEmpty, localStorageMethods, startTimer, stopTimer } from '@/framework/utils/common'
import { getMsgCode } from '@/framework/apis/login/login'
import { LockOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { baseURL } from '@/framework/network/request'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
import { message } from 'ant-design-vue'
import { TimerType } from '@/framework/utils/type'
const countDown = ref(-1)
const loading: Ref<boolean> = ref(false)
const props = withDefaults(
  defineProps<{
    smsType: string
    finish: (phoneNumber: string, msgCode: string) => Promise<void>
  }>(),
  {}
)
const {smsType} = toRefs(props)
const hasSend = ref(false)
const captchaUrl: Ref<string> = ref('')
const formMsgLogin = reactive({phoneNumber: '', msgCode: '', captcha: ''})
const getCaptchaUrl = () => baseURL + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + smsType.value + '_CAPTCHA'
const updateCaptchaUrl = () => captchaUrl.value = getCaptchaUrl() + '&r=' + Math.random()
const getLoginMsgCode = (phoneNumber: string, captcha: string) => {
  getMsgCode(smsType.value, phoneNumber, captcha).then((resp: ResponseDataType) => {
    hasSend.value = true
    countDown.value = resp.payload.internal
    startTimer(countDownTimer, () => {
      countDown.value--
      if(countDown.value < 0) {
        stopTimer(countDownTimer).then(() => {
          countDown.value = -1
        })
      }
    })
    message.destroy()
    message.success({content: () => resp.payload.message, style: {marginTop: '10vh'}})
  })
}
const countDownTimer: TimerType = {
  timer: {},
  lastTime: 0,
  diff: 1000
}
const getMsgCodeDisable = computed(() => {
  return isEmpty(formMsgLogin.captcha) || isEmpty(formMsgLogin.phoneNumber)
    || formMsgLogin.captcha.length !== 4 || formMsgLogin.phoneNumber.length !== 11 || formMsgLogin.phoneNumber[0] !== '1'
})
const onFinish = () => {
  hasSend.value = false
  console.log(props.finish)
  props.finish(formMsgLogin.phoneNumber, formMsgLogin.msgCode).then(() => {
    hasSend.value = false
    updateCaptchaUrl()
  })

}
onMounted(() => {
  updateCaptchaUrl()
})
</script>

<style lang="less" scoped></style>