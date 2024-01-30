import qs from 'qs'
import axios, {AxiosResponse} from 'axios'
import {ElLoading, ElMessage} from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import {isNotEmpty, localStorageMethods} from '@/framework/utils/common'
import {LoadingInstance} from 'element-plus/lib/components/loading/src/loading'
import {AUTHORIZATION_TOKEN} from '@/framework/utils/constant'
import {useCommonStore} from '@/framework/store/common'
import pinia from '@/framework/store'
import router from '@/framework/router'
import {getToken} from '@/framework/apis/login/login'
import {LocationQueryRaw} from 'vue-router'
import {removeURLParameter} from '@/framework/network/utils'

// 全局的 ElLoading，即使多次创建，也只会存在一个，方便随时关闭
let loadingInstance: LoadingInstance
const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
const commonStore = useCommonStore(pinia)


const errCode = {
    SUCCESS: 0,
    SESSION_TIME_OUT: 401
}
const axiosInstance = axios.create({})
const createLoadingInstance = () => ElLoading.service({
    fullscreen: true,
    text: '加载中，请稍后……',
    background: 'rgba(0, 0, 0, 0.7)'
})

axiosInstance.interceptors.request.use(
    (config) => {
        const {data, showLoading} = config.data as configDataType
        if (showLoading) loadingInstance = createLoadingInstance()
        config.data = data
        // if (commonStore.getLoginState) config.headers['Authorization'] = 'Bearer ' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
        const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
        if (token) config.headers['Authorization'] = 'Bearer ' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
        return config
    }, err => {
        console.log(err)
        loadingInstance && loadingInstance.close()
        return ElMessage.error({message: '请求超时，请检查网络设置!'})
    }
)

axiosInstance.interceptors.response.use(
    (resp) => {
        loadingInstance && loadingInstance.close()
        _handleTimeOut(resp.data)
        return Promise.resolve(resp)
    }, err => {
        loadingInstance && loadingInstance.close()
        _handleTimeOut(err.response.data)

        if (err.response.status === 504 || err.response.status === 404)
            return ElMessage.error({message: '服务器被吃了⊙﹏⊙∥'})
        else if (err.response.status === 403)
            return ElMessage.error({message: '权限不足,请联系管理员!'})
        else if (err.response.status === 500)
            return ElMessage.error({message: '系统错误,联系管理员!'})
        else console.log(err)
    }
)

const _handleTimeOut = function (data: ResponseDataType) {
    console.log(data)
    if (data.status != null) {
        if (data.status.code === errCode.SESSION_TIME_OUT) {
            // localStorageMethods.removeLocalStorage(AUTHORIZATION_TOKEN)
            // localStorageMethods.removeLocalStorage('operator')
            let redirectUri
            if (isNotEmpty(import.meta.env.VITE_ssoDomain)) {
                redirectUri = import.meta.env.VITE_ssoDomain
                if (redirectUri === 'localhost') {
                    const url = removeURLParameter(window.location.href, 'redirect_uri').split('#/')[1]
                    const redirect_uri = url === 'login' ? undefined : url
                    return router.replace({path: ssoLoginUrl, query: {redirect_uri} as LocationQueryRaw})
                }
            } else {
                const url = window.location.href.split('://')[1]
                const http = window.location.href.split(url)[0]
                redirectUri = http + url.split('?')[0].split('/')[0] + '/sso'
            }
            const targetUrl = encodeURIComponent(window.location.href)
            window.location.href = ssoLoginUrl + '&redirect_uri=' + redirectUri + '&target_url=' + targetUrl
        }
    }
}

function get(apiType: ApiType,
             params: object = {},
             data: object = {},
             showSuccess = false,
             showLoading = true,
             showErr = true) {
    return request(apiType, params, data, showSuccess, showLoading, showErr)
}

function post(apiType: ApiType,
              params: object = {},
              data: object = {},
              showSuccess = true,
              showLoading = true,
              showErr = true) {
    return request(apiType, params, data, showSuccess, showLoading, showErr)
}

// apiType method/url/version
// params url的参数
// data 请求体的数据
// showErr 是否显示操作成功提示信息
// showLoading 是否需要在等待期间显示转菊花
// showErr 是否显示错误提示信息
function request(apiType: ApiType,
                 params: object = {},
                 data: object = {},
                 showSuccess = false,
                 showLoading = true,
                 showErr = true) {
    return axiosInstance({
        baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain,
        method: apiType.method,
        url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
        data: {
            data,
            showLoading
        },
        params: null,
        headers: {
            'Content-Type': 'application/json',
            'api-version': apiType.version,
            'client-type': 0
        }
    }).then(resp => {
        if (resp.data.status?.code !== errCode.SUCCESS) {
            if (resp.data.status?.msg) {
                const errTypeMapList = ['info', 'warning', 'error']
                const errLevel = +resp.data.payload.errLevel
                const errType = errTypeMapList[errLevel]
                if(showErr) {
                    ElMessage.error({message: resp.data.payload.errMsg, type: errType})
                    throw new Error(resp.data.status.msg)
                } else {
                    throw new Error(resp.data.status.details)
                }
            }
        } else if (showSuccess) {
            const message = resp.data.status.details
            if (message) ElMessage.success({message})
        }
        return {
            status: resp.data.status,
            payload: resp.data.payload,
            response: resp
        }
    }, err => {
        loadingInstance && loadingInstance.close()
        ElMessage.error({message: '后台接口错误，请联系后台管理员！'})
        throw new Error(err)
    })
}

function download(
    apiType: ApiType,
    fileName: string,
    params: object,
    data: object) {
    ElMessage.success({message: '开始下载……'})
    return axiosInstance({
        baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain,
        method: apiType.method,
        url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
        data,
        params: null,
        headers: {
            'Content-Type': 'application/json',
            'api-version': apiType.version,
            'client-type': 0
        },
        responseType: 'blob'
    }).then(resp => {
        _download(resp, fileName)
        return {
            status: resp.data.status,
            payload: resp.data.payload,
            response: resp
        }
    }, err => {
        ElMessage.error({message: '下载失败，请检查网络后重试，或联系系统管理员！'})
        console.log(err)
        return err
    })
}

function upload(
    apiType: ApiType,
    params: object,
    body: object) {

    axios({
        method: apiType.method,
        url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
        data: body,
        params: null,
        headers: {'Content-Type': 'multipart/form-data'}
    }).then(resp => ({
            status: resp.data.status,
            payload: resp.data.payload,
            response: resp
        })
    ).catch(err => {
        console.log(err)
        return err
    })
}


// download 函数部分

function _download(res: AxiosResponse, fileName: string) {

    const content = res.data
    // 构造一个blob对象来处理数据
    const blob = new Blob([content])

    // 对于<a>标签，只有 Firefox 和 Chrome（内核） 支持 download 属性
    // IE10以上支持blob但是依然不支持download
    if ('download' in document.createElement('a')) { // 支持a标签download的浏览器
        const link = document.createElement('a') // 创建a标签
        link.download = fileName // a 标签添加属性
        link.style.display = 'none'
        link.href = URL.createObjectURL(blob)
        document.body.appendChild(link)
        link.click() // 执行下载
        URL.revokeObjectURL(link.href) // 释放url
        document.body.removeChild(link) // 释放标签
    } else { // 其他浏览器
        navigator.msSaveBlob && navigator.msSaveBlob(blob, fileName)
    }
}


export {get, post, request, upload, download}

