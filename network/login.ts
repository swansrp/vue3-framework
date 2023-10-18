import {getToken, getUserInfo, ssoLogin, verifyLogin} from "@/framework/apis/login/login";
import {isNotEmpty, localStorageMethods} from "@/framework/utils/common";
import {AUTHORIZATION_TOKEN, ID_TOKEN, REFRESH_TOKEN} from "@/framework/utils/constant";
import qs from "qs";
import {useRouteStore} from "@/framework/store/route";
import pinia from "@/framework/store";
import {useUserStore} from "@/framework/store/user";
import {useCommonStore} from "@/framework/store/common";
import dayjs from "dayjs";
import {getWeekByDate} from "@/framework/apis/common/week";
import {getQueryObject, removeURLParameter} from "@/framework/network/utils";

const userStore = useUserStore(pinia)
const commonStore = useCommonStore(pinia)

const _executeLogin = () => ssoLogin(userStore.getIdToken)
    .then(res => {
        const payload = res.payload
        if (payload && payload.accessToken) {
            userStore.name = payload.name
            localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, payload.accessToken)
            localStorageMethods.setLocalStorage(REFRESH_TOKEN, payload.refreshToken)
            commonStore.hasLogin = true
        }
        return 1
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
                window.location.href = removeURLParameter(window.location.href, ID_TOKEN)
            })
        }
    }

    return await getToken().then((getTokenRes) => {
        const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
        if (token) {
            return verifyLogin(token).then((res) => {
                const result = res.payload
                if (!+result) {
                    if (window.location.hash === '#/login') return localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, getTokenRes.payload.token)
                    else return _executeLogin().then(afterLogin)
                } else {
                    commonStore.hasLogin = true
                    return afterLogin()
                }
            })
        } else {
            if (window.location.hash === '#/login') return localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, getTokenRes.payload.token)
            else return _executeLogin().then(afterLogin)
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
    }).then(() => {
        const store = useCommonStore(pinia)
        const today = dayjs().format('YYYY-MM-DD')
        return getWeekByDate(today).then(res => store.version = res.payload.version)
    })
}
