<template>
  <msg-code
    :key="msgCodeKey"
    v-model:form-data="formData"
    :finish="handleSubmit"
    :phone-number-existed="true"
    sms-type="LOGIN_MSG_CODE"
  />
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

import MsgCode from '@/framework/components/common/msgCode/index.vue'

interface Props {
  msgCodeKey?: number
}

interface Emits {
  (e: 'submit', data: { phoneNumber: string; msgCode: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  msgCodeKey: 0
})

const emit = defineEmits<Emits>()

const formData = reactive({
  phoneNumber: '',
  msgCode: '',
  captcha: ''
})

const handleSubmit = (data: any) => {
  emit('submit', data)
}
</script>
