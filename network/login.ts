import qs from 'qs'
import { LocationQueryRaw } from 'vue-router'

import { exchangeLogin, getToken, getUserInfo, ssoLogin, verifyLogin } from '@/framework/apis/login/login'
import { isLoginModeConfigured, loginMode, oauth2ExchangeApi, ssoLoginUrl } from '@/framework/network/loginMode'
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
// 转由宿主自行发起登录（VITE_loginMode=host 的宿主，如飞书授权页）。不注入则保持内建认证中心行为
let ssoEntryHandler: ((token?: string) => any) | null = null
export const setSsoEntryHandler = (handler: ((token?: string) => any) | null) => {
  ssoEntryHandler = handler
}
localStorageMethods.setLocalStorage('loginRetryTime', '3')
// 回调接受面与入口形态同源：显式 mode 下只认本形态的产物；未配置 mode 时保持存量行为
// （target_url/id_token 全收，code 仅看兑换端点是否配置）
const acceptsTargetUrl = !isLoginModeConfigured || loginMode === 'idaas' || loginMode === 'idaas-core'
const acceptsIdToken = acceptsTargetUrl
const acceptsAuthCode = isNotEmpty(oauth2ExchangeApi) && (!isLoginModeConfigured || loginMode === 'oauth2')
// 本地账号登录：显式 mode=local，或旧标记 VITE_ssoDomain='localhost'（未配置 mode 时）
const isLocalLoginMode = isLoginModeConfigured ? loginMode === 'local' : import.meta.env.VITE_ssoDomain === 'localhost'

const warnOnce = (() => {
  const warned = new Set<string>()
  return (key: string, message: string) => {
    if (warned.has(key)) return
    warned.add(key)
    console.warn(message)
  }
})()

const navigateLocalLogin = (includeRedirectUri = true) => {
  const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
  const redirect_uri = includeRedirectUri && url !== 'login' ? url : undefined
  return router.replace({
    path: '/login',
    query: { redirect_uri } as LocationQueryRaw
  }).then(() => window.location.reload())
}

// VITE_ssoDomain=localhost 的本地联调入口（沿用旧逻辑：以 VITE_ssoLoginUrl 作为路由 path 跳转）
const navigateLocalSsoPath = (includeRedirectUri = true) => {
  const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
  const redirect_uri = includeRedirectUri && url !== 'login' ? url : undefined
  return router.replace({
    path: ssoLoginUrl,
    query: { redirect_uri } as LocationQueryRaw
  }).then(() => window.location.reload())
}

export const navigation2Login = (includeRedirectUri = true) => {
  // 宿主自定义 SSO（如飞书，authorize URL 需后端按 app 凭证＋动态 state 现生成，静态 URL 表达不了）：
  // 显式 mode=host，或未配置 mode 时保持原有"注入器优先"语义。任何会话失效（含主动登出触发的 401）
  // 一律自动重新发起授权，全程不出现登录页——纯 SSO 单身份系统，用户无账号密码、无切换账号需求
  if (loginMode === 'host' || (!isLoginModeConfigured && ssoEntryHandler)) {
    if (!ssoEntryHandler) {
      warnOnce('host-without-handler', '[login] VITE_loginMode=host 但未注入 setSsoEntryHandler，回落本地登录页')
      return navigateLocalLogin(includeRedirectUri)
    }
    // 与内建认证中心分支一致不清本地 token：失效 token 由 verifyLogin 识别后
    // 经 _executeLogin 重新授权并覆盖写入；仅复位 hasLogin，
    // 避免 authorize 请求失败滞留页面时守卫放行进入"看似已登录"状态
    commonStore.hasLogin = false
    return Promise.resolve(ssoEntryHandler())
  }
  // 存量兼容：VITE_ssoDomain='localhost'（旧“本地账号登录”标记）且配了 ssoLoginUrl 时，
  // 旧逻辑以 ssoLoginUrl 作为路由 path 跳转；显式 VITE_loginMode 下不再看该旧标记
  if (!isLoginModeConfigured && import.meta.env.VITE_ssoDomain === 'localhost' && ssoLoginUrl) {
    return navigateLocalSsoPath(includeRedirectUri)
  }
  if (loginMode === 'local') {
    return navigateLocalLogin(includeRedirectUri)
  }
  if (!ssoLoginUrl) {
    warnOnce('missing-login-url', `[login] VITE_loginMode=${loginMode} 但未配置 VITE_ssoLoginUrl，回落本地登录页`)
    return navigateLocalLogin(includeRedirectUri)
  }
  if (loginMode === 'oauth2') {
    // authorize 直链形态：redirect_uri 已全串内置于 VITE_ssoLoginUrl（必须与白名单登记串一致，
    // authorize 端全串等值复核），不得再追加；target_url 收进 state（RFC 6749 原值透传，
    // 回跳后由 checkLoginState 的 code 分支解码复原）
    const targetUrl = encodeURIComponent(window.location.href)
    window.location.href = ssoLoginUrl + '&state=' + targetUrl
    return
  }
  let redirectUri
  if (isNotEmpty(import.meta.env.VITE_ssoDomain)) {
    redirectUri = import.meta.env.VITE_ssoDomain
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


const enterLocalLogin = (token: any) => {
  localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
  const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
  // 如果当前已经在 login 页面，不需要设置 redirect_uri，否则登录成功后又会跳回 login
  const redirect_uri = url && url !== 'login' ? url : undefined
  // 未配置 SSO 时 VITE_ssoLoginUrl 为空串，replace({path:''}) 落不进 /login，
  // 守卫会再次 checkLoginState ⇒ checkLoginState↔_executeLogin 死循环刷 /token，
  // 兜底到本地登录页须与 navigation2Login 的 '/login' 一致。
  // 存量未配 mode 时保留旧行为（VITE_ssoLoginUrl 作为站内路由 path）；
  // 显式 mode=local 下该变量不再参与分派，本地登录页固定 /login
  return router.replace({ path: isLoginModeConfigured ? '/login' : ssoLoginUrl || '/login', query: { redirect_uri } as LocationQueryRaw })
}

const exchangeIdToken = () => ssoLogin(userStore.getIdToken)
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
    // 🔴 core 形态拒票是裸 Error（request 层 reject 不带 payload，实测 keys=[]），
    // IdaaS 认证中心才在 err.payload.ssoLoginUrl 点名；触发条件＝「点名 ∨ 本系统配置了
    // VITE_ssoLoginUrl」，🔴 不得拿 err.payload 当前提——那会把 core 腿在条件处短路回 throw。
    // navigation2Login 读同一 env，不需要把 URL 传进去。
    // loginRetryTime 计数门原样保留——防 authorize↔exchange 互踢死循环。
    // 未配置 VITE_ssoLoginUrl 且无 payload.ssoLoginUrl 时本分支与改前逐字等价（零位移）
    if (err && ((err.payload && err.payload.ssoLoginUrl) || ssoLoginUrl)) {
      console.log((err.payload && err.payload.ssoLoginUrl) || ssoLoginUrl)
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

const _executeLogin = (token: any) => {
  if (isLoginModeConfigured) {
    if (loginMode === 'local') return enterLocalLogin(token)
    if (loginMode === 'host') {
      if (!ssoEntryHandler) {
        warnOnce('host-without-handler', '[login] VITE_loginMode=host 但未注入 setSsoEntryHandler，回落本地登录页')
        return enterLocalLogin(token)
      }
      return Promise.resolve(ssoEntryHandler(token)).then(() => undefined)
    }
    if (loginMode === 'oauth2') {
      // 本地没有可换的票：重新走 authorize 入口；跳转期间挂起，避免上层继续跑 afterLogin
      navigation2Login()
      return new Promise(() => {})
    }
    // idaas / idaas-core：id_token 交本系统签发口
    return exchangeIdToken()
  }
  // ---- 未配置 VITE_loginMode：以下为存量逻辑，逐字保留 ----
  // ssoDomain 为空 = 未配置 SSO(同域自部署), 与 localhost 一致直接进本地登录页,
  // 不能走认证中心 ssoLogin(/auth/login), 否则后端 404 导致白屏
  if (!import.meta.env.VITE_ssoDomain || import.meta.env.VITE_ssoDomain === 'localhost') {
    return enterLocalLogin(token)
  } else if (ssoEntryHandler) {
    // 宿主自定义 SSO（如飞书）：由注入器发起登录
    return Promise.resolve(ssoEntryHandler(token)).then(() => undefined)
  } else {
    return exchangeIdToken()
  }
}

export const setAfterLoginHandler = (loginHandler: Function) => {
  afterLoginHandler = loginHandler
}
export const checkLoginState = async () => {
  const queryObject = getQueryObject(window.location.href)
  if (isNotEmpty(queryObject)) {
    if (acceptsTargetUrl && isNotEmpty(queryObject.target_url)) {
      const targetUrl = String(queryObject.target_url)
      delete queryObject.target_url
      window.location.href = targetUrl + (targetUrl.includes('?') ? '&' : '?') + qs.stringify(queryObject, { arrayFormat: 'repeat' })
    } else if (acceptsAuthCode && isNotEmpty(queryObject.code)) {
      // OAuth2 授权码回调：形态前提与 navigation2Login 的入口分派同源（显式 mode=oauth2；
      // 未配置 mode 时沿用"配了兑换端点即认"的存量判据）。code 传宿主后端兑换端点换本地会话；
      // state＝navigation2Login 发起跳转时编码进来的原页地址（RFC 6749 原值透传），
      // 会话落好后复原回原页（try/catch 解码，脏 state 就地放弃走清参重载）。
      // 🔴 框架零业务常量：兑换端点路径是宿主业务，一律 env 注入，不得写死任何项目路径——
      // 2026-11-05 生产事故：曾写死 inkhub 对接示例项目的 /epc-ai/oauth2/exchange 且裸判
      // ？code=，pan 飞书回调 #/feishu/callback?code= 被劫持 POST 该路径 404 断链
      // （nginx 日志同秒双 POST 实证）。
      // 🔴 必须在此 return 短路：不return 的话下方 getToken/verify 链会并发走 _executeLogin
      // ⇒ ssoLogin(空 id_token) 必 401 ⇒ 又触发 navigation2Login 回 authorize ⇒ 回跳环
      exchangeLogin(String(queryObject.code)).then(res => {
        const payload = res.payload
        if (payload && payload.accessToken) {
          userStore.name = payload.name
          localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, payload.accessToken)
          localStorageMethods.setLocalStorage(REFRESH_TOKEN, payload.refreshToken)
          commonStore.hasLogin = true
          localStorageMethods.setLocalStorage('loginRetryTime', '3')
        }
        const state = String(queryObject.state || '')
        let target = ''
        if (state) {
          try { target = decodeURIComponent(state) } catch (e) { target = '' }
        }
        if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
          window.location.href = target
        } else {
          window.location.href = removeURLParameter(removeURLParameter(window.location.href, 'code'), 'state')
        }
      })
      return undefined
    } else if (acceptsIdToken && isNotEmpty(queryObject.id_token)) {
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
              if (!isLocalLoginMode) {
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
