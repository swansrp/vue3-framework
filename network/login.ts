import { getToken, getUserInfo, ssoLogin, verifyLogin } from '@/framework/apis/login/login'
import { isNotEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN, ID_TOKEN, REFRESH_TOKEN } from '@/framework/utils/constant'
import qs from 'qs'
import { useRouteStore } from '@/framework/store/route'
import pinia from '@/framework/store'
import { useUserStore } from '@/framework/store/user'
import { useCommonStore } from '@/framework/store/common'
import { getQueryObject, removeURLParameter } from '@/framework/network/utils'
import router from '@/framework/router'
import { LocationQueryRaw } from 'vue-router'

const userStore = useUserStore(pinia)
const commonStore = useCommonStore(pinia)
let afterLoginHandler: Function
localStorageMethods.setLocalStorage('loginRetryTime', '3')
const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
export const navigation2Login = () => {
  let redirectUri
  if (isNotEmpty(import.meta.env.VITE_ssoDomain)) {
    redirectUri = import.meta.env.VITE_ssoDomain
    if (redirectUri === 'localhost') {
      const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
      const redirect_uri = url === 'login' ? undefined : url
      return router.replace({
        path: ssoLoginUrl,
        query: {redirect_uri} as LocationQueryRaw
      }).then(() => window.location.reload())
    }
  } else {
    const url = window.location.href.split('://')[1]
    const http = window.location.href.split(url)[0]
    redirectUri = http + url.split('?')[0].split('/')[0] + '/sso'
  }
  const targetUrl = encodeURIComponent(window.location.href)
  window.location.href = ssoLoginUrl + '&redirect_uri=' + redirectUri + '&target_url=' + targetUrl
}


const _executeLogin = (token: any) => {
  if (import.meta.env.VITE_ssoDomain === 'localhost') {
    const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token)
    const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
    return router.replace({path: ssoLoginUrl, query: {redirect_uri: url} as LocationQueryRaw})
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
      const targetUrl = queryObject.target_url
      delete queryObject.target_url
      window.location.href = targetUrl + '?' + qs.stringify(queryObject, {arrayFormat: 'repeat'})
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
              if (window.location.hash !== '#/login') {
                return afterLogin()
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
