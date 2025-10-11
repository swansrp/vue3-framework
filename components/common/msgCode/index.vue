<template>
  <a-form
    :model="_formData"
    layout="horizontal"
    @finish="onFinish"
  >
    <slot />
    <a-form-item
      :rules="[{ validator: phoneNumberValidatorHandler, trigger: 'blur' }]"
      name="phoneNumber"
    >
      <a-input
        v-model:value="_formData.phoneNumber"
        :maxlength="11"
        autocomplete="off"
        placeholder="手机号码"
        size="large"
      >
        <template #prefix>
          <PhoneOutlined />
        </template>
      </a-input>
    </a-form-item>
    <a-form-item
      :rules="[{ required: true, message: '请输入验证码!', trigger: 'blur' }]"
      name="captcha"
    >
      <a-input
        v-model:value="_formData.captcha"
        :maxlength="4"
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
            @click="updateCaptchaUrl"
          >
        </template>
      </a-input>
    </a-form-item>
    <a-form-item
      :rules="[{ required: true, message: '请输入短信验证码!', trigger: 'change' }]"
      name="msgCode"
    >
      <a-input
        v-model:value="_formData.msgCode"
        autocomplete="off"
        placeholder="短信验证码"
        size="large"
      >
        <template #prefix>
          <CodeOutlined />
        </template>
        <template #suffix>
          <a-button
            v-if="countDown === -1"
            :disabled="getMsgCodeDisable" 
            class="msg-code-btn"
            size="small"
            type="primary"
            @click="getLoginMsgCode(_formData.phoneNumber, _formData.captcha)"
          >
            获取码
          </a-button>
          <span
            v-else
            class="countdown-text"
          >
            {{ countDown }}秒后重发
          </span>
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
        {{ submitText }}
      </a-button>
    </a-form-item>
  </a-form>
  <slot name="footer" />
</template>

<script lang="ts" setup>
import { CodeOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Ref } from 'vue'

import { userAlreadyExisted, userExisted } from '@/framework/apis/admin/user'
import { getMsgCode } from '@/framework/apis/login/login'
import { baseURL } from '@/framework/network/request'
import { isEmpty, localStorageMethods, startTimer, stopTimer } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
import { TimerType } from '@/framework/utils/type'

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
const { smsType, phoneNumberExisted } = toRefs(props)
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
    message.success({ content: () => resp.payload.message, style: { marginTop: '10vh' } })
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

.msg-code-btn {
  height: 32px !important;
  padding: 0 8px !important;
  font-size: 11px !important;
  border-radius: 4px !important;
  white-space: nowrap;
  min-width: 70px !important;
  max-width: 85px !important;
  line-height: 1.2 !important;
  
  // 覆盖登录页面的按钮样式
  &:deep(.ant-btn) {
    height: 32px !important;
    font-size: 11px !important;
    padding: 0 8px !important;
    border-radius: 4px !important;
    background: linear-gradient(135deg, rgba(0, 120, 200, 0.9), rgba(0, 140, 220, 0.8)) !important;
    border: 1px solid rgba(0, 191, 255, 0.5) !important;
    min-width: 70px !important;
    max-width: 85px !important;
    
    &:hover {
      transform: none !important;
      background: linear-gradient(135deg, rgba(0, 140, 220, 0.95), rgba(0, 160, 240, 0.9)) !important;
      box-shadow: 0 2px 8px rgba(0, 191, 255, 0.3) !important;
    }
    
    &::before {
      display: none !important;
    }
  }
}

.countdown-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  padding: 0 4px;
}

// 统一MsgCode组件的输入框样式与登录页面保持一致
:deep(.ant-input),
:deep(.ant-input-password) {
  height: 48px;
  border-radius: 12px;
  border: none !important;
  background: transparent !important;
  color: #e8f4fd !important;
  font-size: 15px;
  font-weight: 500;
  box-shadow: none !important;
  
  &::placeholder {
    color: rgba(100, 255, 218, 0.5) !important;
  }
  
  // 处理浏览器自动填充样式
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px rgba(15, 30, 55, 0.95) inset !important;
    -webkit-text-fill-color: #e8f4fd !important;
    background-color: transparent !important;
    background-image: none !important;
    transition: background-color 5000s ease-in-out 0s;
    border: none !important;
  }
  
  &:hover {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #e8f4fd !important;
  }
  
  &:focus {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    color: #e8f4fd !important;
  }
  
  @media (max-width: 480px) {
    height: 44px;
    font-size: 16px;
    border-radius: 10px;
  }
}

:deep(.ant-input-affix-wrapper) {
  padding: 0 90px 0 14px; // 为小按钮调整右侧内边距
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(100, 255, 218, 0.3);
  background: linear-gradient(145deg, 
    rgba(10, 25, 47, 0.95) 0%,
    rgba(15, 30, 55, 0.90) 100%);
  backdrop-filter: blur(15px);
  transition: all 0.3s ease;
  box-shadow: 
    inset 0 1px 0 rgba(100, 255, 218, 0.1),
    0 2px 10px rgba(0, 0, 0, 0.3);
  
  .ant-input {
    padding: 0;
    height: 100%;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #e8f4fd !important;
    
    &::placeholder {
      color: rgba(100, 255, 218, 0.5) !important;
    }
    
    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus,
    &:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px rgba(15, 30, 55, 0.95) inset !important;
      -webkit-text-fill-color: #e8f4fd !important;
      background-color: transparent !important;
      background-image: none !important;
      transition: background-color 5000s ease-in-out 0s;
    }
    
    &:hover,
    &:focus {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      color: #e8f4fd !important;
    }
  }
  
  .anticon {
    color: rgba(100, 255, 218, 0.8);
    filter: drop-shadow(0 0 3px rgba(100, 255, 218, 0.3));
  }
  
  &:hover {
    border-color: rgba(100, 255, 218, 0.5);
    background: linear-gradient(145deg, 
      rgba(15, 30, 60, 0.98) 0%,
      rgba(20, 35, 65, 0.95) 100%);
    box-shadow: 
      inset 0 1px 0 rgba(100, 255, 218, 0.2),
      0 4px 20px rgba(100, 255, 218, 0.1),
      0 2px 10px rgba(0, 0, 0, 0.4);
  }
  
  &:focus-within {
    border-color: rgba(100, 255, 218, 0.8);
    background: linear-gradient(145deg, 
      rgba(20, 35, 70, 0.98) 0%,
      rgba(25, 40, 75, 0.95) 100%);
    box-shadow: 
      inset 0 1px 0 rgba(100, 255, 218, 0.3),
      0 0 25px rgba(100, 255, 218, 0.2),
      0 4px 20px rgba(0, 0, 0, 0.5);
  }
  
  &.ant-input-affix-wrapper-focused {
    border-color: rgba(100, 255, 218, 0.8);
    box-shadow: 
      inset 0 1px 0 rgba(100, 255, 218, 0.3),
      0 0 25px rgba(100, 255, 218, 0.2),
      0 4px 20px rgba(0, 0, 0, 0.5);
  }
  
  @media (max-width: 480px) {
    height: 44px;
    padding: 0 85px 0 12px; // 移动端调整
    border-radius: 10px;
  }
}
</style>