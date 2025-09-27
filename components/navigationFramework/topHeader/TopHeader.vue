<template>
  <div id="top">
    <div :class="tabStore.isNeedLeftNav ? 'show-left-nav' : 'hide-left-nav'" class="top_title">
      <img v-if="tabStore.isNeedLeftNav" alt="公司标志" src="../../../../../public/icon.png" style="margin-right: 5px" />
      {{ projectName }}
    </div>
    <top-nav class="top_nav" />
    <div class="top_user">
      <div class="user-avatar-wrapper">
        <a-avatar v-if="isNotEmpty(userStore.avatar)" class="user-avatar">
          <template #icon>
            <img :src="userStore.avatar" />
          </template>
        </a-avatar>
        <a-avatar v-else class="user-avatar">
          <template #icon>
            <user-outlined />
          </template>
        </a-avatar>
        <div class="user-status-indicator"></div>
      </div>
      <div class="user-info">
        <div class="user-name">
          <marquee :content="userStore.name" :width="100" />
        </div>
        <div v-if="userStore.deptName" class="user-role">{{ userStore.deptName }}</div>
      </div>
      <div class="top_user_setting">
        <a-dropdown trigger="click">
          <template #overlay>
            <a-menu @click="handleMenuClick" class="user-dropdown-menu">
              <a-menu-item key="1">
                <RedoOutlined />
                重新登录
              </a-menu-item>
              <template v-if="localLoginType">
                <a-menu-item key="2">
                  <SafetyOutlined />
                  设置个人信息
                </a-menu-item>
                <a-menu-item key="3">
                  <SafetyOutlined />
                  设置密码
                </a-menu-item>
              </template>
              <a-menu-item key="4">
                <PoweroffOutlined />
                注销
              </a-menu-item>
            </a-menu>
          </template>
          <div class="setting-button-wrapper">
            <a-button shape="circle" size="large" type="text" class="setting-button">
              <template #icon>
                <SettingOutlined />
              </template>
            </a-button>
          </div>
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
            { message: '5位以上数字和字母', pattern: /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{5,}$/ },
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
    <a-modal
      v-model:open="userInfoModal.open" cancel-text="取消" ok-text="确认" title="设置个人信息"
      @ok="updateInfo">
      <a-form
        :labelCol="{style: { width: '100px' }}" :model="userInfoModal"
        :wrapperCol="{ span: 16 }"
        layout="horizontal">
        <a-form-item
          label="昵称"
          name="nickName">
          <a-input v-model:value="userInfoModal.nickName" autocomplete="off" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item
          label="姓名"
          name="name">
          <a-input v-model:value="userInfoModal.name" autocomplete="off" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item
          label="性别"
          name="sex">
          <a-select v-model:value="userInfoModal.sex" placeholder="请选择性别">
            <a-select-option v-for="item in genderOptionList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="头像"
          name="avatar">
          <multimedia v-model="userInfoModal.avatar" delete-able upload-able />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { changePassword, getUserInfo, logoff, reLogin, updateUserInfo } from "@/framework/apis/login/login"
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
import { dictStore } from '@/framework/store/common'

const userStore = useUserStore(pinia)
const tabStore = useTabStore(pinia)
const genderOptionList = ref<Array<{value: string, label: string}>>([])
const router = useRouter()
const localLoginType = import.meta.env.VITE_ssoDomain === 'localhost'
const modifyPasswordModal = reactive({
  open: false,
  oldPassword: '',
  password: '',
  passwordConfirm: ''
})
const userInfoModal = reactive({
  open: false,
  nickName: userStore.nickName,
  name: userStore.name,
  email: userStore.email,
  sex: userStore.sex,
  avatar: userStore.avatar
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
    let firstIndex = arr[i - 1].charCodeAt(0)
    let secondIndex = arr[i].charCodeAt(0)
    let thirdIndex = arr[i + 1].charCodeAt(0)
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
    userInfoModal.open = true
  } else if (e.key === '3') {
    modifyPasswordModal.open = true
  } else if (e.key === '4') {
    logoff()
  }
}
const updateInfo = () => {
  updateUserInfo(userInfoModal).then(() => getUserInfo().then(res => {
    const data = res.payload
    const userStore = useUserStore(pinia)
    Object.keys(data).forEach((key: string) => {
      if (data[key]) { // @ts-ignore
        userStore[key] = data[key]
      }
    })
    userInfoModal.open = false
  }))
}
onMounted(() => {
  dictStore().getDict('GENDER_DICT').then(res => genderOptionList.value = res)
})
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
  padding-right: 15px;
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

/* 顶部标题和菜单之间的分割线 */
.top_title::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 30px;
  background: linear-gradient(to bottom, 
    transparent 0%, 
    rgba(0, 21, 41, 0.1) 20%, 
    rgba(0, 21, 41, 0.15) 50%, 
    rgba(0, 21, 41, 0.1) 80%, 
    transparent 100%);
  opacity: 0.6;
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
  margin-left: 12px;
  position: relative;
}

.top_user {
  width: 240px;
  height: 100%;
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 8px 16px 8px 12px;
  flex: 0 0 auto;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.95) 0%, 
    rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(0, 21, 41, 0.1);
  position: relative;
  transition: all 0.3s ease;
}

.top_user:hover {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.98) 0%, 
    rgba(240, 248, 255, 0.95) 100%);
  box-shadow: inset 0 0 20px rgba(24, 144, 255, 0.1);
}

/* 用户头像区域 */
.user-avatar-wrapper {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-avatar {
  border: 2px solid rgba(24, 144, 255, 0.2);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-avatar:hover {
  border-color: rgba(24, 144, 255, 0.5);
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
}

/* 在线状态指示器 */
.user-status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: linear-gradient(45deg, #52c41a, #73d13d);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(82, 196, 26, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 1px rgba(82, 196, 26, 0.3), 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  70% {
    box-shadow: 0 0 0 1px rgba(82, 196, 26, 0.3), 0 0 0 6px rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 1px rgba(82, 196, 26, 0.3), 0 0 0 0 rgba(82, 196, 26, 0);
  }
}

/* 用户信息区域 */
.user-info {
  flex: 1;
  min-width: 0;
  margin-right: 8px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 21, 41, 0.88);
  line-height: 1.2;
  margin-bottom: 2px;
}

.user-role {
  font-size: 12px;
  color: rgba(0, 21, 41, 0.65);
  line-height: 1;
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.1), rgba(24, 144, 255, 0.05));
  padding: 2px 6px;
  border-radius: 8px;
  display: inline-block;
  font-weight: 500;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 设置按钮区域 */
.setting-button-wrapper {
  position: relative;
  flex-shrink: 0;
}

.setting-button {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.8) 0%, 
    rgba(248, 250, 252, 0.9) 100%) !important;
  border: 1px solid rgba(24, 144, 255, 0.2) !important;
  color: rgba(0, 21, 41, 0.75) !important;
  transition: all 0.3s ease !important;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.setting-button:hover {
  background: linear-gradient(135deg, 
    rgba(24, 144, 255, 0.1) 0%, 
    rgba(24, 144, 255, 0.05) 100%) !important;
  border-color: rgba(24, 144, 255, 0.4) !important;
  color: rgba(24, 144, 255, 0.9) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.setting-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
}

/* 下拉菜单美化 */
:deep(.user-dropdown-menu) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 21, 41, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 4px;
}

:deep(.user-dropdown-menu .ant-menu-item) {
  border-radius: 6px;
  margin: 2px 0;
  transition: all 0.2s ease;
}

:deep(.user-dropdown-menu .ant-menu-item:hover) {
  background: linear-gradient(90deg, 
    rgba(24, 144, 255, 0.08), 
    rgba(24, 144, 255, 0.04));
  color: rgba(24, 144, 255, 0.9);
}

:deep(.top_user_setting .ant-btn-circle) {
  margin-right: 0;
}
</style>
