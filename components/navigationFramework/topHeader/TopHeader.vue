<template>
  <div id="top">
    <div
      :class="tabStore.isNeedLeftNav ? 'show-left-nav' : 'hide-left-nav'"
      class="top_title"
    >
      <img
        v-if="tabStore.isNeedLeftNav"
        alt="公司标志"
        src="../../../../../public/icon.png"
        style="margin-right: 5px"
      />
      {{ projectName }}
    </div>
    <top-nav class="top_nav" />
    <div class="top_user">
      <div class="user-avatar-wrapper">
        <a-avatar
          v-if="isNotEmpty(userStore.avatar)"
          class="user-avatar"
        >
          <template #icon>
            <img :src="userStore.avatar" />
          </template>
        </a-avatar>
        <a-avatar
          v-else
          class="user-avatar"
        >
          <template #icon>
            <user-outlined />
          </template>
        </a-avatar>
        <div class="user-status-indicator"></div>
      </div>
      <div class="user-info">
        <div class="user-name">
          <marquee
            :content="userStore.name"
            :width="100"
          />
        </div>
        <div
          v-if="userStore.deptName"
          class="user-role"
        >
          {{ userStore.deptName }}
        </div>
      </div>
      <div class="top_user_setting">
        <a-dropdown trigger="click">
          <template #overlay>
            <a-menu
              class="user-dropdown-menu"
              @click="handleMenuClick"
            >
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
            <a-button
              shape="circle"
              size="large"
              type="text"
              class="setting-button"
            >
              <template #icon>
                <SettingOutlined />
              </template>
            </a-button>
          </div>
        </a-dropdown>
      </div>
    </div>
    <a-modal
      v-model:open="modifyPasswordModal.open"
      cancel-text="取消"
      ok-text="确认"
      title="设置密码"
      @ok="modifyPassword"
    >
      <a-form
        :label-col="{style: { width: '100px', marginTop: '4px' }}"
        :model="modifyPasswordModal"
        :wrapper-col="{ span: 16 }"
        layout="horizontal"
      >
        <a-form-item
          :rules="[
            { required: true, message: '请输入密码' }]"
          has-feedback
          label="输入旧密码"
          name="oldPassword"
        >
          <a-input-password
            v-model:value="modifyPasswordModal.oldPassword"
            autocomplete="off"
            placeholder="密码"
            size="large"
            type="password"
          />
        </a-form-item>
        <a-form-item
          :rules="[
            { required: true, message: '请输入密码' },
            { message: '5位以上数字和字母', pattern: /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{5,}$/ },
            { validator: lxStr, trigger: 'change' }]"
          has-feedback
          label="输入新密码"
          name="password"
        >
          <a-input-password
            v-model:value="modifyPasswordModal.password"
            autocomplete="off"
            placeholder="密码"
            size="large"
            type="password"
          />
        </a-form-item>
        <a-form-item
          :rules="[{ required: true, message: '两次密码不一致', pattern: new RegExp('^'+ modifyPasswordModal.password + '$') }]"
          has-feedback
          label="确认密码"
          name="passwordConfirm"
        >
          <a-input-password
            v-model:value="modifyPasswordModal.passwordConfirm"
            autocomplete="off"
            placeholder="确认密码"
            size="large"
            type="password"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="userInfoModal.open"
      cancel-text="取消"
      ok-text="确认"
      title="设置个人信息"
      @ok="updateInfo"
    >
      <a-form
        :label-col="{style: { width: '100px' }}"
        :model="userInfoModal"
        :wrapper-col="{ span: 16 }"
        layout="horizontal"
      >
        <a-form-item
          label="昵称"
          name="nickName"
        >
          <a-input
            v-model:value="userInfoModal.nickName"
            autocomplete="off"
            placeholder="请输入昵称"
          />
        </a-form-item>
        <a-form-item
          label="姓名"
          name="name"
        >
          <a-input
            v-model:value="userInfoModal.name"
            autocomplete="off"
            placeholder="请输入姓名"
          />
        </a-form-item>
        <a-form-item
          label="性别"
          name="sex"
        >
          <a-select
            v-model:value="userInfoModal.sex"
            placeholder="请选择性别"
          >
            <a-select-option
              v-for="item in genderOptionList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="头像"
          name="avatar"
        >
          <multimedia
            v-model="userInfoModal.avatar"
            delete-able
            upload-able
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { PoweroffOutlined, RedoOutlined, SafetyOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons-vue'
import { Md5 } from 'ts-md5'

import { title as projectName } from '../../../../../package.json'

import { changePassword, getUserInfo, logoff, reLogin, updateUserInfo } from '@/framework/apis/login/login'
import Marquee from '@/framework/components/common/marquee/index.vue'
import TopNav from '@/framework/components/navigationFramework/navMenu/topNav/TopNav.vue'
import { afterLogin } from '@/framework/network/login'
import pinia from '@/framework/store'
import { dictStore } from '@/framework/store/common'
import { useTabStore } from '@/framework/store/nav'
import { useUserStore } from '@/framework/store/user'
import { isNotEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN } from '@/framework/utils/constant'

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
  const { password } = modifyPasswordModal
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
  overflow: visible;
  background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  box-sizing: border-box;
}

.top_title {
  width: 250px;
  height: 100%;
  font-size: 17px;
  padding: 0 20px;
  font-weight: bold;
  box-sizing: border-box;
  color: #ffffff;
  /* 增强立体感的深色渐变 - 增加光影层次 */
  background: linear-gradient(135deg, 
    #1a2332 0%, 
    #252f42 25%,
    #2d3a52 50%,
    #252f42 75%,
    #1a2332 100%);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 999;
  /* 添加与左侧菜单一致的右侧阴影 */
  box-shadow: 5px 0 5px 0 rgba(0, 0, 0, 0.5);
  /* 添加内阴影增强立体感 */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* LOGO区域内部光影效果 - 增强立体感 */
.top_title::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.08) 0%,
    transparent 100%);
  pointer-events: none;
  border-radius: 0;
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
  margin-left: 0;
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}

.top_user {
  width: 240px;
  height: 100%;
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 0 16px 0 12px;
  flex: 0 0 auto;
  background: transparent;
  position: relative;
  transition: all 0.3s ease;
}

.top_user:hover {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

/* 用户头像区域 */
.user-avatar-wrapper {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-avatar {
  border: 2px solid rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.user-avatar:hover {
  border-color: rgba(24, 144, 255, 0.6);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
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
  color: #1a1f36;
  line-height: 1.2;
  margin-bottom: 2px;
}

.user-role {
  font-size: 12px;
  color: #5a5e66;
  line-height: 1;
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.08), rgba(24, 144, 255, 0.04));
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  font-weight: 500;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid rgba(24, 144, 255, 0.15);
}

/* 设置按钮区域 */
.setting-button-wrapper {
  position: relative;
  flex-shrink: 0;
}

.setting-button {
  background: #f5f7fa !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  color: #5a5e66 !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.setting-button:hover {
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(24, 144, 255, 0.05) 100%) !important;
  border-color: rgba(24, 144, 255, 0.25) !important;
  color: #1890ff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.15);
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
