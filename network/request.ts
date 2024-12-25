import qs from 'qs'
import axios, { AxiosProgressEvent, AxiosResponse } from 'axios'
import { isEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
import { useCommonStore } from '@/framework/store/common'
import pinia from '@/framework/store'
import { baseDomain } from '@/framework/apis'
import { navigation2Login } from '@/framework/network/login'
import { message } from "ant-design-vue";
import { load } from '@/framework/components/common/Loading'

message.config({maxCount: 1})
const ssoLoginUrl = import.meta.env.VITE_ssoLoginUrl
const commonStore = useCommonStore(pinia)
const web = '/web'
const baseURL = import.meta.env.VITE_baseURL + baseDomain + web

const errCode = {
  SUCCESS: 0,
  SESSION_TIME_OUT: 401
}
const axiosInstance = axios.create({})
axiosInstance.interceptors.request.use(
  (config) => {
    const {data, showLoading} = config.data as configDataType
    if (showLoading) load.show()
    config.data = data
    const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    if (token) config.headers['Authorization'] = 'Bearer ' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    return config
  }, err => {
    console.log(err)
    load.close()
    return message.error('请求超时，请检查网络设置!')
  }
)

axiosInstance.interceptors.response.use(
  (resp) => {
    load.close()
    _handleTimeOut(resp.data)
    return Promise.resolve(resp)
  }, err => {
    load.close()
    _handleTimeOut(err.response.data)
    if (err.response.status === 504 || err.response.status === 404)
      message.error('服务器被吃了⊙﹏⊙∥')
    else if (err.response.status === 403)
      message.error('权限不足,请联系管理员!')
    else if (err.response.status === 500)
      message.error('系统错误,联系管理员!')
    else if (err.response.status === 502)
      message.error('服务器走神了,请稍等!')
    else
      console.log(err)
    throw new Error(err)
  }
)

const _handleTimeOut = function (data: ResponseDataType) {
  if (data.status != null) {
    if (data.status.code === errCode.SESSION_TIME_OUT) {
      navigation2Login()?.then()
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
                 body: object = {},
                 showSuccess = false,
                 showLoading = true,
                 showErr = true) {
  return axiosInstance({
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
    data: {
      data: body,
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
        if (showErr) {
          const msg = resp.data.payload.errMsg
          if (errType === 'info') message.info(msg)
          else if (errType === 'warning') message.warning(msg)
          else if (errType === 'error') message.error(msg)
          throw new Error(resp.data.status.msg)
        } else {
          throw new Error(resp.data.status.details)
        }
      }
    } else if (showSuccess) {
      const msg = resp.data.status.details
      if (msg) message.success(msg)
    }
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  }, err => {
    load.close()
    const statusCode = err.message.split('status code ')[1]
    if (statusCode === '504' || statusCode === '404')
      message.error('服务器被吃了⊙﹏⊙∥,请联系管理员!')
    else if (statusCode === '403')
      message.error('权限不足,请联系管理员!')
    else if (statusCode === '500')
      message.error('系统错误,联系管理员!')
    else if (statusCode === '502')
      message.error('服务器走神了,请稍等!')
    else
      message.error('后台接口错误，请联系后台管理员！')
    throw new Error(err)
  })
}

function download(
  apiType: ApiType,
  fileName: string | undefined,
  params: object,
  body: object) {
  message.success('开始下载……')
  return axiosInstance({
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
    data: {data: body},
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
    message.error('下载失败，请检查网络后重试，或联系系统管理员！')
    console.log(err)
    throw new Error(err)
  })
}

function upload(
  apiType: ApiType,
  params: object,
  body: object,
  onUploadProgress: Function) {
  return axiosInstance({
    baseURL: import.meta.env.VITE_baseURL + apiType.baseDomain + web,
    method: apiType.method,
    url: apiType.url + '?' + qs.stringify(params, {arrayFormat: 'repeat'}),
    data: {data: body},
    params: null,
    headers: {'Content-Type': 'multipart/form-data'},
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      onUploadProgress(progressEvent)
    }
  }).then(resp => {
    return {
      status: resp.data.status,
      payload: resp.data.payload,
      response: resp
    }
  }).catch(err => {
    message.error('上传失败，请检查网络后重试，或联系系统管理员！')
    console.log(err)
    throw new Error(err)
  })
}


// download 函数部分

function _download(res: AxiosResponse, fileName: string | undefined) {
  if (isEmpty(fileName)) {
    const str = res.headers['content-disposition'].split('filename=')[1]
    fileName = decodeURI(str.substring(1, str.length - 1))
  }
  const content = res.data
  // 构造一个blob对象来处理数据
  const blob = new Blob([content])

  // 对于<a>标签，只有 Firefox 和 Chrome（内核） 支持 download 属性
  // IE10以上支持blob但是依然不支持download
  if ('download' in document.createElement('a')) { // 支持a标签download的浏览器
    const link = document.createElement('a') // 创建a标签
    link.download = fileName || window.crypto.randomUUID() // a 标签添加属性
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

const downloadUrl = (fileURL: string, fileName: string) => {
  const link = document.createElement('a') // 创建a标签
  fileName && (link.download = fileName) // a 标签添加属性
  link.style.display = 'none'
  link.href = fileURL
  link.target = '_blank'
  link.click() // 执行下载
}


export { baseURL, get, post, request, upload, download, downloadUrl }

