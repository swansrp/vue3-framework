<template>
  <div id="top">
    <div class="top_title">
      <img src="../../../../../public/icon.png" alt="公司标志" />
      {{ projectName }}
    </div>
    <top-nav class="top_nav" />
    <div class="top_user">
      <a-avatar>
        <template #icon>
          <user-outlined />
        </template>
      </a-avatar>
      <div class="top_user_name">{{ userStore.name }}</div>
      <div class="top_user_setting">
        <a-dropdown trigger="click">
          <template #overlay>
            <a-menu @click="handleMenuClick">
              <a-menu-item key="1">
                <RedoOutlined />
                免密重新登录
              </a-menu-item>
              <a-menu-item key="2">
                <UserOutlined />
                2nd
              </a-menu-item>
              <a-menu-item key="3">
                <UserOutlined />
                3rd item
              </a-menu-item>
            </a-menu>
          </template>
          <a-button type="text" shape="circle" size="large">
            <template #icon><SettingOutlined /></template>
          </a-button>
        </a-dropdown>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {reLogin} from "@/framework/apis/login/login"
import {useUserStore} from "@/framework/store/user"
import {localStorageMethods} from "@/framework/utils/common"
import {title as projectName} from '../../../../../package.json'
import {AUTHORIZATION_TOKEN, REFRESH_TOKEN} from "@/framework/utils/constant"
import { UserOutlined, SettingOutlined, RedoOutlined } from "@ant-design/icons-vue"
import TopNav from "@/framework/components/navigationFramework/navMenu/topNav/TopNav.vue";
const userStore = useUserStore()

const handleMenuClick = (e:any) => {
  if (e.key === '1'){
    const refreshToken = localStorageMethods.getLocalStorage(REFRESH_TOKEN)
    reLogin(refreshToken).then(res => {
      localStorageMethods.setLocalStorage(REFRESH_TOKEN, res.payload[REFRESH_TOKEN])
      localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, res.payload.accessToken)
      window.location.reload()
    })
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
  color: #fff;
  background-color: rgb(0,21,41);
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 5px 0 5px 0 rgba(0,0,0,0.5);
  position: relative;
  z-index: 999;
}
.top_title img {
  height: 20px;
  width: 20px;
  margin-right: 5px;
}
.top_nav {
  flex: 1 0 auto;
}
.top_user {
  width: 180px;
  height: 100%;
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding-left: 10px;
  flex: 0 0 auto;
}
.top_user_name {
  margin-left: 10px;
  width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
