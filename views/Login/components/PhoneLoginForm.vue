<template>
  <msg-code
    :key="msgCodeKey"
    v-model:form-data="formData"
    :finish="handleSubmit"
    :loading="loading"
    :phone-number-existed="true"
    sms-type="LOGIN_MSG_CODE"
  />
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

import MsgCode from '@/framework/components/common/msgCode/index.vue'

interface Props {
  msgCodeKey?: number
  loading?: boolean
}

interface Emits {
  (e: 'submit', data: { phoneNumber: string; msgCode: string }): void
}

withDefaults(defineProps<Props>(), {
  msgCodeKey: 0,
  loading: false
})

const emit = defineEmits<Emits>()

let formData = reactive({
  phoneNumber: '',
  msgCode: '',
  captcha: ''
})

const handleSubmit = (data: any) => {
  emit('submit', data)
}
</script>
