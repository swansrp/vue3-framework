<template>
  <div id="top">
    <div :class="tabStore.isNeedLeftNav ? 'show-left-nav' : 'hide-left-nav'" class="top_title">
      <img v-if="tabStore.isNeedLeftNav" alt="公司标志" src="../../../../../public/icon.png" style="margin-right: 5px" />
      {{ projectName }}
    </div>
    <top-nav class="top_nav" />
    <div class="top_user">
      <a-avatar v-if="isNotEmpty(userStore.avatar)">
        <template #icon>
          <img :src="userStore.avatar" />
        </template>
      </a-avatar>
      <a-avatar v-else>
        <template #icon>
          <user-outlined />
        </template>
      </a-avatar>
      <div style="margin-left: 5px" >
        <marquee :content="userStore.name"  width="100" />
      </div>
      <div class="top_user_setting">
        <a-dropdown trigger="click">
          <template #overlay>
            <a-menu @click="handleMenuClick">
              <a-menu-item key="1">
                <RedoOutlined />
                重新登录
              </a-menu-item>
              <a-menu-item v-if="localLoginType" key="2">
                <SafetyOutlined />
                设置密码
              </a-menu-item>
              <a-menu-item key="3">
                <PoweroffOutlined />
                注销
              </a-menu-item>
            </a-menu>
          </template>
          <a-button shape="circle" size="large" type="text">
            <template #icon>
              <SettingOutlined />
            </template>
          </a-button>
        </a-dropdown>
      </div>
    </div>
    <a-modal
      v-model:open="modifyPasswordModal.open" cancel-text="取消" ok-text="确认" title="设置密码"
      @ok="modifyPassword">
      <a-form
        :labelCol="{style: { width: '100px', marginTop: '4px' }}" :model="modifyPasswordModal"
        :wrapperCol="{ span: 16 }"
        layout="horizontal">
        <a-form-item
          :rules="[
            { required: true, message: '请输入密码' }]"
          has-feedback
          label="输入旧密码"
          name="oldPassword">
          <a-input-password
            v-model:value="modifyPasswordModal.oldPassword" autocomplete="off" placeholder="密码" size="large"
            type="password" />
        </a-form-item>
        <a-form-item
          :rules="[
            { required: true, message: '请输入密码' },
            { message: '5位以上数字和字母', pattern: '^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{5,}$' },
            { validator: lxStr, trigger: 'change' }]"
          has-feedback
          label="输入新密码"
          name="password">
          <a-input-password
            v-model:value="modifyPasswordModal.password" autocomplete="off" placeholder="密码" size="large"
            type="password" />
        </a-form-item>
        <a-form-item
          :rules="[{ required: true, message: '两次密码不一致', pattern: new RegExp('^'+ modifyPasswordModal.password + '$') }]"
          has-feedback
          label="确认密码"
          name="passwordConfirm">
          <a-input-password
            v-model:value="modifyPasswordModal.passwordConfirm" autocomplete="off" placeholder="确认密码"
            size="large" type="password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { changePassword, logoff, reLogin } from "@/framework/apis/login/login"
import { useUserStore } from "@/framework/store/user"
import { isNotEmpty, localStorageMethods } from "@/framework/utils/common"
import { title as projectName } from '../../../../../package.json'
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN } from "@/framework/utils/constant"
import { PoweroffOutlined, RedoOutlined, SafetyOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons-vue"
import TopNav from "@/framework/components/navigationFramework/navMenu/topNav/TopNav.vue";
import { useTabStore } from "@/framework/store/nav";
import pinia from "@/framework/store";
import { afterLogin } from "@/framework/network/login";
import { Md5 } from 'ts-md5'
import Marquee from '@/framework/components/common/marquee/index.vue';

const userStore = useUserStore(pinia)
const tabStore = useTabStore(pinia)
const router = useRouter()
const localLoginType = import.meta.env.VITE_ssoDomain === 'localhost'
const modifyPasswordModal = reactive({
  open: false,
  oldPassword: '',
  password: '',
  passwordConfirm: ''
})
const modifyPassword = () => {
  changePassword(Md5.hashStr(modifyPasswordModal.oldPassword), Md5.hashStr(modifyPasswordModal.password), Md5.hashStr(modifyPasswordModal.passwordConfirm)).then(() => {
    modifyPasswordModal.open = false
  })
}

// 判断密码是否为连续的数字或字母
const lxStr = () => {
  const {password} = modifyPasswordModal
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
const handleMenuClick = (e: any) => {
  if (e.key === '1') {
    const refreshToken = localStorageMethods.getLocalStorage(REFRESH_TOKEN)
    reLogin(refreshToken).then(res => {
      localStorageMethods.setLocalStorage(REFRESH_TOKEN, res.payload[REFRESH_TOKEN])
      localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, res.payload.accessToken)
      afterLogin().then(() => router.replace('/')).then(() => window.location.reload())
    })
  } else if (e.key === '2') {
    modifyPasswordModal.open = true
  } else if (e.key === '3') {
    logoff()
  }
}
</script>

<style scoped>
#top {
  width: 100%;
  height: 50px;
  display: flex;
  position: relative;
  overflow: hidden;
}

.top_title {
  width: 250px;
  height: 100%;
  font-size: 17px;
  line-height: 50px;
  padding-left: 5px;
  padding-right: 5px;
  font-weight: bold;
  text-align: center;
  box-sizing: border-box;
  color: rgb(0, 21, 41);
  background-color: #fff;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 999;
}

.show-left-nav {
  background-color: #fff;
}

.hide-left-nav {
  background-color: #1890ff;
  box-shadow: none;
}

.top_title img {
  height: 20px;
  width: 20px;
}

.top_nav {
  flex: 1 0 auto;
}

.top_user {
  width: 190px;
  height: 100%;
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding-left: 10px;
  flex: 0 0 auto;
}

:deep(.top_user_setting .ant-btn-circle) {
  margin-right: 2px;
}
</style>
