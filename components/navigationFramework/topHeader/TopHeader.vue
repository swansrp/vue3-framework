<template>
  <div id="top">
    <!-- chrome=nav 变体：本地调试子系统形态（去身份件保留导航），正源 plan-local-debug-subsystem 3.2b —— 隐藏 logo/标题区 -->
    <div
      v-if="!isNavChrome"
      :class="[tabStore.isNeedLeftNav ? 'show-left-nav' : 'hide-left-nav', { 'title-inline': leftNavAutoHidden }]"
      :style="{
        width: leftNavAutoHidden ? 'auto' : (tabStore.isNeedLeftNav ? (tabStore.leftNavCollapsed ? '50px' : `${tabStore.leftNavWidth}px`) : '250px'),
        padding: leftNavAutoHidden ? '0 16px' : (tabStore.leftNavCollapsed ? '0' : '0 14px')
      }"
      class="top_title"
      title="点击返回工作台"
      @click="goHome"
    >
      <!-- U124 品牌区（2026-11-28 用户拍板后 U125 追加「logo 区不变，切换器挪左栏顶部」）：
           渐变瓦片压白 logo＋名称＋环境副行，与左列同宽对齐；收起态只留瓦片。
           模块切换器不在品牌区——见 LeftNav 顶部 ln-switcher（U125）。 -->
      <span class="top_title__tile">
        <img
          alt="公司标志"
          src="../../../../../public/icon.png"
        />
      </span>
      <span
        v-if="leftNavAutoHidden || !tabStore.leftNavCollapsed"
        class="top_title__text"
      >
        <span class="top_title__name">{{ minimal ? subSystemTitle : projectName }}</span>
        <span
          v-if="!leftNavAutoHidden && !minimal"
          class="top_title__sub"
        >{{ envSubLabel }}</span>
      </span>
    </div>
    <top-nav
      v-if="!minimal && !hideTopnav"
      class="top_nav"
    />
    <!-- 子系统形态 / 统一侧栏（hide-topnav，U124：顶级模块已全部进左栏父级组标签）
         无顶部菜单，用占位撑开，将用户区推到最右 -->
    <div
      v-else
      class="top_nav_placeholder"
    ></div>
    <!-- 业务扩展区域插槽 - 用于业务层注入自定义内容（如企业选择器） -->
    <div
      v-if="$slots['header-extra']"
      class="top_extra"
    >
      <slot name="header-extra"></slot>
    </div>
    <div class="top_user">
      <!-- chrome=nav 变体：隐藏用户头像/身份段（正源 plan-local-debug-subsystem 3.2b） -->
      <div
        v-if="!isNavChrome"
        class="user-avatar-wrapper"
      >
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
      <!-- chrome=nav 变体：隐藏用户身份段（姓名/部门） -->
      <div
        v-if="!isNavChrome"
        class="user-info"
      >
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
      <!-- 业务动作区插槽（如站内信铃铛）：落在齿轮左侧，默认不渲染 -->
      <div
        v-if="$slots['header-actions']"
        class="top_header_actions"
      >
        <slot name="header-actions"></slot>
      </div>
      <!-- chrome=nav 变体：隐藏齿轮设置下拉（正源 plan-local-debug-subsystem 3.2b） -->
      <div
        v-if="!isNavChrome"
        class="top_user_setting"
      >
        <a-dropdown
          trigger="click"
          @open-change="onSettingDropdownOpen"
        >
          <template #overlay>
            <a-menu
              class="user-dropdown-menu"
              @click="handleMenuClick"
            >
              <!-- 系统管理入口：有该菜单权限即显示（不区分是否子系统极简形态），点击以子系统方式新页签打开 -->
              <a-menu-item
                v-if="systemManageNode"
                key="systemManage"
              >
                <ToolOutlined />
                {{ SYSTEM_MANAGE_MENU_TITLE }}
              </a-menu-item>
              <!-- 租户切换（框架内置，隐蔽）：清单现查，可切的租户 >1 才出现；
                   单租户、无租户（含整个系统还没有租户）与拉取失败，齿轮菜单与从前逐项一致 -->
              <a-sub-menu
                v-if="tenantMenu.visible"
                key="tenantSwitch"
              >
                <template #icon>
                  <SwapOutlined />
                </template>
                <template #title>
                  切换租户（{{ tenantMenu.currentLabel }}）
                </template>
                <a-menu-item
                  v-for="t in tenantStore.tenants"
                  :key="'tenant-' + t.tenantId"
                  :disabled="tenantStore.switching"
                >
                  <CheckOutlined v-if="t.current" />
                  {{ t.name }}
                  <a-tag
                    v-if="t.isAdmin"
                    color="blue"
                  >
                    管理员
                  </a-tag>
                </a-menu-item>
              </a-sub-menu>
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
import { CheckOutlined, PoweroffOutlined, RedoOutlined, SafetyOutlined, SettingOutlined, SwapOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { Md5 } from 'ts-md5'
import { useRouter } from 'vue-router'

import { title as projectName } from '../../../../../package.json'

import { changePassword, getUserInfo, logoff, reLogin, updateUserInfo } from '@/framework/apis/login/login'
import Marquee from '@/framework/components/common/marquee/index.vue'
import TopNav from '@/framework/components/navigationFramework/navMenu/topNav/TopNav.vue'
import { afterLogin } from '@/framework/network/login'
import { setRootPathMode } from '@/framework/router'
import { isLoginModeConfigured, loginMode } from '@/framework/network/loginMode'
import pinia from '@/framework/store'
import { dictStore } from '@/framework/store/common'
import { useTabStore } from '@/framework/store/nav'
import { useNavigationStore } from '@/framework/store/navigation'
import { useRouteStore } from '@/framework/store/route'
import { useTenantStore } from '@/framework/store/tenant'
import { LIGHT_THEMES, useThemeStore } from '@/framework/store/theme'
import { useUserStore } from '@/framework/store/user'
import { isNotEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN, SYSTEM_MANAGE_MENU_TITLE } from '@/framework/utils/constant'
import { validatePassword } from '@/framework/utils/passwordValidator'

// minimal: 子系统形态的极简顶部条（隐藏顶部菜单，标题显示当前子系统名）
// chrome: 框架壳变体，缺省 full=完整壳（未传时行为零变化）；
// nav=本地调试子系统形态——去 logo/用户头像/身份段/齿轮设置下拉，保留 topnav 导航区、
// header-extra 插槽（epc 项目切换器经此注入）等导航件，正源 plan-local-debug-subsystem 3.2b
// leftNavAutoHidden: 左侧整列因「只有一个叶子入口」自动隐藏——品牌区随之内联进顶栏，
// 不再撑出与左列对齐的深色方块（否则左列消失后剩一条无依无靠的深色竖条）
const props = withDefaults(defineProps<{ minimal?: boolean, chrome?: 'full' | 'nav', leftNavAutoHidden?: boolean, hideTopnav?: boolean }>(), { chrome: 'full' })
// chrome=nav 变体判定：本地调试子系统形态（去身份件保留导航），正源 plan-local-debug-subsystem 3.2b
const isNavChrome = computed(() => props.chrome === 'nav')

// U124 品牌区副行：环境标识（与 index.vue document.title 的 测试--/预生产-- 前缀同口径）
const envSubLabel = computed(() => {
  const { MODE } = import.meta.env
  if (MODE === 'development') return '测试环境'
  if (MODE === 'pre') return '预生产环境'
  return '业务工作台'
})

const userStore = useUserStore(pinia)
const tabStore = useTabStore(pinia)
const themeStore = useThemeStore(pinia)
const navigationStore = useNavigationStore(pinia)
const routeStore = useRouteStore(pinia)
const tenantStore = useTenantStore(pinia)

// 子系统名：取当前激活顶部导航节点的标题，回退到项目名
const subSystemTitle = computed(() => {
  const node = routeStore.dynamicRoute.find(n => n.path === navigationStore.activeTopNavPath)
  return node?.title || node?.meta?.title || projectName
})

// "系统管理"顶层菜单节点：后端菜单里有它才有权限，齿轮下拉才显示入口
const systemManageNode = computed(() => {
  return routeStore.dynamicRoute.find(n => (n.meta?.title || n.title || n.name) === SYSTEM_MANAGE_MENU_TITLE)
})

// ==================== 租户切换（框架内置，2026-10-21）====================
// 隐蔽口径：清单由后端 TenantMyController 现查（平台档/系统管理级＝全部有效租户，普通成员＝成员关系 ∩ 有效租户），
// 可切的租户 >1 才出现子菜单；单租户、空清单（系统还没有租户）都让齿轮菜单与从前逐项一致，不做只读展示。
// 清单懒加载＝齿轮下拉首开时才拉（store 内 loaded 防重复），失败静默＝菜单不出现。
const tenantMenu = computed(() => ({
  visible: tenantStore.switchable,
  currentLabel: tenantStore.currentTenantLabel
}))

const onSettingDropdownOpen = (open: boolean) => {
  if (open) tenantStore.fetchMyTenants()
}

const onTenantMenuClick = (tenantId: number) => {
  if (tenantStore.currentTenant?.tenantId === tenantId) return
  tenantStore.switchTenant(tenantId).then(() => {
    message.success('租户已切换，页面即将刷新')
    setTimeout(() => window.location.reload(), 400)
  })
}

// 以子系统方式新页签打开"系统管理"：落地到其第一个叶子子页面
const openSystemManage = () => {
  const topNode = systemManageNode.value
  if (!topNode) return
  let node = topNode
  const pathArray = [topNode.path]
  while (node.children && node.children.length > 0) {
    node = node.children[0]
    pathArray.push(node.path)
  }
  const routeUrl = router.resolve({ path: `/${ pathArray.join('/') }` })
  window.open(routeUrl.href, '_blank')
}

const handleThemeSelect = (e: any) => {
  themeStore.setTheme(e.key)
}

const genderOptionList = ref<Array<{value: string, label: string}>>([])
const router = useRouter()
// 点击左上角标题区返回首页: 交由框架根路径逻辑处理(auto 模式自动进入第一个动态路由), 不硬编码业务路径
// U132（2026-11-28 用户「logo 点击会切换 再点击又不变了，只保留点击去无路由的主菜单路由」）：
// goHome 一次性切 showMenuOnly——/ 停留显示菜单、不选中叶子（原 auto 模式会重定向进首个
// 叶子＝「切换」感）；守卫期生效后还原 auto，登录流等其他 / 导航行为不变。
const goHome = () => {
  setRootPathMode('showMenuOnly')
  router.push('/').catch(() => {}).finally(() => setRootPathMode('auto'))
}
const localLoginType = isLoginModeConfigured ? loginMode === 'local' : import.meta.env.VITE_ssoDomain === 'localhost'
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
  if (typeof e.key === 'string' && e.key.startsWith('tenant-')) {
    const tenantId = Number(e.key.slice('tenant-'.length))
    if (!Number.isNaN(tenantId)) onTenantMenuClick(tenantId)
  } else if (e.key === 'systemManage') {
    openSystemManage()
  } else if (e.key === '1') {
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
  box-sizing: border-box;
  color: var(--text-primary);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  position: relative;
  z-index: 999;
  transition: all var(--transition-fast);
  cursor: pointer;
  user-select: none;
}

/* U124：品牌区改演示壳瓦片样式（渐变瓦片＋名称＋环境副行），弃「白色方块」底 */
.top_title__tile {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #1e6cb4, #114d83);
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(26, 99, 168, 0.35);
  overflow: hidden;
}

.top_title__tile img {
  width: 20px;
  height: 20px;
  /* 公司 logo 深浅不可控：压成白色剪影贴渐变瓦片（演示壳观感） */
  filter: brightness(0) invert(1);
}

.top_title__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.top_title__name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.top_title__sub {
  margin-top: 1px;
  font-size: 10.5px;
  letter-spacing: 0.4px;
  color: var(--text-tertiary, #878e9c);
  white-space: nowrap;
}

/* 左列自动隐藏（单入口顶级导航）：品牌区并入顶栏——透明底、内容宽，与顶部菜单连成一条。
   文字改吃 --text-primary：--header-title-color 在 classic 等主题里是「深色品牌块上的白字」，
   透明后白字落在浅色顶栏上就隐形了 */
.top_title.title-inline {
  background: transparent;
  justify-content: flex-start;
  color: var(--text-primary);
}

.top_title.title-inline::before {
  display: none;
}

.top_title.title-inline:hover {
  filter: none;
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

/* Logo区域底部柔和光晕（U124 品牌块改透明底后已无意义，摘除） */


.top_title img {
  height: 20px;
  width: 20px;
}

.top_nav {
  /* flex-shrink 必须为 1 且 min-width:0：原「1 0 auto」不收缩，窗口窄时会把右侧用户区
     顶出视口（1280 宽实测顶栏内容 1533 > 容器 1265，整页出横向滚动条，2026-11-27 用户反馈）；
     允许收缩后 antdv Menu 的 overflow 机制会把放不下的顶级菜单收进「…」 */
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0;
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  overflow: hidden;
}

/* 子系统形态：无顶部菜单时的弹性占位，将右侧用户区推到最右 */
.top_nav_placeholder {
  flex: 1 1 auto;
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
  /* U126：右上角融入海蓝工作台——悬停海蓝薄纱（与侧栏条目/页签 hover 同款） */
  background: rgba(26, 99, 168, 0.08);
}

/* 用户头像区域 */
.user-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  /* U133 头像瓦片化：品牌族渐变底＋白图标（与 logo/模块瓦片同族，退役 antd 默认灰圆） */
  background: linear-gradient(135deg, #1e6cb4, #114d83) !important;
  color: #fff !important;
  border: 2px solid rgba(26, 99, 168, 0.35);
  box-shadow: 0 2px 8px rgba(26, 99, 168, 0.3);
  transition: all var(--transition-fast);
}

.user-avatar:hover {
  border-color: #1a63a8;
  box-shadow: 0 3px 12px rgba(26, 99, 168, 0.4);
  transform: translateY(-1px);
}

/* 在线状态指示器 */
.user-status-indicator {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 8px;
  height: 8px;
  background: #52d88a;
  border: 2px solid var(--bg-elevated);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(82, 216, 138, 0.5);
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
  color: var(--text-primary, #20242c);
  line-height: 1.3;
}

.user-role {
  font-size: 11px;
  color: #1a63a8;
  line-height: 1;
  display: inline-block;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(26, 99, 168, 0.08);
  border: none;
  border-radius: 999px;
  padding: 2px 8px;
  margin-top: 2px;
}

/* 设置按钮区域 */
.top_header_actions {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

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
  color: var(--text-secondary, #4d5361) !important;
  transition: all var(--transition-fast) !important;
}

.theme-toggle-btn:hover {
  color: #1a63a8 !important;
  background: rgba(26, 99, 168, 0.08) !important;
}

.setting-button {
  background: transparent !important;
  border: none !important;
  box-shadow: none;
  color: var(--text-secondary, #4d5361) !important;
  transition: all var(--transition-fast) !important;
}

.setting-button:hover {
  background: rgba(26, 99, 168, 0.08) !important;
  color: #1a63a8 !important;
  box-shadow: none !important;
  transform: none;
}

.setting-button:active {
  transform: scale(0.96);
}

.theme-toggle-btn:active {
  transform: scale(0.96);
}

/* 🔴 齿轮下拉菜单样式不可写在 scoped/:deep——overlay 被 teleport 到 body，
   [data-v] 祖先链断裂导致 :deep 永不命中（U133 实测一直在渲染 antd 默认样式）。
   面板化规则已挪到文件尾 unscoped 块。 */

:deep(.top_user_setting .ant-btn-circle) {
  margin-right: 0;
}

/* ==================== 主题色板菜单（U133 面板化同族） ==================== */
.theme-palette-menu {
  background: var(--bg-elevated, #fff) !important;
  border: 1px solid var(--border-subtle, #e2eaf3) !important;
  border-radius: 10px !important;
  box-shadow: 0 6px 20px rgba(26, 99, 168, 0.16) !important;
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

<style>
/* U133 齿轮下拉菜单面板化——overlay 被 teleport 到 body，scoped/:deep 永不命中
   （此前一直渲染 antd 默认样式＝用户观感「丑」的来源），必须 unscoped 全局规则；
   选择器三段式压过 antd 的 .ant-dropdown .ant-dropdown-menu（条目类名是
   ant-dropdown-menu-item，dropdown 语境下 a-menu 不渲染 ant-menu-item） */
.ant-dropdown .ant-dropdown-menu.user-dropdown-menu {
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-subtle, #e2eaf3);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(26, 99, 168, 0.16);
  padding: 6px;
}

.ant-dropdown .ant-dropdown-menu.user-dropdown-menu .ant-dropdown-menu-item {
  margin: 2px 4px;
  border-radius: 8px;
  color: #4d5361;
  transition: all 0.15s;
}

.ant-dropdown .ant-dropdown-menu.user-dropdown-menu .ant-dropdown-menu-item:hover {
  background: rgba(26, 99, 168, 0.08);
  color: #1a63a8;
}
</style>
