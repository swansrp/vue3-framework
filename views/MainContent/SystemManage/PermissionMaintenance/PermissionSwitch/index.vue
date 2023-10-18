<template>
  <div class="wrapper">
    <a-typography-title :level="2">将系统超级管理员的权限切换到指定用户</a-typography-title>
    <br />
    <department-and-staff-select layout-mode="vertical" v-model:staffListValue="staffListValue" :is-multiple="false" />
    <a-button type="primary" block @click="switchPermission">切换</a-button>
  </div>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import {message} from "ant-design-vue"
import 'ant-design-vue/lib/message/style/index.css'
import {ValueLabelArray} from "@/framework/utils/type"
import {switchPermissionLogin} from "@/framework/apis/login/login";
import {localStorageMethods} from "@/framework/utils/common";
import {AUTHORIZATION_TOKEN, IS_NEED_REDIRECT, REFRESH_TOKEN} from "@/framework/utils/constant";

const staffListValue: Ref<ValueLabelArray> = ref([])
const switchPermission = () => {
  if (staffListValue.value.length === 0) {
    message.error({content: () => '请选择用户后再执行权限切换操作', style: {marginTop: '10vh', marginLeft: '150px'}})
    return
  }
  const { customerNumber } = staffListValue.value[0].option
  switchPermissionLogin(customerNumber).then(res => {
    localStorageMethods.setLocalStorage(REFRESH_TOKEN, res.payload[REFRESH_TOKEN])
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, res.payload.accessToken)
    localStorageMethods.setLocalStorage(IS_NEED_REDIRECT, '1')
    location.reload()
  })
}




</script>

<style scoped>
.wrapper {
  width: 550px;
  margin: 50px auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
