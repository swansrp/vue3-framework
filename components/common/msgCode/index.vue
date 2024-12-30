<template>
  <a-form :model="_formData" layout="horizontal" @finish="onFinish">
    <slot></slot>
    <a-form-item :rules="[{ validator: phoneNumberValidatorHandler, trigger: 'blur' }]" name="phoneNumber">
      <a-input
        v-model:value="_formData.phoneNumber" :maxlength="11" autocomplete="off" placeholder="手机号码" size="large"
        style="height: 50px;">
        <template #prefix>
          <PhoneOutlined />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item :rules="[{ required: true, message: '请输入验证码!', trigger: 'blur' }]" name="captcha">
      <a-input
        v-model:value="_formData.captcha" :maxlength="4" placeholder="验证码" size="large"
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
    <a-form-item :rules="[{ required: true, message: '请输入短信验证码!', trigger: 'change' }]" name="msgCode">
      <a-input
        v-model:value="_formData.msgCode" autocomplete="off" placeholder="短信验证码" size="large"
        style="height: 50px;">
        <template #prefix>
          <CodeOutlined />
        </template>
        <template #suffix>
          <a-button
            v-if="countDown === -1"
            :disabled="getMsgCodeDisable" type="primary"
            @click="getLoginMsgCode(_formData.phoneNumber, _formData.captcha)">
            获取验证码
          </a-button>
          <span v-else>
            还剩{{ countDown }}秒重发
          </span>
        </template>
      </a-input>
    </a-form-item>
    <a-form-item>
      <a-button :loading="loading" block html-type="submit" size="large" type="primary">{{ submitText }}</a-button>
    </a-form-item>
  </a-form>
  <slot name="footer"></slot>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'
import { isEmpty, localStorageMethods, startTimer, stopTimer } from '@/framework/utils/common'
import { getMsgCode } from '@/framework/apis/login/login'
import { CodeOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { baseURL } from '@/framework/network/request'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
import { message } from 'ant-design-vue'
import { TimerType } from '@/framework/utils/type'
import { userAlreadyExisted, userExisted } from '@/framework/apis/admin/user'

const countDown = ref(-1)
const loading: Ref<boolean> = ref(false)
const props = withDefaults(
  defineProps<{
    smsType: string
    // ture 必须注册过, false 未注册过, undefined 不限制
    phoneNumberExisted?: boolean
    submitText?: string
    formData: { phoneNumber: string, msgCode: string, captcha: string }
    finish: (formData: any) => Promise<void>
  }>(),
  {
    submitText: '登录',
    phoneNumberExisted: undefined
  }
)
const {smsType, phoneNumberExisted} = toRefs(props)
const emit = defineEmits<{
  (e: 'update:formData', value: any): void
}>()
const hasSend = ref(false)
const captchaUrl: Ref<string> = ref('')
const _formData: Ref<{ phoneNumber: string, captcha: string, msgCode: string }> = ref({} as { phoneNumber: string, captcha: string, msgCode: string })
const getCaptchaUrl = () => baseURL + '/captcha.jpg?token=' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) + '&captchaType=' + smsType.value + '_CAPTCHA'
const updateCaptchaUrl = () => captchaUrl.value = getCaptchaUrl() + '&r=' + Math.random()
const getLoginMsgCode = (phoneNumber: string, captcha: string) => {
  getMsgCode(smsType.value, phoneNumber, captcha).then((resp: ResponseDataType) => {
    hasSend.value = true
    countDown.value = resp.payload.internal
    startTimer(countDownTimer, () => {
      countDown.value--
      if (countDown.value < 0) {
        stopTimer(countDownTimer).then(() => {
          countDown.value = -1
        })
      }
    })
    message.destroy()
    message.success({content: () => resp.payload.message, style: {marginTop: '10vh'}})
  })
}
watch(
  () => props.formData,
  () => _formData.value = props.formData,
  {
    immediate: true,
    deep: true
  }
)
watch(
  () => _formData.value,
  () => emit('update:formData', _formData.value),
  {
    deep: true
  }
)
const countDownTimer: TimerType = {
  timer: {},
  lastTime: 0,
  diff: 1000
}
const getMsgCodeDisable = computed(() => {
  return isEmpty(_formData.value.captcha) || isEmpty(_formData.value.phoneNumber)
    || _formData.value.captcha.length !== 4 || _formData.value.phoneNumber.length !== 11 || _formData.value.phoneNumber[0] !== '1'
})
const onFinish = () => {
  hasSend.value = false
  props.finish(_formData.value).then(() => {
    hasSend.value = false
    updateCaptchaUrl()
  })
}
const phoneNumberValidatorHandler = () => {
  if (isNotEmpty(_formData.value.phoneNumber)) {
    if (isEmpty(phoneNumberExisted.value)) {
      return new Promise(() => {
      })
    } else {
      if (phoneNumberExisted.value) {
        return userExisted(_formData.value.phoneNumber, undefined, undefined, undefined, undefined)
      } else {
        return userAlreadyExisted(_formData.value.phoneNumber, undefined, undefined, undefined, undefined)
      }
    }

  } else {
    return new Promise(() => {
      throw new Error('请输入手机号!')
    })
  }
}
onMounted(() => {
  updateCaptchaUrl()
})
</script>

<style lang="less" scoped>
.forbidden-hover {
  position: relative;
  overflow: hidden; /* 确保图标不会影响布局 */
}

.forbidden-hover::after {
  content: "\1F6AB"; /* Unicode字符禁止（🚫） */
  position: absolute;
  left: 130px; /* 调整图标位置 */
  opacity: 0; /* 默认不显示图标 */
  transition: opacity 0.3s; /* 平滑显示图标 */
  font-size: 16px; /* 调整图标大小 */
}

.forbidden-hover:hover::after {
  opacity: 1; /* 当鼠标悬停时显示图标 */
}
</style>