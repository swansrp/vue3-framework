import { message } from 'ant-design-vue'
import axios, { AxiosProgressEvent, AxiosResponse } from 'axios'
import qs from 'qs'

import { name } from '@/../package.json'
import { load } from '@/framework/components/common/Loading'
import { navigation2Login } from '@/framework/network/login'
import { isEmpty, localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'
export const domain = '/' + name
message.config({ maxCount: 1 })

/**
 * 自定义JSON解析器，将大整数转换为字符串以避免精度丢失
 * JavaScript的Number类型安全整数范围是 -(2^53-1) 到 (2^53-1)
 */
function parseBigInt(text: string): any {
  // 匹配所有的 "id": 数字 的模式，将大整数转换为字符串
  // 这里匹配 "id" 或以 "Id" 结尾的字段
  const converted = text.replace(
    /"(\w*[Ii]d)"\s*:\s*(\d{15,})/g,
    '"$1":"$2"'
  )
  return JSON.parse(converted)
}


const web = '/web'
const baseURL = import.meta.env.VITE_baseURL + domain + web

// 延迟显示时间（避免快闪）
const showDelay = 500
// 最小展示时长（避免刚显示就消失）
const minDuration = 500
const loadMap = new WeakMap()
// 存储所有活跃的 timer,用于极端情况的清理
const activeTimers = new Set<NodeJS.Timeout>()

const errCode = {
  SUCCESS: 0,
  SESSION_TIME_OUT: 401
}
const axiosInstance = axios.create({
  // 使用自定义的transformResponse来处理大整数
  transformResponse: [(data) => {
    if (typeof data === 'string') {
      try {
        return parseBigInt(data)
      } catch (e) {
        console.error('JSON解析失败:', e)
        return data
      }
    }
    return data
  }]
})
axiosInstance.interceptors.request.use(
  (config) => {
    const { data, showLoading } = config.data as configDataType
    config.data = data
    const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
    if (token) config.headers['Authorization'] = 'Bearer ' + localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)

    if (showLoading) {
      const record: any = { startAt: Date.now(), shownAt: null }
      // 延迟展示 loading
      record.timer = setTimeout(() => {
        load.show()
        record.shownAt = Date.now()
        activeTimers.delete(record.timer)
      }, showDelay)
      activeTimers.add(record.timer)
      loadMap.set(config, record)
    }

    return config
  }, err => {
    console.log(err)
    load.close()
    return message.error('请求超时，请检查网络设置!')
  }
)

const closeLoading = (config: any) => {
  const record = loadMap.get(config)
  if (!record) return

  clearTimeout(record.timer)
  activeTimers.delete(record.timer)

  // 若未显示 → 直接不显示
  if (!record.shownAt) {
    loadMap.delete(config)
    return
  }

  // 若已显示 → 确保显示满最小时长
  const visibleTime = Date.now() - record.shownAt
  const remain = Math.max(0, minDuration - visibleTime)
  setTimeout(() => {
    load.close()
    loadMap.delete(config)
  }, remain)
}

// 清理所有活跃的 timer(用于极端情况)
const clearAllTimers = () => {
  activeTimers.forEach(timer => clearTimeout(timer))
  activeTimers.clear()
  load.close()
}

axiosInstance.interceptors.response.use(
  (resp) => {
    closeLoading(resp.config)
    _handleTimeOut(resp.data)
    return Promise.resolve(resp)
  }, err => {
    if (err.config) {
      closeLoading(err.config)
    } else {
      // 极端情况:清理所有可能的 timer
      clearAllTimers()
    }
    if(err.response) {
      _handleTimeOut(err.response.data)
      if (err.response.status === 404)
        message.error('抱歉,尚未支持该服务!')
      else if (err.response.status === 504)
        message.error('服务开小差了,请稍后再试...')
      else if (err.response.status === 403)
        message.error('权限不足,请联系管理员!')
      else if (err.response.status === 500)
        message.error('系统错误,联系管理员!')
      else if (err.response.status === 502)
        message.error('服务正在快马加鞭,请稍等!')
      else
        console.log(err)
    } else {
      message.error('网络异常')
    }

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
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
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
    if (statusCode === 404)
      message.error('抱歉,尚未支持该服务!')
    else if (statusCode === 504)
      message.error('服务开小差了,请稍后再试...')
    else if (statusCode === 403)
      message.error('权限不足,请联系管理员!')
    else if (statusCode === 500)
      message.error('系统错误,联系管理员!')
    else if (statusCode === 502)
      message.error('服务正在快马加鞭,请稍等!')
    else
      console.log(err)
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
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    data: { data: body },
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
    url: apiType.url + '?' + qs.stringify(params, { arrayFormat: 'repeat' }),
    data: { data: body },
    params: null,
    headers: { 'Content-Type': 'multipart/form-data' },
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
  downloadBlob(blob, fileName)
}

const downloadBlob = (blob: Blob, fileName: string | undefined) => {
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


export { baseURL, get, post, request, upload, download, downloadBlob, downloadUrl }

