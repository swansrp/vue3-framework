import {EmptyObjectType} from "@/framework/utils/type"
import {isNotEmpty, localStorageMethods, setField,} from "@/framework/utils/common";
import qs from "qs"
import pinia from "@/framework/store";
import {useUserStore} from "@/framework/store/user"
import {useCommonStore} from "@/framework/store/common";
import {checkServerLive, getUserInfo, login, verifyToken,} from "@/framework/apis/login/login";
import {AUTHORIZATION_TOKEN, ID_TOKEN, REFRESH_TOKEN} from "@/framework/utils/constant";
import {useRouteStore} from "@/framework/store/route";
import dayjs from "dayjs";
import {getWeekByDate} from "@/framework/apis/common/week";

const userStore = useUserStore(pinia)
const commonStore = useCommonStore(pinia)

const _getQueryObject = function (url: string) {
  url = url || window.location.href
  const search = url.substring(url.lastIndexOf('?') + 1).split('#')[0]
  const obj: EmptyObjectType = {}
  const reg = /([^?&=]+)=([^?&=]*)/g
  search.replace(reg, (rs, $1, $2) => {
    const name = decodeURIComponent($1)
    let val = decodeURIComponent($2)
    val = String(val)
    obj[name] = val
    return rs
  })
  return obj
}

const _removeURLParameter = function (url: string, parameter: string) {
  const urlParts = url.split('?')
  if (urlParts.length >= 2) {
    // 参数名前缀
    const prefix = encodeURIComponent(parameter) + '='
    const pars = urlParts[1].split(/[&;]/g)
    // 循环查找匹配参数
    for (let i = pars.length; i-- > 0;) {
      if (pars[i].lastIndexOf(prefix, 0) !== -1) {
        // 存在则删除
        pars.splice(i, 1)
      }
    }
    return urlParts[0] + (pars.length > 0 ? '?' + pars.join('&') : '')
  }
  return url
}

const _executeLogin = () => login(userStore.getIdToken)
  .then(res => {
    const payload = res.payload
    if (payload && payload.accessToken) {
      userStore.name = payload.name
      localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, payload.accessToken)
      localStorageMethods.setLocalStorage(REFRESH_TOKEN, payload.refreshToken)
      commonStore.hasLogin = true
    }
  }, err => {
    if (err && err.payload && err.payload.ssoLoginUrl) console.log(err.payload.ssoLoginUrl)
    else {
      console.log('token验证失败')
      throw new Error(err)
    }
  }).catch(err => {
    console.log('服务器状态异常')
    throw new Error(err)
  })

export const checkLoginState = async () => {
  const queryObject = _getQueryObject(window.location.href)
  if (isNotEmpty(queryObject)) {
    if (isNotEmpty(queryObject.target_url)) {
      const targetUrl = queryObject.target_url
      delete queryObject.target_url
      window.location.href = targetUrl + '?' + qs.stringify(queryObject, {arrayFormat: 'repeat'})
    } else if (isNotEmpty(queryObject.id_token)) {
      userStore.setIdToken(<string>queryObject.id_token).then(() => {
        window.location.href = _removeURLParameter(window.location.href, ID_TOKEN)
      })
    }
  }
  const routeStore = useRouteStore(pinia)
  return checkServerLive().then(() => {
    const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    if (token) return verifyToken(token).then((res) => {
      const result = res.payload
      if (!+result) return _executeLogin()
      commonStore.hasLogin = true
    })
    else return _executeLogin()
  }).then(routeStore.getDynamicRouteAction).then(getUserInfo).then((res) => {
    const userStore = useUserStore()
    userStore.name = res.payload.name
  }).then(() => {
    const store = useCommonStore()
    const today = dayjs().format('YYYY-MM-DD')
    getWeekByDate(today).then(res => store.version = res.payload.version)
  })
}

// 遍历后台所给的路由树，需要自己手动转换为vue-router可以识别的route形式
// 需要更改name、path和component
export const travelRouteTree = (nodeList: any) => {
  const routeStore = useRouteStore(pinia)
  const modules = import.meta.glob('@/**/*.vue')
  const routePath2RouteTitlePathMap: {[key: string] : string} = {}
  const _travelRouteTree = (nodeList: any, parentPathArray:Array<string> = [], parentTitlePathArray:Array<string> = []) => {
    if (!nodeList || !nodeList.length) return
    for (let i = 0, len = nodeList.length; i < len; ++i) {
      const node = nodeList[i]
      node.name = node.path
      const currentPathIsNotEmpty = Boolean(node.path)
      if (currentPathIsNotEmpty) parentPathArray.push(node.path)
      parentTitlePathArray.push(node.title)
      setField(routePath2RouteTitlePathMap, parentPathArray.join('/'),  parentTitlePathArray.join('/'))
      node.component = modules[`/src${node.component}/index.vue`]
      _travelRouteTree(node.children, parentPathArray, parentTitlePathArray)
      if (currentPathIsNotEmpty) parentPathArray.pop()
      parentTitlePathArray.pop()
    }
  }
  _travelRouteTree(nodeList)
  routeStore.routePath2RouteTitlePathMap = routePath2RouteTitlePathMap
  routeStore.routePath2RouteTitlePathMap['Home'] = '首页'
}

// 因为可能存在某些节点只用于展示menu的title，并不需要放在路由中，所以需要对path为空的节点进行删除
// 否则，会产生警告
export const clearNoNameNode = (nodeList: any) => {
  if (!nodeList || !nodeList.length) return
  for (let i = 0; i < nodeList.length; ++i) {
    const node = nodeList[i]
    if (!node.path) {
      if (node.children) {
        nodeList.push(...node.children)
      }
      nodeList.splice(i, 1)
      --i
    } else clearNoNameNode(node.children)
  }
}

// export const findNode
