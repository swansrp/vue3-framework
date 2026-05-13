<template>
  <div id="top">
    <div
      :class="tabStore.isNeedLeftNav ? 'show-left-nav' : 'hide-left-nav'"
      :style="{
        width: tabStore.isNeedLeftNav ? (tabStore.leftNavCollapsed ? '50px' : `${tabStore.leftNavWidth}px`) : '250px',
        padding: tabStore.leftNavCollapsed ? '0' : '0 20px'
      }"
      class="top_title"
    >
      <img
        v-if="tabStore.isNeedLeftNav && !tabStore.leftNavCollapsed"
        alt="公司标志"
        src="../../../../../public/icon.png"
        style="margin-right: 5px"
      />
      <span v-if="!tabStore.leftNavCollapsed">{{ projectName }}</span>
    </div>
    <top-nav class="top_nav" />
    <!-- 业务扩展区域插槽 - 用于业务层注入自定义内容（如企业选择器） -->
    <div
      v-if="$slots['header-extra']"
      class="top_extra"
    >
      <slot name="header-extra"></slot>
    </div>
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
      <!-- 主题切换按钮：左键切换深色/浅色，右键切换浅色主题风格 -->
      <div
        v-if="themeStore.switchEnabled"
        class="theme-toggle-wrapper"
      >
        <a-dropdown
          :trigger="['contextmenu']"
        >
          <a-button
            shape="circle"
            size="large"
            type="text"
            class="theme-toggle-btn"
            title="点击切换深色/浅色主题，右键切换浅色主题风格"
            @click="themeStore.toggleTheme"
          >
            <template #icon>
              <!-- 太阳图标 (深色模式下) -->
              <svg
                v-if="themeStore.isDark"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="5"
                />
                <line
                  x1="12"
                  y1="1"
                  x2="12"
                  y2="3"
                />
                <line
                  x1="12"
                  y1="21"
                  x2="12"
                  y2="23"
                />
                <line
                  x1="4.22"
                  y1="4.22"
                  x2="5.64"
                  y2="5.64"
                />
                <line
                  x1="18.36"
                  y1="18.36"
                  x2="19.78"
                  y2="19.78"
                />
                <line
                  x1="1"
                  y1="12"
                  x2="3"
                  y2="12"
                />
                <line
                  x1="21"
                  y1="12"
                  x2="23"
                  y2="12"
                />
                <line
                  x1="4.22"
                  y1="19.78"
                  x2="5.64"
                  y2="18.36"
                />
                <line
                  x1="18.36"
                  y1="5.64"
                  x2="19.78"
                  y2="4.22"
                />
              </svg>
              <!-- 月亮图标 (浅色模式下) -->
              <svg
                v-else
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </template>
          </a-button>
          <template #overlay>
            <a-menu
              v-if="!themeStore.isDark"
              class="theme-palette-menu"
              @click="handleThemeSelect"
            >
              <a-menu-item
                v-for="t in LIGHT_THEMES"
                :key="t.id"
                class="theme-palette-item"
                :class="{ 'ant-menu-item-selected': themeStore.themeId === t.id }"
              >
                <span
                  class="theme-swatch"
                  :style="{ background: t.swatch }"
                ></span>
                <span class="theme-label">{{ t.label }}</span>
                <span class="theme-desc">{{ t.desc }}</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
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
            { validator: (_rule, value) => validatePassword(value), trigger: 'change' }]"
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
          :rules="[{ validator: passwordConfirmValidator, trigger: 'change' }]"
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
import { LIGHT_THEMES, useThemeStore } from '@/framework/store/theme'
import { useUserStore } from '@/framework/store/user'
import { isNotEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN } from '@/framework/utils/constant'
import { validatePassword } from '@/framework/utils/passwordValidator'

const userStore = useUserStore(pinia)
const tabStore = useTabStore(pinia)
const themeStore = useThemeStore(pinia)

const handleThemeSelect = (e: any) => {
  themeStore.setTheme(e.key)
}

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
const passwordConfirmValidator = (_rule: any, value: string) => {
  if (value !== modifyPasswordModal.password) {
    return Promise.reject('两次密码不一致')
  }
  return Promise.resolve()
}

const modifyPassword = () => {
  changePassword(Md5.hashStr(modifyPasswordModal.oldPassword), Md5.hashStr(modifyPasswordModal.password), Md5.hashStr(modifyPasswordModal.passwordConfirm)).then(() => {
    modifyPasswordModal.open = false
  })
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
  background: var(--top-header-bg);
  backdrop-filter: var(--top-header-blur);
  -webkit-backdrop-filter: var(--top-header-blur);
  border-bottom: var(--top-header-border);
  padding: 0;
  box-sizing: border-box;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  z-index: 20;
}

.top_title {
  height: 100%;
  font-size: 16px;
  padding: 0 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-sizing: border-box;
  color: var(--header-title-color);
  background: var(--header-title-bg);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 999;
  transition: all var(--transition-fast);
}

/* Logo区域右侧柔和分隔 - 用伪元素替代border-right，更精致 */
.top_title::after {
  content: '';
  position: absolute;
  right: 0;
  top: 12px;
  bottom: 12px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--border-subtle) 30%,
    var(--border-subtle) 70%,
    transparent 100%
  );
  pointer-events: none;
}

/* Logo区域底部柔和光晕 */
.top_title::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.04) 0%,
    transparent 100%);
  pointer-events: none;
  border-radius: 0;
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

/* 业务扩展区域样式 */
.top_extra {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--space-lg);
  flex-shrink: 0;
  border-left: 1px solid var(--border-subtle);
}

.top_user {
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 0 var(--space-lg) 0 var(--space-md);
  flex: 0 0 auto;
  background: transparent;
  position: relative;
  transition: background var(--transition-fast);
  cursor: pointer;
  gap: var(--space-sm);
}

.top_user:hover {
  background: var(--header-hover-bg);
}

/* 用户头像区域 */
.user-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  border: 2px solid var(--header-avatar-border);
  box-shadow: var(--header-avatar-shadow);
  transition: all var(--transition-fast);
}

.user-avatar:hover {
  border-color: var(--accent-mid);
  box-shadow: var(--header-avatar-hover-shadow);
  transform: var(--header-avatar-hover-transform);
}

/* 在线状态指示器 */
.user-status-indicator {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 8px;
  height: 8px;
  background: var(--header-status-bg);
  border: 2px solid var(--bg-elevated);
  border-radius: 50%;
  animation: var(--header-status-animation);
}

/* 用户信息区域 */
.user-info {
  min-width: 0;
  margin-right: var(--space-sm);
}

.user-name {
  font-size: var(--header-user-name-size);
  font-weight: var(--header-user-name-weight);
  color: var(--header-user-text);
  line-height: 1.3;
}

.user-role {
  font-size: 11px;
  color: var(--header-user-text-secondary);
  line-height: 1;
  display: inline-block;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: var(--header-role-bg);
  border: var(--header-role-border);
  border-radius: var(--header-role-radius);
  padding: var(--header-role-padding);
}

/* 设置按钮区域 */
.setting-button-wrapper {
  position: relative;
  flex-shrink: 0;
}

/* 主题切换按钮 */
.theme-toggle-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-right: var(--space-xs);
}

.theme-toggle-btn {
  color: var(--header-icon-color) !important;
  transition: all var(--transition-fast) !important;
}

.theme-toggle-btn:hover {
  color: var(--header-btn-hover-color) !important;
  background: var(--header-btn-hover-bg) !important;
}

.setting-button {
  background: var(--header-setting-bg) !important;
  border: var(--header-setting-border) !important;
  box-shadow: var(--header-setting-shadow);
  color: var(--header-icon-color) !important;
  transition: all var(--transition-fast) !important;
}

.setting-button:hover {
  background: var(--header-btn-hover-bg) !important;
  color: var(--header-btn-hover-color) !important;
  box-shadow: var(--header-setting-hover-shadow) !important;
  transform: var(--header-setting-hover-transform);
}

.setting-button:active {
  transform: var(--header-setting-active-transform);
}

/* 下拉菜单 - 深色主题 */
:deep(.user-dropdown-menu) {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 4px;
}

:deep(.user-dropdown-menu .ant-menu-item) {
  border-radius: var(--radius-md);
  margin: 2px 0;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}

:deep(.user-dropdown-menu .ant-menu-item:hover) {
  background: var(--accent-soft);
  color: var(--accent);
}

:deep(.top_user_setting .ant-btn-circle) {
  margin-right: 0;
}

/* ==================== 主题色板菜单 ==================== */
.theme-palette-menu {
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
  padding: 6px !important;
  min-width: 180px !important;
}

.theme-palette-item {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 12px !important;
  border-radius: var(--radius-md) !important;
  margin: 2px 0 !important;
  height: auto !important;
  line-height: 1.3 !important;
  transition: all var(--transition-fast) !important;
}

.theme-palette-item:hover {
  background: var(--accent-soft) !important;
}

.theme-palette-item.ant-menu-item-selected {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
}

.theme-swatch {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--border-subtle);
}

.theme-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.theme-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
}
</style>
