import qs from 'qs'
import { LocationQueryRaw } from 'vue-router'

import { getToken, getUserInfo, ssoLogin, verifyLogin } from '@/framework/apis/login/login'
import { getQueryObject, removeURLParameter } from '@/framework/network/utils'
import router from '@/framework/router'
import pinia from '@/framework/store'
import { useCommonStore } from '@/framework/store/common'
import { useRouteStore } from '@/framework/store/route'
import { useUserStore } from '@/framework/store/user'
import { isNotEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, ID_TOKEN, REFRESH_TOKEN } from '@/framework/utils/constant'


const userStore = useUserStore(pinia)
const commonStore = useCommonStore(pinia)
let afterLoginHandler: Function
// 宿主注入的 SSO 登录发起器：设置后 _executeLogin 不再请求认证中心 /auth/login，
// 转由宿主自行发起登录（如 VITE_ssoType=feishu 时跳飞书授权页）。不注入则保持内建认证中心行为
let ssoEntryHandler: ((token?: string) => any) | null = null
export const setSsoEntryHandler = (handler: ((token?: string) => any) | null) => {
  ssoEntryHandler = handler
}
localStorageMethods.setLocalStorage('loginRetryTime', '3')
const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
export const navigation2Login = (includeRedirectUri = true) => {
  // 宿主自定义 SSO（如飞书）：任何会话失效（含主动登出触发的 401）一律自动重新发起授权，
  // 全程不出现登录页——纯 SSO 单身份系统，用户无账号密码、无切换账号需求
  if (ssoEntryHandler) {
    // 与内建认证中心分支一致不清本地 token：失效 token 由 verifyLogin 识别后
    // 经 _executeLogin 重新授权并覆盖写入；仅复位 hasLogin，
    // 避免 authorize 请求失败滞留页面时守卫放行进入"看似已登录"状态
    commonStore.hasLogin = false
    return Promise.resolve(ssoEntryHandler())
  }
  let redirectUri
  if (!ssoLoginUrl) {
    // 未配置 SSO 登录地址: 直接进本地登录页
    const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
    const redirect_uri = includeRedirectUri && url !== 'login' ? url : undefined
    return router.replace({
      path: '/login',
      query: { redirect_uri } as LocationQueryRaw
    }).then(() => window.location.reload())
  }
  if (isNotEmpty(import.meta.env.VITE_ssoDomain)) {
    redirectUri = import.meta.env.VITE_ssoDomain
    if (redirectUri === 'localhost') {
      const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
      const redirect_uri = includeRedirectUri && url !== 'login' ? url : undefined
      return router.replace({
        path: ssoLoginUrl,
        query: { redirect_uri } as LocationQueryRaw
      }).then(() => window.location.reload())
    }
  } else {
    const url = window.location.href.split('://')[1]
    const http = window.location.href.split(url)[0]
    redirectUri = http + url.split('?')[0].split('/')[0] + '/sso'
  }
  const targetUrl = encodeURIComponent(window.location.href)
  if (includeRedirectUri) {
    window.location.href = ssoLoginUrl + '&redirect_uri=' + redirectUri + '&target_url=' + targetUrl
  } else {
    window.location.href = ssoLoginUrl + '&target_url=' + targetUrl
  }
}


const _executeLogin = (token: any) => {
  // ssoDomain 为空 = 未配置 SSO(同域自部署), 与 localhost 一致直接进本地登录页,
  // 不能走认证中心 ssoLogin(/auth/login), 否则后端 404 导致白屏
  if (!import.meta.env.VITE_ssoDomain || import.meta.env.VITE_ssoDomain === 'localhost') {
    const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
    const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
    // 如果当前已经在 login 页面，不需要设置 redirect_uri，否则登录成功后又会跳回 login
    const redirect_uri = url && url !== 'login' ? url : undefined
    return router.replace({ path: ssoLoginUrl, query: { redirect_uri } as LocationQueryRaw })
  } else if (ssoEntryHandler) {
    // 宿主自定义 SSO（如飞书）：由注入器发起登录
    return Promise.resolve(ssoEntryHandler(token)).then(() => undefined)
  } else {
    return ssoLogin(userStore.getIdToken)
      .then(res => {
        const payload = res.payload
        if (payload && payload.accessToken) {
          userStore.name = payload.name
          localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, payload.accessToken)
          localStorageMethods.setLocalStorage(REFRESH_TOKEN, payload.refreshToken)
          commonStore.hasLogin = true
          localStorageMethods.setLocalStorage('loginRetryTime', '3')
        }
        return 1
      }, err => {
        if (err && err.payload && err.payload.ssoLoginUrl) {
          console.log(err.payload.ssoLoginUrl)
          const retryTimes = localStorageMethods.getLocalStorage('loginRetryTime')
          if (Number(retryTimes) - 1 >= 0) {
            localStorageMethods.setLocalStorage('loginRetryTime', '' + (Number(retryTimes) - 1))
            navigation2Login()?.then()
          }
        } else {
          console.log('token验证失败')
          throw new Error(err)
        }
      }).catch(err => {
        console.log('服务器状态异常')
        throw new Error(err)
      })
  }
}

export const setAfterLoginHandler = (loginHandler: Function) => {
  afterLoginHandler = loginHandler
}
export const checkLoginState = async () => {
  const queryObject = getQueryObject(window.location.href)
  if (isNotEmpty(queryObject)) {
    if (isNotEmpty(queryObject.target_url)) {
      const targetUrl = String(queryObject.target_url)
      delete queryObject.target_url
      window.location.href = targetUrl + (targetUrl.includes('?') ? '&' : '?') + qs.stringify(queryObject, { arrayFormat: 'repeat' })
    } else if (isNotEmpty(queryObject.id_token)) {
      userStore.setIdToken(<string>queryObject.id_token).then(() => {
        window.location.href = removeURLParameter(window.location.href, ID_TOKEN)
      })
    }
  }

  return await getToken().then((getTokenRes) => {
    const token = getTokenRes.payload.token
    const localStorageToken = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    if (localStorageToken) {
      return verifyLogin(localStorageToken).then((res) => {
        const result = res.payload
        if (!+result) {
          if (window.location.hash === '#/login') {
            return localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
          } else {
            return _executeLogin(token).then(() => {
              if (import.meta.env.VITE_ssoDomain !== 'localhost') {
                if (window.location.hash !== '#/login') {
                  return afterLogin()
                }
              }
            })
          }
        } else {
          commonStore.hasLogin = true
          return afterLogin()
        }
      })
    } else {
      if (window.location.hash === '#/login') {
        return localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
      } else {
        return _executeLogin(token).then(() => {
          if (window.location.hash !== '#/login') {
            return afterLogin()
          }
        })
      }
    }
  })
}

export const afterLogin = async () => {
  const routeStore = useRouteStore(pinia)
  return await routeStore.getDynamicRouteAction().then(getUserInfo).then((res) => {
    const data = res.payload
    const userStore = useUserStore(pinia)
    Object.keys(data).forEach((key: string) => {
      if (data[key]) { // @ts-ignore
        userStore[key] = data[key]
      }
    })
  }).then(() => afterLoginHandler && afterLoginHandler())
}
