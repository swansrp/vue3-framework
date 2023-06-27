import {EmptyObjectType} from "@/framework/utils/type"
import {isNotEmpty, localStorageMethods} from "@/framework/utils/common";
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

export const getQueryObject = function (url: string) {
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
    const queryObject = getQueryObject(window.location.href)
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
        userStore.customerNumber = res.payload.customerNumber
    }).then(() => {
        const store = useCommonStore()
        const today = dayjs().format('YYYY-MM-DD')
        getWeekByDate(today).then(res => store.version = res.payload.version)
    })
}
